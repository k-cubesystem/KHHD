'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Heart, Sparkles, Share2, ArrowLeft, Loader2, Users } from 'lucide-react'
import { getFamilyMembers } from '@/app/actions/user/family'
import { getSajuData } from '@/lib/domain/saju/saju'
import { calculateCompatibilityScore } from '@/lib/domain/compatibility/compatibility'

function CompatibilityContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const target1Id = searchParams.get('target1')
  const target2Id = searchParams.get('target2')

  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<{ score: number; comment: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getFamilyMembers()
        setMembers(data)

        if (target1Id && target2Id) {
          const m1 = data.find((m: any) => m.id === target1Id)
          const m2 = data.find((m: any) => m.id === target2Id)

          if (m1 && m2) {
            const s1 = getSajuData(
              m1.birth_date,
              m1.birth_time || '00:00',
              m1.calendar_type === 'solar'
            )
            const s2 = getSajuData(
              m2.birth_date,
              m2.birth_time || '00:00',
              m2.calendar_type === 'solar'
            )
            const res = calculateCompatibilityScore(s1, s2)

            // Simulate analyzing delay for effect
            setTimeout(() => setResult(res), 1500)
          }
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [target1Id, target2Id])

  const m1 = members.find((m) => m.id === target1Id)
  const m2 = members.find((m) => m.id === target2Id)

  if (loading || (target1Id && target2Id && !result)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in duration-700">
        <div className="relative">
          <Heart className="w-16 h-16 text-primary animate-pulse opacity-50" />
          <Loader2 className="absolute inset-0 w-16 h-16 text-primary-dim animate-spin m-auto" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-ink-light">
          두 운명의 조화를 읽고 있습니다...
        </h2>
        <p className="text-ink/60 font-sans">오행의 생극제화와 간지의 합충을 분석 중입니다.</p>
      </div>
    )
  }

  if (!target1Id || !target2Id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in fade-in duration-1000">
        <div className="p-6 bg-surface/50 border border-primary/20 shadow-sm backdrop-blur-sm">
          <Users className="w-12 h-12 text-primary-dim" />
        </div>
        <div className="space-y-4 max-w-lg">
          <h1 className="text-4xl font-serif font-bold text-ink-light">궁합(宮合) 분석</h1>
          <p className="text-lg text-ink/60 font-sans font-light leading-relaxed">
            인연 관리 메뉴에서 두 사람을 선택하여
            <br />
            서로의 기운이 빚어내는 가능성을 확인하세요.
          </p>
        </div>
        <Button
          onClick={() => router.push('/protected/family')}
          className="h-14 px-8 text-lg bg-primary-dark text-white hover:bg-primary-dark/90 rounded-none font-serif shadow-md transition-all active:scale-95"
        >
          인연 선택하러 가기
        </Button>
      </div>
    )
  }

  if (!result) return null

  return (
    <div className="w-full max-w-[480px] mx-auto px-4 py-12 animate-in slide-in-from-bottom-8 fade-in duration-700">
      <Button
        variant="ghost"
        onClick={() => router.push('/protected/family')}
        className="mb-8 text-ink/60 hover:text-ink-light gap-2 pl-0 hover:bg-transparent rounded-none"
      >
        <ArrowLeft className="w-4 h-4" /> 다른 인연 선택하기
      </Button>

      <div className="grid gap-8 grid-cols-1">
        {/* Result Card */}
        <Card className="bg-surface/40 backdrop-blur-md border-primary/20 shadow-lg p-8 text-center rounded-none relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary-dark via-primary to-primary-dark" />

          <div className="flex items-center justify-center gap-8 mb-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-surface border border-primary/20 flex items-center justify-center font-serif font-bold text-2xl text-ink-light mx-auto mb-2 shadow-sm rounded-none">
                {m1?.name[0]}
              </div>
              <span className="text-sm font-bold text-ink/60">{m1?.name}</span>
            </div>
            <Heart className="w-8 h-8 text-primary fill-current animate-pulse" />
            <div className="text-center">
              <div className="w-16 h-16 bg-surface border border-primary/20 flex items-center justify-center font-serif font-bold text-2xl text-ink-light mx-auto mb-2 shadow-sm rounded-none">
                {m2?.name[0]}
              </div>
              <span className="text-sm font-bold text-ink/60">{m2?.name}</span>
            </div>
          </div>

          <div className="mb-8">
            <span className="text-sm font-bold text-primary uppercase tracking-widest border border-primary/30 px-3 py-1 rounded-none">
              Compatibility Score
            </span>
            <div className="mt-4 text-7xl font-serif font-bold text-ink-light tracking-tight">
              {result.score}
              <span className="text-4xl text-ink/40 ml-1 font-sans font-light">/100</span>
            </div>
          </div>

          <div className="max-w-xl mx-auto space-y-4">
            <h3 className="text-2xl font-serif font-bold text-ink-light">
              &quot;{result.comment}&quot;
            </h3>
            <p className="text-ink/60 leading-relaxed font-sans">
              두 분의 사주에서 나타나는 오행의 흐름이 위와 같은 조화를 이루고 있습니다. (더 상세한
              분석 로직은 추후 업데이트될 예정입니다.)
            </p>
          </div>

          <div className="mt-12 pt-8 border-t border-primary/10 flex justify-center gap-4">
            <Button
              variant="outline"
              className="border-primary/20 hover:bg-surface text-ink/60 font-sans h-12 px-6 rounded-none"
            >
              <Share2 className="w-4 h-4 mr-2" />
              결과 공유하기
            </Button>
            <Button className="bg-primary-dark text-white hover:bg-primary-dark/90 font-serif font-bold h-12 px-8 rounded-none shadow-sm">
              <Sparkles className="w-4 h-4 mr-2" />
              상세 리포트 저장 (1Cr)
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default function CompatibilityPage() {
  return (
    <div className="relative w-full overflow-hidden">
      {/* Zen Background Decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-primary-dim/5 rounded-full blur-[100px] pointer-events-none" />

      <Suspense
        fallback={
          <div className="flex min-h-[60vh] items-center justify-center">
            <Loader2 className="animate-spin text-primary" />
          </div>
        }
      >
        <CompatibilityContent />
      </Suspense>
    </div>
  )
}
