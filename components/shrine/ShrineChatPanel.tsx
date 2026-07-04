'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2 } from 'lucide-react'
import { sendShrineChatMessage, type ShrineChatMessage } from '@/app/actions/shrine/shrine-chat'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const STARTERS = [
  '신당의 기운이 어떤가요?',
  '소원이 이루어질 징조가 보이나요?',
  '봉헌물 중 가장 영험한 것은?',
  '어떤 소원을 기원하면 좋을까요?',
  '행운의 날을 알려주세요',
]

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

export function ShrineChatPanel() {
  const [messages, setMessages] = useState<ShrineChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading) return

      const userMsg: ShrineChatMessage = {
        role: 'user',
        content: trimmed,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg])
      setInput('')
      setIsLoading(true)

      const result = await sendShrineChatMessage(trimmed, [...messages, userMsg])
      setIsLoading(false)

      if (result.success && result.response) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: result.response!, timestamp: new Date().toISOString() },
        ])
      } else {
        toast.error('응답 실패. 다시 시도해주세요.')
      }
    },
    [messages, isLoading]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(input)
    }
  }

  return (
    <div className="flex flex-col h-[60vh] min-h-[400px]">
      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
        {messages.length === 0 && (
          <div className="pt-4 space-y-4">
            <div className="text-center">
              <span className="text-4xl">🏮</span>
              <p className="text-ink-light/50 text-sm font-serif mt-2">신당의 무당에게 질문하세요</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-[11px] font-sans px-3 py-1.5 rounded-full transition-all border bg-gold-500/[0.08] border-gold-500/[0.15] text-gold-500/[0.7]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 border bg-gold-500/[0.15] border-gold-500/[0.2]">
                  🔮
                </div>
              )}
              <div className="max-w-[78%] space-y-0.5">
                <div
                  className={cn(
                    'px-4 py-3 rounded-2xl text-sm leading-relaxed font-sans border',
                    msg.role === 'user'
                      ? 'bg-gold-500/[0.12] border-gold-500/[0.2]'
                      : 'bg-white/[0.04] border-white/[0.06]'
                  )}
                  style={
                    msg.role === 'user'
                      ? {
                          color: '#E8E4DC',
                          borderBottomRightRadius: 4,
                        }
                      : {
                          color: '#C8BFA8',
                          borderBottomLeftRadius: 4,
                        }
                  }
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                <p className="text-[9px] text-ink-light/20 font-sans px-1 text-right">{formatTime(msg.timestamp)}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <div className="flex items-center gap-2 px-1">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm border bg-gold-500/[0.15] border-gold-500/[0.2]">
              🔮
            </div>
            <div className="px-4 py-3 rounded-2xl border bg-white/[0.04] border-white/[0.06]">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-gold-500/40 block"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력 영역 */}
      <div className="flex items-end gap-2 pt-3 border-t border-gold-500/[0.08]">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="무당에게 물어보세요..."
          rows={1}
          className="flex-1 bg-white/3 border border-gold-500/10 rounded-xl px-4 py-3 text-sm text-ink-light placeholder:text-ink-light/20 resize-none focus:outline-none focus:border-gold-500/25 font-sans"
          style={{ maxHeight: 120 }}
        />
        <button
          onClick={() => handleSend(input)}
          disabled={isLoading || !input.trim()}
          className="w-11 h-11 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 flex-shrink-0 border bg-gold-500/[0.15] border-gold-500/[0.3]"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-gold-500 animate-spin" />
          ) : (
            <Send className="w-4 h-4 text-gold-500" />
          )}
        </button>
      </div>
    </div>
  )
}
