'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Download, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { IconBokjumeoni } from '@/components/icons/traditional-icons'
import {
  WALLPAPER_SET,
  isMyElement,
  resolveWallpaperUnlock,
  wallpaperPath,
  wallpaperPreview,
  type WallpaperItem,
} from '@/lib/domain/analysis/wallpaper'
import { getWallpaperStatus, type WallpaperStatus } from '@/app/actions/analysis/wallpaper'
import { GA } from '@/lib/analytics/ga4'

const CARD_TITLE = '복 배경화면'
const CARD_SUBTITLE = '매일 보는 잠금화면에 복을 담아드립니다'

/** 비단 진홍 팔레트 — 복주머니 카드(journey-card)와 같은 계보. 테마 리스트의 먹빛과 구별된다. */
const BOK_BG = 'linear-gradient(165deg, #170C0E 0%, #241014 45%, #120909 100%)'

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
 * 조회(WallpaperCard)와 가른 이유: 화면 상태(잠김·열림·내 오행)를 자격 값만 바꿔 세울 수 있어야
 * 목 데이터로 눈으로 확인할 수 있고, 렌더 테스트도 서버 액션 없이 선다.
 */
export function WallpaperCardView({ status }: { status: WallpaperStatus }) {
  const [open, setOpen] = useState(false)
  const preview = wallpaperPreview(status.element)

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

function PreviewTile({ item, status }: { item: WallpaperItem; status: WallpaperStatus }) {
  const { unlocked } = resolveWallpaperUnlock(item, status)
  const mine = isMyElement(item, status.element)

  return (
    <div className="relative aspect-[9/16] overflow-hidden rounded-lg border border-white/[0.06]">
      <img
        src={wallpaperPath(item.id)}
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

/** 여섯 장 그리드 — 시트 본문. 각 장은 열림(받기) 또는 잠김(사유)으로 선다. */
export function WallpaperGrid({ status }: { status: WallpaperStatus }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {WALLPAPER_SET.map((item) => (
        <SheetTile key={item.id} item={item} status={status} />
      ))}
    </div>
  )
}

function SheetTile({ item, status }: { item: WallpaperItem; status: WallpaperStatus }) {
  const { unlocked, reason } = resolveWallpaperUnlock(item, status)
  const mine = isMyElement(item, status.element)
  const href = wallpaperPath(item.id)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative aspect-[9/16] overflow-hidden rounded-lg border border-white/10">
        <img
          src={href}
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
          // 동일 출처라 download 속성이 그대로 저장으로 동작한다(새 탭 이동 아님).
          <a
            href={href}
            download
            onClick={() => GA.wallpaperDownload(item.id)}
            aria-label={`${item.title} 배경화면 받기`}
            className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/70 py-1.5 text-[11px] font-serif text-gold-500 transition-colors hover:bg-black/85 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/60"
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
    </div>
  )
}
