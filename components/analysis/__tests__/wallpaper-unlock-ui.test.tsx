/**
 * 복 배경화면 해금 UI — 시트와 하우스 광고.
 *
 * ① **표시광고법** — 광고 슬라이드·시트 문구 어디에도 금지어가 서지 않는다.
 *    멤버십 홍보는 `membership-benefits.ts` 함수 출력만 쓴다(화면에 숫자·주기 직접 쓰기 금지).
 * ② **하루 1장 상한이 화면에도 보이는가** — 오늘 광고를 썼으면 그 버튼이 사라진다.
 * ③ **잠긴 장에만 값이 붙는가** — 열린 장에 결제 버튼이 서면 안 된다.
 */
import { render, screen } from '@testing-library/react'
import { WallpaperAdDialog } from '../wallpaper-ad-dialog'
import { WallpaperGrid } from '../wallpaper-card'
import { membershipBenefitLines } from '@/lib/domain/payment/membership-benefits'
import type { WallpaperStatus } from '@/app/actions/analysis/wallpaper'

jest.mock('@/app/actions/analysis/wallpaper', () => ({
  getWallpaperStatus: jest.fn(async () => null),
  purchaseWallpaper: jest.fn(async () => ({ success: false, error: 'UNAUTHORIZED' })),
  unlockWallpaperByAd: jest.fn(async () => ({ success: false, error: 'UNAUTHORIZED' })),
}))

// jsdom 에 캔버스가 없다 — 축포는 연출이라 끊어도 판정이 흔들리지 않는다.
jest.mock('canvas-confetti', () => ({ __esModule: true, default: jest.fn() }))

/** 금지어 — `membership-benefits.test.ts` 와 같은 표. 화면 쪽에서도 같은 규율을 건다. */
const BANNED = ['매일', '무제한', '평생', '모두 이용', '정액'] as const

const BASE: WallpaperStatus = {
  element: 'water',
  hasSaju: false,
  journeyComplete: false,
  isMember: false,
  unlocks: [],
  adUsedToday: false,
  monthly: null,
  balance: 3,
}

function expectNoBannedClaims(text: string): void {
  for (const word of BANNED) {
    expect(text).not.toContain(word)
  }
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

    expectNoBannedClaims(baseElement.textContent ?? '')
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

describe('시트 — 잠긴 장에만 값과 광고가 붙는다', () => {
  it('무료 사용자: 다섯 장이 잠기고 각각 값과 광고 버튼을 진다', () => {
    render(<WallpaperGrid status={BASE} />)

    expect(screen.getAllByRole('button', { name: /만냥으로 소장/ })).toHaveLength(5)
    expect(screen.getAllByRole('button', { name: '광고 보고 오늘 1장 열기' })).toHaveLength(5)
    // 오행 1만냥 넷 · 이달의 복 2만냥 하나
    expect(screen.getAllByRole('button', { name: '1만냥으로 소장' })).toHaveLength(4)
    expect(screen.getAllByRole('button', { name: '2만냥으로 소장' })).toHaveLength(1)
  })

  it('멤버십이면 전 장이 열리고 결제·광고 버튼이 서지 않는다', () => {
    render(<WallpaperGrid status={{ ...BASE, isMember: true }} />)

    expect(screen.getByText('멤버십 회원 — 모든 배경화면이 열려 있습니다')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /만냥으로 소장/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /배경화면 받기/ })).toHaveLength(6)
  })

  it('🔴 오늘 광고를 썼으면 광고 버튼이 사라진다 (하루 1장)', () => {
    render(<WallpaperGrid status={{ ...BASE, adUsedToday: true }} />)

    expect(screen.queryByRole('button', { name: '광고 보고 오늘 1장 열기' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /만냥으로 소장/ })).toHaveLength(5)
  })

  it('산 장은 열린 채로 서고 다시 팔지 않는다', () => {
    render(<WallpaperGrid status={{ ...BASE, unlocks: [{ wallpaperId: 'element-water', source: 'purchase' }] }} />)

    expect(screen.getByText('소장 완료')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /만냥으로 소장/ })).toHaveLength(4)
  })

  it('🔴 시트 문구에도 금지어가 없다', () => {
    const { baseElement } = render(<WallpaperGrid status={{ ...BASE, isMember: true }} />)

    expectNoBannedClaims(baseElement.textContent ?? '')
  })
})
