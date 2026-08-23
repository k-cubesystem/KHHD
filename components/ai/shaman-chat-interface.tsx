'use client'

import { useState, useEffect, useRef, useCallback, memo, type ReactNode } from 'react'
import { logger } from '@/lib/utils/logger'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Textarea } from '@/components/ui/textarea'
import { useTranslations } from 'next-intl'
import {
  sendShamanChatMessage,
  getShamanQuestionStatus,
  purchaseShamanQuestions,
  getOrCreateChatSession,
  loadChatSessionMessages,
  listPastChatSessions,
  saveChatMessages,
  endAndCreateNewSession,
  getChatOpening,
  type ShamanChatMessage,
  type ShamanQuestionStatus,
  type PastChatSession,
} from '@/app/actions/ai/shaman-chat'
import { greetingToContent, type Greeting } from '@/lib/domain/chat/greeting'
import { GreetingIntro } from '@/components/ai/chat/greeting-intro'
import { ServiceDisclaimer } from '@/components/shared/ServiceDisclaimer'
import { ChatMoreSheet } from '@/components/ai/chat/chat-more-sheet'
import { OverlayPortal } from '@/components/ai/chat/overlay-portal'
import { useFamilyMembers } from '@/hooks/use-family-members'
import { useTts } from '@/hooks/useTts'
import { useShrineAudio } from '@/components/shrine/scene/useShrineAudio'
import { voiceProfileFor } from '@/lib/domain/shrine/voice-profiles'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, Send, Coins, MoreHorizontal, X, ChevronLeft, Flame } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { GAChat } from '@/lib/analytics/chat-ga'
import { canStream, streamShamanChat, type StreamDonePayload } from '@/lib/domain/chat/stream-client'
import { AdIncenseSheet } from '@/components/ai/chat/ad-incense-sheet'
import { getAdRewardAvailability } from '@/app/actions/ads/coupang'
import type { AdRewardAvailability } from '@/lib/domain/ads/rewarded'

// ─── 타이핑 인디케이터 ────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-end gap-2.5 px-1">
      {/* 아바타 */}
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold-200/45 to-gold-600/30 border border-primary/25 flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(244,228,186,0.08)]">
        <Image src="/avatars/haehwajigi.svg" alt="해화지기" width={20} height={20} className="inline-block" />
      </div>
      {/* 점 */}
      <div className="px-4 py-3 rounded-2xl rounded-bl-none bg-surface/70 border border-primary/10 backdrop-blur-md">
        <div className="flex gap-1.5 items-center h-3.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="block w-1.5 h-1.5 rounded-full bg-primary/50"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * 본문을 내레이션/대사로 쪼갠다 — 통째로 괄호에 싸인 문단만 내레이션으로 본다.
 * 저장된 선문안(내레이션을 괄호로 보존)이 재입장 시에도 같은 모양으로 복원되고,
 * 신위 응답 중 "(향이 흔들립니다)" 같은 지문도 말풍선 안에서 톤이 낮게 렌더된다.
 */
function splitNarration(content: string): Array<{ kind: 'narration' | 'speech'; text: string }> {
  return content
    .split(/\n{2,}/)
    .map((raw) => raw.trim())
    .filter((t) => t.length > 0)
    .map((t) => {
      // dotAll(s) 플래그는 이 tsconfig target 에서 못 쓴다 — [\s\S] 로 여러 줄을 받는다.
      const m = t.match(/^\(([\s\S]+)\)$/)
      // 중첩 괄호가 섞인 문장은 대사로 둔다(잘못 삼키지 않도록).
      if (m && !m[1].includes('(') && !m[1].includes(')')) return { kind: 'narration' as const, text: m[1].trim() }
      return { kind: 'speech' as const, text: t }
    })
}

// ─── 메시지 버블 ────────────────────────────────────────
const Bubble = memo(function Bubble({
  msg,
  showAvatar,
  onSpeak,
}: {
  msg: ShamanChatMessage
  showAvatar: boolean
  onSpeak?: (text: string) => void
}) {
  const isUser = msg.role === 'user'
  const time = new Date(msg.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="flex justify-end items-end gap-2"
      >
        <span className="text-[10px] text-primary/60 self-end mb-0.5">{time}</span>
        <div
          className={cn(
            'max-w-[72%] px-4 py-3 rounded-2xl rounded-br-none text-sm leading-relaxed',
            'bg-gradient-to-br from-[#2a2318] to-[#1e1a10] text-primary/90',
            'border border-gold-600/25',
            'shadow-[0_2px_20px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(244,228,186,0.06)]',
            'font-medium'
          )}
        >
          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="flex items-end gap-2.5 px-1"
    >
      {/* 아바타 - 연속 메시지면 투명 공간만 */}
      {showAvatar ? (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold-200/45 to-gold-600/30 border border-primary/25 flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(244,228,186,0.08)]">
          <Image src="/avatars/haehwajigi.svg" alt="해화지기" width={20} height={20} className="inline-block" />
        </div>
      ) : (
        <div className="w-7 flex-shrink-0" />
      )}

      <div className="max-w-[76%] space-y-1">
        <div
          className={cn(
            'px-4 py-3.5 rounded-2xl rounded-bl-none text-sm leading-[1.75]',
            'bg-surface/60 border border-primary/[0.08] backdrop-blur-md',
            'text-foreground/85',
            'shadow-[0_2px_24px_rgba(0,0,0,0.3)]'
          )}
        >
          {splitNarration(msg.content).map((part, i) =>
            part.kind === 'narration' ? (
              <p key={i} className="text-[11px] italic text-foreground/50 leading-relaxed my-1 first:mt-0 last:mb-0">
                {part.text}
              </p>
            ) : (
              <p key={i} className="whitespace-pre-wrap break-words my-1 first:mt-0 last:mb-0">
                {part.text}
              </p>
            )
          )}
        </div>
        <div className="flex items-center gap-2 pl-1">
          <p className="text-[10px] text-primary/60">{time}</p>
          {onSpeak && msg.content ? (
            <button
              type="button"
              onClick={() => onSpeak(msg.content)}
              aria-label="음성으로 듣기"
              className="-my-3 -mx-2 px-2 py-3 text-[10px] text-primary/50 hover:text-gold-300 transition inline-flex items-center gap-0.5"
            >
              🔊 듣기
            </button>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
})

// ─── 지난 대화 열람 패널 (종료 세션 · 읽기 전용) ──────────────
function PastSessionsPanel({ familyId, onClose }: { familyId: string; onClose: () => void }) {
  const [sessions, setSessions] = useState<PastChatSession[] | null>(null)
  const [viewing, setViewing] = useState<{ session: PastChatSession; messages: ShamanChatMessage[] | null } | null>(
    null
  )
  const [search, setSearch] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // 검색어 변경 시 디바운스 후 첫 페이지 재조회
  useEffect(() => {
    let alive = true
    const id = window.setTimeout(
      () => {
        setSessions(null)
        listPastChatSessions({ familyMemberId: familyId, search }).then((r) => {
          if (!alive) return
          setSessions(r.success ? (r.sessions ?? []) : [])
          setHasMore(r.hasMore ?? false)
        })
      },
      search ? 300 : 0
    )
    return () => {
      alive = false
      window.clearTimeout(id)
    }
  }, [familyId, search])

  const loadMore = async () => {
    if (!sessions) return
    setLoadingMore(true)
    const r = await listPastChatSessions({ familyMemberId: familyId, search, offset: sessions.length })
    setLoadingMore(false)
    if (r.success) {
      setSessions((prev) => [...(prev ?? []), ...(r.sessions ?? [])])
      setHasMore(r.hasMore ?? false)
    }
  }

  const openSession = async (session: PastChatSession) => {
    if (session.purged) {
      setViewing({ session, messages: [] })
      return
    }
    setViewing({ session, messages: null })
    const r = await loadChatSessionMessages(session.id)
    setViewing({ session, messages: r.success ? (r.messages ?? []) : [] })
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    // 포털 — 채팅 루트(zIndex:10)가 만든 스택 컨텍스트를 벗어나야 하단 네비(z-nav:40) 위로 뜬다.
    <OverlayPortal>
      <div
        className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center"
        role="dialog"
        aria-label="지난 대화"
      >
        <button aria-label="닫기" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative w-full max-w-[480px] max-h-[78vh] rounded-t-2xl border border-b-0 border-primary/20 bg-[#12100a] flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-primary/10">
            <div className="flex items-center gap-2">
              {viewing && (
                <button
                  onClick={() => setViewing(null)}
                  aria-label="목록으로"
                  className="p-1 -ml-1 text-primary/60 hover:text-primary"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <p className="text-sm font-serif text-gold-200">
                {viewing ? viewing.session.title || '지난 문답' : '지난 대화'}
              </p>
            </div>
            <button onClick={onClose} aria-label="닫기" className="p-1 text-primary/50 hover:text-primary">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 검색 — 목록 화면에서만 */}
          {!viewing && (
            <div className="px-4 py-2 border-b border-primary/[0.08]">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="지난 문답 검색 (제목·요지)"
                className="w-full h-8 rounded-lg bg-surface/50 border border-primary/15 px-2.5 text-[12px] text-foreground/85 outline-none focus:border-primary/40 placeholder:text-ink-light/30"
              />
            </div>
          )}

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {!viewing ? (
              // 세션 목록
              <div className="divide-y divide-primary/[0.08]">
                {sessions === null && (
                  <div className="p-6 text-center text-xs text-ink-light/40">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                    지난 대화를 불러오는 중…
                  </div>
                )}
                {sessions?.length === 0 && (
                  <p className="p-8 text-center text-xs text-ink-light/40">
                    {search ? (
                      <>「{search}」에 해당하는 문답이 없습니다.</>
                    ) : (
                      <>
                        아직 종료된 대화가 없습니다.
                        <br />
                        「새 대화」로 마친 문답이 이곳에 보관됩니다.
                      </>
                    )}
                  </p>
                )}
                {sessions?.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => void openSession(s)}
                    className="w-full text-left px-4 py-3 hover:bg-primary/5 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] text-foreground/85 truncate">{s.title || '(첫 질문 없음)'}</p>
                      {s.purged && (
                        <span className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded-full border border-primary/20 text-primary/50">
                          연기로 흩어짐
                        </span>
                      )}
                    </div>
                    <p className="text-[10.5px] text-ink-light/35 mt-0.5">{fmtDate(s.endedAt)} 종료</p>
                  </button>
                ))}
                {hasMore && (
                  <button
                    onClick={() => void loadMore()}
                    disabled={loadingMore}
                    className="w-full py-3 text-[11.5px] text-gold-400 hover:bg-primary/5 transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? '불러오는 중…' : '더 보기'}
                  </button>
                )}
              </div>
            ) : viewing.messages === null ? (
              <div className="p-6 text-center text-xs text-ink-light/40">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                문답을 여는 중…
              </div>
            ) : viewing.session.purged ? (
              // 원문 정리된 세션 — 요약만 보존
              <div className="p-6 space-y-4 text-center">
                <p className="text-2xl">🕯️</p>
                <p className="text-[12.5px] text-gold-200/80 font-serif leading-relaxed">
                  오래된 문답은 연기로 흩어졌으나,
                  <br />
                  신은 그 뜻을 기억합니다.
                </p>
                {viewing.session.summary && (
                  <div className="text-left rounded-xl border border-primary/15 bg-surface/40 p-4">
                    <p className="text-[10px] tracking-[0.2em] text-primary/50 font-serif mb-2">신이 기억하는 요지</p>
                    <p className="text-[12px] text-foreground/75 leading-relaxed whitespace-pre-wrap">
                      {viewing.session.summary}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              // 원문 열람 (읽기 전용)
              <div className="p-4 space-y-3">
                {viewing.messages.length === 0 && (
                  <p className="p-4 text-center text-xs text-ink-light/40">이 대화에는 남은 문답이 없습니다.</p>
                )}
                {viewing.messages.map((m, i) => (
                  <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[80%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap break-words',
                        m.role === 'user'
                          ? 'rounded-br-none bg-gradient-to-br from-[#2a2318] to-[#1e1a10] text-primary/90 border border-gold-600/25'
                          : 'rounded-bl-none bg-surface/60 border border-primary/[0.08] text-foreground/85'
                      )}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </OverlayPortal>
  )
}

// ─── 새 대화 시작 확인 다이얼로그 ──────────────────────────
function NewChatConfirmBanner({
  onConfirm,
  onCancel,
  cancelLabel,
}: {
  onConfirm: () => void
  onCancel: () => void
  cancelLabel: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="mx-4 mb-2 px-4 py-3 rounded-xl bg-surface/80 border border-primary/20 backdrop-blur-md flex items-center justify-between gap-3"
    >
      <p className="text-xs text-foreground/60 leading-snug">현재 대화를 마치고 새 대화를 시작할까요?</p>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={onCancel}
          className="text-[11px] px-2.5 py-1 rounded-lg border border-primary/15 text-primary/50 hover:text-primary/70 transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          className="text-[11px] px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/30 text-primary/80 hover:bg-primary/20 transition-colors font-medium"
        >
          새 대화
        </button>
      </div>
    </motion.div>
  )
}

// ─── 좌정 신위 표정 아바타 (감정 크로스페이드) ───────────────
// 원형 컨테이너를 채우는 표정 이미지. emotion 변경 시 300ms fade,
// prefers-reduced-motion 존중. 이미지 실패 시 portrait → fallback 노드로 폴백.
function DeityFaceAvatar({
  deityCode,
  emotion,
  fallback,
}: {
  deityCode: string
  emotion: string
  fallback: ReactNode
}) {
  const reduceMotion = useReducedMotion()
  const emo = emotion || 'neutral'
  const emoKey = `${deityCode}/${emo}`
  const [brokenEmotions, setBrokenEmotions] = useState<Record<string, boolean>>({})
  const [portraitBroken, setPortraitBroken] = useState(false)

  const primarySrc = `/shrine/deities/${deityCode}/${emo}.webp`
  const portraitSrc = `/shrine/deities/${deityCode}/portrait.webp`
  const src = !brokenEmotions[emoKey] ? primarySrc : !portraitBroken ? portraitSrc : null

  if (!src) return <>{fallback}</>

  return (
    <div className="absolute inset-0 overflow-hidden rounded-full">
      <AnimatePresence initial={false}>
        <motion.div
          key={src}
          initial={{ opacity: reduceMotion ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.3, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="좌정 신위"
            draggable={false}
            onError={() => {
              if (src === primarySrc) setBrokenEmotions((prev) => ({ ...prev, [emoKey]: true }))
              else setPortraitBroken(true)
            }}
            className="w-full h-full object-cover object-top"
          />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────
export interface SeatedDeityInfo {
  code: string
  name: string
}

export function ShamanChatInterface({
  initialDeity = null,
  oracleId,
}: { initialDeity?: SeatedDeityInfo | null; oracleId?: string } = {}) {
  const router = useRouter()
  const tCommon = useTranslations('common')
  const reduceMotion = useReducedMotion()
  const [messages, setMessages] = useState<ShamanChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecharging, setIsRecharging] = useState(false)
  const [turnCount, setTurnCount] = useState(0)
  const [questionStatus, setQuestionStatus] = useState<ShamanQuestionStatus | null>(null)
  const [isStatusLoading, setIsStatusLoading] = useState(true)
  /** 선문안 — 신위가 먼저 건넨 오프닝. 대화가 시작되면 메시지 목록으로 자연히 밀려난다. */
  const [greeting, setGreeting] = useState<Greeting | null>(null)
  /** 답변 후 이어 여쭙기 칩(P0-F2). 새 전송을 시작하면 비운다. */
  const [followupChips, setFollowupChips] = useState<string[]>([])
  /** 스트리밍으로 도착 중인 본문(P1-B) — 완결되면 messages 로 옮긴다. */
  const [streamingText, setStreamingText] = useState('')
  /** 광고 리워드 가용성(P1-A) — 「향 올리기」 버튼 노출 여부 */
  const [adAvail, setAdAvail] = useState<AdRewardAvailability | null>(null)
  const [showAdSheet, setShowAdSheet] = useState(false)
  const [showMore, setShowMore] = useState(false)

  // 좌정 主神 표정 아바타 (신당 3.0). 서버 시딩(initialDeity)으로 첫 로드부터 신위 표시,
  // 이후 응답에서 받은 마지막 값 유지 — deityCode는 한번 정해지면 유지.
  const [deityCode, setDeityCode] = useState<string | null>(initialDeity?.code ?? null)
  // 인연(緣) 레벨업 순간의 아바타 발광 연출
  const [bondFx, setBondFx] = useState(false)
  const [deityEmotion, setDeityEmotion] = useState<string>('neutral')
  const { play: playFx } = useShrineAudio()

  // TTS(신과의 음성) — 무료 Web Speech 기본, 자동읽기 토글은 localStorage 유지
  const { supported: ttsSupported, speak, stop: ttsStop } = useTts()
  // 좌정 신위별 목소리 — deityCode 로 프로파일(rate/pitch/voiceHint) 조회 후 발화. 미좌정이면 기본.
  const speakDeity = useCallback(
    (text: string) => speak(text, { ...voiceProfileFor(deityCode), deityCode }),
    [speak, deityCode]
  )
  const [autoSpeak, setAutoSpeak] = useState(false)
  useEffect(() => {
    if (typeof window !== 'undefined') setAutoSpeak(window.localStorage.getItem('hhd_tts_auto') === '1')
  }, [])
  const toggleAutoSpeak = useCallback(() => {
    setAutoSpeak((v) => {
      const next = !v
      if (typeof window !== 'undefined') window.localStorage.setItem('hhd_tts_auto', next ? '1' : '0')
      if (!next) ttsStop()
      return next
    })
  }, [ttsStop])
  // 새 신위 응답 자동 발화(중복 방지)
  const lastSpokenRef = useRef<string | null>(null)
  useEffect(() => {
    if (!autoSpeak || messages.length === 0) return
    const last = messages[messages.length - 1]
    if (last.role !== 'assistant' || !last.content) return
    const key = last.timestamp + '|' + last.content.slice(0, 24)
    if (lastSpokenRef.current === key) return
    lastSpokenRef.current = key
    speakDeity(last.content)
  }, [messages, autoSpeak, speakDeity])

  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('self')
  const { data: familyMembers } = useFamilyMembers()

  // DB 세션 상태
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isSessionLoading, setIsSessionLoading] = useState(true)
  const [showNewChatConfirm, setShowNewChatConfirm] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const chatRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  /** 스트리밍 말풍선의 시각 — 토큰마다 새로 만들면 시계가 흔들린다. */
  const streamStartedAtRef = useRef<string>(new Date().toISOString())
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isAtBottomRef = useRef(true)

  // 스크롤 위치 감지
  const handleScroll = useCallback(() => {
    const el = chatRef.current
    if (!el) return
    const threshold = 80
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
  }, [])

  // AI 응답 왔을 때만 부드럽게 스크롤
  const scrollToBottomSmooth = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [])

  // 신탁 딥링크(?oracle=)는 **첫 진입에서 한 번만** 쓴다 — 대상을 바꾸거나 새 대화를 열면
  // 더는 그 신탁 이야기가 아니다. ref 라 소진 후 재렌더에도 되살아나지 않는다.
  const oracleIdRef = useRef<string | undefined>(oracleId)

  // 세션 로드 및 메시지 복원. 대화가 비어 있으면 선문안(오프닝)을 받아 신위가 먼저 말을 건다.
  const loadSession = useCallback(async (familyMemberId: string) => {
    setIsSessionLoading(true)
    setGreeting(null)
    setFollowupChips([])
    try {
      const sessionResult = await getOrCreateChatSession(familyMemberId)
      if (!sessionResult.success || !sessionResult.sessionId) {
        setIsSessionLoading(false)
        return
      }
      setSessionId(sessionResult.sessionId)

      if (!sessionResult.isNew) {
        // 기존 세션 메시지 복원
        const msgResult = await loadChatSessionMessages(sessionResult.sessionId)
        if (msgResult.success && msgResult.messages) {
          setMessages(msgResult.messages)
          setTurnCount(Math.floor(msgResult.messages.length / 2))
          // 복원 후 스크롤 맨 아래로
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant', block: 'end' }), 100)
        }
      } else {
        setMessages([])
        setTurnCount(0)
      }

      // 열 때마다 오프닝을 새로 받는다(휘발성). 지난 대화가 있으면 그 아래에 붙는다.
      const fromOracle = oracleIdRef.current
      oracleIdRef.current = undefined // 한 번 쓰면 비운다
      const opening = await getChatOpening(familyMemberId, fromOracle ? { oracleId: fromOracle } : undefined)
      if (opening.success && opening.greeting) {
        setGreeting(opening.greeting)
        GAChat.greetingShown(opening.greeting.visitKind)
        if (opening.greeting.visitKind === 'oracle') GAChat.oracleToChat()
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 250)
      }
    } finally {
      setIsSessionLoading(false)
    }
  }, [])

  // 초기 로드
  useEffect(() => {
    const load = async () => {
      setIsStatusLoading(true)
      const statusResult = await getShamanQuestionStatus()
      if (statusResult.success) setQuestionStatus(statusResult)
      setIsStatusLoading(false)
    }
    load()
    loadSession('self')
  }, [loadSession])

  // 진입 계측(P0-F4) — 화면 진입 1회. initialDeity 는 서버 시딩 prop 이라 마운트 후 불변.
  useEffect(() => {
    GAChat.open(initialDeity?.code ?? null)
  }, [initialDeity])

  // 광고 리워드 가용성(P1-A) — 1회 조회. 실패해도 무해(버튼만 안 뜬다).
  useEffect(() => {
    let alive = true
    void getAdRewardAvailability().then((a) => {
      if (alive) setAdAvail(a)
    })
    return () => {
      alive = false
    }
  }, [])

  // family 변경 시 해당 세션으로 전환
  const handleFamilyChange = async (newFamilyId: string) => {
    setSelectedFamilyId(newFamilyId)
    setMessages([])
    setTurnCount(0)
    setFollowupChips([])
    // 대상 전환 = 다른 대화 맥락. 좌정 신위(본인 한정)는 초기화.
    setDeityCode(null)
    setDeityEmotion('neutral')
    await loadSession(newFamilyId)
  }

  // 새 대화 시작
  const handleNewChat = async () => {
    if (!sessionId) return
    setShowNewChatConfirm(false)
    const result = await endAndCreateNewSession(sessionId, selectedFamilyId)
    if (result.success && result.newSessionId) {
      setSessionId(result.newSessionId)
      setMessages([])
      setTurnCount(0)
      setFollowupChips([])
      setDeityCode(null)
      setDeityEmotion('neutral')
      setGreeting(null)
      toast.success('새 대화가 시작되었습니다.')
      // 빈 화면으로 두지 않는다 — 자리를 새로 편 만큼 짧게 먼저 말을 건다.
      const opening = await getChatOpening(selectedFamilyId, { newChat: true })
      if (opening.success && opening.greeting) setGreeting(opening.greeting)
    } else {
      toast.error(result.error || '새 대화 시작 실패')
    }
  }

  // 충전
  const handleRecharge = async () => {
    const balance = questionStatus?.walletBalance ?? 0
    if (balance < 1) {
      toast.error('복채가 부족합니다', {
        description: `${balance.toLocaleString()}만냥 보유 · 1만냥 필요`,
        action: {
          label: '복채 충전',
          onClick: () => {
            // 다른 페이월과 충전 동선 통일 — 멤버십 관리가 아니라 상점 복채 탭(P0-F5)
            GAChat.rechargeRedirect()
            router.push('/protected/store?tab=bokchae')
          },
        },
      })
      return
    }
    setIsRecharging(true)
    try {
      const result = await purchaseShamanQuestions()
      if (result.success) {
        setQuestionStatus((prev) =>
          prev
            ? {
                ...prev,
                walletBalance: result.remainingBalance ?? prev.walletBalance,
                purchasedCredits: result.newPurchasedCredits ?? prev.purchasedCredits,
                totalRemaining:
                  prev.dailyFreeRemaining + prev.adCredits + (result.newPurchasedCredits ?? prev.purchasedCredits),
              }
            : prev
        )
        GAChat.ticketPurchase()
        toast.success('질문권 20회 충전 완료', {
          description: `남은 복채: ${(result.remainingBalance ?? 0).toLocaleString()}만냥`,
        })
      } else {
        toast.error(result.error || '충전 실패')
      }
    } finally {
      setIsRecharging(false)
    }
  }

  // 메시지 전송
  const handleSend = async (text?: string) => {
    const textToSend = (text || inputMessage).trim()
    if (!textToSend || isLoading) return

    if ((questionStatus?.totalRemaining ?? 0) <= 0) {
      GAChat.limitHit()
      toast.error('질문 횟수가 소진되었습니다.', { action: { label: '충전하기', onClick: handleRecharge } })
      return
    }

    setIsLoading(true)
    setFollowupChips([])
    const userMsg: ShamanChatMessage = { role: 'user', content: textToSend, timestamp: new Date().toISOString() }

    // 선문안은 저장하지 않는 휘발성 인사지만, 사용자가 그 질문에 답한 순간부터는 대화의 일부다.
    // 로컬 메시지로 접어 넣고 AI 히스토리에도 실어 보낸다 — 안 그러면 "아직 그대로예요" 같은
    // 답을 신위가 무슨 말인지 모른 채 받는다.
    const greetingMsg: ShamanChatMessage | null = greeting
      ? { role: 'assistant', content: greetingToContent(greeting), timestamp: new Date().toISOString() }
      : null
    const history = greetingMsg ? [...messages, greetingMsg] : messages

    setMessages((prev) => (greetingMsg ? [...prev, greetingMsg, userMsg] : [...prev, userMsg]))
    setGreeting(null)
    setInputMessage('')

    // textarea 높이 리셋
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    // 사용자 메시지 후 바로 스크롤
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 50)

    /**
     * 성공 응답 반영 — 스트리밍(SSE)과 서버 액션이 «같은 마무리»를 쓴다.
     * 두 벌로 갈라 두면 한쪽만 고쳐지고 다른 쪽이 조용히 뒤처진다.
     */
    const applySuccess = (result: StreamDonePayload) => {
      {
        const aiMsg: ShamanChatMessage = {
          role: 'assistant',
          content: result.full,
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, aiMsg])
        setTurnCount((prev) => prev + 1)

        // 좌정 신위 표정 갱신 — deityCode는 한번 정해지면 유지, emotion은 마지막 값 유지
        if (result.deityCode) setDeityCode(result.deityCode)
        if (result.emotion) setDeityEmotion(result.emotion)

        // 인연(緣) 레벨업 — 아바타 발광 + 골드 토스트 + 바라 효과음(F-4)
        if (result.bondLeveledUp) {
          setBondFx(true)
          playFx('bara')
          window.setTimeout(() => setBondFx(false), 3200)
          toast.success(`緣이 깊어졌습니다 — 「${result.bondLevelName ?? ''}」`, {
            description: `${initialDeity?.name ?? '主神'}과의 인연이 새로운 단계에 이르렀습니다`,
            duration: 6000,
            style: {
              background: 'linear-gradient(135deg, #1A1200 0%, #0D0900 100%)',
              border: '1px solid rgba(212,175,55,0.4)',
              color: '#F4E4BA',
            },
          })
        }

        // DB 저장 (비동기, 실패해도 UI에 영향 없음)
        // 세션 제목은 '첫 사용자 발화' 기준 — 선문안(assistant)이 먼저 저장되므로
        // messages.length 로 판단하면 제목이 영영 안 붙는다.
        if (sessionId) {
          const isFirstUserTurn = !messages.some((m) => m.role === 'user')
          saveChatMessages(sessionId, userMsg, aiMsg, isFirstUserTurn).catch((e) =>
            logger.error('[saveChatMessages]', e)
          )
        }

        // AI 응답 후 스크롤
        setTimeout(scrollToBottomSmooth, 80)

        // 잔여 동기화(P0-F5) — 서버가 차감 반영 잔여를 주면 그 값으로 덮어쓴다(낙관 desync 제거).
        setQuestionStatus((prev) => {
          if (!prev) return prev
          if (result.remaining) {
            return {
              ...prev,
              dailyFreeUsed: Math.max(0, prev.dailyFreeTotal - result.remaining.free),
              dailyFreeRemaining: result.remaining.free,
              adCredits: result.remaining.ad,
              purchasedCredits: result.remaining.purchased,
              totalRemaining: result.remaining.total,
            }
          }
          // 구버전 응답 폴백 — 종전 낙관 감소 (소비 순서: 무료 → 광고 → 구매)
          if (prev.dailyFreeRemaining > 0) {
            return {
              ...prev,
              dailyFreeUsed: prev.dailyFreeUsed + 1,
              dailyFreeRemaining: prev.dailyFreeRemaining - 1,
              totalRemaining: prev.totalRemaining - 1,
            }
          }
          if (prev.adCredits > 0) {
            return {
              ...prev,
              adCredits: prev.adCredits - 1,
              totalRemaining: Math.max(0, prev.totalRemaining - 1),
            }
          }
          return {
            ...prev,
            purchasedCredits: Math.max(0, prev.purchasedCredits - 1),
            totalRemaining: Math.max(0, prev.totalRemaining - 1),
          }
        })

        // 이어 여쭙기 칩(P0-F2) — 0e78efb 의 「칩 제거」 결정을 실측(세션당 3.2문답)으로 뒤집는다.
        setFollowupChips((result.suggestedQuestions ?? []).slice(0, 3))

        // 계측(P0-F4). messages 는 이번 전송 «이전» 스냅샷 — 첫 질문 판정에 그대로 쓴다.
        GAChat.messageSent(turnCount + 1)
        if (!messages.some((m) => m.role === 'user')) GAChat.firstQuestion()
      }
    }

    /** 실패 처리 — 되돌리고 알린다. */
    const applyFailure = (message: string, noCredits = false) => {
      if (noCredits) toast.error('질문 횟수 소진', { action: { label: '충전', onClick: handleRecharge } })
      else toast.error(message)
      GAChat.sendError()
      rollbackSend()
    }

    try {
      let done: StreamDonePayload | null = null
      let handled = false

      // ① 스트리밍(P1-B) — 첫 글자가 바로 흐른다. 미지원 브라우저면 시도조차 하지 않는다
      //    (열린 뒤 폴백하면 질문권이 두 번 차감된다 — stream-client 주석 참조).
      if (canStream()) {
        streamStartedAtRef.current = new Date().toISOString()
        setStreamingText('')
        const outcome = await streamShamanChat(
          { message: textToSend, history, familyMemberId: selectedFamilyId },
          {
            onMeta: (m) => {
              if (m.deityCode) setDeityCode(m.deityCode)
              if (m.emotion) setDeityEmotion(m.emotion)
            },
            onToken: (t) => {
              setStreamingText((prev) => prev + t)
              // 사용자가 위로 올려 읽는 중이면 따라가지 않는다.
              if (isAtBottomRef.current) bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' })
            },
          }
        )
        setStreamingText('')
        if (outcome.status === 'done') done = outcome.payload
        else if (outcome.status === 'rejected') {
          applyFailure(outcome.message, outcome.noCredits)
          handled = true
        } else if (outcome.status === 'error') {
          applyFailure(outcome.message)
          handled = true
        }
        // status === 'unavailable' → 연결 자체가 안 됐다. 차감도 없으니 아래 액션으로 폴백한다.
      }

      // ② 서버 액션 폴백 — 스트리밍 미지원·연결 실패 시
      if (!done && !handled) {
        const result = await sendShamanChatMessage(textToSend, history, turnCount, selectedFamilyId)
        if (result.success && result.response) {
          done = {
            full: result.response,
            suggestedQuestions: result.suggestedQuestions,
            remaining: result.remaining,
            deityCode: result.deityCode,
            emotion: result.emotion,
            bondLeveledUp: result.bondLeveledUp,
            bondLevelName: result.bondLevelName,
          }
        } else {
          applyFailure(result.error || '전송 실패', result.noCredits === true)
          handled = true
        }
      }

      if (done) applySuccess(done)
    } catch {
      applyFailure('오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
      setStreamingText('')
    }

    /** 전송 실패 되돌리기 — 접어 넣었던 선문안까지 함께 걷어내고 인사를 다시 세운다. */
    function rollbackSend() {
      setMessages((prev) => prev.slice(0, greetingMsg ? -2 : -1))
      if (greetingMsg && greeting) setGreeting(greeting)
    }
  }

  const isLimitReached = (questionStatus?.totalRemaining ?? 1) <= 0
  const totalRemaining = questionStatus?.totalRemaining ?? 0
  const isLow = totalRemaining > 0 && totalRemaining <= 3

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 w-full max-w-[480px] flex flex-col bg-background"
      // bottom = 하단 메뉴(60px)만. 이 화면에서는 가이드 공지 바를 띄우지 않으므로
      // (GlobalGuide 의 hidden 경로) --guide-bar-h 는 0 이지만, 변수를 남겨두면
      // 다른 화면에서 세팅된 잔여값이 전환 직후 한 프레임 남을 수 있어 아예 뺀다.
      // 🔴 left/right:0 이면 fixed 가 전역 480px 프레임을 탈출해 PC 에서 풀블리드가 된다 —
      // BottomNav·MobileHeader 와 동일한 center-translate 패턴이 유일한 정답(P0-F3).
      style={{
        top: '56px',
        bottom: '60px',
        zIndex: 10,
      }}
    >
      {/* 배경 ambient — 루트가 프레임 폭이므로 absolute 로 그 안에 갇힌다 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-primary/[0.03] blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[250px] h-[250px] rounded-full bg-gold-600/[0.04] blur-[80px]" />
      </div>

      {/* ── 헤더 (1단 · 정체성 + 더보기) ── */}
      <header
        className="sticky top-0 z-20 flex-shrink-0 border-b border-primary/[0.08]"
        style={{ background: 'rgba(13,13,13,0.96)', backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className={cn(
                  'relative rounded-full bg-gradient-to-br from-[#2a2010] to-surface border border-primary/20 flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(244,228,186,0.08)] transition-all duration-300',
                  deityCode ? 'w-16 h-16' : 'w-11 h-11',
                  bondFx && 'ring-2 ring-gold-500/70 shadow-[0_0_26px_rgba(212,175,55,0.55)] scale-105'
                )}
              >
                {deityCode ? (
                  <DeityFaceAvatar
                    deityCode={deityCode}
                    emotion={deityEmotion}
                    fallback={
                      <Image
                        src="/avatars/haehwajigi.svg"
                        alt="해화지기"
                        width={28}
                        height={28}
                        className="inline-block"
                      />
                    }
                  />
                ) : (
                  <Image src="/avatars/haehwajigi.svg" alt="해화지기" width={24} height={24} className="inline-block" />
                )}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-primary border-2 border-[#0d0d0d]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground/90 tracking-wide leading-tight">
                {deityCode && initialDeity && deityCode === initialDeity.code ? initialDeity.name : '해화지기'}
              </p>
              <p className="text-[10px] text-primary/45 tracking-widest mt-0.5">
                {deityCode && initialDeity && deityCode === initialDeity.code
                  ? '청담해화당 · 좌정 主神'
                  : '청담해화당 · 수석 명리 상담가'}
              </p>
            </div>
          </div>

          {/* 더보기 — 음성·지난대화·새대화·점사대상은 전부 시트로 내렸다(크롬 최소화) */}
          <button
            onClick={() => setShowMore(true)}
            aria-label="대화 설정 열기"
            className="p-2 -mr-1 rounded-lg text-primary/55 hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 새 대화 확인 배너 */}
      <AnimatePresence>
        {showNewChatConfirm && (
          <NewChatConfirmBanner
            onConfirm={handleNewChat}
            onCancel={() => setShowNewChatConfirm(false)}
            cancelLabel={tCommon('cancel')}
          />
        )}
      </AnimatePresence>

      {/* 지난 대화 열람 패널 */}
      <AnimatePresence>
        {showHistory && <PastSessionsPanel familyId={selectedFamilyId} onClose={() => setShowHistory(false)} />}
      </AnimatePresence>

      {/* 광고 보고 향 올리기 시트(P1-A) */}
      {showAdSheet && adAvail && (
        <AdIncenseSheet
          availability={adAvail}
          onClose={() => setShowAdSheet(false)}
          onGranted={(adCredits, reward) => {
            setQuestionStatus((prev) =>
              prev
                ? {
                    ...prev,
                    adCredits,
                    totalRemaining: prev.dailyFreeRemaining + adCredits + prev.purchasedCredits,
                  }
                : prev
            )
            // 하루 1세트 — 지급 즉시 버튼을 내린다(재조회 없이 로컬 반영)
            setAdAvail((prev) => (prev ? { ...prev, enabled: false, reason: 'daily_limit', setsLeftToday: 0 } : prev))
            toast.success(`향이 올랐습니다 — 질문권 +${reward}회`)
          }}
        />
      )}

      {/* 더보기 시트 — 음성·지난대화·새대화·점사대상 */}
      <AnimatePresence>
        {showMore && (
          <ChatMoreSheet
            open={showMore}
            onClose={() => setShowMore(false)}
            ttsSupported={ttsSupported}
            autoSpeak={autoSpeak}
            onToggleAutoSpeak={toggleAutoSpeak}
            onOpenHistory={() => setShowHistory(true)}
            onNewChat={() => setShowNewChatConfirm(true)}
            canStartNewChat={messages.length > 0 && !isLoading}
            familyOptions={familyMembers ?? []}
            selectedFamilyId={selectedFamilyId}
            onFamilyChange={handleFamilyChange}
            disabled={isLoading || isSessionLoading}
          />
        )}
      </AnimatePresence>

      {/* ── 채팅 영역 ── */}
      <div
        ref={chatRef}
        onScroll={handleScroll}
        aria-live="polite"
        aria-label="채팅 메시지 영역"
        className="relative z-10 flex-1 overflow-y-auto px-4 py-5 space-y-3 custom-scrollbar"
      >
        {/* 세션 로딩 스켈레톤 */}
        {isSessionLoading && (
          <div className="flex flex-col gap-3 animate-pulse px-1 pt-2">
            <div className="flex items-end gap-2.5">
              <div className="w-7 h-7 rounded-full bg-primary/[0.08] flex-shrink-0" />
              <div className="h-14 w-52 rounded-2xl rounded-bl-none bg-surface/50" />
            </div>
            <div className="flex justify-end">
              <div className="h-9 w-36 rounded-2xl rounded-br-none bg-primary/5" />
            </div>
            <div className="flex items-end gap-2.5">
              <div className="w-7 h-7 rounded-full bg-primary/[0.08] flex-shrink-0" />
              <div className="h-20 w-60 rounded-2xl rounded-bl-none bg-surface/50" />
            </div>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {/* 메시지 목록 */}
          {!isSessionLoading &&
            messages.map((msg, i) => {
              const prev = messages[i - 1]
              const showAvatar = msg.role === 'assistant' && (!prev || prev.role !== 'assistant')
              return (
                <Bubble
                  key={`${msg.timestamp}-${i}`}
                  msg={msg}
                  showAvatar={showAvatar}
                  onSpeak={ttsSupported ? speakDeity : undefined}
                />
              )
            })}

          {/* 도착 중인 답 — 첫 글자가 오기 전엔 점 세 개, 오기 시작하면 말풍선이 자란다(P1-B) */}
          {isLoading && !streamingText && (
            <motion.div key="typing" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
              <TypingDots />
            </motion.div>
          )}
          {isLoading && streamingText && (
            <Bubble
              key="streaming"
              msg={{ role: 'assistant', content: streamingText, timestamp: streamStartedAtRef.current }}
              showAvatar
            />
          )}
        </AnimatePresence>

        {/* 이어 여쭙기 칩(P0-F2) — 마지막 신위 답변 아래, 응답 대기·선문안 중엔 숨긴다 */}
        {!isSessionLoading &&
          !isLoading &&
          !greeting &&
          followupChips.length > 0 &&
          messages.length > 0 &&
          messages[messages.length - 1].role === 'assistant' && (
            <div className="flex flex-wrap gap-1.5 pl-10 pt-0.5" role="group" aria-label="이어 여쭙기">
              {followupChips.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    GAChat.chipTap('followup')
                    void handleSend(q)
                  }}
                  className="px-3 py-1.5 rounded-full border border-gold-500/25 bg-surface/50 text-[12px] text-gold-200/85 hover:border-gold-500/45 hover:bg-surface/70 active:scale-[0.97] transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

        {/* 선문안 — 지금 막 건네는 말이므로 지난 대화 '아래'에 붙는다. */}
        {!isSessionLoading && greeting && (
          <GreetingIntro
            lines={greeting.lines}
            reduceMotion={reduceMotion ?? false}
            onSpeak={ttsSupported ? speakDeity : undefined}
            quickReplies={greeting.quickReplies}
            onQuickReply={(text) => {
              GAChat.chipTap('greeting')
              void handleSend(text)
            }}
            avatar={
              deityCode ? (
                <DeityFaceAvatar
                  deityCode={deityCode}
                  emotion={deityEmotion}
                  fallback={
                    <Image
                      src="/avatars/haehwajigi.svg"
                      alt="해화지기"
                      width={16}
                      height={16}
                      className="inline-block"
                    />
                  }
                />
              ) : undefined
            }
          />
        )}

        {/* 스크롤 앵커 */}
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* ── 입력 영역 ── */}
      <div
        className="relative z-10 flex-shrink-0 border-t border-primary/[0.08] px-4 pt-2.5 pb-2.5"
        style={{ background: 'rgba(13,13,13,0.96)', backdropFilter: 'blur(16px)' }}
      >
        {/* AI기본법 §31② 결과물 표시 — 신위의 말도 생성형 AI 결과물이다. 세계관을 지우지 않고
            「대신 목소리를 낸다」로 층을 나눈다. 상시 1줄(대화가 흐르면 위로 밀려 사라지므로
            메시지 목록이 아니라 입력 영역에 고정한다). */}
        <ServiceDisclaimer tone="chat" className="mb-2 px-0" />

        {/* 잔여·충전 인라인 한 줄 — 헤더 2단을 대체한다. 한도 임박일 때만 강조. */}
        <div className="flex items-center justify-between gap-2 mb-2 px-0.5">
          {isStatusLoading ? (
            <div className="w-24 h-3 rounded bg-primary/[0.08] animate-pulse" />
          ) : (
            <span className={cn('text-[10.5px]', isLow ? 'text-primary-dark' : 'text-foreground/45')}>
              오늘 남은 질문 <span className="font-medium">{totalRemaining}회</span>
              <span className="text-foreground/25">
                {' '}
                · 보유 {(questionStatus?.walletBalance ?? 0).toLocaleString()}만냥
              </span>
            </span>
          )}
          <div className="flex items-center gap-3">
            {/* 광고 보고 향 올리기(P1-A) — 인벤토리·한도·브레이커 통과 시에만 등장 */}
            {adAvail?.enabled && (
              <button
                onClick={() => setShowAdSheet(true)}
                className="flex items-center gap-1 text-[10.5px] text-gold-400/80 hover:text-gold-300 transition-colors"
              >
                <Flame className="w-3 h-3" />
                광고 보고 +{adAvail.reward}회
              </button>
            )}
            <button
              onClick={handleRecharge}
              disabled={isRecharging || isStatusLoading}
              className="flex items-center gap-1 text-[10.5px] text-primary/60 hover:text-primary transition-colors disabled:opacity-40"
            >
              {isRecharging ? <Loader2 className="w-3 h-3 animate-spin" /> : <Coins className="w-3 h-3" />}
              1만냥 → +20회
            </button>
          </div>
        </div>

        {/* 입력창 */}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(e) => {
                setInputMessage(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder={isLimitReached ? '질문 한도 소진 · 충전해주세요' : '무엇이든 편하게 여쭤보세요…'}
              disabled={isLoading || isLimitReached || isSessionLoading}
              rows={1}
              className={cn(
                'w-full resize-none overflow-hidden',
                'bg-surface/40 border border-primary/15 rounded-2xl',
                'px-4 py-3 pr-4 text-sm text-foreground/80 placeholder:text-foreground/25',
                'focus:border-primary/35 focus:bg-surface/60',
                'focus-visible:ring-0 focus-visible:ring-offset-0',
                'transition-all duration-200',
                'min-h-[46px] max-h-[120px]',
                'backdrop-blur-sm'
              )}
            />
          </div>

          {/* 전송 버튼 */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleSend()}
            disabled={isLoading || !inputMessage.trim() || isLimitReached || isSessionLoading}
            className={cn(
              'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
              'transition-all duration-200',
              inputMessage.trim() && !isLoading && !isLimitReached && !isSessionLoading
                ? 'bg-gradient-to-br from-primary to-primary-dim text-ink-950 shadow-[0_0_16px_rgba(244,228,186,0.2)]'
                : 'bg-surface/40 border border-primary/10 text-primary/30'
            )}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </motion.button>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(244, 228, 186, 0.08);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(244, 228, 186, 0.15);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
