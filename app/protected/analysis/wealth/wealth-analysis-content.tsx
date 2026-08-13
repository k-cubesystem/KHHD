'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Coins, Loader2, TrendingUp, AlertCircle, ShieldAlert, Clock, Target } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { logger } from '@/lib/utils/logger'
import { toast } from 'sonner'
import { useUpgradeNudge } from '@/hooks/use-upgrade-nudge'
import { MembershipNudgeModal } from '@/components/membership/membership-nudge-modal'
import { ShareSaveButtons } from '@/components/studio/share-save-buttons'
import { ServiceDisclaimer } from '@/components/shared/ServiceDisclaimer'
import { AmbientVideo } from '@/components/shared/AmbientVideo'
import type { DestinyTarget } from '@/app/actions/user/destiny'

interface WealthAnalysisContentProps {
  /** 서버에서 해석한 기본 대상(본인 우선). 등록된 대상이 하나도 없으면 null */
  initialTargetId: string | null
  targets: DestinyTarget[]
}

function targetLabel(target: DestinyTarget): string {
  return target.name?.trim() || (target.target_type === 'self' ? '본인' : '이름 없음')
}

export function WealthAnalysisContent({ initialTargetId, targets }: WealthAnalysisContentProps) {
  const [selectedId, setSelectedId] = useState<string | null>(initialTargetId)
  const [analyzing, setAnalyzing] = useState(false)
  const [wealthAnalysis, setWealthAnalysis] = useState<{
    currentSituation: string
    strengths: string[]
    risks: string[]
    shortTerm: string
    midTerm: string
    longTerm: string
    actionItems: string[]
  } | null>(null)

  const { nudgeModal, closeNudge, handleDeductResult, trackAnalysis } = useUpgradeNudge()

  const member = targets.find((t) => t.id === selectedId) ?? null
  const showSelect = targets.length > 1

  const handleAnalyze = async () => {
    if (!member?.birth_date) return

    setAnalyzing(true)
    try {
      // Import dynamically to avoid circular dependencies
      const { analyzeWealth } = await import('@/app/actions/ai/wealth')

      // memberId 는 destiny target id — 본인=profiles.id / 가족=family_members.id (다형)
      const result = await analyzeWealth({ memberId: member.id })

      // Handle daily limit / premium errors → show upgrade nudge
      if (
        !result.success &&
        handleDeductResult(result as { success: boolean; error?: string; errorType?: string }, {
          featureLabel: '재물운 분석',
        })
      ) {
        return
      }

      if (result.success && result.analysis && typeof result.analysis === 'object') {
        setWealthAnalysis(result.analysis)
        toast.success('재물운 분석이 완료되었습니다!')
        trackAnalysis()
      } else {
        throw new Error(result.error || '분석에 실패했습니다.')
      }
    } catch (error: unknown) {
      logger.error('Failed to analyze wealth:', error)
      toast.error(error instanceof Error ? error.message : '재물운 분석 중 오류가 발생했습니다.')
    } finally {
      setAnalyzing(false)
    }
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-24 h-full min-h-[50vh]">
        <AlertCircle className="w-12 h-12 text-primary/50" />
        <p className="text-ink-light/60 font-serif">등록된 사주 정보가 없습니다.</p>
        <Button asChild variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
          <Link href="/protected/settings">내 정보 입력하기</Link>
        </Button>
      </div>
    )
  }

  const memberName = targetLabel(member)
  const birthDate = member.birth_date
  const setupHref = member.target_type === 'self' ? '/protected/settings' : '/protected/family'

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="flex flex-col gap-12 w-full max-w-5xl mx-auto py-12 px-3 pb-24"
    >
      {/* Header - The Wealth Flow */}
      <motion.section variants={fadeInUp} className="relative overflow-hidden rounded-3xl text-center">
        {/* 앰비언트 배경 영상 — 재물운 히어로 은은히. 없으면 폴백(렌더 안 함), reduced-motion 존중 */}
        <AmbientVideo
          id="analysis-ambient"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ opacity: 0.12, mixBlendMode: 'screen' }}
        />
        <div className="relative z-10 space-y-4 py-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface/30 border border-primary/20 shadow-sm mb-2 backdrop-blur-sm">
            <Coins className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold text-primary-dim uppercase tracking-[0.2em]">재물의 흐름</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-ink-light leading-tight">
            재물운 <span className="text-primary">심층 분석</span>
          </h1>
          <p className="text-ink-light/70 font-light text-lg max-w-2xl mx-auto leading-relaxed">
            재물은 쫓는 것이 아니라, 길목을 지키는 것입니다.
            <br />
            <span className="text-sm">당신의 인생에서 재물이 모이는 시기와 방향을 알려드립니다.</span>
          </p>
        </div>
      </motion.section>

      {/* Member Info */}
      <motion.div variants={fadeInUp}>
        <Card className="bg-surface/50 backdrop-blur-md border border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl font-serif text-ink-light">분석 대상</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {showSelect && (
              <Select
                value={selectedId ?? ''}
                onValueChange={(v) => {
                  setSelectedId(v || null)
                  setWealthAnalysis(null)
                }}
              >
                <SelectTrigger className="w-full bg-surface/20 border-primary/20 text-ink-light font-light text-sm">
                  <SelectValue placeholder="분석 대상 선택" />
                </SelectTrigger>
                <SelectContent className="bg-surface border-primary/20">
                  {targets.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="font-light text-ink-light">
                      {targetLabel(t)}
                      {t.target_type === 'self' ? ' (본인)' : ` (${t.relation_type})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-2xl font-serif font-bold text-ink-light">{memberName}</p>
                {birthDate ? (
                  <>
                    <p className="text-sm text-ink-light/60 mt-1">
                      생년월일: {new Date(birthDate).toLocaleDateString('ko-KR')}
                    </p>
                    {member.birth_time && <p className="text-sm text-ink-light/60">생시: {member.birth_time}</p>}
                  </>
                ) : (
                  <p className="text-sm text-ink-light/60 mt-1">생년월일이 없어 분석할 수 없습니다.</p>
                )}
              </div>
              {birthDate ? (
                <Button
                  onClick={handleAnalyze}
                  disabled={analyzing || wealthAnalysis !== null}
                  className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      분석 중...
                    </>
                  ) : wealthAnalysis !== null ? (
                    '분석 완료'
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4 mr-2" />
                      재물운 분석 시작
                    </>
                  )}
                </Button>
              ) : (
                <Button asChild variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
                  <Link href={setupHref}>사주 등록하기</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Analysis Result */}
      {wealthAnalysis && (
        <motion.div
          id="wealth-result-capture"
          variants={fadeInUp}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          {/* 현재 상태 */}
          <Card className="bg-surface/50 backdrop-blur-md border border-primary/20">
            <CardHeader>
              <CardTitle className="text-xl font-serif text-ink-light flex items-center gap-2">
                <Coins className="w-5 h-5 text-primary" />
                현재 재물 상태
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-ink-light/80 leading-relaxed">{wealthAnalysis.currentSituation}</p>
            </CardContent>
          </Card>

          {/* 강점 & 리스크 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-surface/50 backdrop-blur-md border border-green-500/20">
              <CardHeader>
                <CardTitle className="text-lg font-serif text-green-400 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  재물 강점
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {wealthAnalysis.strengths.map((s, i) => (
                    <li key={i} className="text-ink-light/80 text-sm flex items-start gap-2">
                      <span className="text-green-400 mt-0.5 flex-shrink-0">+</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-surface/50 backdrop-blur-md border border-red-500/20">
              <CardHeader>
                <CardTitle className="text-lg font-serif text-red-400 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" />
                  주의할 리스크
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {wealthAnalysis.risks.map((r, i) => (
                    <li key={i} className="text-ink-light/80 text-sm flex items-start gap-2">
                      <span className="text-red-400 mt-0.5 flex-shrink-0">!</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* 시기별 조언 */}
          <Card className="bg-surface/50 backdrop-blur-md border border-primary/20">
            <CardHeader>
              <CardTitle className="text-xl font-serif text-ink-light flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                시기별 재물 전략
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-primary/80 uppercase tracking-wider">단기 (1-3개월)</h4>
                <p className="text-ink-light/80 text-sm leading-relaxed">{wealthAnalysis.shortTerm}</p>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-primary/80 uppercase tracking-wider">중기 (6개월-1년)</h4>
                <p className="text-ink-light/80 text-sm leading-relaxed">{wealthAnalysis.midTerm}</p>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-primary/80 uppercase tracking-wider">장기 (1년 이상)</h4>
                <p className="text-ink-light/80 text-sm leading-relaxed">{wealthAnalysis.longTerm}</p>
              </div>
            </CardContent>
          </Card>

          {/* 지금 바로 할 수 있는 행동 */}
          <Card className="bg-surface/50 backdrop-blur-md border border-yellow-500/20">
            <CardHeader>
              <CardTitle className="text-xl font-serif text-yellow-400 flex items-center gap-2">
                <Target className="w-5 h-5" />
                지금 바로 실천하기
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {wealthAnalysis.actionItems.map((item, i) => (
                  <li key={i} className="text-ink-light/80 text-sm flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 text-xs font-bold">
                      {i + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <ShareSaveButtons
            resultContainerId="wealth-result-capture"
            analysisTitle="재물운 분석"
            memberName={memberName}
          />

          <ServiceDisclaimer className="mt-2" />
        </motion.div>
      )}

      {/* Empty State */}
      {!wealthAnalysis && !analyzing && birthDate && (
        <motion.div variants={fadeInUp} className="text-center py-12">
          <Coins className="w-16 h-16 text-primary/30 mx-auto mb-4" />
          <p className="text-ink-light/50 font-serif">위의 버튼을 눌러 재물운 분석을 시작하세요</p>
        </motion.div>
      )}

      {/* Membership upgrade nudge */}
      <MembershipNudgeModal {...nudgeModal} onClose={closeNudge} />
    </motion.div>
  )
}
