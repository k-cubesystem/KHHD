'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { AnalysisHistory } from '@/app/actions/user/history'
import { AnalysisResultView } from '@/components/history/analysis-result-view'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ArrowRight, Clock, User, Sparkles, Loader2, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-ink-light/60 font-serif">운명을 읽어오는 중...</p>
      </div>
    )
  }

  if (error || !record) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-serif font-bold text-ink-light">오류가 발생했습니다</h2>
          <p className="text-ink-light/60">{error || '페이지를 찾을 수 없습니다.'}</p>
        </div>
        <Link href="/">
          <Button variant="outline" className="border-primary/20">
            메인으로 돌아가기
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-ink-light font-sans selection:bg-primary/30 relative overflow-hidden flex flex-col items-center">
      <div className="hanji-overlay" />

      {/* Header / Logo */}
      <header className="w-full max-w-[480px] p-6 flex justify-center sticky top-0 bg-background/90 backdrop-blur-md z-50 border-b border-primary/10">
        <Link href="/">
          <Image
            src="/images/logo.png"
            alt="청담 해화당"
            width={120}
            height={40}
            className="opacity-90 hover:opacity-100 transition-opacity"
            onError={(e) => {
              // Fallback if image fails
              e.currentTarget.style.display = 'none'
            }}
          />
          <span className="sr-only">청담 해화당</span>
          {/* Logo Fallback Text if needed */}
          <h1 className="font-serif text-lg font-bold text-primary tracking-widest text-center hidden">
            청담 해화당
          </h1>
        </Link>
      </header>

      <main className="w-full max-w-[480px] flex-1 px-4 py-8 relative z-10 pb-32">
        {/* Title Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center space-y-4 mb-10"
        >
          <div className="inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 mb-2">
            <User className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary tracking-wider uppercase">
              Shared Analysis
            </span>
          </div>

          <h2 className="text-3xl font-serif font-bold text-ink-light leading-tight">
            {record.target_name}님의
            <br />
            <span className="text-primary">{record.category}</span> 운명 분석
          </h2>

          <div className="flex items-center justify-center gap-4 text-sm text-ink-light/50">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {format(new Date(record.created_at), 'yyyy.MM.dd', {
                  locale: ko,
                })}
              </span>
            </div>
            {record.score !== null && (
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-amber-500 font-bold">{record.score}점</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Result Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-surface/50 border border-primary/20 rounded-xl p-6 shadow-2xl mb-8"
        >
          <AnalysisResultView record={record} />
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="bg-gradient-to-b from-primary/10 to-transparent border border-primary/30 rounded-xl p-8 text-center space-y-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-noise opacity-10 pointer-events-none" />

          <div className="relative z-10 space-y-2">
            <h3 className="text-xl font-serif font-bold text-ink-light">
              나의 운명도 궁금하신가요?
            </h3>
            <p className="text-sm text-ink-light/70 leading-relaxed max-w-xs mx-auto">
              청담 해화당 AI가 당신의 사주, 관상, 손금을
              <br />
              정밀하게 분석해드립니다.
            </p>
          </div>

          <div className="flex flex-col gap-3 relative z-10">
            <Link href="/auth/login" className="w-full">
              <Button
                size="lg"
                className="w-full bg-primary hover:bg-primary-dim text-background font-serif text-lg py-6 shadow-lg shadow-primary/20"
              >
                무료로 내 운세 보기
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/" className="w-full">
              <Button
                variant="ghost"
                className="w-full text-ink-light/50 hover:text-ink-light hover:bg-primary/5"
              >
                메인으로 이동
              </Button>
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  )
}
