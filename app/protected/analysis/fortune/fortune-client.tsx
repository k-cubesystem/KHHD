'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sun, Star, Moon, Calendar, Sparkles, AlertCircle, RefreshCw, Zap } from 'lucide-react'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import type { DestinyTarget } from '@/app/actions/destiny-targets'
import {
  analyzeFortuneAction,
  type FortuneType,
  type FortuneResult,
} from '@/app/actions/fortune-analysis-action'
import { FortuneCalendar } from './fortune-calendar'
import { FortuneDetailModal } from './fortune-detail-modal'

interface FortuneClientProps {
  selfTarget: DestinyTarget | null
  targets: DestinyTarget[]
}

const TAB_CONFIG: {
  value: FortuneType
  label: string
  icon: React.ReactNode
  emptyTitle: string
  emptyDesc: string
}[] = [
  {
    value: 'today',
    label: '오늘',
    icon: <Sun className="w-5 h-5 text-primary" strokeWidth={1} />,
    emptyTitle: '오늘의 운세',
    emptyDesc: '오늘 하루 당신에게 찾아올 기운을 분석합니다.',
  },
  {
    value: 'weekly',
    label: '주간',
    icon: <Star className="w-5 h-5 text-primary" strokeWidth={1} />,
    emptyTitle: '주간 운세',
    emptyDesc: '이번 주 7일간의 흐름을 미리 봅니다.',
  },
  {
    value: 'monthly',
    label: '월간',
    icon: <Moon className="w-5 h-5 text-primary" strokeWidth={1} />,
    emptyTitle: '월간 운세',
    emptyDesc: '이번 달, 당신이 맞이할 큰 변화를 확인하세요.',
  },
]

const AREA_ICONS: Record<string, React.ReactNode> = {
  재물운: <Zap className="w-4 h-4 text-yellow-400" strokeWidth={1.5} />,
  애정운: <Star className="w-4 h-4 text-pink-400" strokeWidth={1.5} />,
  건강운: <Sparkles className="w-4 h-4 text-green-400" strokeWidth={1.5} />,
  직업운: <Sun className="w-4 h-4 text-blue-400" strokeWidth={1.5} />,
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-primary' : 'text-orange-400'
  return <span className={`text-5xl font-serif font-light ${color}`}>{score}</span>
}

function FortuneResultView({ result }: { result: FortuneResult }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className="space-y-4"
    >
      {/* 점수 + 요약 */}
      <motion.div variants={fadeInUp}>
        <Card className="bg-surface/20 border-primary/20 card-glass-manse">
          <CardContent className="p-6 text-center space-y-3">
            <p className="text-xs font-light text-ink-light/50 tracking-widest uppercase">
              {result.period}
            </p>
            <ScoreBadge score={result.score} />
            <p className="text-base font-serif font-light text-primary">{result.summary}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* 전체 운세 */}
      <motion.div variants={fadeInUp}>
        <Card className="bg-surface/20 border-white/5 card-glass-manse">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" strokeWidth={1} />
              <span className="text-xs font-light text-primary tracking-widest uppercase">
                전체 운세 흐름
              </span>
            </div>
            <p className="text-sm font-light text-ink-light/80 leading-relaxed">{result.overall}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* 영역별 운세 */}
      <motion.div variants={fadeInUp}>
        <Card className="bg-surface/20 border-white/5 card-glass-manse">
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" strokeWidth={1} />
              <span className="text-xs font-light text-primary tracking-widest uppercase">
                영역별 분석
              </span>
            </div>
            {result.areas.map((area) => (
              <div key={area.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {AREA_ICONS[area.name] ?? (
                      <Star className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    )}
                    <span className="text-sm font-serif font-light text-ink-light">
                      {area.name}
                    </span>
                  </div>
                  <span className="text-sm font-light text-primary">{area.score}점</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-surface/40 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/60 transition-all duration-700"
                    style={{ width: `${area.score}%` }}
                  />
                </div>
                <p className="text-xs font-light text-ink-light/60 leading-relaxed">
                  {area.content}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* 행운 키워드 */}
      <motion.div variants={fadeInUp}>
        <Card className="bg-surface/20 border-white/5 card-glass-manse">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" strokeWidth={1} />
              <span className="text-xs font-light text-primary tracking-widest uppercase">
                행운 키워드
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="border-primary/30 text-primary font-light text-xs"
              >
                🎨 {result.lucky.color}
              </Badge>
              <Badge
                variant="outline"
                className="border-primary/30 text-primary font-light text-xs"
              >
                🔢 {result.lucky.number}
              </Badge>
              <Badge
                variant="outline"
                className="border-primary/30 text-primary font-light text-xs"
              >
                🧭 {result.lucky.direction}
              </Badge>
            </div>
            <p className="text-xs font-light text-ink-light/70 leading-relaxed">
              {result.lucky.advice}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* 주의사항 */}
      <motion.div variants={fadeInUp}>
        <Card className="bg-surface/20 border-yellow-500/30 card-glass-manse">
          <CardContent className="p-5 space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400" strokeWidth={1} />
              <span className="text-xs font-light text-yellow-400 tracking-widest uppercase">
                주의사항
              </span>
            </div>
            <p className="text-xs font-light text-ink-light/70 leading-relaxed">{result.caution}</p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

function TabPanel({ type, targetId }: { type: FortuneType; targetId: string | null }) {
  const config = TAB_CONFIG.find((t) => t.value === type)!
  const [state, setState] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; result: FortuneResult; cached: boolean }
    | { status: 'error'; message: string }
  >({ status: 'idle' })

  // Monthly Calendar Logic
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [isModalOpen, setIsModalOpen] = useState(false)

  async function handleAnalyze() {
    if (!targetId) return
    setState({ status: 'loading' })
    const res = await analyzeFortuneAction(targetId, type)
    if (res.success && res.data) {
      setState({ status: 'success', result: res.data, cached: res.cached ?? false })
    } else {
      setState({ status: 'error', message: res.error ?? '알 수 없는 오류가 발생했습니다.' })
    }
  }

  // Special Render for Monthly Calendar
  if (type === 'monthly') {
    return (
      <div className="space-y-4">
        <FortuneCalendar
          selectedDate={selectedDate}
          onDateSelect={(date) => {
            setSelectedDate(date)
            setIsModalOpen(true)
          }}
        />
        <div className="bg-surface/20 border border-white/5 rounded-xl p-4">
          <p className="text-xs text-ink-light/60 text-center font-light">
            * 날짜를 클릭하면 상세 운세를 확인할 수 있습니다.
          </p>
        </div>

        <FortuneDetailModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          date={selectedDate}
        />
      </div>
    )
  }

  if (state.status === 'loading') {
    return (
      <motion.div initial="initial" animate="animate" variants={fadeInUp}>
        <Card className="bg-surface/20 border-primary/20 card-glass-manse">
          <CardContent className="p-10 flex flex-col items-center gap-4">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" strokeWidth={1} />
            <p className="text-sm font-light text-ink-light/60">AI가 사주를 분석하고 있습니다...</p>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  if (state.status === 'error') {
    return (
      <motion.div initial="initial" animate="animate" variants={fadeInUp}>
        <Card className="bg-surface/20 border-red-500/30 card-glass-manse">
          <CardContent className="p-6 flex flex-col items-center gap-4">
            <AlertCircle className="w-8 h-8 text-red-400" strokeWidth={1} />
            <p className="text-sm font-light text-red-400/80 text-center">{state.message}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalyze}
              className="border-primary/30 text-primary font-light hover:bg-primary/10"
            >
              <RefreshCw className="w-4 h-4 mr-2" strokeWidth={1.5} />
              다시 시도
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  if (state.status === 'success') {
    return (
      <div className="space-y-3">
        {state.cached && (
          <p className="text-center text-[10px] font-light text-ink-light/30 tracking-widest">
            캐시된 결과입니다
          </p>
        )}
        <FortuneResultView result={state.result} />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAnalyze}
          className="w-full text-ink-light/40 font-light text-xs hover:text-primary/60"
        >
          <RefreshCw className="w-3 h-3 mr-1" strokeWidth={1.5} />
          다시 분석하기
        </Button>
      </div>
    )
  }

  // idle
  return (
    <motion.div initial="initial" animate="animate" variants={fadeInUp}>
      <Card className="bg-surface/20 border-primary/20 card-glass-manse">
        <CardContent className="p-8 flex flex-col items-center gap-5">
          <div className="w-14 h-14 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            {config.icon}
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-lg font-serif font-light text-ink-light">{config.emptyTitle}</h3>
            <p className="text-sm text-ink-light/50 font-light">{config.emptyDesc}</p>
          </div>
          {!targetId ? (
            <p className="text-xs text-ink-light/40 font-light">사주 정보를 먼저 입력해주세요.</p>
          ) : (
            <Button
              onClick={handleAnalyze}
              className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 font-light text-sm"
              variant="outline"
            >
              <Sparkles className="w-4 h-4 mr-2" strokeWidth={1.5} />
              분석하기
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function FortuneClient({ selfTarget, targets }: FortuneClientProps) {
  const defaultId = selfTarget?.id ?? null
  const [selectedId, setSelectedId] = useState<string | null>(defaultId)

  const showSelect = targets.length > 1

  return (
    <div className="min-h-screen bg-background relative overflow-hidden py-12 px-4">
      {/* Hanji Texture Overlay */}
      <div className="absolute inset-0 z-[1] pointer-events-none opacity-[0.03] mix-blend-multiply bg-[url('/texture/hanji_noise.png')] bg-repeat" />

      <div className="relative z-10 max-w-md mx-auto space-y-8">
        {/* 헤더 */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface/50 border border-primary/20 backdrop-blur-sm mb-4 rounded-full">
            <Calendar className="w-4 h-4 text-primary" strokeWidth={1} />
            <span className="text-[10px] font-light text-primary tracking-[0.2em] font-sans uppercase">
              Fortune Calendar
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-light text-ink-light">운세 캘린더</h1>
          <p className="text-sm text-ink-light/60 font-light">당신의 흐름을 미리 확인하세요</p>
        </div>

        {/* 대상 선택 */}
        {showSelect && (
          <motion.div initial="initial" animate="animate" variants={fadeInUp}>
            <Select value={selectedId ?? ''} onValueChange={(v) => setSelectedId(v || null)}>
              <SelectTrigger className="w-full bg-surface/20 border-primary/20 text-ink-light font-light text-sm">
                <SelectValue placeholder="분석 대상 선택" />
              </SelectTrigger>
              <SelectContent className="bg-surface border-primary/20">
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

        {/* 탭 */}
        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-surface/20 border border-white/5">
            {TAB_CONFIG.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="font-serif font-light text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-6">
            {TAB_CONFIG.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                <TabPanel type={tab.value} targetId={selectedId} />
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </div>
    </div>
  )
}
