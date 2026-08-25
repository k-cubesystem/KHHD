'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Loader2, Crown, Store, Check } from 'lucide-react'
import { membershipBenefitLines } from '@/lib/domain/payment/membership-benefits'

/** 보상까지의 시청 시간(초). 서버는 이 값을 검증하지 못한다 — 방어선은 하루 1장 상한이다. */
export const WALLPAPER_AD_SECONDS = 15

/** 슬라이드 한 장이 서 있는 시간(초) — 두 장이 15초를 반씩 나눠 갖는다. */
const SLIDE_SECONDS = WALLPAPER_AD_SECONDS / 2

/**
 * 하우스 광고 슬라이드 — **외부 광고 SDK 가 아니다.** 우리 상품을 우리가 소개하는 자리다.
 *
 * 🔴 멤버십 문구는 `membership-benefits.ts` 의 함수 출력만 쓴다. 화면에 숫자·주기를 직접
 *    쓰면 플랜을 고칠 때 문구가 어긋나고, 그 어긋남이 곧 표시광고법 문제가 된다.
 */
const SLIDES = [
  {
    key: 'membership',
    icon: Crown,
    title: '해화당 멤버십',
    lines: membershipBenefitLines(null),
  },
  {
    key: 'store',
    icon: Store,
    title: '해화당 상점',
    lines: ['복채 충전 — 풀이·소장에 쓰는 단일 통화', '신당 — 신위 모시기·테마 꾸미기', '신물 — 향로·초롱·복부적'],
  },
] as const

interface WallpaperAdDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 광고를 끝까지 본 뒤 「보상 받기」를 누르면 호출된다. */
  onReward: () => void
  /** 보상 처리 중(서버 왕복) — 버튼을 잠근다. */
  pending?: boolean
  /** 열릴 장의 이름 — 무엇이 열리는지 보이게 한다. */
  targetTitle: string
}

/**
 * 15초 하우스 광고 — 카운트다운이 끝나야 「보상 받기」가 열린다.
 *
 * 시청 사실은 클라이언트의 정직 신고다(서버가 검증할 방법이 없다). 그래서 이 화면은
 * 「속일 수 없게」 만드는 물건이 아니라 「보통 사용자가 15초를 실제로 보게」 하는 물건이고,
 * 실질 방어선은 서버가 KST 로 강제하는 **하루 1장 상한**이다.
 */
export function WallpaperAdDialog({ open, onOpenChange, onReward, pending, targetTitle }: WallpaperAdDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* 🔴 본문만 스크롤 — grid 를 flex flex-col 로 바꿔야 줄어든다(2026-08-25). */}
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden border-gold-500/25 bg-surface p-0 sm:max-w-md">
        <DialogTitle className="sr-only">광고 보고 배경화면 열기</DialogTitle>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
          {/* 열릴 때만 마운트한다 — 카운트다운을 «되돌리는» 코드를 없애려는 것이다.
              효과 안에서 상태를 되돌리면 연쇄 렌더가 되고, 닫았다 연 광고가 반쯤 지난 채로 설 여지도 남는다. */}
          {open && <AdBody onReward={onReward} pending={pending} targetTitle={targetTitle} />}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** 카운트다운 본문 — 매번 새로 마운트되므로 15초는 언제나 처음부터 센다. */
function AdBody({ onReward, pending, targetTitle }: Omit<WallpaperAdDialogProps, 'open' | 'onOpenChange'>) {
  const [remaining, setRemaining] = useState(WALLPAPER_AD_SECONDS)

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining((r) => (r <= 1 ? 0 : r - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const elapsed = WALLPAPER_AD_SECONDS - remaining
  const slide = SLIDES[Math.min(Math.floor(elapsed / SLIDE_SECONDS), SLIDES.length - 1)] ?? SLIDES[0]
  const done = remaining === 0
  const Icon = slide.icon

  return (
    <>
      <div className="flex items-center justify-between">
        <span className="rounded border border-gold-500/30 px-1.5 py-0.5 font-serif text-[10px] text-gold-500/80">
          해화당 안내
        </span>
        <span aria-live="polite" className="font-serif text-[11px] text-ink-light/60">
          {done ? '다 보셨습니다' : `${remaining}초 후 받을 수 있습니다`}
        </span>
      </div>

      {/* 진행 막대 — 남은 시간을 눈으로 잡아준다. */}
      <div aria-hidden className="h-0.5 w-full overflow-hidden rounded bg-white/10">
        <div
          className="h-full bg-gold-500/70 transition-[width] duration-1000 ease-linear"
          style={{ width: `${(elapsed / WALLPAPER_AD_SECONDS) * 100}%` }}
        />
      </div>

      <div className="rounded-xl border border-gold-500/20 bg-black/30 p-5">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 shrink-0 text-gold-500" />
          <h3 className="font-serif text-[16px] font-bold text-gold-500">{slide.title}</h3>
        </div>
        <ul className="mt-3 space-y-2">
          {slide.lines.map((line) => (
            <li
              key={line}
              className="flex items-start gap-1.5 text-[12px] font-light leading-relaxed text-ink-light/75"
              style={{ wordBreak: 'keep-all' }}
            >
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-gold-500/70" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center text-[11px] font-light text-ink-light/55" style={{ wordBreak: 'keep-all' }}>
        끝까지 보시면 「{targetTitle}」 한 장이 오늘 열립니다.
      </p>

      <button
        type="button"
        onClick={onReward}
        disabled={!done || pending}
        className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-gold-500 font-serif text-[14px] font-bold text-[#0A0A08] transition-colors hover:bg-[#c9a62e] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-ink-light/45"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {done ? '보상 받기' : `보상 받기 (${remaining})`}
      </button>
    </>
  )
}
