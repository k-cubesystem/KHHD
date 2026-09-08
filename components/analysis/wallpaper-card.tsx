'use client'

import { useEffect, useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import Link from 'next/link'
import { Lock, Download, ChevronRight, Coins, Play, Loader2, Crown, Sparkles } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { IconBokjumeoni } from '@/components/icons/traditional-icons'
import { InsufficientBokchaeModal } from '@/components/payment/insufficient-bokchae-modal'
import { useInsufficientBokchae } from '@/hooks/use-insufficient-bokchae'
import { WallpaperAdDialog } from '@/components/analysis/wallpaper-ad-dialog'
import {
  PREMIUM_CATEGORY_META,
  PREMIUM_CATEGORY_ORDER,
  WALLPAPER_ACCESS_LABEL,
  WALLPAPER_PACKS,
  buildPremiumDisplaySet,
  buildWallpaperDisplaySet,
  isMyElement,
  orderWallpapersByElement,
  resolveWallpaperAccess,
  wallpaperPrice,
  type PremiumDisplayItem,
  type WallpaperAccess,
  type WallpaperDisplayItem,
  type WallpaperPack,
} from '@/lib/domain/analysis/wallpaper'
import {
  getWallpaperStatus,
  purchaseWallpaper,
  purchaseWallpaperPack,
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
      {/* 🔴 머리글은 고정, **본문만** 스크롤한다.
          ① 종전에는 DialogContent 자체가 overflow-y-auto 였다 — 닫기 X 는 다이얼로그 기준
             absolute 라 본문과 함께 밀려 올라갔고, 세트가 23장이 되자 «맨 위까지 되올라와야
             닫히는» 상태가 됐다(CEO 제보 2026-08-25).
          ② 1차 수정에서 겉을 overflow-hidden 으로만 바꿨더니 **스크롤 자체가 죽었다** —
             DialogContent 는 `grid` 라 행이 내용 크기로 잡히고, 자식의 min-h-0 만으로는
             트랙이 줄지 않는다. 그래서 여기서 `flex flex-col` 로 바꿔 잡는다.
          🔴 본문에는 flex-1 + min-h-0 이 둘 다 있어야 한다(하나만으로는 안 줄어든다). */}
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden border-gold-500/25 bg-surface p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-3">
          <DialogTitle className="font-serif text-gold-500">{CARD_TITLE}</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pb-6">
          <p className="text-[12px] font-light text-ink-light/60" style={{ wordBreak: 'keep-all' }}>
            마음에 드는 그림을 눌러 받아, 잠금화면으로 지정해 보세요.
          </p>

          <WallpaperGrid status={status} />
        </div>
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
    // 프리미엄 원본은 서명 URL 로만 나간다 — 방금 산 장의 URL 은 서버 재조회로만 온다.
    // 낙관 갱신(위)이 «열림» 표시를 먼저 세우고, 재조회가 「받기」 링크를 잇는다.
    void getWallpaperStatus().then((s) => {
      if (s) setAccess(s)
    })
  }

  const onPack = async (pack: WallpaperPack) => {
    setErrorMsg(null)
    setPendingId(pack.id)
    try {
      const res = await purchaseWallpaperPack(pack.id)
      if (res.success) {
        GA.wallpaperPurchase(pack.id)
        setAccess((prev) => ({
          ...prev,
          unlocks: [
            ...prev.unlocks,
            ...pack.itemIds
              .filter((id) => !prev.unlocks.some((u) => u.wallpaperId === id))
              .map((id) => ({ wallpaperId: id, source: 'purchase' as const })),
          ],
          balance: typeof res.newBalance === 'number' ? res.newBalance : prev.balance,
        }))
        celebrate()
        void getWallpaperStatus().then((s) => {
          if (s) setAccess(s)
        })
        return
      }
      if (res.error === 'INSUFFICIENT_BOKCHAE') {
        showBokchaeModal({
          currentBalance: res.balance ?? access.balance,
          requiredAmount: res.price ?? pack.price,
          featureLabel: pack.title,
        })
        return
      }
      setErrorMsg(UNLOCK_ERROR_COPY[res.error ?? ''] ?? '소장에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setPendingId(null)
    }
  }

  const onPurchase = async (item: Pick<WallpaperDisplayItem, 'id' | 'title' | 'subtitle' | 'lock' | 'element'>) => {
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
        <p role="alert" className="text-[11px] font-light text-error-text/85" style={{ wordBreak: 'keep-all' }}>
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

      <PremiumSection access={access} pendingId={pendingId} onPurchase={(item) => onPurchase(item)} onPack={onPack} />

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

/** onPurchase 가 받는 최소 모양 — SheetTile 의 display 형과 프리미엄 형이 함께 통과한다. */
type PurchasableItem = Pick<WallpaperDisplayItem, 'id' | 'title' | 'subtitle' | 'lock' | 'element'>

/**
 * 「채운(彩運)」 — 프리미엄 17장 섹션. 무료 여섯 장 아래에 선다.
 *
 * 유도 순서는 CEO 확정(2026-08-25)을 그대로 편다: ①멤버십(전 장 열림)이 제1 ②팩(세트 소장)이
 * 그다음 ③낱장은 기준점. 원본은 사설 Storage 라 열린 장에만 서명 URL 이 온다 —
 * 잠긴 장은 공개 썸네일을 흐려 보여주고, 「받기」 링크 자체가 서지 않는다.
 */
function PremiumSection({
  access,
  pendingId,
  onPurchase,
  onPack,
}: {
  access: WallpaperStatus
  pendingId: string | null
  onPurchase: (item: PurchasableItem) => void
  onPack: (pack: WallpaperPack) => void
}) {
  const items = buildPremiumDisplaySet(access.premiumUrls)
  // 판정은 도메인 한 곳 — 용신(element)을 myElement 로 넘겨 «내게 필요한 기운» 선물이 선다.
  const accessCtx: WallpaperAccess = { ...access, myElement: access.element }
  const allOpen = items.every((item) => resolveWallpaperAccess(item, accessCtx).unlocked)

  return (
    <div className="mt-2 flex flex-col gap-3 border-t border-gold-500/20 pt-4">
      <div>
        <p className="flex items-center gap-1.5 font-serif text-[14px] font-bold text-gold-500">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          채운(彩運) — 기운을 채우는 배경화면
        </p>
        <p className="mt-0.5 text-[11px] font-light text-ink-light/60" style={{ wordBreak: 'keep-all' }}>
          부족한 기운을 채우고, 필요한 운을 부르는 열일곱 장입니다.
        </p>
      </div>

      {!access.isMember && (
        <Link
          href="/protected/store?tab=membership"
          className="flex items-center justify-between gap-2 rounded-lg border border-gold-500/45 bg-gold-500/10 px-3 py-2.5 transition-colors hover:bg-gold-500/20"
        >
          <span className="flex items-center gap-1.5 font-serif text-[12px] font-bold text-gold-500">
            <Crown className="h-3.5 w-3.5 shrink-0" />
            멤버십이면 열일곱 장이 전부 열립니다
          </span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gold-500/70" />
        </Link>
      )}

      {!access.isMember && !allOpen && (
        <div className="flex flex-col gap-1.5">
          {WALLPAPER_PACKS.map((pack) => (
            <button
              key={pack.id}
              type="button"
              onClick={() => onPack(pack)}
              disabled={pendingId !== null}
              className="flex h-9 items-center justify-between rounded-lg border border-white/15 px-3 font-serif text-[11px] text-ink-light/80 transition-colors hover:border-gold-500/45 hover:text-gold-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="flex items-center gap-1.5">
                {pendingId === pack.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <IconBokjumeoni className="h-3 w-3" />
                )}
                {pack.title}
              </span>
              <span className="font-bold">{pack.price}만냥</span>
            </button>
          ))}
        </div>
      )}

      {PREMIUM_CATEGORY_ORDER.map((category) => (
        <div key={category} className="flex flex-col gap-2">
          <div className="px-0.5">
            <p className="font-serif text-[12px] font-bold text-ink-light/85">
              {PREMIUM_CATEGORY_META[category].title}
            </p>
            <p className="text-[10px] font-light text-ink-light/50" style={{ wordBreak: 'keep-all' }}>
              {PREMIUM_CATEGORY_META[category].subtitle}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {items
              .filter((item) => item.category === category)
              .map((item) => (
                <PremiumTile
                  key={item.id}
                  item={item}
                  accessCtx={accessCtx}
                  myElement={access.element}
                  pending={pendingId === item.id}
                  onPurchase={() => onPurchase(item)}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function PremiumTile({
  item,
  accessCtx,
  myElement,
  pending,
  onPurchase,
}: {
  item: PremiumDisplayItem
  accessCtx: WallpaperAccess
  myElement: WallpaperStatus['element']
  pending: boolean
  onPurchase: () => void
}) {
  const { unlocked, via, reason } = resolveWallpaperAccess(item, accessCtx)
  const mine = item.category === 'gi' && item.element !== null && item.element === myElement

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
            내게 필요한 기운
          </span>
        )}

        {unlocked ? (
          item.downloadHref ? (
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
            // 방금 열려 서명 URL 재조회가 도는 짧은 사이 — applyUnlock 의 재조회가 채운다.
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/70 py-1.5 font-serif text-[11px] text-ink-light/60">
              <Loader2 className="h-3 w-3 animate-spin" />
              여는 중
            </span>
          )
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
        <button
          type="button"
          onClick={onPurchase}
          disabled={pending}
          className="flex h-8 items-center justify-center gap-1 rounded-lg border border-gold-500/45 bg-gold-500/10 font-serif text-[11px] font-bold text-gold-500 transition-colors hover:bg-gold-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Coins className="h-3 w-3" />}
          {wallpaperPrice(item)}만냥으로 소장
        </button>
      )}
    </div>
  )
}
