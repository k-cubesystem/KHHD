'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Loader2,
  Flame,
  User,
  Calendar,
  ArrowLeft,
  Star,
  TrendingUp,
  Heart,
  Briefcase,
  Activity,
  RotateCcw,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { getDestinyTargets, type DestinyTarget } from '@/app/actions/destiny-targets'
import Link from 'next/link'
import { analyzeYear2026Action, type Year2026Result } from '@/app/actions/year2026-analysis-action'

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(212,175,55,0.15)"
          strokeWidth={4}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#D4AF37"
          strokeWidth={4}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="absolute font-serif font-bold text-primary"
        style={{ fontSize: size * 0.22 }}
      >
        {score}
      </span>
    </div>
  )
}

function AreaCard({
  icon: Icon,
  label,
  score,
  content,
  color,
}: {
  icon: React.ElementType
  label: string
  score: number
  content: string
  color: string
}) {
  return (
    <div className="bg-surface/20 border border-primary/10 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} strokeWidth={1.5} />
          <span className="text-sm font-serif font-medium text-ink-light">{label}</span>
        </div>
        <span className={`text-sm font-bold ${color}`}>{score}점</span>
      </div>
      <div className="w-full bg-primary/10 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all"
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs text-ink-light/60 leading-relaxed">{content}</p>
    </div>
  )
}

function NewYear2026Content() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const targetId = searchParams.get('targetId')

  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState<DestinyTarget | null>(null)
  const [fortune, setFortune] = useState<Year2026Result | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      setLoading(true)

      if (!targetId) {
        const targets = await getDestinyTargets()
        const selfTarget = targets.find((t) => t.target_type === 'self')
        if (selfTarget) {
          router.replace(`/protected/analysis/new-year?targetId=${selfTarget.id}`)
        } else {
          router.push('/protected/analysis')
        }
        return
      }

      const targets = await getDestinyTargets()
      const selected = targets.find((t) => t.id === targetId)
      if (selected) {
        setMember(selected)
      } else {
        router.push('/protected/analysis')
        return
      }

      setLoading(false)
    }

    init()
  }, [targetId, router])

  const handleGenerateFortune = async () => {
    if (!member) return
    setAnalyzing(true)
    setErrorMsg(null)
    const result = await analyzeYear2026Action(member.id)
    if (result.success && result.data) {
      setFortune(result.data)
    } else {
      setErrorMsg(result.error || '분석 중 오류가 발생했습니다.')
    }
    setAnalyzing(false)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-12">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <p className="text-ink-light/60 font-serif">사용자 정보를 불러오는 중...</p>
      </div>
    )
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="flex flex-col gap-8 w-full max-w-4xl mx-auto py-12 px-6 pb-32"
    >
      {/* Back Button */}
      <motion.div variants={fadeInUp}>
        <Link
          href="/protected/analysis"
          className="inline-flex items-center gap-2 text-primary/70 hover:text-primary transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>분석 허브로 돌아가기</span>
        </Link>
      </motion.div>

      {/* Header */}
      <motion.section variants={fadeInUp} className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-seal/20 border border-seal/40 backdrop-blur-sm mb-2">
            <Sparkles className="w-4 h-4 text-seal" strokeWidth={1.5} />
            <span className="text-[10px] font-bold text-seal tracking-[0.2em] font-sans uppercase">
              2026 丙午年 Special
            </span>
          </div>
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-ink-light italic leading-tight">
            <span className="text-seal">병오년</span>,<br />
            <span className="text-primary-dim">신년 종합운세</span>
          </h1>
          <p className="text-base md:text-lg text-ink-light/70 font-light leading-relaxed max-w-2xl mx-auto">
            붉은 말이 달리는 2026년, 당신의 운명은 어떻게 펼쳐질까요?
          </p>
        </div>
      </motion.section>

      {/* Profile Card */}
      {member && (
        <motion.div variants={fadeInUp}>
          <Card className="bg-surface/40 border border-primary/20 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <User className="w-8 h-8 text-primary" strokeWidth={1.5} />
              </div>
              <div className="flex-grow">
                <h3 className="font-serif font-bold text-2xl text-ink-light mb-2">{member.name}</h3>
                <div className="flex items-center gap-4 text-sm text-ink-light/60">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {member.relation_type}
                  </span>
                  {member.birth_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {member.birth_date}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Fortune Result or CTA */}
      <motion.div variants={fadeInUp}>
        {fortune ? (
          <div className="space-y-6">
            {/* 종합 점수 */}
            <Card className="relative bg-surface/30 backdrop-blur-md p-8 shadow-2xl border border-primary/20 overflow-hidden">
              <div className="absolute inset-0 opacity-5 mix-blend-overlay pointer-events-none">
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E\")",
                    backgroundRepeat: 'repeat',
                  }}
                />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="flex flex-col items-center gap-3">
                  <ScoreRing score={fortune.score} size={120} />
                  <span className="text-xs text-ink-light/40 font-sans tracking-widest uppercase">
                    종합 운세
                  </span>
                </div>
                <div className="flex-1 text-center md:text-left space-y-3">
                  <div className="flex items-center gap-2 justify-center md:justify-start">
                    <Flame className="w-5 h-5 text-seal" />
                    <h2 className="text-xl font-serif font-bold text-ink-light">
                      {fortune.name}님의 2026년 병오년
                    </h2>
                  </div>
                  <p className="text-lg font-serif text-primary font-medium">{fortune.summary}</p>
                  <p className="text-sm text-ink-light/70 leading-relaxed">
                    {fortune.bingoh_meaning}
                  </p>
                </div>
              </div>
            </Card>

            {/* 분기별 흐름 */}
            <div>
              <h3 className="text-base font-serif font-bold text-ink-light mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" strokeWidth={1.5} />
                분기별 운세 흐름
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: '1분기 (1~3월)', content: fortune.quarterly.q1, badge: '봄' },
                  { label: '2분기 (4~6월)', content: fortune.quarterly.q2, badge: '여름' },
                  { label: '3분기 (7~9월)', content: fortune.quarterly.q3, badge: '가을' },
                  { label: '4분기 (10~12월)', content: fortune.quarterly.q4, badge: '겨울' },
                ].map((q) => (
                  <Card
                    key={q.label}
                    className="bg-surface/20 border border-primary/10 p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-sans font-bold text-ink-light/50 tracking-wider uppercase">
                        {q.label}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 border border-primary/20 text-primary/60 font-sans">
                        {q.badge}
                      </span>
                    </div>
                    <p className="text-sm text-ink-light/70 leading-relaxed">{q.content}</p>
                  </Card>
                ))}
              </div>
            </div>

            {/* 영역별 운세 */}
            <div>
              <h3 className="text-base font-serif font-bold text-ink-light mb-4 flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" strokeWidth={1.5} />
                영역별 운세
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AreaCard
                  icon={TrendingUp}
                  label="재물운"
                  score={fortune.areas.wealth.score}
                  content={fortune.areas.wealth.content}
                  color="text-yellow-400"
                />
                <AreaCard
                  icon={Heart}
                  label="애정운"
                  score={fortune.areas.love.score}
                  content={fortune.areas.love.content}
                  color="text-pink-400"
                />
                <AreaCard
                  icon={Briefcase}
                  label="직업운"
                  score={fortune.areas.career.score}
                  content={fortune.areas.career.content}
                  color="text-blue-400"
                />
                <AreaCard
                  icon={Activity}
                  label="건강운"
                  score={fortune.areas.health.score}
                  content={fortune.areas.health.content}
                  color="text-green-400"
                />
              </div>
            </div>

            {/* 행운 키워드 & 주요 달 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-surface/20 border border-primary/10 p-5 space-y-4">
                <h3 className="text-sm font-serif font-bold text-ink-light flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  행운 키워드
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-ink-light/50">행운의 색</span>
                    <span className="text-primary font-medium">{fortune.lucky.color}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-ink-light/50">행운의 방향</span>
                    <span className="text-primary font-medium">{fortune.lucky.direction}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-ink-light/50">행운의 숫자</span>
                    <span className="text-primary font-bold text-lg">{fortune.lucky.number}</span>
                  </div>
                </div>
              </Card>

              <Card className="bg-surface/20 border border-primary/10 p-5 space-y-4">
                <h3 className="text-sm font-serif font-bold text-ink-light flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  주목할 달
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-ink-light/50">최고 운의 달</span>
                    <span className="text-yellow-400 font-medium">{fortune.peak_month} ↑</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-ink-light/50">주의해야 할 달</span>
                    <span className="text-seal font-medium">{fortune.caution_month} !</span>
                  </div>
                </div>
              </Card>
            </div>

            {/* 응원 메시지 */}
            <Card className="bg-gradient-to-br from-primary/10 to-seal/5 border border-primary/20 p-6 text-center space-y-3">
              <Flame className="w-8 h-8 text-seal mx-auto" strokeWidth={1} />
              <p className="font-serif text-ink-light/80 leading-relaxed italic">
                &ldquo;{fortune.message}&rdquo;
              </p>
            </Card>

            <div className="pt-2">
              <Button
                onClick={() => setFortune(null)}
                variant="outline"
                className="w-full md:w-auto"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                다시 생성하기
              </Button>
            </div>
          </div>
        ) : (
          <Card className="relative bg-surface/30 backdrop-blur-md p-12 text-center shadow-2xl border border-primary/20 overflow-hidden">
            <div className="absolute inset-0 opacity-5 mix-blend-overlay pointer-events-none">
              <div
                className="w-full h-full"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E\")",
                  backgroundRepeat: 'repeat',
                }}
              />
            </div>

            <div className="relative z-10 space-y-6 max-w-md mx-auto">
              <div className="w-20 h-20 mx-auto rounded-full bg-seal/20 flex items-center justify-center mb-4">
                <Flame className="w-10 h-10 text-seal" />
              </div>

              <h3 className="text-2xl font-serif font-bold text-ink-light">
                신년운세 분석 준비 완료
              </h3>

              <p className="text-ink-light/60 leading-relaxed">
                붉은 말이 달리는 2026년,{' '}
                <span className="text-primary font-medium">{member?.name}님</span>의
                <br />한 해를 밝게 비춰줄 운세를 확인하세요.
              </p>

              {errorMsg && (
                <p className="text-seal/80 text-sm bg-seal/10 border border-seal/20 rounded-md px-4 py-3">
                  {errorMsg}
                </p>
              )}

              <Button
                onClick={handleGenerateFortune}
                disabled={analyzing}
                className="w-full md:w-auto bg-gradient-to-r from-seal to-seal/80 hover:from-seal/90 hover:to-seal/70 text-ink-light font-serif font-bold text-lg px-8 py-6 rounded-lg shadow-lg transition-all"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    분석 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    2026년 신년운세 확인하기
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}
      </motion.div>

      {/* Footer */}
      <motion.section
        variants={fadeInUp}
        className="text-center space-y-4 opacity-50 font-serif italic text-sm text-ink-light/40 mt-8"
      >
        <p>※ 병오년(丙午年)은 불의 말의 해로, 강한 추진력과 변화의 기운이 특징입니다.</p>
        <div className="flex items-center justify-center gap-4 uppercase tracking-[0.2em] font-sans font-bold text-[10px] not-italic">
          <span>Authentic</span>
          <span className="w-1 h-1 bg-seal" />
          <span>Insightful</span>
          <span className="w-1 h-1 bg-seal" />
          <span>Haehwadang 2026</span>
        </div>
      </motion.section>
    </motion.div>
  )
}

export default function NewYear2026Page() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-12">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <p className="text-ink-light/60 font-serif">로딩 중...</p>
        </div>
      }
    >
      <NewYear2026Content />
    </Suspense>
  )
}
