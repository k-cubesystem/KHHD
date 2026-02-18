'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  sendShamanChatMessage,
  getShamanChatStarters,
  getShamanQuestionStatus,
  purchaseShamanQuestions,
  type ShamanChatMessage,
  type ShamanQuestionStatus,
} from '@/app/actions/ai/shaman-chat'
import { Loader2, Send, MessageSquare, Coins, Flame } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function ShamanChatInterface() {
  const [messages, setMessages] = useState<ShamanChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecharging, setIsRecharging] = useState(false)
  const [turnCount, setTurnCount] = useState(0)
  const [starterQuestions, setStarterQuestions] = useState<string[]>([
    '오늘의 총운이 궁금해요',
    '이번 달 재물운 흐름은?',
    '이직하기 좋은 시기가 언제인가요?',
    '올해 연애운과 결혼운 알려줘',
    '건강상 주의해야 할 점은?',
    '꿈해몽 부탁드려요',
  ])
  const [hasStarted, setHasStarted] = useState(false)
  const [questionStatus, setQuestionStatus] = useState<ShamanQuestionStatus | null>(null)
  const [isStatusLoading, setIsStatusLoading] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (messages.length > 0) scrollToBottom()
  }, [messages])

  // 초기 데이터 로드
  useEffect(() => {
    const load = async () => {
      setIsStatusLoading(true)
      const [statusResult, startersResult] = await Promise.all([
        getShamanQuestionStatus(),
        getShamanChatStarters(),
      ])
      if (statusResult.success) {
        setQuestionStatus(statusResult)
      }
      if (startersResult.success && startersResult.questions.length > 0) {
        setStarterQuestions(startersResult.questions.slice(0, 6))
      }
      setIsStatusLoading(false)
    }
    load()
  }, [])

  // 질문권 충전
  const handleRecharge = async () => {
    const balance = questionStatus?.walletBalance ?? 0
    if (balance < 1) {
      toast.error(`복채가 부족합니다`, {
        description: `현재 ${balance.toLocaleString()}만냥 보유 중. 1만냥이 필요합니다.`,
        action: {
          label: '복채 충전',
          onClick: () => (window.location.href = '/protected/membership'),
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
                  prev.dailyFreeRemaining + (result.newPurchasedCredits ?? prev.purchasedCredits),
              }
            : prev
        )
        toast.success('질문권 20회 충전 완료!', {
          description: `복채 1만냥이 차감되었습니다. 남은 복채: ${(result.remainingBalance ?? 0).toLocaleString()}만냥`,
        })
      } else {
        toast.error(result.error || '충전 실패')
      }
    } finally {
      setIsRecharging(false)
    }
  }

  // 메시지 전송
  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage.trim()
    if (!textToSend) return

    const totalRemaining = questionStatus?.totalRemaining ?? 0
    if (totalRemaining <= 0) {
      toast.error('질문 횟수가 부족합니다.', {
        description: '복채 1만냥으로 질문권 20회를 충전하세요.',
        action: { label: '충전하기', onClick: handleRecharge },
      })
      return
    }

    setIsLoading(true)
    setHasStarted(true)

    const userMessage: ShamanChatMessage = {
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInputMessage('')

    try {
      const result = await sendShamanChatMessage(textToSend, messages, turnCount)

      if (result.success && result.response) {
        const assistantMessage: ShamanChatMessage = {
          role: 'assistant',
          content: result.response,
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, assistantMessage])
        setTurnCount((prev) => prev + 1)

        // 질문권 1개 소비 반영
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

        if (result.suggestedQuestions) {
          setStarterQuestions((prev) =>
            result.suggestedQuestions ? [...result.suggestedQuestions, ...prev].slice(0, 6) : prev
          )
        }
      } else {
        if (result.noCredits) {
          toast.error('질문 횟수가 모두 소진되었습니다.', {
            action: { label: '충전하기', onClick: handleRecharge },
          })
        } else {
          toast.error(result.error || '메시지 전송 실패')
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      toast.error('예기치 않은 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStarterClick = (question: string) => handleSendMessage(question)

  const isLimitReached = (questionStatus?.totalRemaining ?? 1) <= 0
  const totalRemaining = questionStatus?.totalRemaining ?? 0

  return (
    <div className="relative min-h-screen bg-background text-ink-light overflow-hidden flex flex-col items-center">
      <div className="relative z-10 container max-w-2xl mx-auto px-4 py-6 flex-1 flex flex-col">
        {/* Header */}
        <header className="text-center mb-6 space-y-3">
          <h1 className="text-xl md:text-2xl font-serif font-bold text-ink-light flex items-center justify-center gap-2">
            해화당 고민 상담소
          </h1>
          <p className="text-xs text-ink-light/70 font-light leading-relaxed break-keep max-w-md mx-auto">
            단순한 위로가 아닌, 귀하의{' '}
            <strong className="text-primary font-medium">사주 명식</strong>을 정밀하게 분석하여
            <br className="hidden md:block" />
            나아갈 길과 피해야 할 길을 명확히 일러드립니다.
            <br />
            <span className="opacity-80 mt-1 block">
              매일 <strong className="text-primary font-medium">10회 무료</strong> 제공 · 복채 1만
              냥으로 <strong className="text-primary font-medium">+20회 추가 충전</strong>
            </span>
          </p>
        </header>

        {/* Status Bar */}
        <div className="mb-6 flex flex-col gap-2">
          {/* 3분할 현황 */}
          <div className="grid grid-cols-3 gap-2">
            {/* 보유 복채 */}
            <div className="px-3 py-2 rounded-xl bg-surface/40 border border-white/10 text-center backdrop-blur-sm">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Coins className="w-3 h-3 text-yellow-400" />
                <span className="text-[10px] text-ink-light/50">보유 복채</span>
              </div>
              {isStatusLoading ? (
                <div className="h-4 bg-white/5 rounded animate-pulse mx-2" />
              ) : (
                <p className="text-xs font-bold text-yellow-400">
                  {(questionStatus?.walletBalance ?? 0).toLocaleString()}
                  <span className="font-normal text-ink-light/40">만냥</span>
                </p>
              )}
            </div>

            {/* 일일 무료 */}
            <div className="px-3 py-2 rounded-xl bg-surface/40 border border-white/10 text-center backdrop-blur-sm">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Flame className="w-3 h-3 text-primary" />
                <span className="text-[10px] text-ink-light/50">일일 무료</span>
              </div>
              {isStatusLoading ? (
                <div className="h-4 bg-white/5 rounded animate-pulse mx-2" />
              ) : (
                <p className="text-xs font-bold text-primary">
                  {questionStatus?.dailyFreeRemaining ?? 0}
                  <span className="font-normal text-ink-light/40">
                    /{questionStatus?.dailyFreeTotal ?? 10}
                  </span>
                </p>
              )}
            </div>

            {/* 구매 질문권 */}
            <div className="px-3 py-2 rounded-xl bg-surface/40 border border-white/10 text-center backdrop-blur-sm">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <MessageSquare className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] text-ink-light/50">구매 질문권</span>
              </div>
              {isStatusLoading ? (
                <div className="h-4 bg-white/5 rounded animate-pulse mx-2" />
              ) : (
                <p className="text-xs font-bold text-emerald-400">
                  {questionStatus?.purchasedCredits ?? 0}
                  <span className="font-normal text-ink-light/40">회</span>
                </p>
              )}
            </div>
          </div>

          {/* 총 잔여 + 충전 버튼 */}
          <div className="flex items-center gap-2">
            <div className="flex-1 px-4 py-1.5 rounded-full bg-surface/30 border border-white/10 text-xs text-ink-light/70 flex items-center gap-2 backdrop-blur-sm">
              <span>
                총 사용 가능:{' '}
                <span
                  className={cn('font-bold', totalRemaining <= 3 ? 'text-red-400' : 'text-primary')}
                >
                  {totalRemaining}
                </span>
                회
              </span>
              {totalRemaining <= 3 && totalRemaining > 0 && (
                <span className="text-red-400/70 text-[10px]">· 곧 소진</span>
              )}
              {totalRemaining === 0 && (
                <span className="text-red-400/70 text-[10px]">· 소진됨</span>
              )}
            </div>

            <Button
              size="sm"
              onClick={handleRecharge}
              disabled={isRecharging || isStatusLoading}
              className="h-8 px-4 rounded-full bg-[#D4AF37] hover:bg-[#F4E4BA] text-[#0A0A0A] text-xs font-bold transition-all shadow-[0_2px_10px_rgba(212,175,55,0.15)] active:scale-95 disabled:opacity-50"
            >
              {isRecharging ? <Loader2 className="w-3 h-3 animate-spin" /> : '충전 (1만냥→+20회)'}
            </Button>
          </div>
        </div>

        {/* Chat Area */}
        <Card className="flex-1 bg-surface/20 border border-white/5 shadow-inner rounded-2xl overflow-hidden flex flex-col">
          <CardContent className="flex-1 p-0 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar min-h-[400px]">
              <AnimatePresence mode="popLayout">
                {messages.length === 0 && !hasStarted && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="h-full flex flex-col items-center justify-center text-center p-6 opacity-70"
                  >
                    <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mb-4">
                      <MessageSquare className="w-6 h-6 text-primary/60" strokeWidth={1} />
                    </div>
                    <h3 className="text-lg font-serif text-ink-light mb-2">
                      어떤 고민이 있으신가요?
                    </h3>
                    <p className="text-sm text-ink-light/50 max-w-xs leading-relaxed">
                      누구에게도 말하지 못한 고민,
                      <br />
                      해화당이 지혜를 담아 들어드리겠습니다.
                    </p>
                  </motion.div>
                )}

                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm',
                        msg.role === 'user'
                          ? 'bg-primary text-black rounded-tr-none'
                          : 'bg-surface border border-white/5 text-ink-light rounded-tl-none'
                      )}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p
                        className={cn(
                          'text-[10px] mt-1.5 opacity-50',
                          msg.role === 'user' ? 'text-black' : 'text-ink-light'
                        )}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </motion.div>
                ))}

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-surface/50 border border-white/5 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
                      <span className="text-xs text-ink-light/50">답변을 준비하고 있습니다...</span>
                      <Loader2 className="w-3 h-3 text-primary animate-spin" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-surface/30 border-t border-white/5">
              {starterQuestions.length > 0 && messages.length < 2 && (
                <div className="flex overflow-x-auto gap-2 pb-3 mb-1 no-scrollbar mask-grad-right">
                  {starterQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleStarterClick(q)}
                      disabled={isLoading || isLimitReached}
                      className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-ink-light/70 hover:bg-white/10 hover:text-primary transition-colors hover:border-primary/20 disabled:opacity-40"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              <div className="relative">
                <Textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  placeholder={
                    isLimitReached
                      ? '질문 한도가 소진되었습니다. 충전해주세요.'
                      : '고민을 자세히 적어주세요...'
                  }
                  disabled={isLoading || isLimitReached}
                  className="w-full bg-black/20 border-white/10 focus:border-primary/50 min-h-[50px] pr-12 resize-none rounded-xl text-sm"
                />
                <Button
                  size="icon"
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || !inputMessage.trim() || isLimitReached}
                  className="absolute right-2 bottom-2 h-8 w-8 rounded-lg bg-primary text-black hover:bg-primary/90"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="mt-2 text-center">
                <p className="text-[10px] text-ink-light/30">
                  AI 상담 결과는 참고용이며, 심층적인 분석은 전문가 상담을 권장합니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .mask-grad-right {
          mask-image: linear-gradient(to right, black 90%, transparent 100%);
          -webkit-mask-image: linear-gradient(to right, black 90%, transparent 100%);
        }
      `}</style>
    </div>
  )
}
