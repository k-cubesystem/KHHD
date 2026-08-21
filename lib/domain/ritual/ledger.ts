/**
 * 복 장부(치부책) 파생 계산 — 연속 기록·빈달·재개 표기.
 * 순수 함수: ritual_records 행 배열 + 현재 월 서수 → 표시용 행.
 *
 * 설계 결정 D6: 놓친 달은 「—」(여백, 책망조 금지), 연속 끊긴 뒤 재개한 달은
 * 「다시 이은 달」 긍정 표기. 연속 판정은 seq + 1 비교(T5 — 윤달 안전).
 */
import { monthLabelOfSeq } from './lunar-window'

export interface LedgerSourceRow {
  lunar_month_seq: number
  completed_at: string | null
  wish_category: string | null
}

export interface LedgerRow {
  seq: number
  /** "정월"·"윤유월" */
  label: string
  status: 'completed' | 'entered' | 'missed'
  /** 직전 달이 놓친 달이고 이번 달을 완주 — 「다시 이은 달」 */
  resumed: boolean
  wishCategory: string | null
}

export interface Ledger {
  rows: LedgerRow[]
  /** 현재 서수에서 거꾸로 이어지는 완주 연속 달 수 (이번 달 미완주면 지난달부터 셈) */
  streak: number
  totalCompleted: number
}

/**
 * @param records 유저의 ritual_records (순서 무관)
 * @param currentSeq 이번 달 서수
 * @param limit 표시 행 수 (기본 12 — 첫 기록 이전 달은 표시하지 않는다)
 */
export function buildLedger(records: LedgerSourceRow[], currentSeq: number, limit = 12): Ledger {
  const bySeq = new Map<number, LedgerSourceRow>()
  for (const r of records) bySeq.set(r.lunar_month_seq, r)

  const firstSeq = records.length > 0 ? Math.min(...records.map((r) => r.lunar_month_seq)) : currentSeq
  const rows: LedgerRow[] = []

  for (let seq = currentSeq; seq >= Math.max(firstSeq, currentSeq - limit + 1); seq--) {
    const rec = bySeq.get(seq)
    const status: LedgerRow['status'] = rec ? (rec.completed_at ? 'completed' : 'entered') : 'missed'
    rows.push({
      seq,
      label: monthLabelOfSeq(seq),
      status,
      resumed: false,
      wishCategory: rec?.wish_category ?? null,
    })
  }

  // 재개 표기: 완주 달의 「다음 행」(시간상 직전 달)이 놓친 달이면서 그 이전에 완주 이력이 있을 때
  for (let i = 0; i < rows.length; i++) {
    const cur = rows[i]
    const prev = rows[i + 1] // 시간상 한 달 전
    if (cur.status === 'completed' && prev && prev.status === 'missed') {
      const hadEarlier = rows.slice(i + 2).some((r) => r.status === 'completed')
      if (hadEarlier) cur.resumed = true
    }
  }

  // 연속: currentSeq 부터 아래로. 이번 달이 아직 미완주(entered/missed)면 지난달부터 센다.
  let streak = 0
  let seq = currentSeq
  if (bySeq.get(seq)?.completed_at == null) seq -= 1
  while (bySeq.get(seq)?.completed_at != null) {
    streak += 1
    seq -= 1
  }

  return {
    rows,
    streak,
    totalCompleted: records.filter((r) => r.completed_at != null).length,
  }
}
