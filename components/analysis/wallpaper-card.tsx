'use client'

import { useEffect, useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Lock, Download, ChevronRight, Coins, Play, Loader2, Crown } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { IconBokjumeoni } from '@/components/icons/traditional-icons'
import { InsufficientBokchaeModal } from '@/components/payment/insufficient-bokchae-modal'
import { useInsufficientBokchae } from '@/hooks/use-insufficient-bokchae'
import { WallpaperAdDialog } from '@/components/analysis/wallpaper-ad-dialog'
import {
  WALLPAPER_ACCESS_LABEL,
  buildWallpaperDisplaySet,
  isMyElement,
  orderWallpapersByElement,
  resolveWallpaperAccess,
  wallpaperPrice,
  type WallpaperDisplayItem,
} from '@/lib/domain/analysis/wallpaper'
import {
  getWallpaperStatus,
  purchaseWallpaper,
  unlockWallpaperByAd,
  type WallpaperStatus,
} from '@/app/actions/analysis/wallpaper'
import { GA } from '@/lib/analytics/ga4'

const CARD_TITLE = '복 배경화면'
const CARD_SUBTITLE = '매일 보는 잠금화면에 복을 담아드립니다'

/** 멤버십이면 여섯 장이 전부 열린다 — 시트 맨 위 한 줄. */
const MEMBER_BANNER = '멤버십 회원 — 모든 배경화면이 열려 있습니다'

/** 비단 진홍 팔레트 — 복주머니 카드(journey-card)와 같은 계보. 테마 리스트의 먹빛과 구별된다. */
const BOK_BG = 'linear-gradient(165deg, #170C0E 0%, #241014 45%, #120909 100%)'

/** 서버 오류 코드 → 사용자 문구. 코드가 그대로 새어나가지 않게 여기서 전부 받는다. */
const UNLOCK_ERROR_COPY: Record<string, string> = {
  UNAUTHORIZED: '로그인이 필요합니다.',
  NOT_FOUND: '없는 배경화면입니다.',
  ALREADY_UNLOCKED: '이미 열려 있는 배경화면입니다.',
  AD_LIMIT: '오늘은 이미 한 장을 여셨습니다. 내일 다시 열 수 있습니다.',
  PAYMENT_FAILED: '결제에 실패했습니다. 잠시 후 다시 시도해주세요.',
  GRANT_FAILED: '열기에 실패했습니다. 복채는 돌려드렸습니다.',
}

/**
 * 복 배경화면 카드 — 허브 인기테마 섹션 맨 아래에 앉는다.
 * 스스로 자격(getWallpaperStatus)을 조회한다(자가 조회 배너 패턴 — 복주머니 카드와 동일).
 * 비로그인이면 액션이 null 을 주고 카드는 렌더되지 않는다.
 */
export function WallpaperCard() {
  const [status, setStatus] = useState<WallpaperStatus | null>(null)

  useEffect(() => {
    let active = true
    getWallpaperStatus().then((s) => {
      if (active) setStatus(s)
    })
    return () => {
      active = false
    }
  }, [])

  if (!status) return null
  return <WallpaperCardView status={status} />
}

/**
 * 카드의 표현부 — 자격을 «받아서» 그리기만 한다(조회 없음).
 * 조회(WallpaperCard)와 가른 이유: 화면 상태(잠김·열림·멤버십·광고 사용됨)를 자격 값만 바꿔
 * 세울 수 있어야 목 데이터로 눈으로 확인할 수 있고, 렌더 테스트도 서버 액션 없이 선다.
 */
export function WallpaperCardView({ status }: { status: WallpaperStatus }) {
  const [open, setOpen] = useState(false)
  const display = buildWallpaperDisplaySet(status.monthly)
  const preview = orderWallpapersByElement(display, status.element).slice(0, 3)

  const openSheet = () => {
    GA.wallpaperView()
    setOpen(true)
  }

  return (
    <>
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={openSheet}
        aria-label={`${CARD_TITLE} — ${CARD_SUBTITLE}`}
        className="hanji-card group relative block w-full overflow-hidden rounded-xl border border-gold-500/25 p-4 text-left transition-colors hover:border-gold-500/45 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/60"
        style={{ background: BOK_BG }}
      >
        {/* 금실 상단 라인 */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-500/60 to-transparent"
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <IconBokjumeoni className="h-4 w-4 shrink-0 text-gold-500" />
              <h3 className="font-serif text-[15px] font-bold text-gold-500">{CARD_TITLE}</h3>
            </div>
            <p
              className="mt-1 text-[11px] font-light leading-relaxed text-ink-light/60"
              style={{ wordBreak: 'keep-all' }}
            >
              {CARD_SUBTITLE}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-gold-500/70 transition-transform group-hover:translate-x-0.5" />
        </div>

        {/* 썸네일 3장 — 9:16 세로 비율 그대로. 내 오행 장이 맨 앞에 온다. */}
        <div className="relative z-10 mt-3 grid grid-cols-3 gap-2">
          {preview.map((item) => (
            <PreviewTile key={item.id} item={item} status={status} />
          ))}
        </div>
      </motion.button>

      <WallpaperSheet open={open} onOpenChange={setOpen} status={status} />
    </>
  )
}

function PreviewTile({ item, status }: { item: WallpaperDisplayItem; status: WallpaperStatus }) {
  const { unlocked } = resolveWallpaperAccess(item, status)
  const mine = isMyElement(item, status.element)

  return (
    <div className="relative aspect-[9/16] overflow-hidden rounded-lg border border-white/[0.06]">
      <img
        src={item.href}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className={`h-full w-full object-cover ${unlocked ? '' : 'blur-[2px] brightness-50'}`}
      />
      {!unlocked && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Lock className="h-3.5 w-3.5 text-white/70" />
        </span>
      )}
      {mine && (
        <span className="absolute inset-x-1 bottom-1 rounded bg-black/70 px-1 py-0.5 text-center font-serif text-[9px] leading-none text-gold-500">
          내 오행
        </span>
      )}
    </div>
  )
}

function WallpaperSheet({
  open,
  onOpenChange,
  status,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  status: WallpaperStatus
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto border-gold-500/25 bg-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-gold-500">{CARD_TITLE}</DialogTitle>
        </DialogHeader>

        <p className="-mt-1 text-[12px] font-light text-ink-light/60" style={{ wordBreak: 'keep-all' }}>
          마음에 드는 그림을 눌러 받아, 잠금화면으로 지정해 보세요.
        </p>

        <WallpaperGrid status={status} />
      </DialogContent>
    </Dialog>
  )
}

/**
 * 여섯 장 그리드 — 시트 본문. 열림(받기) · 잠김(소장·광고)으로 선다.
 *
 * 해금 결과는 **낙관적으로** 반영한다(서버가 성공을 돌려준 뒤 그 자리에서 상태를 얹는다) —
 * 시트를 닫았다 열지 않아도 방금 연 장이 바로 열린 모습으로 바뀐다.
 */
export function WallpaperGrid({ status }: { status: WallpaperStatus }) {
  const [access, setAccess] = useState<WallpaperStatus>(status)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [adTarget, setAdTarget] = useState<WallpaperDisplayItem | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const { bokchaeModal, showBokchaeModal, closeBokchaeModal } = useInsufficientBokchae()

  const display = buildWallpaperDisplaySet(access.monthly)

  const celebrate = () => {
    startTransition(() => {
      confetti({ particleCount: 70, spread: 65, origin: { y: 0.65 }, colors: ['#C9A84C', '#E8D5A0', '#F2E3B3'] })
    })
  }

  const applyUnlock = (wallpaperId: string, source: 'purchase' | 'ad', newBalance?: number) => {
    setAccess((prev) => ({
      ...prev,
      unlocks: [...prev.unlocks, { wallpaperId, source }],
      adUsedToday: source === 'ad' ? true : prev.adUsedToday,
      balance: typeof newBalance === 'number' ? newBalance : prev.balance,
    }))
    celebrate()
  }

  const onPurchase = async (item: WallpaperDisplayItem) => {
    setErrorMsg(null)
    setPendingId(item.id)
    try {
      const res = await purchaseWallpaper(item.id)
      if (res.success) {
        GA.wallpaperPurchase(item.id)
        applyUnlock(item.id, 'purchase', res.newBalance)
        return
      }
      if (res.error === 'INSUFFICIENT_BOKCHAE') {
        showBokchaeModal({
          currentBalance: res.balance ?? access.balance,
          requiredAmount: res.price ?? wallpaperPrice(item),
          featureLabel: `${item.title} 배경화면`,
        })
        return
      }
      setErrorMsg(UNLOCK_ERROR_COPY[res.error ?? ''] ?? '소장에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setPendingId(null)
    }
  }

  const onAdReward = async () => {
    const item = adTarget
    if (!item) return
    setErrorMsg(null)
    setPendingId(item.id)
    try {
      const res = await unlockWallpaperByAd(item.id)
      if (res.success) {
        GA.wallpaperAdUnlock(item.id)
        setAdTarget(null)
        applyUnlock(item.id, 'ad')
        return
      }
      setAdTarget(null)
      setErrorMsg(UNLOCK_ERROR_COPY[res.error ?? ''] ?? '열기에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setPendingId(null)
    }
  }

  const openAd = (item: WallpaperDisplayItem) => {
    GA.wallpaperAdView(item.id)
    setErrorMsg(null)
    setAdTarget(item)
  }

  return (
    <>
      {access.isMember && (
        <p className="flex items-center gap-1.5 rounded-lg border border-gold-500/25 bg-gold-500/[0.07] px-3 py-2 font-serif text-[12px] text-gold-500">
          <Crown className="h-3.5 w-3.5 shrink-0" />
          {MEMBER_BANNER}
        </p>
      )}

      {errorMsg && (
        <p role="alert" className="text-[11px] font-light text-red-300/85" style={{ wordBreak: 'keep-all' }}>
          {errorMsg}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {display.map((item) => (
          <SheetTile
            key={item.id}
            item={item}
            access={access}
            pending={pendingId === item.id}
            onPurchase={() => onPurchase(item)}
            onAd={() => openAd(item)}
          />
        ))}
      </div>

      <WallpaperAdDialog
        open={adTarget !== null}
        onOpenChange={(v) => !v && setAdTarget(null)}
        onReward={onAdReward}
        pending={pendingId !== null}
        targetTitle={adTarget?.title ?? ''}
      />

      <InsufficientBokchaeModal {...bokchaeModal} onClose={closeBokchaeModal} />
    </>
  )
}

function SheetTile({
  item,
  access,
  pending,
  onPurchase,
  onAd,
}: {
  item: WallpaperDisplayItem
  access: WallpaperStatus
  pending: boolean
  onPurchase: () => void
  onAd: () => void
}) {
  const { unlocked, via, reason } = resolveWallpaperAccess(item, access)
  const mine = isMyElement(item, access.element)
  const price = wallpaperPrice(item)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative aspect-[9/16] overflow-hidden rounded-lg border border-white/10">
        <img
          src={item.href}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className={`h-full w-full object-cover ${unlocked ? '' : 'blur-[3px] brightness-[0.35]'}`}
        />

        {mine && (
          <span className="absolute left-1.5 top-1.5 rounded bg-gold-500 px-1.5 py-0.5 font-serif text-[9px] font-bold leading-none text-[#0A0A08]">
            내 오행
          </span>
        )}

        {unlocked ? (
          // 같은 출처면 download 속성이 그대로 저장으로 동작하고, Storage(교차 출처)는
          // downloadHref 가 `?download` 를 달아 Content-Disposition 을 받아온다.
          <a
            href={item.downloadHref}
            download
            onClick={() => GA.wallpaperDownload(item.id)}
            aria-label={`${item.title} 배경화면 받기`}
            className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/70 py-1.5 font-serif text-[11px] text-gold-500 transition-colors hover:bg-black/85 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/60"
          >
            <Download className="h-3 w-3" />
            받기
          </a>
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-2 text-center">
            <Lock className="h-4 w-4 text-white/70" />
            <span className="text-[10px] font-light leading-tight text-white/75" style={{ wordBreak: 'keep-all' }}>
              {reason}
            </span>
          </span>
        )}
      </div>

      <div className="px-0.5">
        <p className="font-serif text-[12px] font-bold text-ink-light">{item.title}</p>
        <p className="text-[10px] font-light leading-tight text-ink-light/55" style={{ wordBreak: 'keep-all' }}>
          {item.subtitle}
        </p>
      </div>

      {unlocked
        ? via && (
            <span className="px-0.5 font-serif text-[10px] leading-none text-gold-500/70">
              {WALLPAPER_ACCESS_LABEL[via]}
            </span>
          )
        : null}

      {!unlocked && (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={onPurchase}
            disabled={pending}
            className="flex h-8 items-center justify-center gap-1 rounded-lg border border-gold-500/45 bg-gold-500/10 font-serif text-[11px] font-bold text-gold-500 transition-colors hover:bg-gold-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Coins className="h-3 w-3" />}
            {price}만냥으로 소장
          </button>

          {!access.adUsedToday && (
            <button
              type="button"
              onClick={onAd}
              disabled={pending}
              className="flex h-8 items-center justify-center gap-1 rounded-lg border border-white/15 font-serif text-[10px] text-ink-light/70 transition-colors hover:border-white/30 hover:text-ink-light disabled:cursor-not-allowed disabled:opacity-50"
              style={{ wordBreak: 'keep-all' }}
            >
              <Play className="h-2.5 w-2.5" />
              광고 보고 오늘 1장 열기
            </button>
          )}
        </div>
      )}
    </div>
  )
}
