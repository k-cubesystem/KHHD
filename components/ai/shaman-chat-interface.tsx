'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  sendShamanChatMessage,
  getShamanChatStarters,
  getAIChatUsageStatus,
  type ShamanChatMessage,
} from '@/app/actions/ai-shaman-chat'
import { Loader2, Crown, Sparkles, Send, Volume2, VolumeX } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export function ShamanChatInterface() {
  const [messages, setMessages] = useState<ShamanChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [turnCount, setTurnCount] = useState(0)
  const [starterQuestions, setStarterQuestions] = useState<string[]>([])
  const [isSoundEnabled, setIsSoundEnabled] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [usageStatus, setUsageStatus] = useState<{
    isPro: boolean
    remaining: number | string
    total: number | string
    used?: number
  } | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

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
      if (result.success && result.questions) {
        setStarterQuestions(result.questions)
      }
    }

    const loadUsageStatus = async () => {
      const result = await getAIChatUsageStatus()
      if (result.success) {
        setUsageStatus({
          isPro: result.isPro ?? false,
          remaining: result.remaining ?? 0,
          total: result.total ?? 0,
          used: result.used ?? 0,
        })
      }
    }

    loadStarters()
    loadUsageStatus()
  }, [])

  // Toggle background sound
  const toggleSound = () => {
    if (!audioRef.current) {
      // Initialize audio (Buddhist temple ambience or zen music)
      audioRef.current = new Audio('/sounds/temple-ambience.mp3')
      audioRef.current.loop = true
      audioRef.current.volume = 0.3
    }

    if (isSoundEnabled) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch((err) => {
        console.warn('Audio play failed:', err)
        toast.error('배경음악 재생에 실패했습니다.')
      })
    }

    setIsSoundEnabled(!isSoundEnabled)
  }

  // Send message
  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage.trim()

    if (!textToSend) {
      toast.error('메시지를 입력해주세요.')
      return
    }

    if (turnCount >= 3) {
      toast.error('대화 횟수가 초과되었습니다. (최대 3회)')
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

        // Update suggested questions
        if (result.suggestedQuestions) {
          setStarterQuestions(result.suggestedQuestions)
        }

        // 사용 횟수 업데이트 (무료 사용자의 경우)
        if (turnCount === 0 && !result.isProUser) {
          const newUsageStatus = await getAIChatUsageStatus()
          if (newUsageStatus.success) {
            setUsageStatus({
              isPro: newUsageStatus.isPro ?? false,
              remaining: newUsageStatus.remaining ?? 0,
              total: newUsageStatus.total ?? 0,
              used: newUsageStatus.used ?? 0,
            })
          }
        }

        toast.success(`응답 완료 (남은 대화: ${result.turnsRemaining}회)`)
      } else {
        // 업그레이드 필요 에러
        if (result.upgradeRequired) {
          toast.error(result.error || '무료 사용 횟수 초과', {
            action: {
              label: '업그레이드',
              onClick: () => (window.location.href = '/protected/membership'),
            },
            duration: 5000,
          })
        }
        // 부적 부족 에러
        else if (result.insufficientTalisman) {
          toast.error(result.error || '부적이 부족합니다', {
            action: {
              label: '충전하기',
              onClick: () => (window.location.href = '/protected/membership'),
            },
            duration: 5000,
          })
        }
        // 일반 에러
        else {
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

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-ink-900 via-ink-800 to-ink-900 overflow-hidden">
      {/* Atmospheric Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Incense Smoke Effect */}
        <div className="absolute bottom-0 left-1/4 w-32 h-96 bg-gradient-to-t from-white/10 via-white/5 to-transparent blur-3xl animate-breathe" />
        <div
          className="absolute bottom-0 right-1/4 w-32 h-96 bg-gradient-to-t from-white/10 via-white/5 to-transparent blur-3xl animate-breathe"
          style={{ animationDelay: '2s' }}
        />

        {/* Ambient Glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-96 h-96 bg-gold-500/20 rounded-full blur-[120px] animate-pulse" />

        {/* Floating Particles */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-gold-300/40 rounded-full"
            initial={{
              x: Math.random() * 1200,
              y: 800,
            }}
            animate={{
              y: -100,
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 10 + Math.random() * 10,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles className="w-6 h-6 text-gold-400" />
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-gold-300">
                AI 신당(神堂)
              </h1>
              <Sparkles className="w-6 h-6 text-gold-400" />
            </div>

            <p className="text-gold-100/80 text-sm mb-4">
              천지인(天地人)의 지혜로 당신의 고민을 풀어드립니다
            </p>

            <div className="flex items-center justify-center gap-3">
              {usageStatus?.isPro ? (
                <Badge className="bg-gold-500/20 text-gold-300 border-gold-500/30 px-3 py-1">
                  <Crown className="w-3 h-3 mr-1" />
                  Pro 무제한
                </Badge>
              ) : (
                <Badge className="bg-seal-500/20 text-seal-300 border-seal-500/30 px-3 py-1">
                  무료 {usageStatus?.remaining}/{usageStatus?.total}
                </Badge>
              )}

              <Badge
                variant={turnCount >= 3 ? 'destructive' : 'default'}
                className={cn(
                  'px-3 py-1',
                  turnCount >= 3
                    ? 'bg-seal-500/20 text-seal-500 border-seal-500/30'
                    : 'bg-ink-700 text-gold-300 border-gold-500/30'
                )}
              >
                대화 {turnCount}/3
              </Badge>

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSound}
                className="text-gold-300 hover:text-gold-400 hover:bg-gold-500/10"
              >
                {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Chat Container */}
        <Card className="bg-ink-800/50 border-gold-500/20 backdrop-blur-sm shadow-2xl">
          <CardHeader className="border-b border-gold-500/20">
            <CardTitle className="text-gold-300 text-center font-serif">신당 상담실</CardTitle>
          </CardHeader>

          <CardContent className="p-6">
            {/* 무료 사용자에게 업그레이드 유도 배너 */}
            {!usageStatus?.isPro && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-4 bg-gradient-to-r from-gold-500/10 to-gold-600/10 border border-gold-500/30 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Crown className="w-5 h-5 text-gold-400" />
                    <div>
                      <p className="text-sm font-bold text-gold-300">
                        프리미엄으로 업그레이드하세요
                      </p>
                      <p className="text-xs text-gold-100/70">무제한 대화 + 부적 50% 할인</p>
                    </div>
                  </div>
                  <Link href="/protected/membership">
                    <Button size="sm" className="bg-gold-500 hover:bg-gold-600 text-ink-900">
                      업그레이드
                    </Button>
                  </Link>
                </div>
              </motion.div>
            )}

            {/* Messages Area */}
            <div className="h-[500px] overflow-y-auto mb-6 space-y-4 pr-2 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {messages.length === 0 && !hasStarted && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center text-gold-100/60 py-20"
                  >
                    <Sparkles className="w-12 h-12 mx-auto mb-4 text-gold-400/50" />
                    <p className="text-lg font-serif">무엇이 궁금하신가요?</p>
                    <p className="text-sm mt-2">아래 예시 질문을 선택하거나 직접 질문해보세요.</p>
                  </motion.div>
                )}

                {messages.map((msg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[80%] rounded-lg px-4 py-3',
                        msg.role === 'user'
                          ? 'bg-gold-500/20 text-gold-100 border border-gold-500/30'
                          : 'bg-ink-700/50 text-gold-100/90 border border-gold-500/20'
                      )}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      <p className="text-xs text-gold-100/50 mt-2">
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
                    <div className="bg-ink-700/50 text-gold-300 rounded-lg px-4 py-3 border border-gold-500/20">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* Starter Questions (Show before conversation starts or after each turn) */}
            {starterQuestions.length > 0 && turnCount < 3 && (
              <div className="mb-4">
                <p className="text-xs text-gold-100/60 mb-2">추천 질문:</p>
                <div className="flex flex-wrap gap-2">
                  {starterQuestions.map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleStarterClick(question)}
                      disabled={isLoading}
                      className="bg-ink-700/30 hover:bg-gold-500/20 text-gold-300 border-gold-500/30 hover:border-gold-500/50 text-xs"
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="flex gap-2">
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
                  turnCount >= 3
                    ? '대화 횟수가 초과되었습니다.'
                    : '무엇이 궁금하신가요? (Shift+Enter로 줄바꿈)'
                }
                disabled={isLoading || turnCount >= 3}
                className="flex-1 bg-ink-700/30 border-gold-500/30 text-gold-100 placeholder:text-gold-100/40 focus:border-gold-500/50 resize-none"
                rows={3}
              />

              <Button
                onClick={() => handleSendMessage()}
                disabled={isLoading || turnCount >= 3 || !inputMessage.trim()}
                className="bg-gold-500 hover:bg-gold-600 text-ink-900 font-semibold px-6"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>

            {/* Info Notice */}
            {turnCount >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 text-center"
              >
                <p className="text-sm text-seal-500">
                  대화가 종료되었습니다. 새로운 상담을 원하시면 페이지를 새로고침해주세요.
                </p>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center text-gold-100/50 text-xs"
        >
          <p>AI 신당은 엔터테인먼트 목적으로 제공됩니다.</p>
          <p>의학적/법적 조언을 대체할 수 없습니다.</p>
        </motion.div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(139, 110, 88, 0.1);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(197, 179, 88, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(197, 179, 88, 0.5);
        }
      `}</style>
    </div>
  )
}
