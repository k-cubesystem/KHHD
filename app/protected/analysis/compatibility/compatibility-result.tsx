'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { DestinyTarget } from '@/app/actions/user/destiny'
import { Button } from '@/components/ui/button'
import { Heart, ArrowLeft, Sparkles, Compass, MapPin, UserX, Swords, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ShareSaveButtons } from '@/components/studio/share-save-buttons'
import { RemedyPanel } from '@/components/analysis/RemedyPanel'
import { ServiceDisclaimer } from '@/components/shared/ServiceDisclaimer'
import { AmbientVideo } from '@/components/shared/AmbientVideo'
import { FOCUS_GROUPS, type FocusGroup } from '@/lib/domain/compatibility/focus-groups'
import { useShrineAudio } from '@/components/shrine/scene/useShrineAudio'

interface CategoryBreakdown {
  category: string
  label: string
  assessment: string
  details: string[]
  /** @deprecated v2 이전 캐시 호환 */
  score?: number
}

interface FocusAnswer {
  question: string
  answer: string
  basis?: string
}

interface PastRetrogradeEvent {
  period?: string
  description?: string
  basis?: string
}

export interface CompatibilityResultData {
  overallAssessment?: string
  summary: string
  strengths: string[]
  warnings: string[]
  advice: string
  categoryBreakdown?: CategoryBreakdown[]
  mulsangNarrative?: string
  luckyActions?: string[]
  /** 개운 처방 — 요청자(첫 번째 사람) 기준 한 벌. 엔진 결정론이라 AI 재호출 없음. */
  remedy?: import('@/lib/domain/remedy/remedy').RemedySet
  honestVerdict?: string
  person1Weakness?: string
  person2Weakness?: string
  conflictScenario?: string
  recommendedPlaces?: string[]
  // ── v3 신설 (관계군 맞춤) ──
  focusGroup?: string
  focusAnswers?: FocusAnswer[]
  pastRetrograde?: { events?: PastRetrogradeEvent[] }
  /** @deprecated v2 이전 캐시 호환 */
  score?: number
}

interface CompatibilityResultProps {
  person1: DestinyTarget
  person2: DestinyTarget
  result: CompatibilityResultData
  onReset: () => void
  /** 읽기전용(히스토리 상세 재사용): 공유·저장·리셋 푸터 숨김 */
  readOnly?: boolean
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

// "이게 뭐냐" 한 줄 정의 (§5-1 — AI 아닌 UI 고정 상수, category 키 기준)
const CATEGORY_DEFINITIONS: Record<string, string> = {
  dayMaster: '처음 만나 대화할 때 통하는 정도예요',
  dayBranch: '오래 같이 있어도 편안한지를 봐요',
  elementBalance: '내게 부족한 기운을 상대가 채워주는지 봐요',
  yongsinSynergy: '만날수록 서로 운이 트이는지 봐요',
  sipseongRelation: '서로에게 어떤 존재(돕는 이·이끄는 이)가 되는지 봐요',
  wonjinGwimun: '이유 없이 밉고 예민해지는 기운이 있는지 봐요',
  sinsalCompat: '강한 끌림, 귀인이 되어주는 특별한 기운을 봐요',
  daeunSync: '지금 두 사람의 인생 흐름이 맞물리는지 봐요',
}

export function CompatibilityResult({ person1, person2, result, onReset, readOnly = false }: CompatibilityResultProps) {
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
  const focusAnswers = result.focusAnswers || []
  const pastEvents = result.pastRetrograde?.events || []

  // focusAnswers(개편의 얼굴) 섹션 등장 시 바라 효과음 1회 — 전역 음소거·제스처 정책 존중
  const { play: playShrineFx } = useShrineAudio()
  const focusSoundRef = useRef(false)
  useEffect(() => {
    if (focusAnswers.length > 0 && !focusSoundRef.current) {
      focusSoundRef.current = true
      playShrineFx('bara')
    }
  }, [focusAnswers.length, playShrineFx])
  const placesTitle =
    (result.focusGroup && FOCUS_GROUPS[result.focusGroup as FocusGroup]?.placesLabel) || '함께 가면 좋은 장소'

  return (
    <div className="min-h-screen bg-background pb-24">
      <div id="compatibility-result-capture">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-b from-background to-muted/20 p-6 pb-12">
          {/* 궁합 전용 앰비언트 배경 — 두 기운(금·홍조)의 어우러짐. 없으면 폴백(렌더 안 함), reduced-motion 존중 */}
          <AmbientVideo
            id="compatibility-ambient"
            rate={0.5}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ opacity: 0.16, mixBlendMode: 'screen' }}
          />
          <div className="relative z-10 max-w-2xl mx-auto space-y-8">
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
          {/* ── 이 관계에서 가장 궁금한 것들 (focusAnswers) — 개편의 얼굴 ── */}
          {focusAnswers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}
              className="bg-card border rounded-lg p-6 space-y-4"
            >
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-gold-500" />이 관계에서 가장 궁금한 것들
              </h3>
              <div className="space-y-4">
                {focusAnswers.map((fa, idx) => (
                  <div key={idx} className="space-y-1 border-l-2 border-gold-500/30 pl-3">
                    <p className="text-sm font-bold text-ink-light">{fa.question}</p>
                    <p className="text-sm text-ink-light/80 leading-relaxed whitespace-pre-line">{fa.answer}</p>
                    {fa.basis && <p className="text-xs text-muted-foreground">근거 · {fa.basis}</p>}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

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
              <div className="space-y-1">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-gold-500" />
                  여덟 가지로 본 우리 궁합
                </h3>
                <p className="text-xs text-muted-foreground">어려운 말은 괄호에 담았어요</p>
              </div>
              <div className="space-y-4">
                {categoryBreakdown.map((cat, idx) => (
                  <div key={idx} className="space-y-1 pb-3 border-b border-primary/5 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink-light font-medium">{cat.label}</span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getCategoryAssessmentStyle(cat.assessment || '보통 궁합')}`}
                      >
                        {cat.assessment || '보통 궁합'}
                      </span>
                    </div>
                    {/* ① 이게 뭐냐 (고정 정의) */}
                    {CATEGORY_DEFINITIONS[cat.category] && (
                      <p className="text-[11px] text-muted-foreground/70">{CATEGORY_DEFINITIONS[cat.category]}</p>
                    )}
                    {/* ② 우리 둘은 어떤가 (엔진 details[0]) */}
                    {cat.details[0] && <p className="text-xs text-ink-light/80 leading-relaxed">{cat.details[0]}</p>}
                    {/* ③ 그래서 어떻게 (details 마지막 요소가 별도로 있으면) */}
                    {cat.details.length > 1 && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {cat.details[cat.details.length - 1]}
                      </p>
                    )}
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

          {/* 지난 시간 돌아보기 (pastRetrograde — COUPLE/MARRIAGE 만 생성) */}
          {pastEvents.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.48 }}
              className="bg-card border rounded-lg p-6 space-y-3"
            >
              <h3 className="text-lg font-semibold flex items-center gap-2 text-purple-400">
                <Clock className="w-5 h-5" />
                지난 시간 돌아보기
              </h3>
              {pastEvents.map((ev, i) => (
                <div key={i} className="space-y-1">
                  {ev.period && <p className="text-sm font-medium text-ink-light">{ev.period}</p>}
                  {ev.description && <p className="text-sm text-muted-foreground leading-relaxed">{ev.description}</p>}
                  {ev.basis && <p className="text-xs text-muted-foreground/70">{ev.basis}</p>}
                </div>
              ))}
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

          {/* 개운 처방 — 🔴 요청자 한 사람 기준이다. 두 사람 몫을 나란히 내면 상대의 사주를
              «처방»으로 규정하는 화면이 되고, 상대는 그것을 반박할 자리에 없다. */}
          {result.remedy && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
              <RemedyPanel remedy={result.remedy} title="나를 채우는 것" />
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
                {placesTitle}
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

          {/* AI기본법 §31② — 🔴 캡처 컨테이너 «안». 밖에 두면 카카오로 나가는 이미지에 고지가
              따라가지 않는다(2026-08-13 이전이 그 상태였다) */}
          <ServiceDisclaimer className="mt-6" />
        </div>
      </div>
      {/* end capture */}

      {/* Share & Save (outside capture area) — 읽기전용에선 숨김 */}
      {!readOnly && (
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
      )}
    </div>
  )
}
