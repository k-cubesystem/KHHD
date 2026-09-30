/**
 * 궁합 «현재 대운» — 나이를 서울 달력 연도로 센다(2026-10-01).
 *
 * 전에는 서버(UTC) 달력의 올해라 서울 새해 00~09시에 한 해 전이었다 — 대운이 바뀌는 나이에 걸린 사람은
 * 그 아홉 시간 동안 이전 대운으로 궁합 점수가 나갔다. (풀이 컨텍스트 `context-builder` 는 이미 KST 로 센다.)
 */
import type { SajuContext } from '../context-builder'
import { getCurrentDaeun } from '../compatibility-engine'

const at = (iso: string) => new Date(iso)

/** 1990년생, 대운이 6·16·26·36·46 세에 바뀐다. */
function ctxBorn1990(): SajuContext {
  const daeun = [6, 16, 26, 36, 46].map((age) => ({ age, element: '木', ganji: `대운${age}` }))
  return { personInfo: { birthDate: '1990-05-05' }, analysis: { daeun } } as unknown as SajuContext
}

describe('getCurrentDaeun — 서울 달력 연도', () => {
  it('서울 새해 00:30(UTC 12-31 15:30)에는 이미 2026 — 36세 대운', () => {
    expect(getCurrentDaeun(ctxBorn1990(), at('2026-12-31T15:30:00Z'))?.ganji).toBe('대운36')
  })

  it('서울이 아직 12-31 이면(UTC 12-31 14:30) 2026 — 36세 대운 그대로', () => {
    expect(getCurrentDaeun(ctxBorn1990(), at('2026-12-31T14:30:00Z'))?.ganji).toBe('대운36')
  })

  it('🔴 2025→2026 새해 경계에서 대운이 넘어간다: 서울 00:30 은 36세(대운36), 서울 전날 23:30 은 35세(대운26)', () => {
    expect(getCurrentDaeun(ctxBorn1990(), at('2025-12-31T15:30:00Z'))?.ganji).toBe('대운36')
    expect(getCurrentDaeun(ctxBorn1990(), at('2025-12-31T14:30:00Z'))?.ganji).toBe('대운26')
  })
})
