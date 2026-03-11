'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Coins, Loader2, TrendingUp, AlertCircle, ShieldAlert, Zap, Clock, Target } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { logger } from '@/lib/utils/logger'
import { GuestCTACard } from '@/components/guest-cta-card'
import { toast } from 'sonner'
import { useUpgradeNudge } from '@/hooks/use-upgrade-nudge'
import { MembershipNudgeModal } from '@/components/membership/membership-nudge-modal'
import { ShareSaveButtons } from '@/components/studio/share-save-buttons'

interface FamilyMember {
  id: string
  name: string
  birth_date: string
  birth_time?: string
}

export function WealthAnalysisContent() {
  const searchParams = useSearchParams()
  const targetId = searchParams.get('targetId')

  const [member, setMember] = useState<FamilyMember | null>(null)
  const [loading, setLoading] = useState(true)
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
  const [isGuest, setIsGuest] = useState(false)

  const { nudgeModal, closeNudge, handleDeductResult, trackAnalysis } = useUpgradeNudge()

  useEffect(() => {
    const fetchMember = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setIsGuest(true)
        setLoading(false)
        return
      }

      if (targetId) {
        const { data } = await supabase
          .from('family_members')
          .select('id, name, birth_date, birth_time')
          .eq('id', targetId)
          .single()

        if (data) {
          setMember(data)
        }
      }
      setLoading(false)
    }
    fetchMember()
  }, [targetId])

  const handleAnalyze = async () => {
    if (!member) return

    setAnalyzing(true)
    try {
      // Import dynamically to avoid circular dependencies
      const { analyzeWealth } = await import('@/app/actions/ai/wealth')

      const result = await analyzeWealth({ memberId: member.id })

      // Handle daily limit / premium errors → show upgrade nudge
      if (!result.success && handleDeductResult(result as any, { featureLabel: '재물운 분석' })) {
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 h-full min-h-[50vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="mt-4 text-ink/60 font-serif">정보를 불러오는 중...</p>
      </div>
    )
  }

  if (isGuest) {
    return (
      <div className="flex flex-col gap-12 w-full max-w-5xl mx-auto py-12 px-3 pb-24">
        <GuestCTACard
          title="가입하고 재물운 분석 받기"
          description="당신의 사주를 기반으로 재물이 모이는 시기와 방향을 정확하게 분석해드립니다."
          icon={<Coins className="w-8 h-8 text-primary" strokeWidth={1} />}
        />
      </div>
    )
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center p-24 h-full min-h-[50vh]">
        <AlertCircle className="w-12 h-12 text-primary/50 mb-4" />
        <p className="text-ink-light/60 font-serif">분석할 프로필을 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="flex flex-col gap-12 w-full max-w-5xl mx-auto py-12 px-3 pb-24"
    >
      {/* Header - The Wealth Flow */}
      <motion.section variants={fadeInUp} className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface/30 border border-primary/20 shadow-sm mb-2 backdrop-blur-sm">
          <Coins className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold text-primary-dim uppercase tracking-[0.2em]">The Wealth Flow</span>
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-ink-light leading-tight">
          재물운 <span className="text-primary">심층 분석</span>
        </h1>
        <p className="text-ink-light/70 font-light text-lg max-w-2xl mx-auto leading-relaxed">
          재물은 쫓는 것이 아니라, 길목을 지키는 것입니다.
          <br />
          <span className="text-sm">당신의 인생에서 재물이 모이는 시기와 방향을 알려드립니다.</span>
        </p>
      </motion.section>

      {/* Member Info */}
      <motion.div variants={fadeInUp}>
        <Card className="bg-surface/50 backdrop-blur-md border border-primary/20">
          <CardHeader>
            <CardTitle className="text-xl font-serif text-ink-light">분석 대상</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-serif font-bold text-ink-light">{member.name}</p>
                <p className="text-sm text-ink-light/60 mt-1">
                  생년월일: {new Date(member.birth_date).toLocaleDateString('ko-KR')}
                </p>
                {member.birth_time && <p className="text-sm text-ink-light/60">생시: {member.birth_time}</p>}
              </div>
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
            memberName={member?.name}
          />
        </motion.div>
      )}

      {/* Empty State */}
      {!wealthAnalysis && !analyzing && (
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
