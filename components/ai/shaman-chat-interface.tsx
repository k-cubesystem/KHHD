'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { BrandQuote } from '@/components/ui/BrandQuote'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  sendShamanChatMessage,
  getShamanChatStarters,
  getAIChatUsageStatus,
  type ShamanChatMessage,
} from '@/app/actions/ai/shaman-chat'
import { Loader2, Send, Sparkles, MessageSquare, Coins, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { BRAND_QUOTES } from '@/lib/constants/brand-quotes'

export function ShamanChatInterface({ children }: { children?: React.ReactNode }) {
  const [messages, setMessages] = useState<ShamanChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
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
  // Mocking usage status based on user request "복채 1만냥 질문 10개"
  const [usageStatus, setUsageStatus] = useState<{
    isPro: boolean
    remaining: number | string
    total: number | string
    used?: number
    bokchae?: string
  }>({
    isPro: true,
    remaining: 10,
    total: 10,
    used: 0,
    bokchae: '10,000',
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load starter questions & usage status
  useEffect(() => {
    const loadStarters = async () => {
      const result = await getShamanChatStarters()
      if (result.success && result.questions && result.questions.length > 0) {
        // Merge with defaults or override, preserving at least 6
        setStarterQuestions((prev) => [...result.questions!.slice(0, 6), ...prev].slice(0, 8))
      }
    }

    // In a real scenario we fetch this, but user asked to hardcode/mock specific values for now
    // loadUsageStatus()

    loadStarters()
  }, [])

  // Send message
  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage.trim()

    if (!textToSend) {
      toast.error('메시지를 입력해주세요.')
      return
    }

    if (
      usageStatus.remaining !== 'unlimited' &&
      typeof usageStatus.remaining === 'number' &&
      usageStatus.remaining <= 0
    ) {
      toast.error('질문 횟수가 모두 소진되었습니다. 복채를 충전해주세요.')
      return
    }

    setIsLoading(true)
    setHasStarted(true)

    // Add user message
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
        // Add assistant response
        const assistantMessage: ShamanChatMessage = {
          role: 'assistant',
          content: result.response,
          timestamp: new Date().toISOString(),
        }

        setMessages((prev) => [...prev, assistantMessage])
        setTurnCount((prev) => prev + 1)

        // Mock decrement
        setUsageStatus((prev) => ({
          ...prev,
          remaining:
            typeof prev.remaining === 'number' ? Math.max(0, prev.remaining - 1) : prev.remaining,
        }))

        // Update suggested questions
        if (result.suggestedQuestions) {
          setStarterQuestions((prev) =>
            result.suggestedQuestions ? [...result.suggestedQuestions, ...prev].slice(0, 6) : prev
          )
        }

        toast.success(`응답 완료`)
      } else {
        // 에러 처리
        if (result.upgradeRequired || result.insufficientTalisman) {
          toast.error('질문 횟수가 부족합니다. 복채를 충전해주세요.', {
            action: {
              label: '충전',
              onClick: () => (window.location.href = '/protected/membership'),
            },
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

  // Handle starter question click
  const handleStarterClick = (question: string) => {
    handleSendMessage(question)
  }

  const isLimitReached = typeof usageStatus.remaining === 'number' && usageStatus.remaining <= 0

  return (
    <div className="relative min-h-screen bg-background text-ink-light overflow-hidden flex flex-col items-center">
      {/* Main Content */}
      <div className="relative z-10 container max-w-2xl mx-auto px-4 py-6 flex-1 flex flex-col">
        {/* Header */}
        <header className="text-center mb-6 space-y-2">
          <h1 className="text-xl md:text-2xl font-serif font-bold text-ink-light flex items-center justify-center gap-2">
            해화당 고민 상담소
          </h1>
          <p className="text-xs text-ink-light/60 font-light">
            당신의 깊은 고민을 듣고, 명리학적 관점에서 해답을 제안합니다.
          </p>
        </header>

        {/* Stats Bar */}
        <div className="flex items-center justify-center gap-4 mb-6 text-xs text-ink-light/50 bg-surface/30 py-2 pl-4 pr-2 rounded-full w-fit mx-auto border border-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-primary" />
            <span className="text-ink-light">보유 복채</span>
            <span className="font-medium text-primary ml-1">{usageStatus.bokchae}냥</span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-ink-light/40" />
            <span>남은 질문</span>
            <span className="font-medium text-ink-light ml-1">{usageStatus.remaining}회</span>
          </div>
          <Link href="/protected/membership">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 ml-1 text-[10px] bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-full"
            >
              충전 <Plus className="w-3 h-3 ml-0.5" />
            </Button>
          </Link>
        </div>

        {/* Chat Area */}
        <Card className="flex-1 bg-surface/20 border border-white/5 shadow-inner rounded-2xl overflow-hidden flex flex-col">
          <CardContent className="flex-1 p-0 flex flex-col">
            {/* Messages Scroll Area */}
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

            {/* Input Section */}
            <div className="p-4 bg-surface/30 border-t border-white/5">
              {/* Starters */}
              {starterQuestions.length > 0 && messages.length < 2 && (
                <div className="flex overflow-x-auto gap-2 pb-3 mb-1 no-scrollbar mask-grad-right">
                  {starterQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleStarterClick(q)}
                      disabled={isLoading}
                      className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-ink-light/70 hover:bg-white/10 hover:text-primary transition-colors hover:border-primary/20"
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
                    isLimitReached ? '질문 한도가 초과되었습니다.' : '고민을 자세히 적어주세요...'
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

      {/* Event Banners (Server Component passed as child) */}
      {/* Removed children as per instruction */}

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
