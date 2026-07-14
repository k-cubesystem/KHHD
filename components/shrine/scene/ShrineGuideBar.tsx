'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, ListChecks, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// 감성 돋보기:
// 신당 하이브리드 가이드 — 평소엔 우하단 主神이 말풍선으로 안내(몰입),
// 할 일이 2개 이상 쌓이면 하단 네비 위에 슬림 바가 떠서 놓침을 막는다.

export interface GuideTask {
  id: string
  text: string
  cta: string
  href: string
}

interface GuideDeity {
  name: string
  portraitUrl: string | null
  accent: string | null
}

interface Props {
  deity: GuideDeity | null
  neededElementKo: string
  neededElementPlaced: boolean
  mainDeitySeated: boolean
  isOwner: boolean
}

export function ShrineGuideBar({ deity, neededElementKo, neededElementPlaced, mainDeitySeated, isOwner }: Props) {
  const [canCheckIn, setCanCheckIn] = useState(false)
  const [bubbleOpen, setBubbleOpen] = useState(true)
  const [barOpen, setBarOpen] = useState(false)
  const [idx, setIdx] = useState(0)

  // 출석 가능 여부(클라 조회)
  useEffect(() => {
    if (!isOwner) return
    let alive = true
    import('@/app/actions/payment/attendance')
      .then((m) => m.checkAttendanceAvailability())
      .then((r) => {
        if (alive && r && 'canCheckIn' in r) setCanCheckIn(!!r.canCheckIn)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [isOwner])

  const tasks = useMemo<GuideTask[]>(() => {
    if (!isOwner) return []
    const t: GuideTask[] = []
    if (!mainDeitySeated)
      t.push({
        id: 'seat',
        text: '아직 좌정한 主神이 없어요. 나를 지켜줄 수호신을 모셔보세요.',
        cta: '신위전 열기',
        href: '/protected/shrine/deities',
      })
    if (canCheckIn)
      t.push({
        id: 'attend',
        text: '오늘 출석하고 복채 1만냥을 받아가세요.',
        cta: '출석하기',
        href: '/protected/profile',
      })
    if (!neededElementPlaced)
      t.push({
        id: 'element',
        text: `사주에 ${neededElementKo} 기운이 필요해요. 어울리는 신물을 놓아 기운을 채워보세요.`,
        cta: '신물 보러가기',
        href: '/protected/shrine/shop',
      })
    return t
  }, [isOwner, mainDeitySeated, canCheckIn, neededElementPlaced, neededElementKo])

  // 첫 진입 시 말풍선 잠깐 노출 후 접기
  useEffect(() => {
    if (!tasks.length) return
    setBubbleOpen(true)
    const id = window.setTimeout(() => setBubbleOpen(false), 5200)
    return () => window.clearTimeout(id)
  }, [tasks.length])

  if (!isOwner || !tasks.length) return null

  const accent = deity?.accent ?? '#c9a84c'
  const current = tasks[idx % tasks.length]
  const nextGuide = () => setIdx((i) => (i + 1) % tasks.length)

  return (
    <>
      {/* 슬림 할 일 바 (할 일 2개+ 일 때만) */}
      {tasks.length >= 2 && (
        <div className="fixed left-2 right-2 bottom-[68px] z-[125] mx-auto max-w-[476px]">
          <AnimatePresence initial={false}>
            {barOpen ? (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="rounded-xl border border-gold-500/30 bg-[#161009]/95 backdrop-blur-md shadow-lg overflow-hidden"
              >
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-gold-300">
                    <ListChecks className="w-3.5 h-3.5" /> 오늘 할 것 {tasks.length}개
                  </span>
                  <button
                    onClick={() => setBarOpen(false)}
                    aria-label="닫기"
                    className="text-ink-light/40 hover:text-ink-light/70"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="divide-y divide-white/5">
                  {tasks.slice(0, 3).map((t) => (
                    <Link
                      key={t.id}
                      href={t.href}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors"
                    >
                      <Sparkles className="w-3 h-3 text-gold-500/70 shrink-0" />
                      <span className="flex-1 text-[11px] text-ink-light/80 leading-snug line-clamp-2">{t.text}</span>
                      <span className="text-[10px] font-bold text-gold-400 shrink-0 flex items-center gap-0.5">
                        {t.cta} <ChevronRight className="w-3 h-3" />
                      </span>
                    </Link>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.button
                key="collapsed"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                onClick={() => setBarOpen(true)}
                className="w-full flex items-center gap-2 rounded-full border border-gold-500/30 bg-[#161009]/95 backdrop-blur-md px-4 py-2 shadow-lg pr-14"
              >
                <ListChecks className="w-4 h-4 text-gold-400 shrink-0" />
                <span className="text-[11.5px] font-bold text-gold-200">오늘 할 것 {tasks.length}개</span>
                <span className="ml-auto text-[10px] text-ink-light/50">눌러서 보기</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 우하단 主神 가이드 HUD */}
      <div className={cn('fixed right-3 z-[130]', tasks.length >= 2 ? 'bottom-[120px]' : 'bottom-[82px]')}>
        <AnimatePresence>
          {bubbleOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 6 }}
              className="absolute bottom-[60px] right-0 w-[228px] rounded-2xl rounded-br-md border border-gold-500/40 bg-[#120d07] p-3 shadow-2xl"
            >
              <p className="text-[9px] text-gold-500/70 font-serif mb-1">主神 {deity?.name ?? '신당지기'}</p>
              <p className="text-[11.5px] text-ink-light/90 leading-snug mb-2">{current.text}</p>
              <div className="flex items-center justify-between">
                <Link href={current.href} className="text-[11px] font-bold text-gold-400 flex items-center gap-0.5">
                  {current.cta} <ChevronRight className="w-3 h-3" />
                </Link>
                {tasks.length > 1 && (
                  <button onClick={nextGuide} className="text-[10px] text-ink-light/40 hover:text-ink-light/70">
                    다음 안내 →
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setBubbleOpen((o) => !o)}
          aria-label="신당 가이드"
          className="relative w-12 h-12 rounded-full overflow-hidden border-2 shadow-lg active:scale-95 transition-transform"
          style={{ borderColor: `${accent}66`, boxShadow: `0 0 14px ${accent}44` }}
        >
          {/* 새 안내 알림 링 */}
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{ boxShadow: `0 0 0 2px ${accent}55`, animationDuration: '2.4s' }}
          />
          {deity?.portraitUrl ? (
            <Image
              src={deity.portraitUrl}
              alt={deity.name}
              width={48}
              height={48}
              className="w-full h-full object-cover object-top"
            />
          ) : (
            <span className="w-full h-full flex items-center justify-center text-lg bg-surface">🔮</span>
          )}
          {/* 할 일 수 배지 */}
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gold-500 text-background text-[10px] font-bold flex items-center justify-center border border-background">
            {tasks.length}
          </span>
        </button>
      </div>
    </>
  )
}
