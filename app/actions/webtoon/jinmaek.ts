'use server'

import { getSajuData } from '@/lib/domain/saju/saju'
import { ILGAN, type IlganInfo } from '@/lib/domain/saju/ilgan'
import {
  JINMAEK_SLOTS,
  WU_XING_ORDER,
  balanceComment,
  themeComment,
  validBirthDate,
  type JinmaekReading,
  type WuXing,
} from '@/lib/domain/webtoon/jinmaek'
import { logger } from '@/lib/utils/logger'

/**
 * 간이 진맥 — 비로그인 공개 액션.
 *
 * ⚠️ 여기엔 저장이 없다. 생년월일은 계산에만 쓰고 어디에도 남기지 않는다 — 남기는 순간
 *    이 위젯은 «개인정보 수집 폼»이 되고, 공개 페이지의 가벼움이 죽는다. 기억은
 *    독자 브라우저(localStorage)의 몫이다.
 * ⚠️ 결정론 만세력만 부른다(AI·DB 없음) — 같은 입력이면 같은 답, 호출 비용 0.
 */
export interface JinmaekInput {
  episodeNo: number
  /** 'YYYY-MM-DD' (양력) */
  birthDate: string
  /** 'HH:mm' — 모르면 null */
  birthTime: string | null
}

export interface JinmaekResult {
  success: boolean
  reading?: JinmaekReading
  error?: 'INVALID'
}

function findIlganByHan(han: string): IlganInfo | null {
  for (const info of Object.values(ILGAN)) if (info.han === han) return info
  return null
}

function isWuXing(v: unknown): v is WuXing {
  return typeof v === 'string' && (WU_XING_ORDER as readonly string[]).includes(v)
}

export async function computeJinmaek(input: JinmaekInput): Promise<JinmaekResult> {
  const no = Number(input?.episodeNo)
  const date = String(input?.birthDate ?? '')
  const time = typeof input?.birthTime === 'string' && /^\d{2}:\d{2}$/.test(input.birthTime) ? input.birthTime : null
  if (!Number.isInteger(no) || !validBirthDate(date)) return { success: false, error: 'INVALID' }

  try {
    // 시 모름이면 정오로 계산해 두고, 아래에서 시주 두 글자를 셈에서 뺀다(여섯 글자 진맥).
    const saju = getSajuData(date, time ?? '12:00', true)

    const counts: Record<WuXing, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }
    for (const el of WU_XING_ORDER) counts[el] = saju.elementsDistribution[el] ?? 0
    let total: 6 | 8 = 8
    if (!time) {
      const tg = saju.pillars.time.ganElement
      const tz = saju.pillars.time.zhiElement
      if (isWuXing(tg)) counts[tg] = Math.max(0, counts[tg] - 1)
      if (isWuXing(tz)) counts[tz] = Math.max(0, counts[tz] - 1)
      total = 6
    }

    const ilgan = findIlganByHan(saju.dayMaster)
    const dayMasterLine = ilgan
      ? `일간은 ${ilgan.name}(${ilgan.hanja}) — 「${ilgan.image}」로 읽습니다.`
      : '일간을 읽었습니다.'

    const slot = JINMAEK_SLOTS[no]
    const comment =
      slot?.element != null ? themeComment(slot.element, counts[slot.element], total) : balanceComment(counts, total)

    return { success: true, reading: { counts, total, dayMasterLine, comment } }
  } catch (e) {
    // 존재하지 않는 날짜 등 — 입력 문제로 취급한다(서버 오류 아님)
    logger.warn('[webtoon/jinmaek] 계산 실패(입력 취급):', e)
    return { success: false, error: 'INVALID' }
  }
}
