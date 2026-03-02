'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { AnalysisHistory } from '@/app/actions/user/history'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  ArrowRight,
  Clock,
  User,
  Sparkles,
  Loader2,
  AlertCircle,
  Eye,
  Sun,
  User2,
  Hand,
  Home,
  Heart,
  Coins,
  Star,
  TrendingUp,
  BookOpen,
  Share2,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'

// ─── Category Config ──────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  string,
  {
    icon: React.ElementType
    label: string
    badgeLabel: string
    gradient: string
    ringColor: string
    description: string
  }
> = {
  SAJU: {
    icon: Sun,
    label: '사주 분석',
    badgeLabel: '천지인 사주',
    gradient: 'from-amber-900/40 via-yellow-900/20 to-transparent',
    ringColor: 'border-amber-400/40',
    description: '사주팔자로 읽는 운명의 흐름',
  },
  FACE: {
    icon: User2,
    label: '관상 분석',
    badgeLabel: '관상',
    gradient: 'from-rose-900/30 via-pink-900/10 to-transparent',
    ringColor: 'border-rose-400/40',
    description: '얼굴로 읽는 운명과 성격',
  },
  HAND: {
    icon: Hand,
    label: '손금 분석',
    badgeLabel: '손금',
    gradient: 'from-sky-900/30 via-blue-900/10 to-transparent',
    ringColor: 'border-sky-400/40',
    description: '손금으로 읽는 인생의 선',
  },
  FENGSHUI: {
    icon: Home,
    label: '풍수 분석',
    badgeLabel: '풍수지리',
    gradient: 'from-emerald-900/30 via-green-900/10 to-transparent',
    ringColor: 'border-emerald-400/40',
    description: '공간의 기운으로 읽는 운세',
  },
  COMPATIBILITY: {
    icon: Heart,
    label: '궁합 분석',
    badgeLabel: '남녀 궁합',
    gradient: 'from-pink-900/40 via-rose-900/20 to-transparent',
    ringColor: 'border-pink-400/40',
    description: '두 사람의 운명적 인연',
  },
  TODAY: {
    icon: Star,
    label: '오늘의 운세',
    badgeLabel: '일일 운세',
    gradient: 'from-violet-900/30 via-purple-900/10 to-transparent',
    ringColor: 'border-violet-400/40',
    description: '오늘 하루의 운기 흐름',
  },
  WEALTH: {
    icon: Coins,
    label: '재물운 분석',
    badgeLabel: '재물운',
    gradient: 'from-yellow-900/40 via-amber-900/20 to-transparent',
    ringColor: 'border-yellow-400/40',
    description: '금전과 재물의 운세 흐름',
  },
  NEW_YEAR: {
    icon: Sparkles,
    label: '신년운세',
    badgeLabel: '2026 신년운세',
    gradient: 'from-indigo-900/30 via-blue-900/10 to-transparent',
    ringColor: 'border-indigo-400/40',
    description: '새해 1년의 전체 운세',
  },
}

const DEFAULT_CATEGORY = CATEGORY_CONFIG.TODAY

// ─── Score Ring Component ─────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const clamped = Math.min(100, Math.max(0, score))
  const radius = 38
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference

  const color = clamped >= 80 ? '#F4E4BA' : clamped >= 60 ? '#E2D5B5' : clamped >= 40 ? '#C8B273' : '#8C7B50'

  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg className="absolute inset-0 -rotate-90" width="96" height="96" viewBox="0 0 96 96">
        {/* Track */}
        <circle cx="48" cy="48" r={radius} fill="none" stroke="rgba(244,228,186,0.1)" strokeWidth="6" />
        {/* Progress */}
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="relative text-center">
        <span className="text-2xl font-serif font-bold text-primary leading-none">{clamped}</span>
        <span className="block text-xs text-primary/60 mt-0.5">점</span>
      </div>
    </div>
  )
}

// ─── Result Body: renders parsed result_json per category ─────────────────────

function ResultBody({ record }: { record: AnalysisHistory }) {
  const json = record.result_json
  if (!json || typeof json !== 'object') {
    return record.summary ? (
      <p className="text-base text-ink-light/85 leading-relaxed whitespace-pre-wrap">{record.summary}</p>
    ) : null
  }

  // Helper: render a section with a label
  const Section = ({
    icon: Icon,
    title,
    children,
  }: {
    icon?: React.ElementType
    title: string
    children: React.ReactNode
  }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-primary/70" />}
        <h4 className="text-xs font-bold text-primary/70 uppercase tracking-widest">{title}</h4>
      </div>
      <div className="pl-0">{children}</div>
    </div>
  )

  const Divider = () => <div className="border-t border-primary/10" />

  // SAJU – has cheon/ji/in structure OR fortune_score/detailedAnalysis
  if (record.category === 'SAJU') {
    const hasCheonjiin = json.cheon || json.ji || json.in
    if (hasCheonjiin) {
      const cheon = json.cheon || {}
      const ji = json.ji || {}
      const inData = json.in || {}
      return (
        <div className="space-y-4">
          {json.summary && (
            <>
              <Section icon={BookOpen} title="핵심 요약">
                <p className="text-sm text-ink-light/85 leading-relaxed">{json.summary}</p>
              </Section>
              <Divider />
            </>
          )}
          {cheon.title && (
            <Section icon={Sun} title="천(天) · 선천운">
              <p className="text-sm text-ink-light/80 leading-relaxed line-clamp-4">
                {cheon.description || cheon.content || ''}
              </p>
            </Section>
          )}
          {ji.title && (
            <>
              <Divider />
              <Section icon={Home} title="지(地) · 현실운">
                <p className="text-sm text-ink-light/80 leading-relaxed line-clamp-4">
                  {ji.description || ji.content || ''}
                </p>
              </Section>
            </>
          )}
          {inData.title && (
            <>
              <Divider />
              <Section icon={User} title="인(人) · 대인운">
                <p className="text-sm text-ink-light/80 leading-relaxed line-clamp-4">
                  {inData.description || inData.content || ''}
                </p>
              </Section>
            </>
          )}
        </div>
      )
    }

    // Standard SAJU structure
    return (
      <div className="space-y-4">
        {json.summary && (
          <Section icon={BookOpen} title="핵심 요약">
            <p className="text-sm text-ink-light/85 leading-relaxed">{json.summary}</p>
          </Section>
        )}
        {json.coreCharacter && (
          <>
            <Divider />
            <Section icon={User} title="타고난 성격">
              <p className="text-sm text-ink-light/80 leading-relaxed line-clamp-4">{json.coreCharacter}</p>
            </Section>
          </>
        )}
        {json.advice && (
          <>
            <Divider />
            <Section icon={TrendingUp} title="개운 조언">
              <p className="text-sm text-ink-light/80 leading-relaxed line-clamp-4">{json.advice}</p>
            </Section>
          </>
        )}
        {json.detailedAnalysis && (
          <>
            <Divider />
            <Section icon={BookOpen} title="상세 분석">
              <p className="text-sm text-ink-light/75 leading-relaxed line-clamp-6 whitespace-pre-wrap">
                {json.detailedAnalysis}
              </p>
            </Section>
          </>
        )}
      </div>
    )
  }

  // FACE
  if (record.category === 'FACE') {
    return (
      <div className="space-y-4">
        {(json.summary || json.overallAssessment) && (
          <Section icon={BookOpen} title="관상 요약">
            <p className="text-sm text-ink-light/85 leading-relaxed">{json.summary || json.overallAssessment}</p>
          </Section>
        )}
        {json.currentAnalysis && (
          <>
            <Divider />
            <Section icon={TrendingUp} title="현재 운기">
              <p className="text-sm text-ink-light/80 leading-relaxed line-clamp-5 whitespace-pre-wrap">
                {json.currentAnalysis}
              </p>
            </Section>
          </>
        )}
        {json.recommendations?.length > 0 && (
          <>
            <Divider />
            <Section icon={Sparkles} title="개운 추천">
              <ul className="space-y-1.5">
                {(json.recommendations as string[]).slice(0, 3).map((r: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ink-light/80">
                    <span className="text-primary mt-0.5">·</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </Section>
          </>
        )}
      </div>
    )
  }

  // COMPATIBILITY
  if (record.category === 'COMPATIBILITY') {
    return (
      <div className="space-y-4">
        {json.summary && (
          <Section icon={Heart} title="궁합 요약">
            <p className="text-sm text-ink-light/85 leading-relaxed">{json.summary}</p>
          </Section>
        )}
        {json.overallAssessment && (
          <>
            <Divider />
            <Section icon={BookOpen} title="종합 평가">
              <p className="text-sm text-ink-light/80 leading-relaxed line-clamp-5">{json.overallAssessment}</p>
            </Section>
          </>
        )}
        {json.advice && (
          <>
            <Divider />
            <Section icon={TrendingUp} title="관계 조언">
              <p className="text-sm text-ink-light/80 leading-relaxed line-clamp-4">{json.advice}</p>
            </Section>
          </>
        )}
      </div>
    )
  }

  // TODAY / WEALTH / NEW_YEAR / HAND / FENGSHUI — generic rendering
  return (
    <div className="space-y-4">
      {(json.summary || record.summary) && (
        <Section icon={BookOpen} title="요약">
          <p className="text-sm text-ink-light/85 leading-relaxed">{json.summary || record.summary}</p>
        </Section>
      )}
      {json.advice && (
        <>
          <Divider />
          <Section icon={TrendingUp} title="조언">
            <p className="text-sm text-ink-light/80 leading-relaxed line-clamp-5">{json.advice}</p>
          </Section>
        </>
      )}
      {json.detailedAnalysis && (
        <>
          <Divider />
          <Section icon={BookOpen} title="상세 내용">
            <p className="text-sm text-ink-light/75 leading-relaxed line-clamp-6 whitespace-pre-wrap">
              {json.detailedAnalysis}
            </p>
          </Section>
        </>
      )}
      {/* Fallback: show raw summary if nothing else matched */}
      {!json.summary && !json.advice && !json.detailedAnalysis && record.summary && (
        <p className="text-sm text-ink-light/85 leading-relaxed whitespace-pre-wrap">{record.summary}</p>
      )}
    </div>
  )
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      {/* Header skeleton */}
      <div className="w-full max-w-[480px] p-6 border-b border-primary/10 flex justify-center">
        <div className="w-28 h-8 bg-primary/10 rounded animate-pulse" />
      </div>

      <main className="w-full max-w-[480px] px-4 py-8 space-y-6">
        {/* Badge skeleton */}
        <div className="flex justify-center">
          <div className="w-32 h-6 bg-primary/10 rounded-full animate-pulse" />
        </div>

        {/* Title skeleton */}
        <div className="space-y-3 text-center">
          <div className="w-3/4 h-8 bg-primary/10 rounded mx-auto animate-pulse" />
          <div className="w-1/2 h-6 bg-primary/10 rounded mx-auto animate-pulse" />
        </div>

        {/* Icon + score skeleton */}
        <div className="flex items-center justify-center gap-6 py-4">
          <div className="w-20 h-20 bg-primary/10 rounded-full animate-pulse" />
          <div className="w-24 h-24 bg-primary/10 rounded-full animate-pulse" />
        </div>

        {/* Card skeleton */}
        <div className="border border-primary/15 rounded-2xl p-6 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="w-20 h-3 bg-primary/10 rounded animate-pulse" />
              <div className="w-full h-4 bg-primary/8 rounded animate-pulse" />
              <div className="w-5/6 h-4 bg-primary/8 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* CTA skeleton */}
        <div className="border border-primary/15 rounded-2xl p-8 space-y-4">
          <div className="w-40 h-6 bg-primary/10 rounded mx-auto animate-pulse" />
          <div className="w-full h-12 bg-primary/15 rounded-xl animate-pulse" />
        </div>
      </main>
    </div>
  )
}

// ─── Error State ──────────────────────────────────────────────────────────────

function ErrorState({ message }: { message: string }) {
  const isExpired = message.includes('찾을 수 없') || message.includes('만료') || message.includes('expired')

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="w-full max-w-[480px] mx-auto p-6 flex justify-center border-b border-primary/10">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/images/logo.png"
            alt="청담 해화당"
            width={120}
            height={40}
            className="opacity-90"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-8 max-w-[480px] mx-auto w-full">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="w-24 h-24 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center"
        >
          <AlertCircle className="w-10 h-10 text-primary/60" />
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-3"
        >
          <h2 className="text-2xl font-serif font-bold text-ink-light">
            {isExpired ? '분석 결과를 찾을 수 없습니다' : '오류가 발생했습니다'}
          </h2>
          <p className="text-sm text-ink-light/55 leading-relaxed max-w-xs mx-auto">
            {isExpired
              ? '공유 링크가 만료되었거나 삭제된 분석 결과입니다.\n청담 해화당에서 새로운 운세를 받아보세요.'
              : message}
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col gap-3 w-full max-w-xs"
        >
          <Link href="/auth/login" className="w-full">
            <Button
              size="lg"
              className="w-full bg-primary hover:bg-primary-dim text-background font-serif text-base py-5"
            >
              무료로 내 운세 보기
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link href="/" className="w-full">
            <Button variant="ghost" className="w-full text-ink-light/50 hover:text-ink-light hover:bg-primary/5">
              메인으로 돌아가기
            </Button>
          </Link>
        </motion.div>
      </main>
    </div>
  )
}

// ─── Main Client Component ────────────────────────────────────────────────────

interface SharePageClientProps {
  token: string
}

export function SharePageClient({ token }: SharePageClientProps) {
  const [record, setRecord] = useState<AnalysisHistory | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRecord() {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
        )

        const { data, error } = await supabase.rpc('get_shared_analysis_record', {
          token_input: token,
        })

        if (error) {
          console.error('RPC Error:', error)
          setError('데이터를 불러오는 중 오류가 발생했습니다.')
          return
        }

        if (!data || data.length === 0) {
          setError('분석 기록을 찾을 수 없습니다.')
          return
        }

        setRecord(data[0] as AnalysisHistory)
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('알 수 없는 오류가 발생했습니다.')
      } finally {
        setIsLoading(false)
      }
    }

    if (token) {
      fetchRecord()
    }
  }, [token])

  if (isLoading) return <LoadingSkeleton />
  if (error || !record) return <ErrorState message={error || '페이지를 찾을 수 없습니다.'} />

  const config = CATEGORY_CONFIG[record.category] || DEFAULT_CATEGORY
  const CategoryIcon = config.icon
  const dateStr = format(new Date(record.created_at), 'yyyy년 M월 d일', { locale: ko })
  const viewCount = (record as any).share_view_count ?? null

  return (
    <div className="min-h-screen bg-background text-ink-light font-sans selection:bg-primary/30 relative overflow-hidden flex flex-col items-center">
      {/* Background ambient glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/3 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-amber-900/10 blur-[80px]" />
      </div>

      {/* Header */}
      <header className="w-full max-w-[480px] px-6 py-4 flex justify-between items-center sticky top-0 bg-background/90 backdrop-blur-md z-50 border-b border-primary/10">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/images/logo.png"
            alt="청담 해화당"
            width={110}
            height={36}
            className="opacity-90 hover:opacity-100 transition-opacity"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <span className="sr-only">청담 해화당</span>
        </Link>
        {viewCount !== null && viewCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-ink-light/35">
            <Eye className="w-3.5 h-3.5" />
            <span>{viewCount.toLocaleString()}</span>
          </div>
        )}
      </header>

      <main className="w-full max-w-[480px] flex-1 px-4 py-8 relative z-10 pb-32 space-y-6">
        {/* ── Hero Section ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="text-center space-y-5"
        >
          {/* Category badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5">
            <CategoryIcon className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary tracking-wider">{config.badgeLabel}</span>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <h2 className="text-3xl font-serif font-bold text-ink-light leading-tight">{record.target_name}님의</h2>
            <h3 className="text-xl font-serif text-primary">{config.label}</h3>
          </div>

          {/* Meta row */}
          <div className="flex items-center justify-center gap-4 text-xs text-ink-light/40">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{dateStr}</span>
            </div>
            {record.target_relation && (
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>{record.target_relation}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Score + Icon Panel ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
          className={`relative overflow-hidden rounded-2xl border ${config.ringColor} bg-gradient-to-b ${config.gradient} p-6`}
        >
          <div className="flex items-center justify-between">
            {/* Category icon circle */}
            <div className="flex flex-col items-center gap-2">
              <div
                className={`w-20 h-20 rounded-full border-2 ${config.ringColor} bg-black/30 flex items-center justify-center`}
              >
                <CategoryIcon className="w-9 h-9 text-primary" />
              </div>
              <span className="text-xs text-ink-light/50 font-medium">{config.description}</span>
            </div>

            {/* Score ring or sparkle */}
            {record.score !== null ? (
              <div className="flex flex-col items-center gap-1">
                <ScoreRing score={record.score} />
                <span className="text-xs text-ink-light/50">운세 점수</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-20 h-20 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary/60" />
                </div>
                <span className="text-xs text-ink-light/50">AI 분석 완료</span>
              </div>
            )}
          </div>

          {/* Summary teaser below icons */}
          {record.summary && (
            <div className="mt-5 pt-4 border-t border-primary/10">
              <p className="text-sm text-ink-light/80 leading-relaxed text-center italic">
                &ldquo;{record.summary}&rdquo;
              </p>
            </div>
          )}
        </motion.div>

        {/* ── Result Content Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.28, ease: 'easeOut' }}
          className="bg-surface/50 border border-primary/15 rounded-2xl overflow-hidden shadow-2xl"
        >
          {/* Card Header */}
          <div className="px-6 py-4 border-b border-primary/10 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary/60" />
            <span className="text-xs font-bold text-primary/60 uppercase tracking-widest">분석 결과</span>
          </div>

          {/* Card Body */}
          <div className="px-6 py-5">
            <ResultBody record={record} />
          </div>

          {/* Partial blur overlay — teaser */}
          <div className="relative h-16 -mt-8 bg-gradient-to-t from-surface/90 to-transparent pointer-events-none" />

          {/* Unlock hint */}
          <div className="px-6 pb-5 text-center">
            <p className="text-xs text-ink-light/35">전체 분석 결과는 청담 해화당 앱에서 확인하세요</p>
          </div>
        </motion.div>

        {/* ── CTA Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.42, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent p-8 text-center space-y-5"
        >
          {/* Decorative sparkle top-right */}
          <div aria-hidden className="absolute top-4 right-5 opacity-20">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <div aria-hidden className="absolute bottom-4 left-5 opacity-10">
            <Star className="w-6 h-6 text-primary" />
          </div>

          <div className="space-y-2 relative z-10">
            <h3 className="text-xl font-serif font-bold text-ink-light leading-snug">
              나의 운명도
              <br />
              궁금하신가요?
            </h3>
            <p className="text-sm text-ink-light/60 leading-relaxed max-w-xs mx-auto">
              청담 해화당 AI가 사주·관상·손금·풍수를
              <br />
              정밀하게 분석해드립니다.
              <br />
              <span className="text-primary/80 font-medium">신규 가입 시 50만냥 무료 지급!</span>
            </p>
          </div>

          <div className="flex flex-col gap-3 relative z-10">
            <Link href="/auth/login" className="w-full">
              <Button
                size="lg"
                className="w-full bg-primary hover:bg-primary-dim text-background font-serif text-lg py-6 shadow-lg shadow-primary/20 transition-all"
              >
                무료로 내 운세 보기
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/" className="w-full">
              <Button
                variant="ghost"
                className="w-full text-ink-light/45 hover:text-ink-light hover:bg-primary/5 text-sm"
              >
                메인으로 이동
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* ── Share Again Row ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.55 }}
          className="flex items-center justify-center gap-2 text-xs text-ink-light/30"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>청담 해화당에서 공유된 운명 분석 결과입니다</span>
        </motion.div>
      </main>
    </div>
  )
}
