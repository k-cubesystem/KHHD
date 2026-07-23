'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, User, Heart, Check, ArrowRight } from 'lucide-react'
import { DestinyTarget } from '@/app/actions/user/destiny'
import { toast } from 'sonner'
import { analyzeCompatibilityAction } from '@/app/actions/ai/compatibility'
import { useAnalysisQuota } from '@/hooks/use-analysis-quota'
import { deductTalisman, getWalletBalance, refundStudioCost } from '@/app/actions/payment/wallet'
import { FEATURE_COST } from '@/lib/domain/payment/feature-costs'
import { useInsufficientBokchae } from '@/hooks/use-insufficient-bokchae'
import { InsufficientBokchaeModal } from '@/components/payment/insufficient-bokchae-modal'
import { PaywallModal } from '@/components/shared/paywall-modal'
import { CompatibilityResult } from './compatibility-result'
import { CompatibilityLoading } from './compatibility-loading'
import { RELATIONSHIP_TYPES, RELATIONSHIP_CATEGORIES, CATEGORY_LABELS } from '@/lib/constants/relationship-types'
import { getFocusGroupSpec } from '@/lib/domain/compatibility/focus-groups'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CompatibilityClientProps {
  targets: DestinyTarget[]
  fixedTargetId?: string
}

const COMPATIBILITY_COST = FEATURE_COST.compatibility.display // 단일 소스 — 표시 = 실차감(2만냥)

// 가족 등록 관계값(한글) → 궁합 관계 셀렉트 값 추정 규칙 (§7 자동 프리셋)
const RELATION_TYPE_RULES: Array<{ match: (rt: string) => boolean; value: string }> = [
  { match: (rt) => rt.includes('배우자') || rt.includes('부부'), value: 'spouse' },
  {
    match: (rt) => ['자녀', '아들', '딸', '부모', '아버지', '어머니'].some((k) => rt.includes(k)),
    value: 'parent_child',
  },
  { match: (rt) => rt.includes('형제') || rt.includes('자매') || rt.includes('남매'), value: 'siblings' },
  { match: (rt) => rt.includes('연인') || rt.includes('애인'), value: 'lover' },
  { match: (rt) => rt.includes('친구'), value: 'friend' },
  { match: (rt) => rt.includes('동료') || rt.includes('직장'), value: 'coworker' },
]

function relationTypeToValue(rt?: string | null): string | null {
  if (!rt) return null
  for (const rule of RELATION_TYPE_RULES) {
    if (rule.match(rt)) return rule.value
  }
  return null
}

// 두 대상의 관계 자동 추정 (본인 기준 상대의 관계, 매핑 불가 시 null)
function inferRelationship(p1: DestinyTarget, p2: DestinyTarget): string | null {
  const rt1 = p1.relation_type
  const rt2 = p2.relation_type
  const other = rt1 === '본인' ? rt2 : rt2 === '본인' ? rt1 : rt2
  return relationTypeToValue(other)
}

export function CompatibilityClient({ targets, fixedTargetId }: CompatibilityClientProps) {
  const router = useRouter()
  const fixedTarget = fixedTargetId ? (targets.find((t) => t.id === fixedTargetId) ?? null) : null
  const [person1, setPerson1] = useState<DestinyTarget | null>(fixedTarget)
  const [person2, setPerson2] = useState<DestinyTarget | null>(null)
  const [relationship, setRelationship] = useState<string>('lover')
  const [relationshipTouched, setRelationshipTouched] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null)
  const { checkQuota, paywallProps } = useAnalysisQuota()
  const { bokchaeModal, closeBokchaeModal, handleDeductResult } = useInsufficientBokchae()
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  useEffect(() => {
    getWalletBalance().then(setWalletBalance)
  }, [])

  // 관계 자동 프리셋(§7): 두 대상이 정해지고 사용자가 수동으로 안 바꿨을 때만 추정값 적용. 수동 변경 항상 가능.
  useEffect(() => {
    if (relationshipTouched || !person1 || !person2) return
    const inferred = inferRelationship(person1, person2)
    if (inferred) setRelationship(inferred)
  }, [person1, person2, relationshipTouched])

  const handleSelectPerson = (target: DestinyTarget, personNumber: 1 | 2) => {
    if (personNumber === 1) {
      if (person2?.id === target.id) {
        toast.error('같은 사람을 선택할 수 없습니다.')
        return
      }
      setPerson1(target)
    } else {
      if (person1?.id === target.id) {
        toast.error('같은 사람을 선택할 수 없습니다.')
        return
      }
      setPerson2(target)
    }
  }

  const handleAnalyze = async () => {
    if (!person1 || !person2) {
      toast.error('두 사람을 모두 선택해주세요.')
      return
    }

    if (!relationship) {
      toast.error('관계를 선택해주세요.')
      return
    }

    const canProceed = await checkQuota()
    if (!canProceed) return

    // 복채 차감(2만냥) — 마스터/무제한은 wallet 내부 면제. 부족 시 업셀 모달.
    const deduct = await deductTalisman('COMPATIBILITY', COMPATIBILITY_COST)
    if (!deduct.success) {
      const handled = handleDeductResult(deduct, {
        currentBalance: walletBalance ?? 0,
        requiredAmount: COMPATIBILITY_COST,
        featureLabel: '궁합 분석',
      })
      if (!handled) toast.error(deduct.error || '복채가 부족합니다.')
      return
    }
    if (deduct.remainingBalance !== undefined) setWalletBalance(deduct.remainingBalance)

    setIsAnalyzing(true)

    try {
      const response = await analyzeCompatibilityAction(person1.id, person2.id, relationship)

      if (response.success) {
        // 캐시 히트(신규 연산 아님)면 환불 — 신규 분석만 과금(표시=실차감)
        if (response.cached) await refundStudioCost('COMPATIBILITY').catch(() => {})
        setResult(response.data)
        toast.success('궁합 분석이 완료되었습니다!')
      } else {
        await refundStudioCost('COMPATIBILITY').catch(() => {})
        toast.error(response.error || '분석 중 오류가 발생했습니다.')
      }
    } catch {
      await refundStudioCost('COMPATIBILITY').catch(() => {})
      toast.error('분석 중 오류가 발생했습니다.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleReset = () => {
    setPerson1(fixedTarget)
    setPerson2(null)
    setResult(null)
  }

  // 로딩 중
  if (isAnalyzing) {
    return <CompatibilityLoading person1={person1!} person2={person2!} />
  }

  // 결과 표시
  if (result) {
    return <CompatibilityResult person1={person1!} person2={person2!} result={result} onReset={handleReset} />
  }

  // 가족 선택 UI
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="min-h-screen bg-background relative overflow-hidden py-12 px-4 pb-24"
    >
      <PaywallModal {...paywallProps} />
      <InsufficientBokchaeModal {...bokchaeModal} onClose={closeBokchaeModal} />
      {/* Hanji Texture */}
      <div className="absolute inset-0 z-[1] pointer-events-none opacity-[0.03] mix-blend-multiply bg-[url('/texture/hanji_noise.png')] bg-repeat" />

      <div className="relative z-10 max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <motion.div variants={fadeInUp} className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface/50 border border-primary/20 backdrop-blur-sm mb-2 rounded-full">
            <Users className="w-4 h-4 text-primary" strokeWidth={1} />
            <span className="text-[10px] font-light text-primary tracking-[0.2em] font-sans uppercase">
              Compatibility
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-light text-ink-light">궁합 분석</h1>
          <p className="text-sm text-ink-light/60 font-light">
            {fixedTarget
              ? `${fixedTarget.name}님과 궁합을 볼 상대를 선택해주세요`
              : '두 사람의 사주를 분석하여 관계의 조화를 살펴봅니다'}
          </p>
        </motion.div>

        {targets.length === 0 ? (
          <motion.div variants={fadeInUp}>
            <Card
              onClick={() => router.push('/protected/family')}
              className="bg-surface/10 border-dashed border-primary/20 p-12 text-center cursor-pointer hover:bg-surface/20 transition-colors group"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <User className="w-8 h-8 text-primary/60" strokeWidth={1} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-serif text-ink-light font-medium group-hover:text-primary transition-colors">
                    등록된 인연이 없습니다
                  </h3>
                  <p className="text-sm text-ink-light/60 font-light group-hover:text-primary/80 transition-colors">
                    궁합을 분석할 가족이나 연인을 먼저 등록해주세요
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="mt-4 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary group-hover:border-primary/60"
                >
                  가족/인연 등록하러 가기 <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : (
          <>
            {/* Person 1 Selection */}
            <motion.div variants={fadeInUp} className="space-y-3">
              <h2 className="text-lg font-serif font-light text-ink-light flex items-center gap-2">
                <User className="w-5 h-5 text-primary" strokeWidth={1} />첫 번째 사람
              </h2>

              {fixedTarget ? (
                <Card className="bg-primary/10 border-primary/40">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" strokeWidth={1} />
                        </div>
                        <div>
                          <div className="font-medium text-ink-light">{fixedTarget.name}</div>
                          <div className="text-xs text-ink-light/50">
                            {fixedTarget.birth_date} {fixedTarget.birth_time && `• ${fixedTarget.birth_time}`}
                          </div>
                        </div>
                      </div>
                      <Check className="w-5 h-5 text-primary" strokeWidth={2} />
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {targets.map((target) => (
                    <Card
                      key={target.id}
                      className={`cursor-pointer transition-all ${
                        person1?.id === target.id
                          ? 'bg-primary/10 border-primary/40'
                          : 'bg-surface/20 border-primary/20 hover:bg-primary/5'
                      }`}
                      onClick={() => handleSelectPerson(target, 1)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-5 h-5 text-primary" strokeWidth={1} />
                            </div>
                            <div>
                              <div className="font-medium text-ink-light">{target.name}</div>
                              <div className="text-xs text-ink-light/50">
                                {target.birth_date} {target.birth_time && `• ${target.birth_time}`}
                              </div>
                            </div>
                          </div>
                          {person1?.id === target.id && <Check className="w-5 h-5 text-primary" strokeWidth={2} />}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Person 2 Selection */}
            <motion.div variants={fadeInUp} className="space-y-3">
              <h2 className="text-lg font-serif font-light text-ink-light flex items-center gap-2">
                <User className="w-5 h-5 text-primary" strokeWidth={1} />
                {fixedTarget ? '궁합을 볼 상대' : '두 번째 사람'}
              </h2>

              <div className="grid grid-cols-1 gap-3">
                {targets
                  .filter((t) => !fixedTarget || t.id !== fixedTarget.id)
                  .map((target) => (
                    <Card
                      key={target.id}
                      className={`cursor-pointer transition-all ${
                        person2?.id === target.id
                          ? 'bg-primary/10 border-primary/40'
                          : 'bg-surface/20 border-primary/20 hover:bg-primary/5'
                      }`}
                      onClick={() => handleSelectPerson(target, 2)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-5 h-5 text-primary" strokeWidth={1} />
                            </div>
                            <div>
                              <div className="font-medium text-ink-light">{target.name}</div>
                              <div className="text-xs text-ink-light/50">
                                {target.birth_date} {target.birth_time && `• ${target.birth_time}`}
                              </div>
                            </div>
                          </div>
                          {person2?.id === target.id && <Check className="w-5 h-5 text-primary" strokeWidth={2} />}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </motion.div>

            {/* Relationship Selection */}
            <motion.div variants={fadeInUp} className="space-y-3">
              <h2 className="text-lg font-serif font-light text-ink-light flex items-center gap-2">
                <Heart className="w-5 h-5 text-primary" strokeWidth={1} />두 사람의 관계
              </h2>

              <Card className="bg-surface/20 border-primary/20">
                <CardContent className="p-6">
                  <Select
                    value={relationship}
                    onValueChange={(v) => {
                      setRelationship(v)
                      setRelationshipTouched(true)
                    }}
                  >
                    <SelectTrigger className="w-full h-12 text-base bg-background/50 border-primary/20">
                      <SelectValue placeholder="관계를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[400px]">
                      {Object.entries(RELATIONSHIP_CATEGORIES).map(([category, relations]) => (
                        <SelectGroup key={category}>
                          <SelectLabel className="text-sm font-semibold text-primary">
                            {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                          </SelectLabel>
                          {relations.map((rel) => (
                            <SelectItem key={rel.value} value={rel.value} className="text-base py-3">
                              <div className="flex items-center gap-2">
                                <span>{rel.emoji}</span>
                                <span>{rel.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* 선택된 관계 설명 */}
                  {relationship && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/10"
                    >
                      <p className="text-sm text-ink-light/70">
                        {RELATIONSHIP_TYPES.find((r) => r.value === relationship)?.description}
                      </p>
                    </motion.div>
                  )}

                  {/* 질문 미리보기 칩(§7) — 이 관계에서 실제 궁금한 것 3개, 기대 설정 */}
                  {relationship && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-medium text-primary/80">이런 게 궁금하시죠?</p>
                      <div className="flex flex-wrap gap-2">
                        {getFocusGroupSpec(relationship)
                          .questions.slice(0, 3)
                          .map((q, i) => (
                            <span
                              key={i}
                              className="text-xs bg-primary/10 border border-primary/20 rounded-full px-3 py-1.5 text-ink-light/80"
                            >
                              {q}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Analyze Button */}
            <motion.div variants={fadeInUp}>
              <Button
                onClick={handleAnalyze}
                disabled={!person1 || !person2}
                size="lg"
                className="w-full bg-gradient-to-r from-gold-500 to-gold-300 hover:from-[#C5A028] hover:to-[#E5D6B4] text-black font-semibold"
              >
                <Heart className="w-5 h-5 mr-2" />
                궁합 분석하기
              </Button>
              {(!person1 || !person2) && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  {fixedTarget ? '궁합을 볼 상대를 선택해주세요' : '두 사람을 모두 선택해주세요'}
                </p>
              )}
            </motion.div>
          </>
        )}
      </div>
    </motion.div>
  )
}
