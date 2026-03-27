'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { AnalysisHistory } from '@/app/actions/user/history'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/utils/logger'
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
  ChevronDown,
  BookOpen,
  TrendingUp,
  Share2,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'

// ─── Types ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnalysisData = Record<string, any>

// ─── Score Ring ──────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const clamped = Math.min(100, Math.max(0, score))
  const radius = 38
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference
  const color =
    clamped >= 80 ? '#F4E4BA' : clamped >= 60 ? '#E2D5B5' : clamped >= 40 ? '#C8B273' : '#8C7B50'

  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg className="absolute inset-0 -rotate-90" width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="rgba(244,228,186,0.1)" strokeWidth="6" />
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

// ─── Section Helpers (사주 결과 전용) ─────────────────────────────────────────

function ResultSection({
  title,
  color,
  show,
  children,
}: {
  title: string
  color: 'amber' | 'blue' | 'gold' | 'emerald' | 'rose'
  show: boolean
  children: React.ReactNode
}) {
  if (!show) return null
  const colors = {
    amber: 'bg-amber-500/5 border-amber-500/15 text-amber-400',
    blue: 'bg-blue-500/5 border-blue-500/15 text-blue-400',
    gold: 'bg-gold-500/5 border-gold-500/15 text-gold-500',
    emerald: 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400',
    rose: 'bg-rose-500/5 border-rose-500/15 text-rose-400',
  }
  const dotColors = {
    amber: 'bg-amber-400',
    blue: 'bg-blue-400',
    gold: 'bg-gold-500',
    emerald: 'bg-emerald-400',
    rose: 'bg-rose-400',
  }
  return (
    <section className={`mx-4 mb-4 p-4 rounded-xl border ${colors[color]}`}>
      <h3 className={`text-sm font-serif font-medium mb-3 flex items-center gap-2 ${colors[color].split(' ')[2]}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[color]}`} />
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function DetailSection({
  title,
  data,
  color,
}: {
  title: string
  data: Record<string, unknown> | null | undefined
  color: 'blue' | 'emerald' | 'rose'
}) {
  const [isOpen, setIsOpen] = useState(true)
  if (!data) return null

  const content = data.content as string | undefined
  const strengths = data.strengths as string[] | undefined
  const weaknesses = data.weaknesses as string[] | undefined

  const colorMap = {
    blue: { bg: 'bg-blue-500/5', border: 'border-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-400' },
    emerald: { bg: 'bg-emerald-500/5', border: 'border-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
    rose: { bg: 'bg-rose-500/5', border: 'border-rose-500/15', text: 'text-rose-400', dot: 'bg-rose-400' },
  }
  const c = colorMap[color]

  return (
    <section className={`mx-4 mb-4 rounded-xl border ${c.bg} ${c.border} overflow-hidden`}>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-4">
        <h3 className={`text-sm font-serif font-medium flex items-center gap-2 ${c.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
          {title}
        </h3>
        <ChevronDown className={`w-4 h-4 text-ink-light/30 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 space-y-4">
          {content && <p className="text-sm text-ink-light/80 leading-relaxed whitespace-pre-line">{content}</p>}
          {strengths && strengths.length > 0 && (
            <div>
              <p className="text-xs text-ink-light/40 mb-1.5">강점</p>
              <ul className="space-y-1">
                {strengths.map((s, i) => (
                  <li key={i} className="text-sm text-ink-light/70 flex gap-2">
                    <span className="text-gold-500/60 shrink-0">+</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {weaknesses && weaknesses.length > 0 && (
            <div>
              <p className="text-xs text-ink-light/40 mb-1.5">약점</p>
              <ul className="space-y-1">
                {weaknesses.map((w, i) => (
                  <li key={i} className="text-sm text-ink-light/70 flex gap-2">
                    <span className="text-red-400/60 shrink-0">-</span>
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-gold-500 mx-auto" />
        <p className="text-sm text-ink-light/60 font-serif">사주풀이 결과를 불러오고 있어요</p>
      </div>
    </div>
  )
}

// ─── Error State ─────────────────────────────────────────────────────────────

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="w-full max-w-[480px] mx-auto p-6 flex justify-center border-b border-primary/10">
        <Link href="/">
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
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 max-w-[480px] mx-auto w-full">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="w-20 h-20 rounded-full bg-primary/5 border border-primary/20 flex items-center justify-center"
        >
          <AlertCircle className="w-9 h-9 text-primary/60" />
        </motion.div>
        <div className="space-y-2">
          <h2 className="text-xl font-serif font-bold text-ink-light">사주풀이 결과를 찾을 수 없어요</h2>
          <p className="text-sm text-ink-light/50 leading-relaxed max-w-xs mx-auto">{message}</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link href="/auth/login" className="w-full">
            <Button size="lg" className="w-full bg-primary hover:bg-primary-dim text-background font-serif text-base py-5">
              무료로 내 사주 보기
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link href="/" className="w-full">
            <Button variant="ghost" className="w-full text-ink-light/50 hover:text-ink-light hover:bg-primary/5">
              메인으로 돌아가기
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}

// ─── Saju Result Body (공유 전용 — 읽기 전용) ───────────────────────────────

function SajuResultBody({ data }: { data: AnalysisData }) {
  return (
    <>
      {/* 행운 정보 */}
      {data.lucky && (
        <section className="mx-4 mb-6 grid grid-cols-4 gap-2">
          {[
            { label: '색상', value: data.lucky.color },
            { label: '방위', value: data.lucky.direction },
            { label: '숫자', value: data.lucky.number },
            { label: '키워드', value: data.lucky.keyword },
          ].map(
            (item) =>
              item.value && (
                <div key={item.label} className="text-center p-2.5 rounded-lg bg-surface/30 border border-white/5">
                  <p className="text-[10px] text-ink-light/40">{item.label}</p>
                  <p className="text-xs text-gold-500 font-medium mt-0.5">{String(item.value)}</p>
                </div>
              ),
          )}
        </section>
      )}

      {/* 과거 역추산 */}
      <ResultSection title="과거에 이런 일이 있으셨을 거예요" color="amber" show={!!data.pastRetrograde?.events?.length}>
        {(data.pastRetrograde?.events as Array<{ period?: string; description?: string; basis?: string }>)?.map(
          (event, i) => (
            <div key={i} className="space-y-1">
              <p className="text-sm text-ink-light">
                <span className="text-amber-400/80 font-medium">{event.period}</span> — {event.description}
              </p>
              <p className="text-[11px] text-ink-light/40 font-light">{event.basis}</p>
            </div>
          ),
        )}
        {data.pastRetrograde?.accuracyHook && (
          <p className="mt-3 pt-3 border-t border-amber-500/10 text-[11px] text-amber-400/60 italic">
            {data.pastRetrograde.accuracyHook as string}
          </p>
        )}
      </ResultSection>

      {/* 현재 공감 */}
      <ResultSection title="요즘 이런 상황이시죠?" color="blue" show={!!data.currentSituation?.description}>
        <p className="text-sm text-ink-light leading-relaxed">{data.currentSituation?.description as string}</p>
        {data.currentSituation?.basis && (
          <p className="text-[11px] text-ink-light/40 font-light mt-2">{data.currentSituation.basis as string}</p>
        )}
        {data.currentSituation?.advice && (
          <p className="text-sm text-blue-400/80 font-medium mt-3 pt-3 border-t border-blue-500/10">
            {data.currentSituation.advice as string}
          </p>
        )}
      </ResultSection>

      {/* 타고난 성격 */}
      <DetailSection title={data.cheon?.title || '타고난 성격과 재능이에요'} data={data.cheon} color="blue" />

      {/* 신살 */}
      {data.cheon?.sinsal && (
        <ResultSection title="특별한 기운이 있어요" color="gold" show>
          {(data.cheon.sinsal as Array<{ name?: string; modern?: string }>)?.map((s, i) => (
            <div key={i} className="p-3 rounded-lg bg-gold-500/5 border border-gold-500/10">
              <p className="text-sm text-gold-500 font-medium">{s.name}</p>
              <p className="text-sm text-ink-light/70 leading-relaxed mt-1">{s.modern}</p>
            </div>
          ))}
        </ResultSection>
      )}

      {/* 운의 흐름 */}
      <DetailSection title={data.ji?.title || '지금 흐르는 운의 방향이에요'} data={data.ji} color="emerald" />

      {/* 교차 분석 */}
      <ResultSection
        title="여러 분석이 같은 결론을 가리키고 있어요"
        color="gold"
        show={!!data.crossAnalysis?.convergenceInsight}
      >
        {data.crossAnalysis?.sajuAndFace && (
          <p className="text-sm text-ink-light/80 leading-relaxed">{data.crossAnalysis.sajuAndFace as string}</p>
        )}
        {data.crossAnalysis?.convergenceInsight && (
          <p className="text-sm text-gold-500/80 font-medium mt-3 pt-3 border-t border-gold-500/10 leading-relaxed">
            {data.crossAnalysis.convergenceInsight as string}
          </p>
        )}
      </ResultSection>
    </>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface SharedSajuResultProps {
  token: string
}

export function SharedSajuResult({ token }: SharedSajuResultProps) {
  const [record, setRecord] = useState<AnalysisHistory | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRecord() {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        )

        const { data, error: rpcError } = await supabase.rpc('get_shared_analysis_record', {
          token_input: token,
        })

        if (rpcError) {
          logger.error('[SharedSaju] RPC Error:', rpcError)
          setError('데이터를 불러오는 중 오류가 발생했습니다.')
          return
        }

        if (!data || data.length === 0) {
          setError('공유 링크가 만료되었거나 삭제된 분석 결과입니다.\n청담 해화당에서 새로운 사주 분석을 받아보세요.')
          return
        }

        setRecord(data[0] as AnalysisHistory)
      } catch (err) {
        logger.error('[SharedSaju] Unexpected error:', err)
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

  const resultData = record.result_json as AnalysisData
  const dateStr = format(new Date(record.created_at), 'yyyy년 M월 d일', { locale: ko })
  const viewCount = record.share_view_count ?? null

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

      <main className="w-full max-w-[480px] flex-1 relative z-10 pb-32">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="text-center pt-8 pb-6 px-4 space-y-4"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gold-500/30 bg-gold-500/5">
            <Sun className="w-3.5 h-3.5 text-gold-500" />
            <span className="text-xs font-semibold text-gold-500 tracking-wider">청담해화당 사주풀이</span>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <h1 className="text-2xl font-serif font-bold text-ink-light">
              {record.target_name}님의 <span className="text-gold-500">사주풀이</span>
            </h1>
            {resultData?.summary && (
              <p className="text-sm text-ink-light/60 font-light mt-2 max-w-sm mx-auto leading-relaxed">
                {resultData.summary as string}
              </p>
            )}
          </div>

          {/* Meta */}
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

          {/* Score */}
          {record.score !== null && record.score !== undefined && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex justify-center pt-2"
            >
              <div className="flex flex-col items-center gap-1">
                <ScoreRing score={record.score} />
                <span className="text-xs text-ink-light/40">종합 운세 점수</span>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Saju Result Body */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
        >
          {resultData && <SajuResultBody data={resultData} />}
        </motion.div>

        {/* Partial blur teaser overlay */}
        <div className="relative h-24 -mt-12 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />

        {/* CTA Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: 'easeOut' }}
          className="mx-4 mt-2 relative overflow-hidden rounded-2xl border border-gold-500/30 bg-gradient-to-b from-gold-500/10 via-gold-500/5 to-transparent p-8 text-center space-y-5"
        >
          {/* Decorative */}
          <div aria-hidden className="absolute top-4 right-5 opacity-20">
            <Sparkles className="w-8 h-8 text-gold-500" />
          </div>

          <div className="space-y-2 relative z-10">
            <h3 className="text-xl font-serif font-bold text-ink-light leading-snug">
              나도 내 사주가
              <br />
              궁금하신가요?
            </h3>
            <p className="text-sm text-ink-light/60 leading-relaxed max-w-xs mx-auto">
              청담 해화당 AI가 당신의 사주팔자를
              <br />
              정밀하게 풀어드립니다.
              <br />
              <span className="text-gold-500/80 font-medium">신규 가입 시 50만냥 무료 지급!</span>
            </p>
          </div>

          <div className="flex flex-col gap-3 relative z-10">
            <Link href="/auth/login" className="w-full">
              <Button
                size="lg"
                className="w-full bg-gold-500 hover:bg-gold-500/90 text-background font-serif text-lg py-6 shadow-lg shadow-gold-500/20 transition-all"
              >
                무료로 내 사주 보기
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/" className="w-full">
              <Button variant="ghost" className="w-full text-ink-light/45 hover:text-ink-light hover:bg-primary/5 text-sm">
                메인으로 이동
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Footer watermark */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="flex items-center justify-center gap-2 text-xs text-ink-light/25 mt-8 pb-8"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>청담 해화당에서 공유된 사주풀이 결과입니다</span>
        </motion.div>
      </main>
    </div>
  )
}
