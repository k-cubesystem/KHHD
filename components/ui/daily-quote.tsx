'use client'

import { useEffect, useState } from 'react'
import { Quote } from 'lucide-react'
import { motion } from 'framer-motion'
import { COMFORT_MESSAGES, WELCOME_GREETINGS } from '@/lib/constants/messages'

export function DailyQuote() {
  const [greeting, setGreeting] = useState('')
  const [quote, setQuote] = useState('')

  useEffect(() => {
    // 시간대별 인사
    const hour = new Date().getHours()
    if (hour < 11) setGreeting(WELCOME_GREETINGS.morning)
    else if (hour < 17) setGreeting(WELCOME_GREETINGS.afternoon)
    else if (hour < 21) setGreeting(WELCOME_GREETINGS.evening)
    else setGreeting(WELCOME_GREETINGS.night)

    // 랜덤 명언
    const randomQuote = COMFORT_MESSAGES[Math.floor(Math.random() * COMFORT_MESSAGES.length)]
    setQuote(randomQuote)
  }, [])

  if (!greeting) return null // Hydration mismatch 방지

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="space-y-6"
    >
      <div className="bg-white/60 p-6 rounded-sm border border-zen-border backdrop-blur-sm shadow-sm relative overflow-hidden group hover:border-zen-gold/30 transition-colors">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Quote className="w-12 h-12 text-zen-gold" />
        </div>

        <h3 className="text-xl font-serif font-bold text-zen-text mb-3">{greeting}</h3>

        <p className="text-sm font-sans text-zen-text/70 leading-relaxed italic border-l-2 border-zen-wood/30 pl-4 py-1">
          &quot;{quote}&quot;
        </p>
      </div>
    </motion.div>
  )
}
