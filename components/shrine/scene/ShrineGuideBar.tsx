'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, ListChecks, Sparkles, X } from 'lucide-react'

// 감성 돋보기:
// 신당 가이드 — 하단 네비 위 슬림 바 하나로만 안내한다.
// 우하단에 떠 있던 主神 아바타 + 말풍선은 제거했다(2026-07-28): 신당 연출을 가리고,
// 자동으로 떠서 시야를 뺏었다. 안내는 사용자가 바를 눌렀을 때만 펼친다.

export interface GuideTask {
  id: string
  text: string
  cta: string
  href: string
}

interface Props {
  neededElementKo: string
  neededElementPlaced: boolean
  mainDeitySeated: boolean
  isOwner: boolean
}

export function ShrineGuideBar({ neededElementKo, neededElementPlaced, mainDeitySeated, isOwner }: Props) {
  const [canCheckIn, setCanCheckIn] = useState(false)
  const [barOpen, setBarOpen] = useState(false)

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
        href: '/protected/store?tab=items',
      })
    return t
  }, [isOwner, mainDeitySeated, canCheckIn, neededElementPlaced, neededElementKo])

  if (!isOwner || !tasks.length) return null

  return (
    <>
      {/* 슬림 할 일 바 — 우하단 HUD 를 없앤 뒤로 이 바가 유일한 안내 통로다(할 일 1개여도 노출) */}
      {tasks.length >= 1 && (
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
    </>
  )
}
