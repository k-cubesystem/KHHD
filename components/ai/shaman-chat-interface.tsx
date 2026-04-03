'use client'

import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { logger } from '@/lib/utils/logger'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useTranslations } from 'next-intl'
import {
  sendShamanChatMessage,
  getShamanChatStarters,
  getShamanQuestionStatus,
  purchaseShamanQuestions,
  getOrCreateChatSession,
  loadChatSessionMessages,
  saveChatMessages,
  endAndCreateNewSession,
  type ShamanChatMessage,
  type ShamanQuestionStatus,
} from '@/app/actions/ai/shaman-chat'
import { useFamilyMembers } from '@/hooks/use-family-members'
import { useRouter } from 'next/navigation'
import { Loader2, Send, Coins, Flame, Sparkles, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ─── 타이핑 인디케이터 ────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-end gap-2.5 px-1">
      {/* 아바타 */}
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold-600/30 to-gold-700/20 border border-primary/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(244,228,186,0.08)]">
        <span className="text-xs">👺</span>
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

// ─── 메시지 버블 ────────────────────────────────────────
const Bubble = memo(function Bubble({ msg, showAvatar }: { msg: ShamanChatMessage; showAvatar: boolean }) {
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
        <span className="text-[10px] text-primary/30 self-end mb-0.5">{time}</span>
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
          <span className="text-xs">👺</span>
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
          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        </div>
        <p className="text-[10px] text-primary/25 pl-1">{time}</p>
      </div>
    </motion.div>
  )
})

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

// ─── 메인 컴포넌트 ─────────────────────────────────────────
export function ShamanChatInterface() {
  const router = useRouter()
  const tCommon = useTranslations('common')
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

  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('self')
  const { data: familyMembers } = useFamilyMembers()

  // DB 세션 상태
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isSessionLoading, setIsSessionLoading] = useState(true)
  const [showNewChatConfirm, setShowNewChatConfirm] = useState(false)

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

  // 세션 로드 및 메시지 복원
  const loadSession = useCallback(async (familyMemberId: string) => {
    setIsSessionLoading(true)
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

        // DB 저장 (비동기, 실패해도 UI에 영향 없음)
        if (sessionId) {
          saveChatMessages(sessionId, userMsg, aiMsg, messages.length === 0).catch((e) =>
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
  const showStarters = messages.length === 0

  return (
    <div
      className="fixed flex flex-col bg-background"
      style={{ top: '56px', bottom: '60px', left: 0, right: 0, zIndex: 10 }}
    >
      {/* 배경 ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-primary/3 blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[250px] h-[250px] rounded-full bg-gold-600/4 blur-[80px]" />
      </div>

      {/* ── 헤더 (2단 · 고정) ── */}
      <header
        className="sticky top-0 z-20 flex-shrink-0 border-b border-primary/8"
        style={{ background: 'rgba(13,13,13,0.96)', backdropFilter: 'blur(20px)' }}
      >
        {/* 1단: 정체성 + 새 대화 버튼 */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2.5 border-b border-white/4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#2a2010] to-surface border border-primary/20 flex items-center justify-center shadow-[0_0_20px_rgba(244,228,186,0.08)]">
                <span className="text-xl leading-none">👺</span>
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-primary border-2 border-[#0d0d0d]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground/90 tracking-wide leading-tight">해화지기</p>
              <p className="text-[10px] text-primary/45 tracking-widest mt-0.5">청담해화당 · 수석 명리 상담가</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 새 대화 시작 버튼 */}
            {messages.length > 0 && (
              <button
                onClick={() => setShowNewChatConfirm(true)}
                disabled={isLoading}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
                  'text-[11px] text-primary/50 hover:text-primary/80',
                  'border border-primary/15 hover:border-primary/35',
                  'bg-transparent hover:bg-primary/5',
                  'transition-all duration-150',
                  'disabled:opacity-30'
                )}
              >
                <RotateCcw className="w-3 h-3" />새 대화
              </button>
            )}

            {/* 점사 대상 선택 */}
            <div className="flex flex-col items-end gap-1">
              <span className="text-[9px] text-primary/40 leading-none">점사 대상</span>
              <select
                value={selectedFamilyId}
                onChange={(e) => handleFamilyChange(e.target.value)}
                disabled={isLoading || isSessionLoading}
                className="bg-surface/50 border border-primary/20 hover:border-primary/40 transition-colors rounded-lg pl-2 pr-6 py-1 text-xs text-primary/80 outline-none appearance-none cursor-pointer disabled:opacity-50"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgb(244 228 186 / 0.5)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 6px center',
                }}
              >
                <option value="self">나 (본인)</option>
                {familyMembers?.map((member: { id: string; name: string; relation: string }) => (
                  <option key={member.id} value={member.id} className="bg-surface text-foreground">
                    {member.name} ({member.relation})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 2단: 복채 상태 + 충전 */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            {/* 보유 복채 */}
            <div className="flex items-center gap-1.5">
              <Coins className="w-3 h-3 text-primary/40" />
              {isStatusLoading ? (
                <div className="w-12 h-3 rounded bg-primary/8 animate-pulse" />
              ) : (
                <span className="text-[11px] text-foreground/50">
                  보유{' '}
                  <span className="text-primary/70 font-medium">
                    {(questionStatus?.walletBalance ?? 0).toLocaleString()}만냥
                  </span>
                </span>
              )}
            </div>
            {/* 구분선 */}
            <span className="w-px h-3 bg-white/8" />
            {/* 남은 질문 */}
            <div className="flex items-center gap-1.5">
              <Flame className={cn('w-3 h-3', isLow ? 'text-primary-dark/70' : 'text-primary/40')} />
              {isStatusLoading ? (
                <div className="w-10 h-3 rounded bg-primary/8 animate-pulse" />
              ) : (
                <span className={cn('text-[11px]', isLow ? 'text-primary-dark/80' : 'text-foreground/50')}>
                  잔여{' '}
                  <span className={cn('font-medium', isLow ? 'text-primary-dark' : 'text-primary/70')}>
                    {totalRemaining}회
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* 충전 버튼 */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleRecharge}
            disabled={isRecharging || isStatusLoading}
            className="h-6 px-3 rounded-full text-[10px] font-semibold border-primary/20 text-primary/60 hover:border-primary/50 hover:text-primary hover:bg-primary/5"
          >
            {isRecharging ? <Loader2 className="w-3 h-3 animate-spin" /> : '1만냥 → +20회 충전'}
          </Button>
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

        <AnimatePresence mode="popLayout">
          {/* 웰컴 화면 */}
          {!isSessionLoading && messages.length === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6 gap-5"
            >
              {/* 오브 */}
              <motion.div
                animate={{ scale: [1, 1.04, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/12 to-gold-600/6 border border-primary/15 flex items-center justify-center shadow-[0_0_40px_rgba(244,228,186,0.06)]"
              >
                <span className="text-4xl">👺</span>
              </motion.div>

              <div className="space-y-2">
                <h2 className="text-base font-serif text-foreground/70 tracking-wide">어떤 이야기를 꺼내드릴까요</h2>
                <p className="text-xs text-foreground/35 leading-relaxed">
                  말 못 한 고민이 있다면,
                  <br />
                  이곳에서 편히 꺼내보세요.
                </p>
              </div>

              {/* 스타터 질문 */}
              <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
                {starters.map((q, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.07 }}
                    onClick={() => handleSend(q)}
                    disabled={isLoading || isLimitReached}
                    className={cn(
                      'text-left px-4 py-2.5 rounded-xl text-xs',
                      'bg-surface/40 border border-primary/10 backdrop-blur-sm',
                      'text-foreground/55 hover:text-primary/80 hover:border-primary/25 hover:bg-surface/60',
                      'transition-all duration-200 active:scale-[0.98]',
                      'disabled:opacity-30'
                    )}
                  >
                    <span className="text-primary/40 mr-2">✦</span>
                    {q}
                  </motion.button>
                ))}
              </div>

              <p className="text-[10px] text-foreground/20 flex items-center gap-1.5 mt-2">
                <Sparkles className="w-3 h-3 text-primary/30" />
                매일 10회 무료 · 1만냥으로 +20회
                <Sparkles className="w-3 h-3 text-primary/30" />
              </p>
            </motion.div>
          )}

          {/* 메시지 목록 */}
          {!isSessionLoading &&
            messages.map((msg, i) => {
              const prev = messages[i - 1]
              const showAvatar = msg.role === 'assistant' && (!prev || prev.role !== 'assistant')
              return <Bubble key={`${msg.timestamp}-${i}`} msg={msg} showAvatar={showAvatar} />
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
        {/* 대화 중 추천 질문 (가로 스크롤) */}
        {messages.length > 0 && !showStarters && starters.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3 -mx-1 px-1">
            {starters.map((q, i) => (
              <button
                key={i}
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
