'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Users, DollarSign, Activity, FileText, LucideIcon, TrendingUp } from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  users: Users,
  revenue: DollarSign,
  records: FileText,
  system: Activity,
}

interface StatCard {
  label: string
  value: string
  sub: string
  iconKey: string
  color: string
}

interface DashboardStatsProps {
  cards: StatCard[]
}

export function DashboardStats({ cards }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
      {cards.map((card, i) => {
        const Icon = ICON_MAP[card.iconKey] || Activity

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
          >
            <Card className="relative p-3.5 bg-gradient-to-br from-stone-800/30 to-stone-900/20 border border-stone-700/30 hover:border-gold-500/30 transition-all overflow-hidden group">
              <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-stone-700/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={cn(
                      'p-1.5 rounded-lg bg-stone-900/50 border border-stone-700/40',
                      card.color
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </div>
                  <TrendingUp className="w-3 h-3 text-stone-600 group-hover:text-gold-400 transition-colors" />
                </div>
                <p className="text-[9px] text-stone-500 uppercase tracking-wider font-medium mb-1">
                  {card.label}
                </p>
                <div className="text-xl font-bold text-stone-100 font-mono tabular-nums leading-tight">
                  {card.value}
                </div>
                <p className="text-[10px] text-stone-600 mt-1">{card.sub}</p>
              </div>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

interface AnimatedHeaderProps {
  title: string
  subtitle: string
}

export function AnimatedHeader({ title, subtitle }: AnimatedHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-4"
    >
      <h1 className="text-xl font-serif font-bold text-stone-100">{title}</h1>
      <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>
    </motion.div>
  )
}
