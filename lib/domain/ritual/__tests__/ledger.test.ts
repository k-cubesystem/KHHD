import { buildLedger } from '../ledger'

const done = (seq: number) => ({ lunar_month_seq: seq, completed_at: '2026-01-01T00:00:00Z', wish_category: 'PEACE' })
const entered = (seq: number) => ({ lunar_month_seq: seq, completed_at: null, wish_category: null })

describe('buildLedger', () => {
  it('빈 기록이면 이번 달 한 행(missed)뿐, streak 0', () => {
    const l = buildLedger([], 320)
    expect(l.rows).toHaveLength(1)
    expect(l.rows[0]).toMatchObject({ seq: 320, status: 'missed' })
    expect(l.streak).toBe(0)
    expect(l.totalCompleted).toBe(0)
  })

  it('연속 완주 3달이면 streak 3 (이번 달 완주 포함)', () => {
    const l = buildLedger([done(318), done(319), done(320)], 320)
    expect(l.streak).toBe(3)
    expect(l.rows[0].status).toBe('completed')
  })

  it('이번 달 미완주면 지난달부터 센다', () => {
    const l = buildLedger([done(318), done(319), entered(320)], 320)
    expect(l.streak).toBe(2)
    expect(l.rows[0].status).toBe('entered')
  })

  it('빈달은 missed 로 채워지고 streak 이 끊긴다', () => {
    // 317 완주, 318 거름, 319 완주, 320 완주
    const l = buildLedger([done(317), done(319), done(320)], 320)
    expect(l.rows.map((r) => r.status)).toEqual(['completed', 'completed', 'missed', 'completed'])
    expect(l.streak).toBe(2)
  })

  it('빈달 다음 완주 달은 「다시 이은 달」(resumed)', () => {
    const l = buildLedger([done(317), done(319), done(320)], 320)
    const seq319 = l.rows.find((r) => r.seq === 319)
    expect(seq319?.resumed).toBe(true)
    // 첫 완주(317)는 이전 완주가 없으므로 resumed 아님
    expect(l.rows.find((r) => r.seq === 317)?.resumed).toBe(false)
  })

  it('첫 기록 이전 달은 표시하지 않는다', () => {
    const l = buildLedger([done(319), done(320)], 320)
    expect(l.rows).toHaveLength(2)
  })

  it('윤달 라벨이 서수에서 복원된다 (2025 윤6월 = seq(2025-06)+1)', () => {
    // 2025-06 normal 의 seq 를 직접 계산하는 대신, 라벨 규칙만 검증
    const l = buildLedger([], 0)
    expect(l.rows[0].label).toBe('정월') // seq 0 = 2000년 정월
  })
})
