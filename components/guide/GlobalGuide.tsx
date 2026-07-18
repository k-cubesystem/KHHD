'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Megaphone, X, Archive } from 'lucide-react'
import { getGuideData, type GuideData } from '@/app/actions/guide'
import { markNotificationRead } from '@/app/actions/core/user-notifications'

// ─── 페이지별 기능 소개 스크립트 (경로 정확 매칭) ───────────────
const TOURS: Record<string, readonly string[]> = {
  '/protected/analysis': [
    '어서 오세요, 여기는 해화당의 본전입니다. 사주·궁합·관상·손금 분석을 여기서 시작합니다.',
    '매일 들르시면 오늘의 운세가 새로 내려오고, 내 서재에서 출석 복채도 받을 수 있어요.',
    '아래 메뉴로 신당과 고민상담에 바로 건너갈 수 있습니다.',
  ],
  '/protected/ai-shaman': [
    '고민을 말씀하시면 좌정하신 神이 사주를 근거로 답해드립니다.',
    '위의 「점사 대상」에서 가족을 고르면 그 가족 신당의 主神이 대신 상담해드려요.',
    '「지난 대화」를 누르면 마친 문답을 다시 볼 수 있습니다. 오래된 원문은 흩어져도 신은 요지를 기억해요.',
  ],
  '/protected/store': [
    '이곳은 봉헌소 — 복채 충전부터 멤버십·신당 테마·신물까지 한 곳에서 봉헌합니다.',
    '테마를 봉헌하면 본인·가족 신당 어디에든 적용할 수 있어요.',
    '「기억의 함」을 신당에 모시면 신이 문답을 90일 더 오래 기억합니다.',
  ],
  '/protected/profile': [
    '나의 서재입니다. 복채·멤버십·분석 기록을 한눈에 볼 수 있어요.',
    '매일 출석 도장을 찍으면 복채가 쌓입니다.',
    '아바타를 누르면 오행 정령으로 바꿀 수 있어요.',
  ],
  '/protected/family': [
    '가족을 등록하면 그 가족의 신당이 열리고, 사주에 맞는 수호신이 강림합니다.',
    '등록한 가족은 고민상담 점사 대상으로도, 궁합 분석에도 쓸 수 있어요.',
  ],
  '/protected/history': ['지난 분석 기록이 이곳에 쌓입니다. 언제든 다시 꺼내 볼 수 있어요.'],
}

const PROGRESS_KEY = 'hhd_guide_progress'
const NOTICE_KEY = 'hhd_notice_seen'

function loadProgress(): Record<string, number> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, number>) : {}
  } catch {
    return {}
  }
}

function saveProgress(p: Record<string, number>) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p))
  } catch {}
}

type Bubble = { kind: 'personal' } | { kind: 'notice' } | { kind: 'tour'; step: number } | null

/**
 * 전 페이지 신 가이드 — 우하단 主神 아바타가 페이지 기능을 하나씩 소개.
 * 다 본 페이지에선 자동으로 나오지 않고, 아바타를 누르면 다시 보여준다.
 * 어드민 공지가 있으면 공지를 먼저 전한다. (신당 방은 자체 가이드가 있어 제외)
 */
export function GlobalGuide() {
  const pathname = usePathname()
  const [data, setData] = useState<GuideData | null>(null)
  const [bubble, setBubble] = useState<Bubble>(null)

  useEffect(() => {
    let alive = true
    getGuideData().then((d) => {
      if (alive) setData(d)
    })
    return () => {
      alive = false
    }
  }, [])

  const tour = useMemo(() => TOURS[pathname] ?? null, [pathname])
  const hidden = pathname.startsWith('/protected/shrine')

  // 경로 진입 시 자동 노출 — 개인 알림(만료 예고 등) > 공지(미확인) > 미완료 투어
  useEffect(() => {
    if (!data || hidden) return
    if (data.personalNotice) {
      setBubble({ kind: 'personal' })
      return
    }
    if (data.announcement && localStorage.getItem(NOTICE_KEY) !== data.announcement.id) {
      setBubble({ kind: 'notice' })
      return
    }
    if (tour) {
      const seen = loadProgress()[pathname] ?? 0
      if (seen < tour.length) {
        setBubble({ kind: 'tour', step: seen })
        return
      }
    }
    setBubble(null)
  }, [data, pathname, tour, hidden])

  /** 개인 알림 확인 — 읽음 처리 후 로컬 상태에서 제거(재노출 방지) */
  const dismissPersonal = useCallback(() => {
    const notice = data?.personalNotice
    if (notice) void markNotificationRead(notice.id)
    setData((prev) => (prev ? { ...prev, personalNotice: null } : prev))
    setBubble(null)
  }, [data])

  const dismissNotice = useCallback(() => {
    if (data?.announcement) {
      try {
        localStorage.setItem(NOTICE_KEY, data.announcement.id)
      } catch {}
    }
    // 공지 확인 후 이 페이지의 미완료 투어가 있으면 이어서
    if (tour) {
      const seen = loadProgress()[pathname] ?? 0
      if (seen < tour.length) {
        setBubble({ kind: 'tour', step: seen })
        return
      }
    }
    setBubble(null)
  }, [data, tour, pathname])

  const advanceTour = useCallback(
    (step: number) => {
      if (!tour) return
      const progress = loadProgress()
      progress[pathname] = Math.max(progress[pathname] ?? 0, step + 1)
      saveProgress(progress)
      if (step + 1 < tour.length) setBubble({ kind: 'tour', step: step + 1 })
      else setBubble(null)
    },
    [tour, pathname]
  )

  const skipTour = useCallback(() => {
    if (tour) {
      const progress = loadProgress()
      progress[pathname] = tour.length
      saveProgress(progress)
    }
    setBubble(null)
  }, [tour, pathname])

  // 아바타 탭 — 닫혀 있으면 개인 알림 > 공지 > 투어 처음부터 다시 안내
  const onTapAvatar = useCallback(() => {
    if (bubble) {
      setBubble(null)
      return
    }
    if (data?.personalNotice) {
      setBubble({ kind: 'personal' })
      return
    }
    if (data?.announcement) {
      setBubble({ kind: 'notice' })
      return
    }
    if (tour) setBubble({ kind: 'tour', step: 0 })
  }, [bubble, data, tour])

  if (!data || hidden) return null
  if (!tour && !data.announcement && !data.personalNotice) return null

  const accent = data.accent ?? '#c9a84c'
  const speaker = data.deityName ?? '해화지기'

  return (
    <div className="fixed right-3 bottom-[82px] z-[130]">
      <AnimatePresence>
        {bubble && (
          <motion.div
            key={bubble.kind === 'tour' ? `tour-${bubble.step}` : 'notice'}
            initial={{ opacity: 0, scale: 0.9, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 6 }}
            className="absolute bottom-[60px] right-0 w-[236px] rounded-2xl rounded-br-md border border-gold-500/40 bg-[#120d07] p-3 shadow-2xl"
          >
            {bubble.kind === 'personal' && data.personalNotice ? (
              <>
                <p className="flex items-center gap-1 text-[9px] text-seal/90 font-serif mb-1">
                  <Archive className="w-3 h-3" /> {speaker}의 전갈
                </p>
                <p className="text-[12px] font-bold text-gold-200 leading-snug mb-1">{data.personalNotice.title}</p>
                <p className="text-[11.5px] text-ink-light/85 leading-snug mb-2 whitespace-pre-wrap">
                  {data.personalNotice.message}
                </p>
                <div className="flex items-center justify-between">
                  {data.personalNotice.ctaHref ? (
                    <Link
                      href={data.personalNotice.ctaHref}
                      onClick={dismissPersonal}
                      className="text-[11px] font-bold text-gold-400"
                    >
                      {data.personalNotice.ctaLabel} →
                    </Link>
                  ) : (
                    <span />
                  )}
                  <button onClick={dismissPersonal} className="text-[10px] text-ink-light/40 hover:text-ink-light/70">
                    확인했어요
                  </button>
                </div>
              </>
            ) : bubble.kind === 'notice' && data.announcement ? (
              <>
                <p className="flex items-center gap-1 text-[9px] text-gold-500/80 font-serif mb-1">
                  <Megaphone className="w-3 h-3" /> 해화당 공지
                </p>
                <p className="text-[12px] font-bold text-gold-200 leading-snug mb-1">{data.announcement.title}</p>
                <p className="text-[11.5px] text-ink-light/85 leading-snug mb-2 whitespace-pre-wrap">
                  {data.announcement.body}
                </p>
                <div className="flex justify-end">
                  <button onClick={dismissNotice} className="text-[11px] font-bold text-gold-400">
                    확인했어요
                  </button>
                </div>
              </>
            ) : bubble.kind === 'tour' && tour ? (
              <>
                <p className="text-[9px] text-gold-500/70 font-serif mb-1">
                  {speaker} · {bubble.step + 1}/{tour.length}
                </p>
                <p className="text-[11.5px] text-ink-light/90 leading-snug mb-2">{tour[bubble.step]}</p>
                <div className="flex items-center justify-between">
                  <button onClick={skipTour} className="text-[10px] text-ink-light/40 hover:text-ink-light/70">
                    그만 보기
                  </button>
                  <button onClick={() => advanceTour(bubble.step)} className="text-[11px] font-bold text-gold-400">
                    {bubble.step + 1 < tour.length ? '다음 →' : '알겠어요'}
                  </button>
                </div>
              </>
            ) : null}
            <button
              onClick={() => setBubble(null)}
              aria-label="말풍선 닫기"
              className="absolute top-2 right-2 text-ink-light/30 hover:text-ink-light/60"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={onTapAvatar}
        aria-label={`가이드 ${speaker}`}
        className="relative w-12 h-12 rounded-full overflow-hidden border-2 shadow-lg active:scale-95 transition-transform"
        style={{ borderColor: `${accent}66`, boxShadow: `0 0 14px ${accent}44` }}
      >
        {data.portraitUrl ? (
          <Image
            src={data.portraitUrl}
            alt={speaker}
            width={48}
            height={48}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <span className="w-full h-full flex items-center justify-center text-lg bg-surface">🔮</span>
        )}
        {/* 미확인 알림·공지 배지 */}
        {(data.personalNotice ||
          (data.announcement &&
            typeof window !== 'undefined' &&
            localStorage.getItem(NOTICE_KEY) !== data.announcement.id)) && (
          <span className="absolute -top-0.5 -right-0.5 w-[14px] h-[14px] rounded-full bg-seal text-[8px] text-white font-bold flex items-center justify-center border border-background">
            !
          </span>
        )}
      </button>
    </div>
  )
}
