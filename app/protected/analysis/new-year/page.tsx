'use client'

import { useState, useEffect, Suspense } from 'react'
import { logger } from '@/lib/utils/logger'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Loader2,
  Flame,
  User,
  Calendar,
  ArrowLeft,
  TrendingUp,
  Heart,
  Briefcase,
  Activity,
  RotateCcw,
  ChevronRight,
  ScrollText,
  Wind,
  Sun,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { getDestinyTargets, type DestinyTarget } from '@/app/actions/user/destiny'
import Link from 'next/link'
import { analyzeYear2026Action, type Year2026Result } from '@/app/actions/ai/year2026'

// --- Internal Components ---

// ScoreRing removed — score system replaced with text-based outlook

function getOutlookStyle(outlook: string): { label: string; color: string; bg: string } {
  if (outlook === '좋음') return { label: '좋음', color: 'text-green-400', bg: 'bg-green-500/10' }
  if (outlook === '주의') return { label: '주의', color: 'text-red-400', bg: 'bg-red-500/10' }
  return { label: '보통', color: 'text-yellow-400', bg: 'bg-yellow-500/10' }
}

function ArtifactCard({
  icon: Icon,
  title,
  outlook,
  content,
  variant = 'default',
  delay = 0,
}: {
  icon: React.ElementType
  title: string
  outlook: string
  content: string
  variant?: 'default' | 'gold' | 'red' | 'blue' | 'green'
  delay?: number
}) {
  const colors = {
    default: 'text-ink-light',
    gold: 'text-yellow-400 border-yellow-500/20 bg-yellow-900/10',
    red: 'text-red-400 border-red-500/20 bg-red-900/10',
    blue: 'text-blue-400 border-blue-500/20 bg-blue-900/10',
    green: 'text-green-400 border-green-500/20 bg-green-900/10',
  }

  const colorClass = colors[variant]
  const outlookStyle = getOutlookStyle(outlook)

  return (
    <motion.div
      variants={{
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0, transition: { delay } },
      }}
      className={`relative overflow-hidden rounded-xl border p-5 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] ${colorClass.split(' ')[1]} ${colorClass.split(' ')[2]}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-black/20 ${colorClass.split(' ')[1]} border`}>
            <Icon className={`w-4 h-4 ${colorClass.split(' ')[0]}`} />
          </div>
          <h4 className="font-serif font-medium text-ink-light tracking-wide">{title}</h4>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${outlookStyle.bg} ${outlookStyle.color}`}>
          {outlookStyle.label}
        </span>
      </div>

      <p className="text-sm text-ink-light/70 font-light leading-relaxed break-keep">{content}</p>
    </motion.div>
  )
}

function SeasonCard({
  season,
  months,
  content,
  icon: Icon,
  index,
}: {
  season: string
  months: string
  content: string
  icon: React.ElementType
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5 + index * 0.1 }}
      className="group relative border-l-2 border-primary/20 pl-6 py-2 hover:border-primary/60 transition-colors"
    >
      <div className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-[#1a0505] border-2 border-primary/40 group-hover:border-primary group-hover:bg-primary/10 transition-colors flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-primary/80 uppercase tracking-widest font-sans">{season}</span>
        <span className="text-[10px] text-ink-light/30 px-2 py-0.5 rounded-full border border-white/5 bg-white/5 font-sans">
          {months}
        </span>
      </div>

      <p className="text-sm text-ink-light/70 leading-relaxed font-light group-hover:text-ink-light/90 transition-colors">
        {content}
      </p>
    </motion.div>
  )
}

function LoadingOracle() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] relative z-10 w-full max-w-md mx-auto">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        className="absolute w-64 h-64 border border-dashed border-red-500/20 rounded-full opacity-50"
      />
      <motion.div
        animate={{ rotate: -180 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        className="absolute w-48 h-48 border border-dotted border-primary/30 rounded-full opacity-50"
      />

      <div className="relative z-20 flex flex-col items-center gap-6 text-center">
        <div className="w-20 h-20 bg-gradient-to-b from-red-900/40 to-black rounded-full flex items-center justify-center border border-red-500/30 shadow-[0_0_30px_rgba(220,38,38,0.2)]">
          <Flame className="w-8 h-8 text-red-500 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h3 className="font-serif text-xl text-ink-light font-medium tracking-wide">천기의 흐름을 읽고 있습니다</h3>
          <p className="text-sm text-ink-light/50 font-light">2026년 병오년의 기운을 분석 중...</p>
        </div>
      </div>
    </div>
  )
}

function TargetSelector({
  targets,
  onSelect,
  selectedId,
}: {
  targets: DestinyTarget[]
  onSelect: (id: string) => void
  selectedId: string | null
}) {
  if (targets.length === 0) return null

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {targets.map((target) => {
          const isSelected = selectedId === target.id
          return (
            <motion.button
              key={target.id}
              onClick={() => onSelect(target.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`
                 relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 w-full text-left
                 ${
                   isSelected
                     ? 'bg-gradient-to-r from-red-900/80 to-red-950 border-red-500/50 shadow-[0_0_15px_rgba(220,38,38,0.3)]'
                     : 'bg-surface/40 border-white/5 hover:border-white/20 hover:bg-surface/60'
                 }
               `}
            >
              <div
                className={`
                 w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold
                 ${isSelected ? 'bg-red-500 text-white' : 'bg-white/10 text-ink-light/50'}
               `}
              >
                {target.name.slice(0, 1)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className={`text-sm font-serif truncate ${isSelected ? 'text-white' : 'text-ink-light/80'}`}>
                  {target.name}
                </span>
                <span className="text-[10px] text-ink-light/40 truncate">{target.relation_type}</span>
              </div>
              {isSelected && (
                <motion.div
                  layoutId="active-indicator"
                  className="absolute inset-0 border-2 border-red-500/30 rounded-xl"
                />
              )}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

// --- Main Content ---

function NewYear2026Content() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialTargetId = searchParams.get('targetId')

  const [targets, setTargets] = useState<DestinyTarget[]>([])
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(initialTargetId)
  const [fortune, setFortune] = useState<Year2026Result | null>(null)
  const [loading, setLoading] = useState(true) // Initial data load
  const [analyzing, setAnalyzing] = useState(false) // Analysis process
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Load targets
  useEffect(() => {
    const loadTargets = async () => {
      try {
        const data = await getDestinyTargets()
        setTargets(data)

        // If query param exists, verify it matches a target
        if (initialTargetId) {
          const exists = data.find((t) => t.id === initialTargetId)
          if (exists) setSelectedTargetId(initialTargetId)
        } else if (data.length > 0) {
          // Default select self
          const self = data.find((t) => t.target_type === 'self')
          if (self) setSelectedTargetId(self.id)
          else setSelectedTargetId(data[0].id)
        }
      } catch (err) {
        logger.error('Failed to load targets', err)
      } finally {
        setLoading(false)
      }
    }
    loadTargets()
  }, [initialTargetId])

  // Function to run analysis
  const handleGenerate = async () => {
    if (!selectedTargetId) return

    setAnalyzing(true)
    setErrorMsg(null)
    setFortune(null) // Reset previous result

    try {
      // Add minimum delay for dramatic effect (0.8s)
      const startTime = Date.now()

      const result = await analyzeYear2026Action(selectedTargetId)

      const elapsed = Date.now() - startTime
      if (elapsed < 800) {
        await new Promise((r) => setTimeout(r, 800 - elapsed))
      }

      if (result.success && result.data) {
        setFortune(result.data)
      } else {
        setErrorMsg(result.error || '운명을 읽는 도중 방해를 받았습니다. 다시 시도해주세요.')
      }
    } catch (e) {
      setErrorMsg('알 수 없는 오류가 발생했습니다.')
    } finally {
      setAnalyzing(false)
    }
  }

  // Handle target change
  const handleTargetChange = (id: string) => {
    setSelectedTargetId(id)
    setFortune(null) // Reset fortune when target changes to encourage re-analysis
    setErrorMsg(null)
    // Optional: Update URL without refresh
    router.replace(`/protected/analysis/new-year?targetId=${id}`, { scroll: false })
  }

  const selectedTarget = targets.find((t) => t.id === selectedTargetId)

  if (loading) {
    return <LoadingOracle />
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="max-w-4xl mx-auto py-6 md:py-12 px-4 pb-24 md:pb-32"
    >
      {/* Header and Back Link */}
      <motion.div variants={fadeInUp} className="mb-6 md:mb-10">
        <Link
          href="/protected/analysis"
          className="inline-flex items-center gap-2 text-ink-light/50 hover:text-primary transition-colors text-sm font-medium mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>분석실로 돌아가기</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-red-950/40 border border-red-900/50 rounded-full"
            >
              <Flame className="w-3 h-3 text-red-500" />
              <span className="text-[10px] font-bold text-red-300 tracking-wider">2026 RED HORSE YEAR</span>
            </motion.div>
            <h1 className="text-3xl md:text-5xl font-serif font-bold text-ink-light leading-tight md:leading-none">
              병오년(丙午年)
              <br />
              <span className="text-red-500/90 drop-shadow-[0_0_15px_rgba(220,38,38,0.4)]">붉은 말의 해</span>
            </h1>
            <p className="text-ink-light/60 font-light max-w-lg leading-relaxed">
              활활 타오르는 불의 기운이 가득한 2026년.
              <br className="hidden md:block" />
              당신의 운명은 이 거대한 흐름 속에서 어떻게 피어날까요?
            </p>
          </div>
        </div>
      </motion.div>

      {/* Target Selection */}
      <motion.div variants={fadeInUp} className="mb-8 md:mb-12 space-y-3">
        <h3 className="text-sm font-serif text-ink-light/70 ml-1">누구의 운명을 보시겠습니까?</h3>
        <TargetSelector targets={targets} selectedId={selectedTargetId} onSelect={handleTargetChange} />
      </motion.div>

      {/* Main Action Area */}
      <AnimatePresence mode="wait">
        {analyzing ? (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-20"
          >
            <LoadingOracle />
          </motion.div>
        ) : !fortune ? (
          <motion.div
            key="intro"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="luxury-card-glow max-w-2xl mx-auto border-primary/20 bg-gradient-to-br from-[#1a1815] to-[#0A0A0A] overflow-hidden">
              <div className="absolute inset-0 bg-noise-pattern opacity-10 pointer-events-none" />
              <div className="p-6 md:p-12 text-center space-y-6 md:space-y-8 relative z-10">
                <div className="w-24 h-24 mx-auto bg-red-600/10 rounded-full flex items-center justify-center border border-red-500/20 shadow-[0_0_30px_rgba(220,38,38,0.1)]">
                  <ScrollText className="w-10 h-10 text-red-400 opacity-80" strokeWidth={1} />
                </div>

                <div className="space-y-3">
                  <h2 className="text-2xl font-serif text-ink-light">
                    <span className="text-primary">{selectedTarget?.name}</span>님의 2026년 운명서
                  </h2>
                  <p className="text-sm text-ink-light/50 font-light leading-relaxed">
                    병오년의 강렬한 화(火) 기운이 당신의 사주와 만나
                    <br />
                    어떤 조화를 이루는지, 그 길흉화복을 미리 짚어드립니다.
                  </p>
                </div>

                {/* Analyze Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={!selectedTargetId}
                  className="w-full md:w-auto px-8 py-6 text-lg font-serif bg-gradient-to-r from-red-800 to-red-900 hover:from-red-700 hover:to-red-800 border border-red-500/30 text-red-50 shadow-[0_4px_20px_rgba(220,38,38,0.25)] transition-all hover:scale-[1.02]"
                >
                  <Sparkles className="w-5 h-5 mr-3 text-yellow-300 animate-pulse" />
                  신년 운세 열어보기
                </Button>

                {errorMsg && (
                  <p className="text-red-400 text-sm mt-4 bg-red-950/30 py-2 rounded-lg border border-red-900/50">
                    {errorMsg}
                  </p>
                )}
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6 md:space-y-10"
          >
            {/* 1. Summary Card */}
            <Card className="card-glass-manse p-6 md:p-10 border-red-900/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 blur-[80px] rounded-full pointer-events-none -mr-20 -mt-20" />

              <div className="flex flex-col items-center lg:items-start gap-6 relative z-10">
                <div className="text-center lg:text-left space-y-4 flex-1 w-full">
                  <div className="inline-block px-3 py-1 rounded-full border border-primary/20 bg-primary/5 mb-2">
                    <span className="text-xs font-serif text-primary tracking-wide">2026 병오년 총평</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-serif font-bold text-ink-light leading-snug break-keep">
                    {fortune.summary}
                  </h2>
                  <p className="text-ink-light/70 font-light leading-relaxed break-keep">{fortune.bingoh_meaning}</p>
                </div>
              </div>
            </Card>

            {/* 2. Fate Seasons (Quarterly) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="card-glass-manse p-6 md:p-8 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                    <Wind className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-serif text-xl text-ink-light">운명의 사계절</h3>
                </div>
                <div className="space-y-6 pl-2">
                  <SeasonCard index={0} season="1분기" months="1~3월" content={fortune.quarterly.q1} icon={Wind} />
                  <SeasonCard index={1} season="2분기" months="4~6월" content={fortune.quarterly.q2} icon={Sun} />
                  <SeasonCard index={2} season="3분기" months="7~9월" content={fortune.quarterly.q3} icon={Wind} />
                  <SeasonCard index={3} season="4분기" months="10~12월" content={fortune.quarterly.q4} icon={Flame} />
                </div>
              </Card>

              <div className="space-y-6">
                {/* Lucky Items */}
                <Card className="card-glass-manse p-6 md:p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
                      <Sparkles className="w-5 h-5 text-yellow-400" />
                    </div>
                    <h3 className="font-serif text-xl text-ink-light">행운의 징표</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-xl bg-surface/50 border border-white/5 space-y-2 flex flex-col items-center justify-center">
                      <span className="text-xs text-ink-light/40 block">행운의 색</span>
                      <div
                        className="w-6 h-6 rounded-full mx-auto shadow-inner"
                        style={{ backgroundColor: fortune.lucky.color === '레드' ? 'red' : 'gray' }}
                      />
                      <span className="text-sm font-medium text-ink-light break-keep">{fortune.lucky.color}</span>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-surface/50 border border-white/5 space-y-2 flex flex-col items-center justify-center">
                      <span className="text-xs text-ink-light/40 block">행운의 방위</span>
                      <span className="text-lg block pt-1">🧭</span>
                      <span className="text-sm font-medium text-ink-light break-keep">{fortune.lucky.direction}</span>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-surface/50 border border-white/5 space-y-2 flex flex-col items-center justify-center">
                      <span className="text-xs text-ink-light/40 block">행운의 숫자</span>
                      <span className="text-xl font-serif font-bold text-primary block">{fortune.lucky.number}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-gradient-to-br from-yellow-900/20 to-black p-4 rounded-xl border border-yellow-700/20 flex flex-col items-center justify-center text-center">
                      <span className="text-xs text-yellow-500/70 mb-1">최고의 달</span>
                      <span className="text-xl font-serif font-bold text-yellow-400">{fortune.peak_month}</span>
                    </div>
                    <div className="bg-gradient-to-br from-red-900/20 to-black p-4 rounded-xl border border-red-700/20 flex flex-col items-center justify-center text-center">
                      <span className="text-xs text-red-500/70 mb-1">주의할 달</span>
                      <span className="text-xl font-serif font-bold text-red-400">{fortune.caution_month}</span>
                    </div>
                  </div>
                </Card>

                {/* Message */}
                <Card className="card-glass-manse p-6 bg-gradient-to-r from-surface to-red-950/10 border-l-4 border-l-red-500/40">
                  <p className="font-serif italic text-ink-light/80 text-center leading-loose">
                    &ldquo; {fortune.message} &rdquo;
                  </p>
                </Card>
              </div>
            </div>

            {/* 3. Detailed Areas */}
            <div className="space-y-4">
              <h3 className="text-lg font-serif text-ink-light/60 pl-2 border-l-2 border-primary/30 ml-1">
                삶의 네 기둥
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <ArtifactCard
                  icon={TrendingUp}
                  title="재물운"
                  outlook={fortune.areas.wealth.outlook}
                  content={fortune.areas.wealth.content}
                  variant="gold"
                  delay={0.1}
                />
                <ArtifactCard
                  icon={Briefcase}
                  title="직업운"
                  outlook={fortune.areas.career.outlook}
                  content={fortune.areas.career.content}
                  variant="blue"
                  delay={0.2}
                />
                <ArtifactCard
                  icon={Heart}
                  title="애정운"
                  outlook={fortune.areas.love.outlook}
                  content={fortune.areas.love.content}
                  variant="red"
                  delay={0.3}
                />
                <ArtifactCard
                  icon={Activity}
                  title="건강운"
                  outlook={fortune.areas.health.outlook}
                  content={fortune.areas.health.content}
                  variant="green"
                  delay={0.4}
                />
              </div>
            </div>

            <div className="flex justify-center pt-8">
              <Button
                onClick={() => setFortune(null)}
                variant="outline"
                className="opacity-50 hover:opacity-100 transition-opacity"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                새로운 운세 보기
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function NewYear2026Page() {
  return (
    <Suspense fallback={<LoadingOracle />}>
      <NewYear2026Content />
    </Suspense>
  )
}
