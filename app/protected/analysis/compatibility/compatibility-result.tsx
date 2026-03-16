'use client'

import { motion } from 'framer-motion'
import { DestinyTarget } from '@/app/actions/user/destiny'
import { Button } from '@/components/ui/button'
import { Heart, ArrowLeft, Sparkles, Compass, MapPin, AlertTriangle, UserX, Swords } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ShareSaveButtons } from '@/components/studio/share-save-buttons'

interface CategoryBreakdown {
  category: string
  label: string
  assessment: string
  details: string[]
  /** @deprecated v2 이전 캐시 호환 */
  score?: number
}

interface CompatibilityResultData {
  overallAssessment?: string
  summary: string
  strengths: string[]
  warnings: string[]
  advice: string
  categoryBreakdown?: CategoryBreakdown[]
  mulsangNarrative?: string
  luckyActions?: string[]
  honestVerdict?: string
  person1Weakness?: string
  person2Weakness?: string
  conflictScenario?: string
  recommendedPlaces?: string[]
  /** @deprecated v2 이전 캐시 호환 */
  score?: number
}

interface CompatibilityResultProps {
  person1: DestinyTarget
  person2: DestinyTarget
  result: CompatibilityResultData
  onReset: () => void
}

function getAssessmentColor(assessment: string): string {
  if (assessment === '좋은 궁합') return 'bg-pink-500 text-pink-50'
  if (assessment === '보통 궁합') return 'bg-gold-500 text-yellow-50'
  if (assessment === '어려운 궁합') return 'bg-orange-400 text-orange-50'
  return 'bg-red-500 text-red-50'
}

function getAssessmentBorderColor(assessment: string): string {
  if (assessment === '좋은 궁합') return 'border-pink-500/30'
  if (assessment === '보통 궁합') return 'border-gold-500/30'
  if (assessment === '어려운 궁합') return 'border-orange-400/30'
  return 'border-red-500/30'
}

function getCategoryAssessmentStyle(assessment: string): string {
  if (assessment === '좋은 궁합') return 'text-pink-400 bg-pink-500/10'
  if (assessment === '보통 궁합') return 'text-gold-500 bg-gold-500/10'
  if (assessment === '어려운 궁합') return 'text-orange-400 bg-orange-400/10'
  return 'text-red-400 bg-red-500/10'
}

export function CompatibilityResult({ person1, person2, result, onReset }: CompatibilityResultProps) {
  const overallAssessment = result.overallAssessment || '보통 궁합'
  const summary = result.summary || '궁합 분석 결과'
  const strengths = result.strengths || []
  const warnings = result.warnings || []
  const advice = result.advice || ''
  const categoryBreakdown = result.categoryBreakdown || []
  const mulsangNarrative = result.mulsangNarrative || ''
  const luckyActions = result.luckyActions || []
  const honestVerdict = result.honestVerdict || ''
  const person1Weakness = result.person1Weakness || ''
  const person2Weakness = result.person2Weakness || ''
  const conflictScenario = result.conflictScenario || ''
  const recommendedPlaces = result.recommendedPlaces || []

  return (
    <div className="min-h-screen bg-background pb-24">
      <div id="compatibility-result-capture">
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
              {honestVerdict && (
                <p
                  className={`text-sm font-semibold ${overallAssessment === '좋은 궁합' || overallAssessment === '보통 궁합' ? 'text-gold-500' : 'text-red-400'}`}
                >
                  {honestVerdict}
                </p>
              )}
            </motion.div>

            {/* Assessment Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex justify-center"
            >
              <div className={`px-8 py-4 rounded-2xl border-2 ${getAssessmentBorderColor(overallAssessment)}`}>
                <div
                  className={`text-2xl font-bold font-serif text-center ${getAssessmentColor(overallAssessment).split(' ')[0].replace('bg-', 'text-')}`}
                >
                  {overallAssessment}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto px-3 space-y-6">
          {/* Mulsang Narrative */}
          {mulsangNarrative && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-6 space-y-2"
            >
              <h3 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
                <Compass className="w-5 h-5" />두 사람의 물상 풍경
              </h3>
              <p className="text-sm text-ink-light/80 leading-relaxed">{mulsangNarrative}</p>
            </motion.div>
          )}

          {/* Category Breakdown */}
          {categoryBreakdown.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card border rounded-lg p-6 space-y-4"
            >
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-gold-500" />
                8대 궁합 분석
              </h3>
              <div className="space-y-3">
                {categoryBreakdown.map((cat, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink-light">{cat.label}</span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getCategoryAssessmentStyle(cat.assessment || '보통 궁합')}`}
                      >
                        {cat.assessment || '보통 궁합'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{cat.details[0]}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Person Weaknesses */}
          {(person1Weakness || person2Weakness) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card border rounded-lg p-6 space-y-4"
            >
              <h3 className="text-lg font-semibold flex items-center gap-2 text-orange-400">
                <UserX className="w-5 h-5" />
                각자의 약점
              </h3>
              {person1Weakness && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-ink-light">{person1.name}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{person1Weakness}</p>
                </div>
              )}
              {person2Weakness && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-ink-light">{person2.name}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{person2Weakness}</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Conflict Scenario */}
          {conflictScenario && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="bg-red-500/5 border border-red-500/20 rounded-lg p-6 space-y-2"
            >
              <h3 className="text-lg font-semibold flex items-center gap-2 text-red-400">
                <Swords className="w-5 h-5" />
                예상 갈등 패턴
              </h3>
              <p className="text-sm text-ink-light/80 leading-relaxed">{conflictScenario}</p>
            </motion.div>
          )}

          {/* Strengths */}
          {strengths.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-card border rounded-lg p-6 space-y-4"
            >
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-gold-500" />
                강점
              </h3>
              <div className="flex flex-wrap gap-2">
                {strengths.map((strength: string, idx: number) => (
                  <Badge key={idx} variant="outline" className="bg-gold-500/10 border-gold-500/30">
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
              transition={{ delay: 0.55 }}
              className="bg-card border rounded-lg p-6 space-y-4"
            >
              <h3 className="text-lg font-semibold text-muted-foreground">주의할 점</h3>
              <div className="flex flex-wrap gap-2">
                {warnings.map((warning: string, idx: number) => (
                  <Badge key={idx} variant="outline" className="bg-muted/50 border-muted">
                    {warning}
                  </Badge>
                ))}
              </div>
            </motion.div>
          )}

          {/* Lucky Actions */}
          {luckyActions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-gold-500/10 border border-gold-500/20 rounded-lg p-6 space-y-3"
            >
              <h3 className="text-lg font-semibold text-gold-500">개운 행동</h3>
              <ul className="space-y-2">
                {luckyActions.map((action: string, idx: number) => (
                  <li key={idx} className="text-sm text-ink-light/80 flex items-start gap-2">
                    <span className="text-gold-500 mt-0.5">*</span>
                    {action}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Recommended Places */}
          {recommendedPlaces.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.63 }}
              className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-6 space-y-3"
            >
              <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                함께 가면 좋은 장소
              </h3>
              <ul className="space-y-2">
                {recommendedPlaces.map((place: string, idx: number) => (
                  <li key={idx} className="text-sm text-ink-light/80 flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">*</span>
                    {place}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Advice */}
          {advice && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
              className="bg-pink-500/10 border border-pink-500/20 rounded-lg p-6 space-y-2"
            >
              <h3 className="text-lg font-semibold text-pink-500">관계 조언</h3>
              <p className="text-sm text-ink-light/80 leading-relaxed whitespace-pre-line">{advice}</p>
            </motion.div>
          )}

          {/* Auto-save notice */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.68 }}
            className="text-xs text-muted-foreground text-center"
          >
            이 분석 결과는 사주 기록에 자동 저장되었습니다
          </motion.p>
        </div>
      </div>
      {/* end capture */}

      {/* Share & Save (outside capture area) */}
      <div className="max-w-2xl mx-auto px-3 mt-6 space-y-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <ShareSaveButtons
            resultContainerId="compatibility-result-capture"
            analysisTitle="궁합 분석"
            memberName={`${person1.name} & ${person2.name}`}
          />
        </motion.div>

        {/* Reset Button */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.75 }}>
          <Button onClick={onReset} variant="outline" className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            다른 궁합 분석하기
          </Button>
        </motion.div>
      </div>
    </div>
  )
}
