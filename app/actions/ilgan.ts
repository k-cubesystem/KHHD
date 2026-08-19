'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { calculateManse } from '@/lib/domain/saju/manse'
import { ilganSlugFromHan, UNKNOWN_TIME_FALLBACK, type IlganSlug } from '@/lib/domain/saju/ilgan'
import { rateLimitByIp } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/utils/logger'

/**
 * 「3초 일간」 — 비로그인 공개 계산.
 *
 * 저장하지 않는다. 생년월일은 이 함수 안에서 만세력을 한 번 돌리고 버린다(DB·로그 어디에도 안 남긴다).
 * 'use server' export 는 공개 엔드포인트이므로 IP 스로틀만 건다 — 순수 계산이라 비용은 낮지만
 * 봇이 돌리면 만세력 절기 계산이 CPU 를 먹는다.
 */

const THIS_YEAR = new Date().getFullYear()

const Schema = z.object({
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

export type IlganResult =
  | { success: true; slug: IlganSlug; dayPillar: string; timeKnown: boolean }
  | { success: false; error: string }

export async function resolveIlgan(raw: unknown): Promise<IlganResult> {
  const parsed = Schema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? '입력을 확인해 주세요' }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const gate = await rateLimitByIp(ip, 'ilgan', { interval: 60_000, uniqueTokenPerInterval: 30 })
  if (!gate.success) return { success: false, error: '잠시 후 다시 시도해 주세요' }

  const { birthDate, birthTime } = parsed.data
  try {
    const manse = calculateManse(birthDate, birthTime ?? UNKNOWN_TIME_FALLBACK)
    const slug = ilganSlugFromHan(manse.day.ganHan)
    if (!slug) {
      logger.error('[ilgan] 알 수 없는 일간 글자', { ganHan: manse.day.ganHan })
      return { success: false, error: '계산에 실패했어요. 잠시 후 다시 시도해 주세요' }
    }
    return { success: true, slug, dayPillar: manse.day.korean, timeKnown: birthTime !== null }
  } catch (e) {
    // 생년월일은 로그에 남기지 않는다.
    logger.error('[ilgan] 만세력 계산 실패', e instanceof Error ? e.message : String(e))
    return { success: false, error: '계산에 실패했어요. 잠시 후 다시 시도해 주세요' }
  }
}
