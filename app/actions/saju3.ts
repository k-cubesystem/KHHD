'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { getSajuData, calculateDaeun } from '@/lib/domain/saju/saju'
import {
  buildSaju3,
  buildChildReading,
  ageOn,
  UNKNOWN_TIME_FALLBACK,
  type Element,
  type Saju3Result,
  type ChildResult,
} from '@/lib/domain/saju/saju3'
import { rateLimitByIp } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/utils/logger'

/**
 * 「3초 사주」 — 비로그인 공개 계산.
 *
 * 🔴 저장하지 않는다. 생년월일은 이 함수 안에서 만세력을 한 번 돌리고 버린다(DB·로그 어디에도 안 남긴다).
 *    그래서 화면에 «저장하지 않습니다»라고 쓸 수 있다.
 * 🔴 'use server' export 는 공개 엔드포인트다 — 만세력·대운 계산이 CPU 를 쓰므로 IP 스로틀을 건다.
 */

const THIS_YEAR = new Date().getFullYear()

const BirthSchema = z.object({
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '생년월일 형식이 올바르지 않아요')
    .refine((s) => {
      // 🔴 로컬 Date + toISOString 비교는 서버 타임존(KST)에서 하루가 밀려 모든 입력을 거절한다 — UTC 성분으로만 검사
      const [y, m, d] = s.split('-').map(Number)
      const dt = new Date(Date.UTC(y, m - 1, d))
      return (
        y >= 1900 && y <= THIS_YEAR && dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
      )
    }, '1900년 이후의 실제 날짜를 넣어 주세요'),
  birthTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
})

const ChildSchema = BirthSchema.extend({ gender: z.enum(['M', 'F']) })

export type Saju3Response = ({ success: true } & Saju3Result) | { success: false; error: string }
export type ChildResponse = ({ success: true } & ChildResult) | { success: false; error: string }

async function gate(action: string): Promise<string | null> {
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const r = await rateLimitByIp(ip, action, { interval: 60_000, uniqueTokenPerInterval: 30 })
  return r.success ? null : '잠시 후 다시 시도해 주세요'
}

export async function readSaju3(raw: unknown): Promise<Saju3Response> {
  const parsed = BirthSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? '입력을 확인해 주세요' }

  const blocked = await gate('saju3')
  if (blocked) return { success: false, error: blocked }

  const { birthDate, birthTime } = parsed.data
  try {
    const s = getSajuData(birthDate, birthTime ?? UNKNOWN_TIME_FALLBACK, true)
    const result = buildSaju3({
      me: s.dayMasterElement as Element,
      elements: s.elementsDistribution as Record<Element, number>,
      spouseSeat: s.pillars.day.zhiElement as Element,
    })
    return { success: true, ...result }
  } catch (e) {
    // 생년월일은 로그에 남기지 않는다.
    logger.error('[saju3] 계산 실패', e instanceof Error ? e.message : String(e))
    return { success: false, error: '계산에 실패했어요. 잠시 후 다시 시도해 주세요' }
  }
}

export async function readChild(raw: unknown): Promise<ChildResponse> {
  const parsed = ChildSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? '입력을 확인해 주세요' }

  const blocked = await gate('saju3-child')
  if (blocked) return { success: false, error: blocked }

  const { birthDate, birthTime, gender } = parsed.data
  const time = birthTime ?? UNKNOWN_TIME_FALLBACK
  try {
    const s = getSajuData(birthDate, time, true)
    const daeun = calculateDaeun(birthDate, time, gender, true).map((d) => ({
      age: d.age,
      element: d.element as Element,
    }))
    const result = buildChildReading({
      me: s.dayMasterElement as Element,
      elements: s.elementsDistribution as Record<Element, number>,
      daeun,
      currentAge: ageOn(birthDate, new Date()),
    })
    return { success: true, ...result }
  } catch (e) {
    logger.error('[saju3/child] 계산 실패', e instanceof Error ? e.message : String(e))
    return { success: false, error: '계산에 실패했어요. 잠시 후 다시 시도해 주세요' }
  }
}
