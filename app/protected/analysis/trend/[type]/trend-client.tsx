'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Heart,
  Building2,
  GraduationCap,
  TrendingUp,
  Clock,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Star,
  Zap,
} from 'lucide-react'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import type { DestinyTarget } from '@/app/actions/user/destiny'
import { analyzeTrendAction, type TrendType, type TrendResult } from '@/app/actions/ai/trend'
import { useAnalysisQuota } from '@/hooks/use-analysis-quota'
import { PaywallModal } from '@/components/shared/paywall-modal'

interface TrendClientProps {
  trendType: TrendType
  selfTarget: DestinyTarget | null
  targets: DestinyTarget[]
}

const TREND_CONFIG: Record<
  TrendType,
  {
    label: string
    desc: string
    icon: React.ElementType
    color: string
    bg: string
  }
> = {
  love: {
    label: '애정운',
    desc: '만남 · 결혼 · 연애',
    icon: Heart,
    color: 'text-pink-400',
    bg: 'bg-pink-400/10',
  },
  career: {
    label: '직장운',
    desc: '승진 · 이직 · 사업',
    icon: Building2,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
  },
  exam: {
    label: '학업운',
    desc: '합격 · 자격 · 성취',
    icon: GraduationCap,
    color: 'text-green-400',
    bg: 'bg-green-400/10',
  },
  estate: {
    label: '부동산',
    desc: '매매 · 이사 · 계약',
    icon: TrendingUp,
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
  },
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-[#D4AF37]' : 'text-orange-400'
  return <span className={`text-5xl font-serif font-light ${color}`}>{score}</span>
}

function TrendResultView({ result, config }: { result: TrendResult; config: (typeof TREND_CONFIG)[TrendType] }) {
  const Icon = config.icon

  return (
    <motion.div initial="initial" animate="animate" variants={staggerContainer} className="space-y-4">
      {/* 점수 + 요약 */}
      <motion.div variants={fadeInUp}>
        <Card className="bg-surface/20 border-primary/20 card-glass-manse">
          <CardContent className="p-6 text-center space-y-3">
            <div className={`w-12 h-12 mx-auto rounded-full ${config.bg} flex items-center justify-center`}>
              <Icon className={`w-6 h-6 ${config.color}`} strokeWidth={1} />
            </div>
            <ScoreBadge score={result.score} />
            <p className="text-base font-serif font-light text-[#D4AF37]">{result.summary}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* 전체 설명 */}
      <motion.div variants={fadeInUp}>
        <Card className="bg-surface/20 border-white/5 card-glass-manse">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" strokeWidth={1} />
              <span className="text-xs font-light text-[#D4AF37] tracking-widest uppercase">전체 흐름</span>
            </div>
            <p className="text-sm font-light text-ink-light/80 leading-relaxed">{result.overview}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* 세부 분석 영역 */}
      <motion.div variants={fadeInUp}>
        <Card className="bg-surface/20 border-white/5 card-glass-manse">
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-[#D4AF37]" strokeWidth={1} />
              <span className="text-xs font-light text-[#D4AF37] tracking-widest uppercase">영역별 분석</span>
            </div>
            {result.areas.map((area) => (
              <div key={area.title} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-serif font-light text-ink-light">{area.title}</span>
                  <span className="text-sm font-light text-[#D4AF37]">{area.score}점</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-surface/40 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#D4AF37]/60 transition-all duration-700"
                    style={{ width: `${area.score}%` }}
                  />
                </div>
                <p className="text-xs font-light text-ink-light/60 leading-relaxed">{area.content}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* 좋은 시기 */}
      <motion.div variants={fadeInUp}>
        <Card className="bg-surface/20 border-white/5 card-glass-manse">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-[#D4AF37]" strokeWidth={1} />
              <span className="text-xs font-light text-[#D4AF37] tracking-widest uppercase">좋은 시기</span>
            </div>
            <p className="text-sm font-light text-ink-light/80 leading-relaxed">{result.timing}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* 행운 키워드 */}
      <motion.div variants={fadeInUp}>
        <Card className="bg-surface/20 border-white/5 card-glass-manse">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#D4AF37]" strokeWidth={1} />
              <span className="text-xs font-light text-[#D4AF37] tracking-widest uppercase">행운 키워드</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-[#D4AF37]/30 text-[#D4AF37] font-light text-xs">
                색상 {result.lucky.color}
              </Badge>
              <Badge variant="outline" className="border-[#D4AF37]/30 text-[#D4AF37] font-light text-xs">
                숫자 {result.lucky.number}
              </Badge>
              <Badge variant="outline" className="border-[#D4AF37]/30 text-[#D4AF37] font-light text-xs">
                방향 {result.lucky.direction}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 핵심 조언 */}
      <motion.div variants={fadeInUp}>
        <Card className="bg-surface/20 border-[#D4AF37]/20 card-glass-manse">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" strokeWidth={1} />
              <span className="text-xs font-light text-[#D4AF37] tracking-widest uppercase">핵심 조언</span>
            </div>
            <p className="text-sm font-light text-ink-light/80 leading-relaxed">{result.advice}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* 주의사항 */}
      <motion.div variants={fadeInUp}>
        <Card className="bg-surface/20 border-yellow-500/30 card-glass-manse">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400" strokeWidth={1} />
              <span className="text-xs font-light text-yellow-400 tracking-widest uppercase">주의사항</span>
            </div>
            <p className="text-sm font-light text-ink-light/70 leading-relaxed">{result.caution}</p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

export function TrendClient({ trendType, selfTarget, targets }: TrendClientProps) {
  const config = TREND_CONFIG[trendType]
  const Icon = config.icon

  const defaultId = selfTarget?.id ?? null
  const [selectedId, setSelectedId] = useState<string | null>(defaultId)
  const [state, setState] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; result: TrendResult; cached: boolean }
    | { status: 'error'; message: string }
  >({ status: 'idle' })

  const showSelect = targets.length > 1
  const { checkQuota, paywallProps } = useAnalysisQuota()

  async function handleAnalyze() {
    if (!selectedId) return
    const canProceed = await checkQuota()
    if (!canProceed) return
    setState({ status: 'loading' })
    const res = await analyzeTrendAction(selectedId, trendType)
    if (res.success && res.data) {
      setState({ status: 'success', result: res.data, cached: res.cached ?? false })
    } else {
      setState({ status: 'error', message: res.error ?? '알 수 없는 오류가 발생했습니다.' })
    }
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden py-12 px-4">
      <PaywallModal {...paywallProps} />
      <div className="absolute inset-0 z-[1] pointer-events-none opacity-[0.03] mix-blend-multiply bg-[url('/texture/hanji_noise.png')] bg-repeat" />

      <div className="relative z-10 max-w-md mx-auto space-y-8">
        {/* 헤더 */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface/50 border border-[#D4AF37]/20 backdrop-blur-sm mb-4 rounded-full">
            <Icon className={`w-4 h-4 ${config.color}`} strokeWidth={1} />
            <span className="text-[10px] font-light text-[#D4AF37] tracking-[0.2em] font-sans uppercase">
              {config.desc}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-light text-ink-light">{config.label}</h1>
          <p className="text-sm text-ink-light/60 font-light">사주로 보는 {config.label} 심층 분석</p>
        </div>

        {/* 대상 선택 */}
        {showSelect && (
          <motion.div initial="initial" animate="animate" variants={fadeInUp}>
            <Select
              value={selectedId ?? ''}
              onValueChange={(v) => {
                setSelectedId(v || null)
                setState({ status: 'idle' })
              }}
            >
              <SelectTrigger className="w-full bg-surface/20 border-[#D4AF37]/20 text-ink-light font-light text-sm">
                <SelectValue placeholder="분석 대상 선택" />
              </SelectTrigger>
              <SelectContent className="bg-surface border-[#D4AF37]/20">
                {targets.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="font-light text-ink-light">
                    {t.name}
                    {t.target_type === 'self' ? ' (본인)' : ` (${t.relation_type})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </motion.div>
        )}

        {/* 로딩 */}
        {state.status === 'loading' && (
          <motion.div initial="initial" animate="animate" variants={fadeInUp}>
            <Card className="bg-surface/20 border-[#D4AF37]/20 card-glass-manse">
              <CardContent className="p-10 flex flex-col items-center gap-4">
                <RefreshCw className="w-8 h-8 text-[#D4AF37] animate-spin" strokeWidth={1} />
                <p className="text-sm font-light text-ink-light/60">AI가 {config.label}을 분석하고 있습니다...</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 에러 */}
        {state.status === 'error' && (
          <motion.div initial="initial" animate="animate" variants={fadeInUp}>
            <Card className="bg-surface/20 border-red-500/30 card-glass-manse">
              <CardContent className="p-6 flex flex-col items-center gap-4">
                <AlertCircle className="w-8 h-8 text-red-400" strokeWidth={1} />
                <p className="text-sm font-light text-red-400/80 text-center">{state.message}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAnalyze}
                  className="border-[#D4AF37]/30 text-[#D4AF37] font-light hover:bg-[#D4AF37]/10"
                >
                  <RefreshCw className="w-4 h-4 mr-2" strokeWidth={1.5} />
                  다시 시도
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 결과 */}
        {state.status === 'success' && (
          <div className="space-y-3">
            {state.cached && (
              <p className="text-center text-[10px] font-light text-ink-light/30 tracking-widest">캐시된 결과입니다</p>
            )}
            <TrendResultView result={state.result} config={config} />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAnalyze}
              className="w-full text-ink-light/40 font-light text-xs hover:text-[#D4AF37]/60"
            >
              <RefreshCw className="w-3 h-3 mr-1" strokeWidth={1.5} />
              다시 분석하기
            </Button>
          </div>
        )}

        {/* idle */}
        {state.status === 'idle' && (
          <motion.div initial="initial" animate="animate" variants={fadeInUp}>
            <Card className="bg-surface/20 border-[#D4AF37]/20 card-glass-manse">
              <CardContent className="p-8 flex flex-col items-center gap-5">
                <div className={`w-14 h-14 mx-auto rounded-full ${config.bg} flex items-center justify-center`}>
                  <Icon className={`w-7 h-7 ${config.color}`} strokeWidth={1} />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-serif font-light text-ink-light">{config.label} 분석</h3>
                  <p className="text-sm text-ink-light/50 font-light">{config.desc}에 관한 사주 심층 분석</p>
                </div>
                {!selectedId ? (
                  <p className="text-xs text-ink-light/40 font-light">사주 정보를 먼저 입력해주세요.</p>
                ) : (
                  <Button
                    onClick={handleAnalyze}
                    className="bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#D4AF37] border border-[#D4AF37]/30 font-light text-sm"
                    variant="outline"
                  >
                    <Sparkles className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    분석하기
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}
