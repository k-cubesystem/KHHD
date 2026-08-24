'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Megaphone, X, Archive, Footprints, Bell, Lightbulb } from 'lucide-react'
import { getGuideData, saveGuideProgress, type GuideData } from '@/app/actions/guide'
import { markNotificationRead } from '@/app/actions/core/user-notifications'
import { KNOWLEDGE_TIPS, tipForPath, nextTipInPath, type KnowledgeTip } from '@/lib/domain/guide/knowledge-tips'

// ─── 페이지별 기능 소개 스크립트 (경로 정확 매칭) ───────────────
const TOURS: Record<string, readonly string[]> = {
  '/protected/analysis': [
    '어서 오세요, 여기는 해화당의 본전입니다. 사주·궁합·관상·손금 분석을 여기서 시작합니다.',
    '매일 들르시면 오늘의 운세가 새로 내려오고, 내 서재에서 출석 복채도 받을 수 있어요.',
    '아래 메뉴로 신당과 속풀이에 바로 건너갈 수 있습니다.',
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
    '등록한 가족은 속풀이 점사 대상으로도, 궁합 분석에도 쓸 수 있어요.',
  ],
  '/protected/history': ['지난 분석 기록이 이곳에 쌓입니다. 언제든 다시 꺼내 볼 수 있어요.'],
}

// 진행률은 서버(profiles.guide_progress)가 정본. localStorage 는 구버전 사용자의
// 기존 진행을 이어받기 위한 읽기 전용 폴백으로만 남긴다(기기 바뀌면 초기화되던 문제 해소).
const LEGACY_PROGRESS_KEY = 'hhd_guide_progress'
const LEGACY_NOTICE_KEY = 'hhd_notice_seen'

function legacyProgress(): Record<string, number> {
  try {
    const raw = localStorage.getItem(LEGACY_PROGRESS_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, number>) : {}
  } catch {
    return {}
  }
}

function legacyNoticeId(): string | null {
  try {
    return localStorage.getItem(LEGACY_NOTICE_KEY)
  } catch {
    return null
  }
}

type Bubble =
  | { kind: 'onboarding' }
  | { kind: 'personal' }
  | { kind: 'notice' }
  | { kind: 'tour'; step: number }
  /** 지식 팁 — 경로별 풀에서 고른 항목 자체를 들고 있다(인덱스는 풀이 바뀌면 의미가 없어진다). */
  | { kind: 'knowledge'; tip: KnowledgeTip }
  | null

/**
 * 전 페이지 신 가이드 — **상단 바의 종(鐘)**. 헤더 우측 아이콘 하나로만 서 있다가,
 * 누르면 헤더 바로 아래로 공지·안내 패널이 펼쳐진다.
 *
 * 하단 메뉴 위의 「공지 바」였다가 바뀌었다(2026-08-23, CEO "계속 거슬린다"):
 * 지식 팁이 상시 존재해 바가 절대 사라지지 않는 구조라 본문을 늘 한 줄 밀고 있었다.
 * 이제 상시 노출은 종 아이콘 + 미확인 점뿐이고, 화면 높이를 먹지 않는다.
 * (하단 바가 없어졌으므로 `--guide-bar-h` 도 함께 사라졌다 — 참조처 없음)
 */
export function GuideBell() {
  const pathname = usePathname()
  const [data, setData] = useState<GuideData | null>(null)
  // 펼침 상태는 '어느 경로에서 펼쳤는지'와 함께 들고 있다.
  // 렌더 중 경로를 비교해 파생시키므로, 페이지를 옮기면 effect 없이 자동으로 닫힌다.
  const [expanded, setExpanded] = useState<{ path: string; bubble: Bubble }>({ path: pathname, bubble: null })
  const bubble = expanded.path === pathname ? expanded.bubble : null
  const setBubble = useCallback((next: Bubble) => setExpanded({ path: pathname, bubble: next }), [pathname])
  // 서버 진행률 + 구버전 localStorage 병합본 (세션 내 즉시 반영용)
  const [progress, setProgress] = useState<Record<string, number>>({})
  const [seenNotice, setSeenNotice] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    getGuideData().then((d) => {
      if (!alive) return
      setData(d)
      // 서버 값과 구버전 로컬 값을 max 병합 — 이미 본 안내가 다시 뜨지 않게
      const legacy = legacyProgress()
      const merged: Record<string, number> = { ...legacy }
      for (const [k, v] of Object.entries(d.progress)) merged[k] = Math.max(merged[k] ?? 0, v)
      setProgress(merged)
      setSeenNotice(d.seenNoticeId ?? legacyNoticeId())
    })
    return () => {
      alive = false
    }
  }, [])

  const tour = useMemo(() => TOURS[pathname] ?? null, [pathname])
  // 오늘의 상식 — 경로 + 날짜로 결정. 페이지를 옮기면 다른 상식이 뜬다.
  const pathTip = useMemo(() => tipForPath(pathname), [pathname])

  // 자동 노출 없음 — 알릴 게 있으면 종에 붉은 점으로만 알리고, 펼치는 건 사용자가 눌렀을 때만.

  /** 개인 알림 확인 — 읽음 처리 후 로컬 상태에서 제거(재노출 방지) */
  const dismissPersonal = useCallback(() => {
    const notice = data?.personalNotice
    if (notice) void markNotificationRead(notice.id)
    setData((prev) => (prev ? { ...prev, personalNotice: null } : prev))
    setBubble(null)
  }, [data, setBubble])

  const dismissNotice = useCallback(() => {
    const id = data?.announcement?.id
    if (id) {
      setSeenNotice(id)
      void saveGuideProgress({ seenNoticeId: id })
    }
    // 공지 확인 후 온보딩·투어가 남았으면 이어서
    if (data?.onboarding) {
      setBubble({ kind: 'onboarding' })
      return
    }
    if (tour) {
      const seen = progress[pathname] ?? 0
      if (seen < tour.length) {
        setBubble({ kind: 'tour', step: seen })
        return
      }
    }
    setBubble(null)
  }, [data, tour, pathname, progress, setBubble])

  /** 진행률 갱신 — 서버 저장(정본) + 로컬 상태 즉시 반영 */
  const commitProgress = useCallback(
    (step: number) => {
      setProgress((prev) => ({ ...prev, [pathname]: Math.max(prev[pathname] ?? 0, step) }))
      void saveGuideProgress({ path: pathname, step })
    },
    [pathname]
  )

  const advanceTour = useCallback(
    (step: number) => {
      if (!tour) return
      commitProgress(step + 1)
      if (step + 1 < tour.length) setBubble({ kind: 'tour', step: step + 1 })
      else setBubble(null)
    },
    [tour, commitProgress, setBubble]
  )

  const skipTour = useCallback(() => {
    if (tour) commitProgress(tour.length)
    setBubble(null)
  }, [tour, commitProgress, setBubble])

  /** 지식 팁 회전 — 같은 경로 풀 안에서 다음 항목으로(소진형 아님) */
  const rotateKnowledge = useCallback(
    (current: KnowledgeTip) => {
      const next = nextTipInPath(pathname, current)
      if (next) setBubble({ kind: 'knowledge', tip: next })
    },
    [pathname, setBubble]
  )

  // 종 탭 — 열려 있으면 닫고, 아니면 개인 알림 > 공지 > 온보딩 > 투어 처음부터 > 오늘의 상식
  const onTapBell = useCallback(() => {
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
    if (data?.onboarding) {
      setBubble({ kind: 'onboarding' })
      return
    }
    if (tour) {
      setBubble({ kind: 'tour', step: 0 })
      return
    }
    if (pathTip) setBubble({ kind: 'knowledge', tip: pathTip })
  }, [bubble, data, tour, pathTip, setBubble])

  // 지식 팁이 상시 존재하므로 종은 신당 외 모든 페이지에서 유지된다.
  const hasContent =
    KNOWLEDGE_TIPS.length > 0 || !!(tour || data?.announcement || data?.personalNotice || data?.onboarding)

  if (!data || !hasContent) return null

  const accent = data.accent ?? '#c9a84c'
  const speaker = data.deityName ?? '해화지기'
  const unread = !!(
    data.personalNotice ||
    data.onboarding ||
    (data.announcement && seenNotice !== data.announcement.id)
  )

  const portrait = data.portraitUrl ? (
    <Image
      src={data.portraitUrl}
      alt={speaker}
      width={28}
      height={28}
      className="w-7 h-7 rounded-full object-cover object-top border shrink-0"
      style={{ borderColor: `${accent}66` }}
    />
  ) : (
    <span className="w-7 h-7 rounded-full bg-surface flex items-center justify-center text-[13px] shrink-0">🔮</span>
  )

  return (
    <>
      <button
        type="button"
        onClick={onTapBell}
        aria-expanded={!!bubble}
        aria-label={bubble ? '안내 접기' : `${speaker}의 안내 펼치기`}
        className="relative w-11 h-11 flex items-center justify-center text-ink-light/70 hover:text-primary transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unread && (
          <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-seal ring-2 ring-background" />
        )}
      </button>

      <AnimatePresence>
        {bubble && (
          <>
            {/* 바깥 탭으로 닫기 — 헤더 아래 영역만 덮는다(상단 바 자체는 계속 눌린다) */}
            <div
              aria-hidden="true"
              onClick={() => setBubble(null)}
              className="absolute top-full left-0 right-0 h-screen"
              data-guide-backdrop
            />
            <motion.div
              key={
                bubble.kind === 'tour'
                  ? `tour-${bubble.step}`
                  : bubble.kind === 'knowledge'
                    ? `knowledge-${bubble.tip.term}`
                    : bubble.kind
              }
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              data-guide-panel
              className="absolute top-full left-0 right-0 px-2 pt-1.5"
            >
              {/* 🔴 배경은 «완전 불투명»이어야 한다. 종전 `bg-[#120d07]/97` 은 투명도가 5의 배수가
                  아니라 Tailwind 가 클래스를 아예 만들지 않았고(빌드 CSS 에 #120d07 0건), 배경이
                  통째로 비어 본문 글자가 패널 위로 비쳤다(CEO 실기기 제보 2026-08-24).
                  투명도를 다시 넣을 일이 있으면 5의 배수만 쓸 것 — HANDOFF 19차와 같은 계보다. */}
              <div className="relative flex gap-2.5 rounded-xl border border-gold-500/40 bg-[#120d07] p-3 pr-8 shadow-2xl">
                {portrait}
                <div className="flex-1 min-w-0">
                  {bubble.kind === 'onboarding' && data.onboarding ? (
                    <>
                      <p className="flex items-center gap-1 text-[9px] text-gold-500/80 font-serif mb-1">
                        <Footprints className="w-3 h-3" /> 첫걸음 {data.onboarding.done}/{data.onboarding.total}
                      </p>
                      <p className="text-[11.5px] text-ink-light/90 leading-snug mb-2">{data.onboarding.text}</p>
                      <div className="flex items-center justify-between">
                        <Link
                          href={data.onboarding.ctaHref}
                          onClick={() => setBubble(null)}
                          className="text-[11px] font-bold text-gold-400"
                        >
                          {data.onboarding.ctaLabel} →
                        </Link>
                        <button
                          onClick={() => setBubble(null)}
                          className="text-[10px] text-ink-light/40 hover:text-ink-light/70"
                        >
                          나중에
                        </button>
                      </div>
                    </>
                  ) : bubble.kind === 'personal' && data.personalNotice ? (
                    <>
                      <p className="flex items-center gap-1 text-[9px] text-seal/90 font-serif mb-1">
                        <Archive className="w-3 h-3" /> {speaker}의 전갈
                      </p>
                      <p className="text-[12px] font-bold text-gold-200 leading-snug mb-1">
                        {data.personalNotice.title}
                      </p>
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
                        <button
                          onClick={dismissPersonal}
                          className="text-[10px] text-ink-light/40 hover:text-ink-light/70"
                        >
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
                        <button
                          onClick={() => advanceTour(bubble.step)}
                          className="text-[11px] font-bold text-gold-400"
                        >
                          {bubble.step + 1 < tour.length ? '다음 →' : '알겠어요'}
                        </button>
                      </div>
                    </>
                  ) : bubble.kind === 'knowledge' ? (
                    <>
                      <p className="flex items-center gap-1 text-[9px] text-gold-500/80 font-serif mb-1">
                        <Lightbulb className="w-3 h-3" /> 오늘의 사주 상식
                      </p>
                      <p className="text-[12px] font-bold text-gold-200 leading-snug mb-1">{bubble.tip.term}</p>
                      <p className="text-[11.5px] text-ink-light/85 leading-snug mb-2">{bubble.tip.plain}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-ink-light/35 font-serif">{bubble.tip.category}</span>
                        <button
                          onClick={() => rotateKnowledge(bubble.tip)}
                          className="text-[11px] font-bold text-gold-400"
                        >
                          다른 상식 보기 →
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
                <button
                  onClick={() => setBubble(null)}
                  aria-label="안내 닫기"
                  className="absolute top-2 right-2 text-ink-light/30 hover:text-ink-light/60"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
