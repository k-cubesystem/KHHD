'use client'

import { useState, useEffect, useRef } from 'react'
import { analyzeCheonjiinAction } from '@/app/actions/ai/cheonjiin'
import { useAnalysisQuota } from '@/hooks/use-analysis-quota'
import { PaywallModal } from '@/components/shared/paywall-modal'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { DestinyTarget } from '@/app/actions/user/destiny'
import { RefreshCw, AlertTriangle, Settings, Sparkles, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { GOLD_500 } from '@/lib/config/design-tokens'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnalysisData = Record<string, any>

interface SajuResultClientProps {
  target: DestinyTarget
  initialData?: AnalysisData | null
  isCached?: boolean
}

export function SajuResultClient({ target, initialData = null, isCached = false }: SajuResultClientProps) {
  const [data, setData] = useState<AnalysisData | null>(initialData)
  const [isLoading, setIsLoading] = useState(!initialData)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const { checkQuota, paywallProps } = useAnalysisQuota()
  const started = useRef(false)

  useEffect(() => {
    if (!initialData && !started.current) {
      started.current = true
      runAnalysis()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 로딩 프로그레스
  useEffect(() => {
    if (!isLoading) return
    const interval = setInterval(() => {
      setProgress((p) => (p < 90 ? p + Math.random() * 8 : p))
    }, 500)
    return () => clearInterval(interval)
  }, [isLoading])

  async function runAnalysis() {
    const canProceed = await checkQuota()
    if (!canProceed) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setProgress(0)
    setError(null)

    try {
      const result = await analyzeCheonjiinAction(target.id, null, false, true)
      if (result.success && result.data) {
        setData(result.data as AnalysisData)
        setProgress(100)
        setTimeout(() => setIsLoading(false), 500)
      } else {
        setError(result.error || '분석 중 오류가 발생했습니다.')
        setIsLoading(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.')
      toast.error('분석 중 오류가 발생했습니다.')
      setIsLoading(false)
    }
  }

  // --- 로딩 ---
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-xs">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 border-2 border-gold-500/20 rounded-full" />
            <div
              className="absolute inset-0 border-2 border-gold-500 rounded-full border-t-transparent animate-spin"
              style={{ animationDuration: '1.5s' }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-serif text-gold-500">{Math.round(progress)}%</span>
            </div>
          </div>
          <div>
            <p className="text-sm text-ink-light font-serif">{target.name}님의 사주를 풀어보고 있습니다</p>
            <p className="text-xs text-ink-light/40 mt-1">약 10~30초 소요</p>
          </div>
        </div>
      </div>
    )
  }

  // --- 에러 ---
  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md space-y-4">
          <AlertTriangle className="w-12 h-12 mx-auto text-red-400/80" />
          <p className="text-red-400 text-sm">{error}</p>
          <div className="flex gap-2 justify-center">
            {error.includes('생년월일') ? (
              <Link href="/protected/settings">
                <Button variant="default" size="sm" className="gap-2">
                  <Settings className="w-4 h-4" />
                  프로필 설정
                </Button>
              </Link>
            ) : (
              <Button onClick={runAnalysis} variant="outline" size="sm" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                다시 시도
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  // --- 결과 ---
  return (
    <div className="min-h-screen bg-background pb-24">
      <PaywallModal {...paywallProps} />

      {/* 헤더 */}
      <header className="text-center pt-8 pb-6 px-4">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold-500/10 border border-gold-500/20 mb-3">
          <Sparkles className="w-3 h-3 text-gold-500" />
          <span className="text-[10px] font-medium text-gold-500 tracking-widest">청담해화당 통합분석</span>
        </div>
        <h1 className="text-2xl font-serif font-bold text-ink-light">
          {target.name}님의 <span className="text-gold-500">사주풀이</span>
        </h1>
        {data.summary && (
          <p className="text-sm text-ink-light/60 font-light mt-2 max-w-sm mx-auto leading-relaxed">
            {data.summary as string}
          </p>
        )}
        {isCached && (
          <button
            onClick={runAnalysis}
            className="mt-3 inline-flex items-center gap-1 text-[11px] text-ink-light/30 hover:text-gold-500/60 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            새로 분석하기
          </button>
        )}
      </header>

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

      {/* 天 사주 */}
      <DetailSection title={data.cheon?.title || '타고난 성격과 재능이에요'} data={data.cheon} color="blue" />

      {/* 투자 성향 */}
      {data.cheon?.investment && (
        <ResultSection title="나에게 맞는 투자 스타일이에요" color="emerald" show>
          {data.cheon.investment.style && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/10 mb-2">
              <p className="text-sm text-emerald-400 font-medium">{data.cheon.investment.style as string}</p>
            </div>
          )}
          {data.cheon.investment.stockStyle && (
            <div className="space-y-1">
              <p className="text-xs text-ink-light/40">주식 투자</p>
              <p className="text-sm text-ink-light/80 leading-relaxed">{data.cheon.investment.stockStyle as string}</p>
            </div>
          )}
          {data.cheon.investment.cryptoStyle && (
            <div className="space-y-1">
              <p className="text-xs text-ink-light/40">코인/가상자산</p>
              <p className="text-sm text-ink-light/80 leading-relaxed">{data.cheon.investment.cryptoStyle as string}</p>
            </div>
          )}
          {data.cheon.investment.riskLevel && (
            <div className="space-y-1">
              <p className="text-xs text-ink-light/40">위험 감수 성향</p>
              <p className="text-sm text-ink-light/80">{data.cheon.investment.riskLevel as string}</p>
            </div>
          )}
          {data.cheon.investment.bestTiming && (
            <div className="space-y-1">
              <p className="text-xs text-ink-light/40">투자 타이밍</p>
              <p className="text-sm text-ink-light/80">{data.cheon.investment.bestTiming as string}</p>
            </div>
          )}
          {data.cheon.investment.warning && (
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 mt-2">
              <p className="text-xs text-red-400/60 mb-1">주의</p>
              <p className="text-sm text-ink-light/80">{data.cheon.investment.warning as string}</p>
            </div>
          )}
          {data.cheon.investment.recommendation && (
            <p className="text-sm text-emerald-400/80 font-medium mt-3 pt-3 border-t border-emerald-500/10">
              {data.cheon.investment.recommendation as string}
            </p>
          )}
        </ResultSection>
      )}

      {/* 건강 분석 */}
      {data.cheon?.health && typeof data.cheon.health === 'object' && (
        <ResultSection title="건강 관리는 이렇게 하세요" color="rose" show>
          {data.cheon.health.overall && (
            <p className="text-sm text-ink-light/80 leading-relaxed">{data.cheon.health.overall as string}</p>
          )}
          {(data.cheon.health.weakOrgans as string[])?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-ink-light/40">주의가 필요한 부위</p>
              {(data.cheon.health.weakOrgans as string[]).map((organ: string, i: number) => (
                <p key={i} className="text-sm text-ink-light/70 flex gap-2">
                  <span className="text-red-400/60 shrink-0">!</span> {organ}
                </p>
              ))}
            </div>
          )}
          {data.cheon.health.mentalHealth && (
            <div className="space-y-1">
              <p className="text-xs text-ink-light/40">멘탈 관리</p>
              <p className="text-sm text-ink-light/80 leading-relaxed">{data.cheon.health.mentalHealth as string}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {data.cheon.health.exerciseAdvice && (
              <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                <p className="text-[10px] text-gold-500/60 mb-1">추천 운동</p>
                <p className="text-[12px] text-ink-light/70 leading-relaxed">{data.cheon.health.exerciseAdvice as string}</p>
              </div>
            )}
            {data.cheon.health.dietAdvice && (
              <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                <p className="text-[10px] text-gold-500/60 mb-1">음식 추천</p>
                <p className="text-[12px] text-ink-light/70 leading-relaxed">{data.cheon.health.dietAdvice as string}</p>
              </div>
            )}
          </div>
          {data.cheon.health.warningPeriod && (
            <p className="text-sm text-red-400/70 mt-2 pt-2 border-t border-red-500/10">
              {data.cheon.health.warningPeriod as string}
            </p>
          )}
        </ResultSection>
      )}

      {/* 地 환경 */}
      <DetailSection title={data.ji?.title || '지금 흐르는 운의 방향이에요'} data={data.ji} color="emerald" />

      {/* 人 관계 */}
      <DetailSection title={data.in?.title || '사람 관계와 인연이에요'} data={data.in} color="rose" />

      {/* 교차 분석 */}
      <ResultSection title="여러 분석이 같은 결론을 가리키고 있어요" color="gold" show={!!data.crossAnalysis?.convergenceInsight}>
        {data.crossAnalysis?.sajuAndFace && (
          <p className="text-sm text-ink-light/80 leading-relaxed">{data.crossAnalysis.sajuAndFace as string}</p>
        )}
        {data.crossAnalysis?.sajuAndFengshui && (
          <p className="text-sm text-ink-light/80 leading-relaxed">{data.crossAnalysis.sajuAndFengshui as string}</p>
        )}
        <p className="text-sm text-gold-500/80 font-medium mt-3 pt-3 border-t border-gold-500/10 leading-relaxed">
          {data.crossAnalysis?.convergenceInsight as string}
        </p>
      </ResultSection>
    </div>
  )
}

// --- 섹션 헬퍼 ---
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
  const career = data.career as string | undefined
  const wealth = data.wealth as string | undefined
  const love = data.love as string | undefined
  const health = data.health as string | undefined

  const colorMap = {
    blue: { bg: 'bg-blue-500/5', border: 'border-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-400' },
    emerald: {
      bg: 'bg-emerald-500/5',
      border: 'border-emerald-500/15',
      text: 'text-emerald-400',
      dot: 'bg-emerald-400',
    },
    rose: { bg: 'bg-rose-500/5', border: 'border-rose-500/15', text: 'text-rose-400', dot: 'bg-rose-400' },
  }
  const c = colorMap[color]

  return (
    <section className={`mx-4 mb-4 rounded-xl border ${c.bg} ${c.border} overflow-hidden`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4"
      >
        <h3 className={`text-sm font-serif font-medium flex items-center gap-2 ${c.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
          {title}
        </h3>
        <ChevronDown
          className={`w-4 h-4 text-ink-light/30 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
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

          {(career || wealth || love || health) && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
              {career && <MiniCard label="직업운" content={career} />}
              {wealth && <MiniCard label="재물운" content={wealth} />}
              {love && <MiniCard label="연애운" content={love} />}
              {health && <MiniCard label="건강운" content={health} />}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function MiniCard({ label, content }: { label: string; content: string }) {
  const [expanded, setExpanded] = useState(false)
  const preview = content.length > 60 ? content.slice(0, 60) + '...' : content

  return (
    <div
      className="p-3 rounded-lg bg-black/20 border border-white/5 cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      <p className="text-[10px] text-gold-500/60 mb-1">{label}</p>
      <p className="text-[12px] text-ink-light/70 leading-relaxed">{expanded ? content : preview}</p>
    </div>
  )
}
