'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Flame, ChevronRight, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { fadeInUp } from '@/lib/animations'

interface DailyFortuneCardProps {
  userId: string
  userName: string
}

interface FortunePreview {
  content: string
  streak: number
}

export function DailyFortuneCard({ userId, userName }: DailyFortuneCardProps) {
  const router = useRouter()
  const [fortune, setFortune] = useState<FortunePreview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [fortuneRes, streakRes] = await Promise.all([
          import('@/app/actions/fortune/daily').then((m) => m.generateDailyFortune(userId, userId, 'USER')),
          import('@/app/actions/payment/attendance').then((m) => m.checkAttendanceAvailability()),
        ])

        if (cancelled) return

        const content =
          fortuneRes.success && 'content' in fortuneRes && fortuneRes.content
            ? (fortuneRes.content as string).substring(0, 80)
            : '오늘의 운세를 확인해보세요'

        const streak = streakRes && 'streak' in streakRes ? (streakRes.streak as number) : 0

        setFortune({ content, streak })
      } catch {
        setFortune({ content: '오늘의 운세를 확인해보세요', streak: 0 })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [userId])

  return (
    <motion.div variants={fadeInUp}>
      <Card
        className="relative overflow-hidden cursor-pointer border-gold-500/20 bg-gradient-to-br from-gold-500/10 via-surface/50 to-surface/80 backdrop-blur-sm hover:border-gold-500/40 transition-colors"
        onClick={() => router.push('/protected/analysis/today')}
      >
        <div className="p-4 space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gold-500/20 flex items-center justify-center">
                <Flame className="w-4 h-4 text-gold-500" />
              </div>
              <div>
                <p className="text-xs text-gold-500/70 font-sans">{userName}님의 오늘</p>
                <p className="text-sm font-serif text-ink-light">오늘의 운세</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!loading && fortune && fortune.streak > 0 && (
                <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-gold-500/15 text-gold-500">
                  {fortune.streak}일 연속
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-gold-500/50" />
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="w-3 h-3 animate-spin text-gold-500/50" />
              <div className="h-3 w-48 bg-white/5 rounded animate-pulse" />
            </div>
          ) : (
            <p className="text-sm text-ink-light/80 font-sans leading-relaxed line-clamp-2 pl-10">
              {fortune?.content}...
            </p>
          )}
        </div>

        {/* Decorative glow */}
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-gold-500/5 rounded-full blur-2xl" />
      </Card>
    </motion.div>
  )
}
