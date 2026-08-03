import {
  RITUAL_TRANSITION_TIMEOUT_MS,
  canRunViewTransition,
  shouldInterceptNavigation,
  type NavClickLike,
} from '../view-transition'

const plainClick: NavClickLike = {
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  defaultPrevented: false,
}

describe('의례 전환 — 가로채도 되는 클릭만 가로챈다', () => {
  it('평범한 왼쪽 클릭은 가로챈다', () => {
    expect(shouldInterceptNavigation(plainClick)).toBe(true)
  })

  it('★ 보조키가 눌린 클릭은 브라우저 것이다 — 새 탭·새 창·다운로드를 뺏지 않는다', () => {
    for (const key of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey'] as const) {
      expect(shouldInterceptNavigation({ ...plainClick, [key]: true })).toBe(false)
    }
  })

  it('★ 가운데·오른쪽 클릭은 가로채지 않는다 (가운데클릭 = 새 탭)', () => {
    expect(shouldInterceptNavigation({ ...plainClick, button: 1 })).toBe(false)
    expect(shouldInterceptNavigation({ ...plainClick, button: 2 })).toBe(false)
  })

  it('이미 누가 막은 클릭은 건드리지 않는다', () => {
    expect(shouldInterceptNavigation({ ...plainClick, defaultPrevented: true })).toBe(false)
  })
})

describe('의례 전환 — 돌릴 자리인지 판정', () => {
  it('API 가 있고 감속 선호가 아니면 돌린다', () => {
    expect(canRunViewTransition({ hasApi: true, prefersReducedMotion: false })).toBe(true)
  })

  it('★ API 가 없으면 안 돌린다 — 폴백은 즉시 이동이라 깨지는 자리가 없다', () => {
    expect(canRunViewTransition({ hasApi: false, prefersReducedMotion: false })).toBe(false)
  })

  it('★ 감속을 선호하면 안 돌린다 — 멀미는 취향이 아니라 증상이다', () => {
    expect(canRunViewTransition({ hasApi: true, prefersReducedMotion: true })).toBe(false)
    expect(canRunViewTransition({ hasApi: false, prefersReducedMotion: true })).toBe(false)
  })
})

describe('의례 전환 — 얼어붙지 않게 하는 시한', () => {
  it('★ 시한이 반드시 있다 — 없으면 이동 실패에 화면이 스냅샷째로 굳는다', () => {
    expect(Number.isFinite(RITUAL_TRANSITION_TIMEOUT_MS)).toBe(true)
    expect(RITUAL_TRANSITION_TIMEOUT_MS).toBeGreaterThan(0)
  })

  it('사람이 "멈췄다"고 느끼기 전에 놓아 준다 (2초 이내)', () => {
    expect(RITUAL_TRANSITION_TIMEOUT_MS).toBeLessThanOrEqual(2000)
    // 너무 짧으면 정상 이동 중에 전환이 잘린다
    expect(RITUAL_TRANSITION_TIMEOUT_MS).toBeGreaterThanOrEqual(600)
  })
})
