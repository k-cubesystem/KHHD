'use client'

import { motion } from 'framer-motion'
import { DestinyTarget } from '@/app/actions/destiny-targets'
import { Sparkles } from 'lucide-react'

interface CheonjiinSummaryProps {
  data: any
  target: DestinyTarget
}

export function CheonjiinSummary({ data, target }: CheonjiinSummaryProps) {
  if (!data) return null

  const score = data.score || 85
  const summary = data.summary || '운명 분석 결과'
  const lucky = data.lucky || {}

  return (
    <div className="bg-gradient-to-b from-background to-muted/20 p-6 pb-12">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-[#F4E5C3]/20 mx-auto flex items-center justify-center text-4xl">
            ✨
          </div>
          <h1 className="text-3xl font-bold">{target.name}님의 천지인 분석</h1>
          <p className="text-sm text-muted-foreground">{summary}</p>
        </motion.div>

        {/* 점수 원형 차트 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative w-40 h-40 mx-auto"
        >
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted-foreground/20"
            />
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 440} 440`}
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#D4AF37" />
                <stop offset="100%" stopColor="#F4E5C3" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl font-bold text-[#D4AF37]">{score}</div>
              <div className="text-xs text-muted-foreground">운명도</div>
            </div>
          </div>
        </motion.div>

        {/* 행운의 키워드 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card border rounded-lg p-6 space-y-4"
        >
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#D4AF37]" />
            행운의 키워드
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">색상</div>
              <div className="text-base font-medium">{lucky.color || '금색'}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">방향</div>
              <div className="text-base font-medium">{lucky.direction || '동쪽'}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">숫자</div>
              <div className="text-base font-medium">{lucky.number || 7}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">조언</div>
              <div className="text-sm text-muted-foreground line-clamp-2">
                {lucky.advice || '긍정적인 마음가짐'}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
