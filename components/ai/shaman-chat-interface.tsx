'use client'

import { useState, useEffect, useRef, useCallback, memo, type ReactNode } from 'react'
import { logger } from '@/lib/utils/logger'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Textarea } from '@/components/ui/textarea'
import { useTranslations } from 'next-intl'
import {
  sendShamanChatMessage,
  getShamanChatStarters,
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
import type { Greeting } from '@/lib/domain/chat/greeting'
import { GreetingIntro } from '@/components/ai/chat/greeting-intro'
import { ChatMoreSheet } from '@/components/ai/chat/chat-more-sheet'
import { useFamilyMembers } from '@/hooks/use-family-members'
import { useTts } from '@/hooks/useTts'
import { useShrineAudio } from '@/components/shrine/scene/useShrineAudio'
import { voiceProfileFor } from '@/lib/domain/shrine/voice-profiles'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, Send, Coins, MoreHorizontal, X, ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ─── 타이핑 인디케이터 ────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-end gap-2.5 px-1">
      {/* 아바타 */}
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold-600/30 to-gold-700/20 border border-primary/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(244,228,186,0.08)]">
        <Image src="/avatars/haehwajigi.svg" alt="해화지기" width={16} height={16} className="inline-block" />
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
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold-600/30 to-gold-700/20 border border-primary/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(244,228,186,0.08)]">
          <Image src="/avatars/haehwajigi.svg" alt="해화지기" width={16} height={16} className="inline-block" />
        </div>
      ) : (
        <div className="w-7 flex-shrink-0" />
      )}

      <div className="max-w-[76%] space-y-1">
        <div
          className={cn(
            'px-4 py-3.5 rounded-2xl rounded-bl-none text-sm leading-[1.75]',
            'bg-surface/60 border border-primary/8 backdrop-blur-md',
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
              className="text-[10px] text-primary/50 hover:text-gold-300 transition inline-flex items-center gap-0.5"
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
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-label="지난 대화">
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
          <div className="px-4 py-2 border-b border-primary/8">
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
            <div className="divide-y divide-primary/8">
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
                        : 'rounded-bl-none bg-surface/60 border border-primary/8 text-foreground/85'
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

export function ShamanChatInterface({ initialDeity = null }: { initialDeity?: SeatedDeityInfo | null } = {}) {
  const router = useRouter()
  const tCommon = useTranslations('common')
  const reduceMotion = useReducedMotion()
  const [messages, setMessages] = useState<ShamanChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecharging, setIsRecharging] = useState(false)
  const [turnCount, setTurnCount] = useState(0)
  const [starters, setStarters] = useState([
    '올해 재물운 흐름 궁금해요',
    '이직 시기가 맞을까요?',
    '연애운 솔직하게 봐주세요',
    '지금 제 사주 흐름은요?',
    '건강 주의할 점 있나요?',
  ])
  const [questionStatus, setQuestionStatus] = useState<ShamanQuestionStatus | null>(null)
  const [isStatusLoading, setIsStatusLoading] = useState(true)
  /** 선문안 — 신위가 먼저 건넨 오프닝. 대화가 시작되면 메시지 목록으로 자연히 밀려난다. */
  const [greeting, setGreeting] = useState<Greeting | null>(null)
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

  // 세션 로드 및 메시지 복원. 대화가 비어 있으면 선문안(오프닝)을 받아 신위가 먼저 말을 건다.
  const loadSession = useCallback(async (familyMemberId: string) => {
    setIsSessionLoading(true)
    setGreeting(null)
    try {
      const sessionResult = await getOrCreateChatSession(familyMemberId)
      if (!sessionResult.success || !sessionResult.sessionId) {
        setIsSessionLoading(false)
        return
      }
      setSessionId(sessionResult.sessionId)

      let restored: ShamanChatMessage[] = []
      if (!sessionResult.isNew) {
        // 기존 세션 메시지 복원
        const msgResult = await loadChatSessionMessages(sessionResult.sessionId)
        if (msgResult.success && msgResult.messages) {
          restored = msgResult.messages
          setMessages(restored)
          setTurnCount(Math.floor(restored.length / 2))
          // 복원 후 스크롤 맨 아래로
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant', block: 'end' }), 100)
        }
      } else {
        setMessages([])
        setTurnCount(0)
      }

      // 빈 대화일 때만 오프닝. 서버가 저장까지 하므로 재입장 시엔 일반 메시지로 복원된다.
      if (restored.length === 0) {
        const opening = await getChatOpening(familyMemberId)
        if (opening.success && opening.greeting) setGreeting(opening.greeting)
      }
    } finally {
      setIsSessionLoading(false)
    }
  }, [])

  // 초기 로드
  useEffect(() => {
    const load = async () => {
      setIsStatusLoading(true)
      const [statusResult, startersResult] = await Promise.all([getShamanQuestionStatus(), getShamanChatStarters()])
      if (statusResult.success) setQuestionStatus(statusResult)
      if (startersResult.success && startersResult.questions.length > 0) {
        setStarters(startersResult.questions.slice(0, 5))
      }
      setIsStatusLoading(false)
    }
    load()
    loadSession('self')
  }, [loadSession])

  // family 변경 시 해당 세션으로 전환
  const handleFamilyChange = async (newFamilyId: string) => {
    setSelectedFamilyId(newFamilyId)
    setMessages([])
    setTurnCount(0)
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
      setDeityCode(null)
      setDeityEmotion('neutral')
      toast.success('새 대화가 시작되었습니다.')
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
        action: { label: '복채 충전', onClick: () => router.push('/protected/membership') },
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
                totalRemaining: prev.dailyFreeRemaining + (result.newPurchasedCredits ?? prev.purchasedCredits),
              }
            : prev
        )
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
      toast.error('질문 횟수가 소진되었습니다.', { action: { label: '충전하기', onClick: handleRecharge } })
      return
    }

    setIsLoading(true)
    const userMsg: ShamanChatMessage = { role: 'user', content: textToSend, timestamp: new Date().toISOString() }
    setMessages((prev) => [...prev, userMsg])
    setInputMessage('')

    // textarea 높이 리셋
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    // 사용자 메시지 후 바로 스크롤
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 50)

    try {
      const result = await sendShamanChatMessage(textToSend, messages, turnCount, selectedFamilyId)
      if (result.success && result.response) {
        const aiMsg: ShamanChatMessage = {
          role: 'assistant',
          content: result.response,
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

        setQuestionStatus((prev) => {
          if (!prev) return prev
          if (prev.dailyFreeRemaining > 0) {
            return {
              ...prev,
              dailyFreeUsed: prev.dailyFreeUsed + 1,
              dailyFreeRemaining: prev.dailyFreeRemaining - 1,
              totalRemaining: prev.totalRemaining - 1,
            }
          }
          return {
            ...prev,
            purchasedCredits: Math.max(0, prev.purchasedCredits - 1),
            totalRemaining: Math.max(0, prev.totalRemaining - 1),
          }
        })

        if (result.suggestedQuestions?.length) {
          setStarters((prev) => [...(result.suggestedQuestions ?? []), ...prev].slice(0, 5))
        }
      } else {
        if (result.noCredits) toast.error('질문 횟수 소진', { action: { label: '충전', onClick: handleRecharge } })
        else toast.error(result.error || '전송 실패')
        // 실패 시 user 메시지 롤백
        setMessages((prev) => prev.slice(0, -1))
      }
    } catch {
      toast.error('오류가 발생했습니다.')
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setIsLoading(false)
    }
  }

  const isLimitReached = (questionStatus?.totalRemaining ?? 1) <= 0
  const totalRemaining = questionStatus?.totalRemaining ?? 0
  const isLow = totalRemaining > 0 && totalRemaining <= 3
  // 대화 전엔 신위 질문에 대한 '빠른 답', 대화 중엔 이어갈 추천 질문.
  const quickChips = messages.length === 0 ? (greeting?.quickReplies ?? starters.slice(0, 4)) : starters

  return (
    <div
      className="fixed flex flex-col bg-background"
      // bottom = 하단 메뉴(60px) + 가이드 공지 바 높이. 바가 없거나 접히면 변수가 0/작은 값이라
      // 자동으로 되돌아온다. (GlobalGuide 가 --guide-bar-h 를 실측해 세팅)
      style={{
        top: '56px',
        bottom: 'calc(60px + var(--guide-bar-h, 0px))',
        left: 0,
        right: 0,
        zIndex: 10,
      }}
    >
      {/* 배경 ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-primary/3 blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[250px] h-[250px] rounded-full bg-gold-600/4 blur-[80px]" />
      </div>

      {/* ── 헤더 (1단 · 정체성 + 더보기) ── */}
      <header
        className="sticky top-0 z-20 flex-shrink-0 border-b border-primary/8"
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
              <div className="w-7 h-7 rounded-full bg-primary/8 flex-shrink-0" />
              <div className="h-14 w-52 rounded-2xl rounded-bl-none bg-surface/50" />
            </div>
            <div className="flex justify-end">
              <div className="h-9 w-36 rounded-2xl rounded-br-none bg-primary/5" />
            </div>
            <div className="flex items-end gap-2.5">
              <div className="w-7 h-7 rounded-full bg-primary/8 flex-shrink-0" />
              <div className="h-20 w-60 rounded-2xl rounded-bl-none bg-surface/50" />
            </div>
          </div>
        )}

        {/* 선문안 — 신위가 먼저 건네는 오프닝. 사용자가 답하면 그 위로 대화가 이어진다. */}
        {!isSessionLoading && greeting && (
          <GreetingIntro
            lines={greeting.lines}
            reduceMotion={reduceMotion ?? false}
            onSpeak={ttsSupported ? speakDeity : undefined}
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

          {/* 타이핑 */}
          {isLoading && (
            <motion.div key="typing" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
              <TypingDots />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 스크롤 앵커 */}
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* ── 입력 영역 ── */}
      <div
        className="relative z-10 flex-shrink-0 border-t border-primary/8 px-4 pt-2.5 pb-2.5"
        style={{ background: 'rgba(13,13,13,0.96)', backdropFilter: 'blur(16px)' }}
      >
        {/* 빠른 답 — 대화 전이면 신위 질문에 대한 답, 대화 중이면 이어갈 질문 */}
        {quickChips.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-2.5 -mx-1 px-1">
            {quickChips.map((q, i) => (
              <button
                key={`${q}-${i}`}
                onClick={() => handleSend(q)}
                disabled={isLoading || isLimitReached}
                className={cn(
                  'whitespace-nowrap flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11px]',
                  'bg-surface/50 border border-primary/12 text-primary/50',
                  'hover:border-primary/30 hover:text-primary/80 hover:bg-surface/70',
                  'transition-all duration-150 active:scale-95',
                  'disabled:opacity-25'
                )}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* 잔여·충전 인라인 한 줄 — 헤더 2단을 대체한다. 한도 임박일 때만 강조. */}
        <div className="flex items-center justify-between gap-2 mb-2 px-0.5">
          {isStatusLoading ? (
            <div className="w-24 h-3 rounded bg-primary/8 animate-pulse" />
          ) : (
            <span className={cn('text-[10.5px]', isLow ? 'text-primary-dark' : 'text-foreground/45')}>
              오늘 남은 질문 <span className="font-medium">{totalRemaining}회</span>
              <span className="text-foreground/25">
                {' '}
                · 보유 {(questionStatus?.walletBalance ?? 0).toLocaleString()}만냥
              </span>
            </span>
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
              placeholder={isLimitReached ? '질문 한도 소진 · 충전해주세요' : '고민을 편하게 적어주세요...'}
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
