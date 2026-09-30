/**
 * 삼재 — «지금 적용 중인 세운»은 입춘에 바뀐다(2026-10-01).
 *
 * 전에는 서버 달력의 올해(`new Date().getFullYear()`)로 지지를 셌다: UTC 서버는 서울 새해 00~09시에 한 해 전이었고,
 * 달력이 넘어간 1월 1일~입춘 전에도 이미 새해 삼재로 판정했다.
 * 亥·卯·未생의 삼재는 巳·午·未 해 — 2025 을사(들) · 2026 병오(눌) · 2027 정미(날).
 */
import { calculateSamjae } from '../warnings'

const at = (iso: string) => new Date(iso)

describe('calculateSamjae — 입춘 기준', () => {
  it('입춘 뒤 한참(2026-09-29)은 병오 — 눌삼재', () => {
    expect(calculateSamjae('亥', at('2026-09-29T10:00:00+09:00'))).toMatchObject({
      isActive: true,
      phase: '눌삼재',
      currentYear: 2026,
      samjaeYears: [2025, 2026, 2027],
    })
  })

  it('🔴 달력은 2027 이어도 입춘 전(2027-01-15 서울)이면 아직 병오 — 눌삼재, 날삼재가 아니다', () => {
    expect(calculateSamjae('亥', at('2027-01-15T10:00:00+09:00'))).toMatchObject({
      phase: '눌삼재',
      currentYear: 2026,
    })
  })

  it('서울 새해 00:30(UTC 12-31 15:30)도 입춘 전이라 아직 병오', () => {
    expect(calculateSamjae('亥', at('2026-12-31T15:30:00Z'))).toMatchObject({ phase: '눌삼재', currentYear: 2026 })
  })

  it('입춘 뒤(2027-02-10)에는 정미 — 날삼재', () => {
    expect(calculateSamjae('亥', at('2027-02-10T10:00:00+09:00'))).toMatchObject({
      phase: '날삼재',
      currentYear: 2027,
      samjaeYears: [2025, 2026, 2027],
    })
  })

  it('입춘 분 단위 경계 — 2027-02-04 10:46(KST) 전후로 눌삼재에서 날삼재로 넘어간다', () => {
    expect(calculateSamjae('亥', at('2027-02-04T10:44:00+09:00')).phase).toBe('눌삼재')
    expect(calculateSamjae('亥', at('2027-02-04T10:48:00+09:00')).phase).toBe('날삼재')
  })

  it('삼재가 아닌 해에는 다음 삼재 시작 해를 세운 연도 기준으로 안내한다', () => {
    // 申·子·辰생의 삼재는 寅·卯·辰 해 — 병오(2026)는 아니고, 다음은 2034 갑인.
    const beforeIpchun = calculateSamjae('子', at('2027-01-15T10:00:00+09:00'))
    expect(beforeIpchun.isActive).toBe(false)
    expect(beforeIpchun.currentYear).toBe(2026)
    expect(beforeIpchun.samjaeYears).toEqual([2034, 2035, 2036])
  })
})
