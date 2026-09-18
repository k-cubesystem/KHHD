/**
 * 복 배경화면 해금 UI — 시트와 하우스 광고.
 *
 * ① **표시광고법** — 광고 슬라이드·시트 문구 어디에도 금지어가 서지 않는다.
 *    멤버십 홍보는 `membership-benefits.ts` 함수 출력만 쓴다(화면에 숫자·주기 직접 쓰기 금지).
 * ② **하루 1장 상한이 화면에도 보이는가** — 오늘 광고를 썼으면 그 버튼이 사라진다.
 * ③ **값을 받는 버튼이 없는가** — 2026-09-18 구매 경로 폐지. 잠긴 장의 손잡이는 광고·멤버십뿐이다.
 */
import { act, fireEvent, render, screen } from '@testing-library/react'
import { WallpaperAdDialog, WALLPAPER_AD_SECONDS } from '../wallpaper-ad-dialog'
import { WallpaperCardView, WallpaperGrid } from '../wallpaper-card'
import { membershipBenefitLines } from '@/lib/domain/payment/membership-benefits'
import { findBannedPassTerms } from '@/lib/domain/entitlement/pass'
import type { WallpaperStatus } from '@/app/actions/analysis/wallpaper'

jest.mock('@/app/actions/analysis/wallpaper', () => ({
  getWallpaperStatus: jest.fn(async () => null),
  unlockWallpaperByAd: jest.fn(async () => ({ success: false, error: 'UNAUTHORIZED' })),
}))

// jsdom 에 캔버스가 없다 — 축포는 연출이라 끊어도 판정이 흔들리지 않는다.
jest.mock('canvas-confetti', () => ({ __esModule: true, default: jest.fn() }))

/** 금지어 — `membership-benefits.test.ts` 와 같은 표. 화면 쪽에서도 같은 규율을 건다. */
const BANNED = ['매일', '무제한', '평생', '모두 이용', '정액'] as const

const AD_LABEL = '광고 보고 오늘 1장 열기'

const BASE: WallpaperStatus = {
  element: 'water',
  hasSaju: false,
  journeyComplete: false,
  isMember: false,
  unlocks: [],
  adUsedToday: false,
  monthly: null,
  premiumUrls: {},
}

function expectNoBannedClaims(text: string): void {
  for (const word of BANNED) {
    expect(text).not.toContain(word)
  }
  expect(findBannedPassTerms(text)).toEqual([])
}

describe('하우스 광고 — 우리 상품을 우리가 소개한다(외부 광고 SDK 아님)', () => {
  it('멤버십 문구는 단일 출처 함수의 출력을 그대로 쓴다', () => {
    render(<WallpaperAdDialog open onOpenChange={() => {}} onReward={() => {}} targetTitle="물" />)

    for (const line of membershipBenefitLines(null)) {
      expect(screen.getByText(line)).toBeInTheDocument()
    }
  })

  it('🔴 슬라이드 어디에도 금지어가 없다', () => {
    const { baseElement } = render(
      <WallpaperAdDialog open onOpenChange={() => {}} onReward={() => {}} targetTitle="물" />
    )

    for (const word of BANNED) expect(baseElement.textContent ?? '').not.toContain(word)
  })

  it('🔴 상점 슬라이드는 이용권으로 소개한다 — «단일 통화»·잔액형 표현이 없다', () => {
    jest.useFakeTimers()
    try {
      const { baseElement } = render(
        <WallpaperAdDialog open onOpenChange={() => {}} onReward={() => {}} targetTitle="물" />
      )
      act(() => {
        jest.advanceTimersByTime(WALLPAPER_AD_SECONDS * 1000)
      })

      expect(screen.getByText('해화당 상점')).toBeInTheDocument()
      expect(screen.getByText(/^이용권 — 풀이 한 번에 \d+장 · 유효기간 \d+일$/)).toBeInTheDocument()
      expectNoBannedClaims(baseElement.textContent ?? '')
    } finally {
      jest.useRealTimers()
    }
  })

  it('시청이 끝나기 전에는 보상 버튼이 잠겨 있다', () => {
    render(<WallpaperAdDialog open onOpenChange={() => {}} onReward={() => {}} targetTitle="물" />)

    expect(screen.getByRole('button', { name: /보상 받기/ })).toBeDisabled()
    expect(screen.getByText('15초 후 받을 수 있습니다')).toBeInTheDocument()
  })

  it('무엇이 열리는지 이름으로 밝힌다', () => {
    render(<WallpaperAdDialog open onOpenChange={() => {}} onReward={() => {}} targetTitle="이달의 복 (9월)" />)

    expect(screen.getByText(/이달의 복 \(9월\)/)).toBeInTheDocument()
  })
})

describe('닫기 X — 본문과 함께 스크롤돼 사라지지 않는다', () => {
  /**
   * 🔴 종전에는 `DialogContent` 자체가 `overflow-y-auto` 였다. X 는 다이얼로그 기준 absolute 라
   * 본문과 함께 밀려 올라갔고, 세트가 23장으로 길어지자 «맨 위까지 되올라와야 닫히는» 상태가
   * 됐다(CEO 제보 2026-08-25). 겉은 스크롤하지 않고 **안쪽 본문만** 스크롤해야 한다.
   */
  it('겉(DialogContent)은 스크롤하지 않고, 안쪽 본문이 스크롤을 진다', () => {
    const { baseElement } = render(<WallpaperCardView status={BASE} />)

    fireEvent.click(screen.getByRole('button', { name: /복 배경화면/ }))

    const content = baseElement.querySelector('[data-slot="dialog-content"]')
    if (!content) throw new Error('다이얼로그가 열리지 않았다')

    expect(content.className).toContain('overflow-hidden')
    expect(content.className).not.toContain('overflow-y-auto')
    // 🔴 겉이 flex-col 이어야 본문이 줄어든다. DialogContent 기본은 `grid` 이고, grid 트랙은
    //    자식의 min-h-0 만으로는 안 줄어들어 «스크롤 자체가 죽는다»(1차 수정의 실패 원인).
    expect(content.className).toContain('flex')
    expect(content.className).toContain('flex-col')
    // 스크롤을 지는 본문 — flex-1 과 min-h-0 이 둘 다 있어야 실제로 줄어든다
    const scroller = content.querySelector('.overflow-y-auto')
    expect(scroller).not.toBeNull()
    expect(scroller?.className).toContain('min-h-0')
    expect(scroller?.className).toContain('flex-1')
    // 닫기 X 는 스크롤 영역 «밖»에 있어야 제자리에 선다
    const close = baseElement.querySelector('[data-slot="dialog-close"]')
    expect(close).not.toBeNull()
    expect(scroller?.contains(close!)).toBe(false)
  })
})

describe('시트 — 무료 여섯 장 + 「채운」 17장, 값을 받는 버튼은 없다 (2026-09-18)', () => {
  it('자격이 없어도 무료 여섯 장은 전부 열리고, 광고 버튼은 잠긴 프리미엄 17장에만 선다', () => {
    render(<WallpaperGrid status={BASE} />)

    expect(screen.getAllByRole('link', { name: /배경화면 받기/ })).toHaveLength(6)
    expect(screen.getAllByRole('button', { name: AD_LABEL })).toHaveLength(17)
  })

  it('🔴 소장·팩 구매 버튼이 어디에도 없다', () => {
    const { baseElement } = render(<WallpaperGrid status={BASE} />)

    expect(screen.queryByRole('button', { name: /소장/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /만냥/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /채운 전체 17장/ })).not.toBeInTheDocument()
    expect(baseElement.textContent ?? '').not.toMatch(/\d+만냥/)
  })

  it('오늘 광고를 썼으면 광고 버튼이 사라지고 «내일 다시»를 알린다', () => {
    render(<WallpaperGrid status={{ ...BASE, adUsedToday: true }} />)

    expect(screen.queryByRole('button', { name: AD_LABEL })).not.toBeInTheDocument()
    expect(screen.getAllByText('오늘 광고 한 장을 여셨어요 · 내일 다시')).toHaveLength(17)
    expect(screen.getAllByRole('link', { name: /배경화면 받기/ })).toHaveLength(6)
  })

  it('멤버십이면 전 장이 열리고 광고 버튼·멤버십 유도가 서지 않는다', () => {
    render(<WallpaperGrid status={{ ...BASE, isMember: true }} />)

    expect(screen.getByText('멤버십 회원 — 모든 배경화면이 열려 있습니다')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: AD_LABEL })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /멤버십이면/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /배경화면 받기/ })).toHaveLength(6)
  })

  it('예전에 소장한 장은 그대로 열려 있다 — 산 것은 사라지지 않는다', () => {
    render(<WallpaperGrid status={{ ...BASE, unlocks: [{ wallpaperId: 'jae-koi', source: 'purchase' }] }} />)

    // 잠긴 장은 16장 — 소장 기록이 있는 한 장은 광고 버튼을 지지 않는다
    expect(screen.getAllByRole('button', { name: AD_LABEL })).toHaveLength(16)
    expect(screen.getByText('소장 완료')).toBeInTheDocument()
  })

  it('「채운」 섹션 — 비회원은 잠긴 17장 + 멤버십 유도가 선다', () => {
    render(<WallpaperGrid status={BASE} />)

    expect(screen.getByText(/채운\(彩運\)/)).toBeInTheDocument()
    // 멤버십이 제1 유도 — 상점 멤버십 탭으로 간다
    expect(screen.getByRole('link', { name: /멤버십이면 열일곱 장이 전부 열립니다/ })).toHaveAttribute(
      'href',
      '/protected/store?tab=membership'
    )
  })

  it('「채운」 — 용신이 물이면 달빛 물결에만 «내게 필요한 기운» 배지가 붙는다', () => {
    render(<WallpaperGrid status={BASE} />)

    expect(screen.getAllByText('내게 필요한 기운')).toHaveLength(1)
  })

  it('🔴 확정된 용신 선물이 있으면 용신이 바뀌어도 두 번째 선물을 열린 것처럼 그리지 않는다', () => {
    // 선물 행은 물(gi-water)인데 지금 용신은 불 — 불 장이 «열림(여는 중)»으로 서면 안 된다
    render(
      <WallpaperGrid
        status={{
          ...BASE,
          element: 'fire',
          hasSaju: true,
          unlocks: [{ wallpaperId: 'gi-water', source: 'saju' }],
        }}
      />
    )

    expect(screen.getAllByText('사주 풀이 선물')).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: AD_LABEL })).toHaveLength(16)
  })

  it('🔴 시트 문구에도 금지어가 없다', () => {
    const { baseElement } = render(<WallpaperGrid status={BASE} />)

    expectNoBannedClaims(baseElement.textContent ?? '')
  })
})
