'use client'

import { motion } from 'framer-motion'
import { DestinyTarget } from '@/app/actions/destiny-targets'
import { Button } from '@/components/ui/button'
import { Heart, ArrowLeft, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface CompatibilityResultProps {
  person1: DestinyTarget
  person2: DestinyTarget
  result: any
  onReset: () => void
}

export function CompatibilityResult({
  person1,
  person2,
  result,
  onReset,
}: CompatibilityResultProps) {
  const score = result.score || 85
  const summary = result.summary || '궁합 분석 결과'
  const strengths = result.strengths || []
  const warnings = result.warnings || []
  const advice = result.advice || ''

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="bg-gradient-to-b from-background to-muted/20 p-6 pb-12">
        <div className="max-w-2xl mx-auto space-y-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 mx-auto flex items-center justify-center">
              <Heart className="w-10 h-10 text-pink-500 fill-current" />
            </div>
            <h1 className="text-3xl font-bold">궁합 분석 결과</h1>
            <div className="flex items-center justify-center gap-3 text-lg">
              <span className="text-ink-light">{person1.name}</span>
              <Heart className="w-5 h-5 text-pink-500" />
              <span className="text-ink-light">{person2.name}</span>
            </div>
            <p className="text-sm text-muted-foreground">{summary}</p>
          </motion.div>

          {/* Score Circle */}
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
                stroke="url(#gradient-compatibility)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 440} 440`}
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="gradient-compatibility" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-bold text-pink-500">{score}</div>
                <div className="text-xs text-muted-foreground">궁합도</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-3 space-y-6">
        {/* Strengths */}
        {strengths.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card border rounded-lg p-6 space-y-4"
          >
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#D4AF37]" />
              강점
            </h3>
            <div className="flex flex-wrap gap-2">
              {strengths.map((strength: string, idx: number) => (
                <Badge key={idx} variant="outline" className="bg-[#D4AF37]/10 border-[#D4AF37]/30">
                  {strength}
                </Badge>
              ))}
            </div>
          </motion.div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card border rounded-lg p-6 space-y-4"
          >
            <h3 className="text-lg font-semibold text-muted-foreground">⚠️ 주의할 점</h3>
            <div className="flex flex-wrap gap-2">
              {warnings.map((warning: string, idx: number) => (
                <Badge key={idx} variant="outline" className="bg-muted/50 border-muted">
                  {warning}
                </Badge>
              ))}
            </div>
          </motion.div>
        )}

        {/* Advice */}
        {advice && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-pink-500/10 border border-pink-500/20 rounded-lg p-6 space-y-2"
          >
            <h3 className="text-lg font-semibold text-pink-500">💕 관계 조언</h3>
            <p className="text-sm text-ink-light/80 leading-relaxed whitespace-pre-line">
              {advice}
            </p>
          </motion.div>
        )}

        {/* Reset Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Button onClick={onReset} variant="outline" className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            다른 궁합 분석하기
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
