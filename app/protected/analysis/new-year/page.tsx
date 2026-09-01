'use client'

import { useState, useEffect, Suspense } from 'react'
import { logger } from '@/lib/utils/logger'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Flame,
  ArrowLeft,
  TrendingUp,
  Heart,
  Briefcase,
  Activity,
  RotateCcw,
  ScrollText,
  Wind,
  Sun,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { getDestinyTargets, type DestinyTarget } from '@/app/actions/user/destiny'
import { TargetSelect, toTargetOption } from '@/components/destiny/target-select'
import Link from 'next/link'
import { analyzeYear2026Action, type Year2026Result } from '@/app/actions/ai/year2026'
import { ShareSaveButtons } from '@/components/studio/share-save-buttons'
import { ServiceDisclaimer } from '@/components/shared/ServiceDisclaimer'
import { AmbientVideo } from '@/components/shared/AmbientVideo'

// --- Internal Components ---

// ScoreRing removed — score system replaced with text-based outlook

function getOutlookStyle(outlook: string): { label: string; color: string; bg: string } {
  if (outlook === '좋음') return { label: '좋음', color: 'text-gold-300', bg: 'bg-gold-500/15' }
  if (outlook === '주의') return { label: '주의', color: 'text-error-text', bg: 'bg-error-light' }
  return { label: '보통', color: 'text-ink-light/55', bg: 'bg-white/5' }
}

function ArtifactCard({
  icon: Icon,
  title,
  outlook,
  content,
  delay = 0,
}: {
  icon: React.ElementType
  title: string
  outlook: string
  content: string
  delay?: number
}) {
  // 네 기둥은 «색색 프레임»이 아니라 같은 차분한 액자를 쓴다 — 뜻을 나르는 색은 우측
  // 전망 배지(좋음·보통·주의) 하나뿐이고, 카드 자체는 골드 위계로 통일한다.
  const outlookStyle = getOutlookStyle(outlook)

  return (
    <motion.div
      variants={{
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0, transition: { delay } },
      }}
      className="relative overflow-hidden rounded-2xl border p-5 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] border-white/10 bg-surface/40"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-black/20 border-white/10 border">
            <Icon className="w-4 h-4 text-gold-300" />
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
  icon: _Icon,
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
        <span className="text-[10px] text-ink-light/55 px-2 py-0.5 rounded-full border border-white/5 bg-white/5 font-sans">
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
        className="absolute w-64 h-64 border border-dashed border-seal/30 rounded-full opacity-50"
      />
      <motion.div
        animate={{ rotate: -180 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        className="absolute w-48 h-48 border border-dotted border-primary/30 rounded-full opacity-50"
      />

      <div className="relative z-20 flex flex-col items-center gap-6 text-center">
        <div className="w-20 h-20 bg-gradient-to-b from-seal/40 to-black rounded-full flex items-center justify-center border border-seal/40 shadow-[0_0_30px_rgba(158,43,43,0.25)]">
          <Flame className="w-8 h-8 text-obangsaek-red animate-pulse" />
        </div>

        <div className="space-y-2">
          <h3 className="font-serif text-xl text-ink-light font-medium tracking-wide">천기의 흐름을 읽고 있습니다</h3>
          <p className="text-sm text-ink-light/50 font-light">2026년 병오년의 기운을 분석 중...</p>
        </div>
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
    } catch {
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
              className="inline-flex items-center gap-2 px-3 py-1 bg-seal/15 border border-seal/35 rounded-full"
            >
              <Flame className="w-3 h-3 text-obangsaek-red" />
              <span className="text-[10px] font-bold text-gold-300 tracking-wider">2026 RED HORSE YEAR</span>
            </motion.div>
            <h1 className="text-3xl md:text-5xl font-serif font-bold text-ink-light leading-tight md:leading-none">
              병오년(丙午年)
              <br />
              {/* 병오(丙午)의 화(火) — 색은 오방색 적(#C83232) 단일 출처를 따른다 */}
              <span className="text-obangsaek-red drop-shadow-[0_0_15px_rgba(200,50,50,0.4)]">붉은 말의 해</span>
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
        {/* 카드 격자였던 자리 — 모양은 `TargetSelect` 하나가 정한다(2026-08-25 드롭다운 통일). */}
        <TargetSelect
          targets={targets.map(toTargetOption)}
          value={selectedTargetId}
          onChange={handleTargetChange}
          placeholder="분석할 대상을 선택하세요"
        />
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
            <Card className="luxury-card-glow max-w-2xl mx-auto border-primary/20 bg-gradient-to-br from-[#1a1815] to-charcoal-deep overflow-hidden">
              <div className="absolute inset-0 bg-noise-pattern opacity-10 pointer-events-none" />
              <div className="p-6 md:p-12 text-center space-y-6 md:space-y-8 relative z-10">
                <div className="w-24 h-24 mx-auto bg-seal/10 rounded-full flex items-center justify-center border border-seal/25 shadow-[0_0_30px_rgba(158,43,43,0.15)]">
                  <ScrollText className="w-10 h-10 text-obangsaek-red opacity-80" strokeWidth={1} />
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
                  className="w-full md:w-auto px-8 py-6 text-lg font-serif bg-gradient-to-r from-seal to-seal/75 hover:from-seal/90 hover:to-seal/65 border border-seal/40 text-gold-200 shadow-[0_4px_20px_rgba(158,43,43,0.3)] transition-all hover:scale-[1.02]"
                >
                  <Sparkles className="w-5 h-5 mr-3 text-gold-200 animate-pulse" />
                  신년 운세 열어보기
                </Button>

                {errorMsg && (
                  <p className="text-error-text text-sm mt-4 bg-error-light py-2 rounded-lg border border-error-border">
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
            id="newyear-result-capture"
          >
            {/* 1. Summary Card */}
            <Card className="card-glass-manse p-6 md:p-10 border-seal/25 relative overflow-hidden">
              {/* 앰비언트 배경 영상 — 신년 의식 테마. 없으면 폴백(렌더 안 함), reduced-motion 존중 */}
              <AmbientVideo
                id="analysis-ambient"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{ opacity: 0.14, mixBlendMode: 'screen' }}
              />
              <div className="absolute top-0 right-0 w-64 h-64 bg-seal/10 blur-[80px] rounded-full pointer-events-none -mr-20 -mt-20" />

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
                    <div className="p-2 bg-gold-500/10 rounded-lg border border-gold-500/20">
                      <Sparkles className="w-5 h-5 text-gold-300" />
                    </div>
                    <h3 className="font-serif text-xl text-ink-light">행운의 징표</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-xl bg-surface/50 border border-white/5 space-y-2 flex flex-col items-center justify-center">
                      <span className="text-xs text-ink-light/55 block">행운의 색</span>
                      <div
                        className="w-6 h-6 rounded-full mx-auto shadow-inner"
                        style={{ backgroundColor: fortune.lucky.color === '레드' ? '#C83232' : '#8C8478' }}
                      />
                      <span className="text-sm font-medium text-ink-light break-keep">{fortune.lucky.color}</span>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-surface/50 border border-white/5 space-y-2 flex flex-col items-center justify-center">
                      <span className="text-xs text-ink-light/55 block">행운의 방위</span>
                      <span className="text-lg block pt-1">🧭</span>
                      <span className="text-sm font-medium text-ink-light break-keep">{fortune.lucky.direction}</span>
                    </div>
                    <div className="text-center p-4 rounded-xl bg-surface/50 border border-white/5 space-y-2 flex flex-col items-center justify-center">
                      <span className="text-xs text-ink-light/55 block">행운의 숫자</span>
                      <span className="text-xl font-serif font-bold text-primary block">{fortune.lucky.number}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-gradient-to-br from-gold-500/10 to-black p-4 rounded-xl border border-gold-500/20 flex flex-col items-center justify-center text-center">
                      <span className="text-xs text-gold-500/70 mb-1">최고의 달</span>
                      <span className="text-xl font-serif font-bold text-gold-300">{fortune.peak_month}</span>
                    </div>
                    <div className="bg-gradient-to-br from-error/10 to-black p-4 rounded-xl border border-error-border flex flex-col items-center justify-center text-center">
                      <span className="text-xs text-error-text/70 mb-1">주의할 달</span>
                      <span className="text-xl font-serif font-bold text-error-text">{fortune.caution_month}</span>
                    </div>
                  </div>
                </Card>

                {/* Message */}
                <Card className="card-glass-manse p-6 bg-gradient-to-r from-surface to-seal/10 border-l-4 border-l-seal/50">
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
                  delay={0.1}
                />
                <ArtifactCard
                  icon={Briefcase}
                  title="직업운"
                  outlook={fortune.areas.career.outlook}
                  content={fortune.areas.career.content}
                  delay={0.2}
                />
                <ArtifactCard
                  icon={Heart}
                  title="애정운"
                  outlook={fortune.areas.love.outlook}
                  content={fortune.areas.love.content}
                  delay={0.3}
                />
                <ArtifactCard
                  icon={Activity}
                  title="건강운"
                  outlook={fortune.areas.health.outlook}
                  content={fortune.areas.health.content}
                  delay={0.4}
                />
              </div>
            </div>

            <div className="max-w-2xl mx-auto">
              <ShareSaveButtons
                resultContainerId="newyear-result-capture"
                analysisTitle="2026 신년운세"
                memberName={selectedTarget?.name}
              />
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

            <ServiceDisclaimer className="mt-2" />
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
