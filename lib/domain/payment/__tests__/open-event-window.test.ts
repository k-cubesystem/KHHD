import { OPEN_EVENT_END_KST, isOpenEventActive } from '../open-event-window'

/**
 * 오픈 이벤트 폐기 회귀 방지 — 2026-08-12 CEO 지시.
 * 「매일 복채를 준다」가 종료일 없이 되살아나지 못하게, 지금이 종료 상태라는 것부터 못박는다.
 */

const END_MS = new Date(OPEN_EVENT_END_KST).getTime()

describe('오픈 이벤트 — 폐기 상태', () => {
  it('지금은 닫혀 있다', () => {
    expect(isOpenEventActive()).toBe(false)
  })

  it('종료 시각이 과거다 — 종료일 없는 무기한 이벤트가 아니다', () => {
    expect(END_MS).toBeLessThanOrEqual(Date.now())
  })
})

describe('종료 경계 — 되살릴 때도 판정이 한 곳뿐이어야 한다', () => {
  it('종료 시각 1ms 전까지는 열려 있다', () => {
    expect(isOpenEventActive(new Date(END_MS - 1))).toBe(true)
  })

  it('종료 시각 정각부터 닫힌다', () => {
    expect(isOpenEventActive(new Date(END_MS))).toBe(false)
  })

  it('판정은 상수만 본다 — 종료 시각 이전은 열림, 이후는 닫힘', () => {
    const day = 24 * 60 * 60 * 1000
    expect(isOpenEventActive(new Date(END_MS - day))).toBe(true)
    expect(isOpenEventActive(new Date(END_MS + day))).toBe(false)
  })
})
