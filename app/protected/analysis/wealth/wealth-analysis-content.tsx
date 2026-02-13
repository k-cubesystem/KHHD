'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Coins, Loader2, TrendingUp, Calendar, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { GuestCTACard } from '@/components/guest-cta-card'
import { toast } from 'sonner'

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
  const [wealthAnalysis, setWealthAnalysis] = useState<string>('')
  const [isGuest, setIsGuest] = useState(false)

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
      const { analyzeWealth } = await import('@/app/actions/wealth-analysis')

      const result = await analyzeWealth({ memberId: member.id })

      if (result.success && result.analysis) {
        setWealthAnalysis(result.analysis)
        toast.success('재물운 분석이 완료되었습니다!')
      } else {
        throw new Error(result.error || '분석에 실패했습니다.')
      }
    } catch (error: any) {
      console.error('Failed to analyze wealth:', error)
      toast.error(error.message || '재물운 분석 중 오류가 발생했습니다.')
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
          <span className="text-[10px] font-bold text-primary-dim uppercase tracking-[0.2em]">
            The Wealth Flow
          </span>
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
                {member.birth_time && (
                  <p className="text-sm text-ink-light/60">생시: {member.birth_time}</p>
                )}
              </div>
              <Button
                onClick={handleAnalyze}
                disabled={analyzing || !!wealthAnalysis}
                className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    분석 중...
                  </>
                ) : wealthAnalysis ? (
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
          variants={fadeInUp}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-surface/50 backdrop-blur-md border border-primary/20">
            <CardContent className="p-8">
              <div
                className="prose prose-invert max-w-none"
                style={{
                  color: 'var(--ink-light)',
                }}
              >
                {wealthAnalysis.split('\n').map((line, index) => {
                  if (line.startsWith('# ')) {
                    return (
                      <h1 key={index} className="text-3xl font-serif font-bold text-ink-light mb-6">
                        {line.substring(2)}
                      </h1>
                    )
                  } else if (line.startsWith('## ')) {
                    return (
                      <h2
                        key={index}
                        className="text-2xl font-serif font-bold text-primary mt-8 mb-4"
                      >
                        {line.substring(3)}
                      </h2>
                    )
                  } else if (line.startsWith('### ')) {
                    return (
                      <h3
                        key={index}
                        className="text-xl font-serif font-bold text-ink-light mt-6 mb-3"
                      >
                        {line.substring(4)}
                      </h3>
                    )
                  } else if (line.startsWith('**') && line.endsWith('**')) {
                    return (
                      <p key={index} className="font-bold text-primary my-3">
                        {line.substring(2, line.length - 2)}
                      </p>
                    )
                  } else if (line.startsWith('- ')) {
                    return (
                      <li key={index} className="text-ink-light/80 ml-4">
                        {line.substring(2)}
                      </li>
                    )
                  } else if (line.startsWith('---')) {
                    return <hr key={index} className="my-6 border-primary/20" />
                  } else if (line.trim()) {
                    return (
                      <p key={index} className="text-ink-light/80 leading-relaxed my-2">
                        {line}
                      </p>
                    )
                  }
                  return <br key={index} />
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Empty State */}
      {!wealthAnalysis && !analyzing && (
        <motion.div variants={fadeInUp} className="text-center py-12">
          <Coins className="w-16 h-16 text-primary/30 mx-auto mb-4" />
          <p className="text-ink-light/50 font-serif">위의 버튼을 눌러 재물운 분석을 시작하세요</p>
        </motion.div>
      )}
    </motion.div>
  )
}
