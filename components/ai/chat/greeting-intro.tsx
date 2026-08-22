'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { GreetingLine } from '@/lib/domain/chat/greeting'
import { cn } from '@/lib/utils'

/**
 * 선문안 렌더 — 신위가 먼저 건네는 오프닝을 줄 단위로 시차 출력한다.
 * narration 줄은 말풍선이 아니라 중앙 이탤릭으로(ZETA 내레이션 UI 원리).
 *
 * 줄마다 지연을 주는 이유: 한 번에 다 떠 있으면 "미리 써둔 안내문"으로 읽히고,
 * 순서대로 도착해야 말을 거는 것으로 읽힌다.
 */
export function GreetingIntro({
  lines,
  avatar,
  onSpeak,
  reduceMotion,
  quickReplies,
  onQuickReply,
}: {
  lines: GreetingLine[]
  avatar?: React.ReactNode
  onSpeak?: (text: string) => void
  reduceMotion?: boolean
  /** 마지막 질문에 답하기 쉬운 빠른 답 칩(P0-F2). 없으면 종전과 동일하게 칩 없이 렌더. */
  quickReplies?: string[]
  /** 칩 탭 → 그 문장을 즉시 전송. 미지정이면 칩을 그리지 않는다. */
  onQuickReply?: (text: string) => void
}) {
  const step = reduceMotion ? 0 : 0.55

  return (
    <div className="space-y-3">
      {lines.map((line, i) => {
        const delay = i * step

        if (line.kind === 'narration') {
          return (
            <motion.p
              key={`n-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.5, delay }}
              className="text-center text-[11px] italic text-foreground/50 px-8 leading-relaxed"
            >
              {line.text}
            </motion.p>
          )
        }

        // 말풍선 — 첫 speech 줄에만 아바타를 붙인다(연속 발화는 여백만).
        const isFirstSpeech = lines.findIndex((l) => l.kind === 'speech') === i

        return (
          <motion.div
            key={`s-${i}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.35, delay, ease: 'easeOut' }}
            className="flex items-end gap-2.5 px-1"
          >
            {isFirstSpeech && avatar ? (
              <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border border-primary/20 bg-gradient-to-br from-gold-600/30 to-gold-700/20 flex items-center justify-center relative shadow-[0_0_10px_rgba(244,228,186,0.08)]">
                {avatar}
              </div>
            ) : isFirstSpeech ? (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold-600/30 to-gold-700/20 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Image src="/avatars/haehwajigi.svg" alt="해화지기" width={16} height={16} className="inline-block" />
              </div>
            ) : (
              <div className="w-7 flex-shrink-0" />
            )}

            <div className="max-w-[80%] space-y-1">
              <div
                className={cn(
                  'px-4 py-3.5 rounded-2xl rounded-bl-none text-sm leading-[1.75]',
                  'bg-surface/60 border border-primary/[0.08] backdrop-blur-md',
                  'text-foreground/85 shadow-[0_2px_24px_rgba(0,0,0,0.3)]'
                )}
              >
                <p className="whitespace-pre-wrap break-words">{line.text}</p>
              </div>
              {onSpeak && (
                <button
                  type="button"
                  onClick={() => onSpeak(line.text)}
                  aria-label="음성으로 듣기"
                  className="text-[10px] text-primary/50 hover:text-gold-300 transition inline-flex items-center gap-0.5 pl-1"
                >
                  🔊 듣기
                </button>
              )}
            </div>
          </motion.div>
        )
      })}

      {/* 이어 여쭙기 칩 — 모든 줄이 도착한 뒤에 나타난다. 탭 한 번이 곧 다음 질문(P0-F2). */}
      {quickReplies && quickReplies.length > 0 && onQuickReply && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.3, delay: lines.length * step + 0.1 }}
          className="flex flex-wrap gap-1.5 pl-10 pt-0.5"
          role="group"
          aria-label="빠른 답"
        >
          {quickReplies.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onQuickReply(q)}
              className="px-3 py-1.5 rounded-full border border-gold-500/25 bg-surface/50 text-[12px] text-gold-200/85 hover:border-gold-500/45 hover:bg-surface/70 active:scale-[0.97] transition-all"
            >
              {q}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  )
}
