'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { analyzeCheonjiinAction } from '@/app/actions/ai/cheonjiin'
import { createSajuShareTokenByTarget } from '@/app/actions/ai/share-saju'
import { useAnalysisQuota } from '@/hooks/use-analysis-quota'
import { PaywallModal } from '@/components/shared/paywall-modal'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { DestinyTarget } from '@/app/actions/user/destiny'
import { RefreshCw, AlertTriangle, Settings, Sparkles, ChevronDown, Share2, Link2, Check, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { GOLD_500 } from '@/lib/config/design-tokens'
import { logger } from '@/lib/utils/logger'

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

  const [apiDone, setApiDone] = useState(false)

  // 로딩 프로그레스 — 느리게 올라가다가 API 완료되면 100%로 점프
  useEffect(() => {
    if (!isLoading) return
    const interval = setInterval(() => {
      setProgress((p) => {
        if (apiDone) return p // API 완료되면 별도 처리
        // 0~50%: 느리게 (1~2씩), 50~80%: 더 느리게 (0.5~1씩)
        if (p < 50) return p + 0.8 + Math.random() * 1.2
        if (p < 80) return p + 0.3 + Math.random() * 0.7
        return p // 80%에서 멈춤 — API 완료 대기
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isLoading, apiDone])

  // API 완료 시 80% 이상이면 바로 100%로
  useEffect(() => {
    if (apiDone && isLoading) {
      setProgress(100)
      setTimeout(() => setIsLoading(false), 800)
    }
  }, [apiDone, isLoading])

  async function runAnalysis() {
    const canProceed = await checkQuota()
    if (!canProceed) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setProgress(0)
    setApiDone(false)
    setError(null)

    try {
      const result = await analyzeCheonjiinAction(target.id, null, false, true)
      if (result.success && result.data) {
        setData(result.data as AnalysisData)
        setApiDone(true) // progress가 80% 미만이어도 완료 처리
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

  // --- 콘텐츠형 로딩 ---
  if (isLoading) {
    return <SajuLoadingContent name={target.name} progress={progress} />
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

      {/* ⭐ 특별한 사주 기운 */}
      {data.specialEnergy?.title && (
        <section className="mx-4 mb-6 p-5 rounded-2xl bg-gradient-to-br from-gold-500/15 via-gold-500/5 to-transparent border border-gold-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/20 rounded-full blur-[60px] pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <p className="text-[10px] text-gold-500/60 tracking-wider">이 사주만의 특별한 기운</p>
            <h3 className="text-lg font-serif font-bold text-gold-500">{data.specialEnergy.title as string}</h3>
            <p className="text-sm text-ink-light/80 leading-relaxed">{data.specialEnergy.description as string}</p>
            {data.specialEnergy.rarity && (
              <span className="inline-block px-2.5 py-1 rounded-full bg-gold-500/10 border border-gold-500/20 text-[11px] text-gold-500">{data.specialEnergy.rarity as string}</span>
            )}
            {data.specialEnergy.hiddenTalent && (
              <div className="pt-3 border-t border-gold-500/10">
                <p className="text-[10px] text-gold-500/50 mb-1">숨겨진 재능</p>
                <p className="text-sm text-ink-light/70 leading-relaxed">{data.specialEnergy.hiddenTalent as string}</p>
              </div>
            )}
            {data.specialEnergy.destinyMission && (
              <div className="pt-3 border-t border-gold-500/10">
                <p className="text-[10px] text-gold-500/50 mb-1">인생 미션</p>
                <p className="text-sm text-ink-light/70 leading-relaxed">{data.specialEnergy.destinyMission as string}</p>
              </div>
            )}
          </div>
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

      {/* 격국·용신 + 오행 밸런스 */}
      {data.sajuStructure && (
        <ResultSection title="내 사주의 구조예요" color="blue" show>
          {data.sajuStructure.geokgukName && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/10 mb-2">
              <p className="text-xs text-blue-400/60 mb-0.5">격국</p>
              <p className="text-sm text-blue-400 font-medium">{data.sajuStructure.geokgukName as string}</p>
            </div>
          )}
          {data.sajuStructure.geokgukExplain && (
            <p className="text-sm text-ink-light/80 leading-relaxed">{data.sajuStructure.geokgukExplain as string}</p>
          )}
          {data.sajuStructure.yongsinElement && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/10 mt-2 mb-2">
              <p className="text-xs text-emerald-400/60 mb-0.5">용신</p>
              <p className="text-sm text-emerald-400 font-medium">{data.sajuStructure.yongsinElement as string}</p>
            </div>
          )}
          {data.sajuStructure.yongsinExplain && (
            <p className="text-sm text-ink-light/80 leading-relaxed">{data.sajuStructure.yongsinExplain as string}</p>
          )}
          {data.sajuStructure.elementBalance && (
            <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
              <p className="text-xs text-ink-light/40 mb-2">오행 밸런스</p>
              {([
                { key: 'wood', label: '목(木)', color: 'bg-emerald-500/60' },
                { key: 'fire', label: '화(火)', color: 'bg-red-500/60' },
                { key: 'earth', label: '토(土)', color: 'bg-yellow-500/60' },
                { key: 'metal', label: '금(金)', color: 'bg-gray-300/60' },
                { key: 'water', label: '수(水)', color: 'bg-blue-500/60' },
              ] as const).map((el) => {
                const bal = (data.sajuStructure.elementBalance as Record<string, { count?: number; status?: string }>)?.[el.key]
                if (!bal) return null
                return (
                  <div key={el.key} className="flex items-center gap-2">
                    <span className="w-12 text-[11px] text-ink-light/50">{el.label}</span>
                    <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full ${el.color} rounded-full transition-all`} style={{ width: `${Math.min((bal.count ?? 0) * 20, 100)}%` }} />
                    </div>
                    <span className={`text-[10px] w-10 text-right ${bal.status === '부족' ? 'text-red-400/60' : bal.status === '과다' ? 'text-amber-400/60' : 'text-ink-light/30'}`}>{bal.status}</span>
                  </div>
                )
              })}
            </div>
          )}
        </ResultSection>
      )}

      {/* 올해 월별 운세 */}
      {(data.yearlyMonthly as Array<{ month?: string; keyword?: string; content?: string; rating?: string }>)?.length > 0 && (
        <ResultSection title="올해 월별 운세예요" color="gold" show>
          <div className="grid grid-cols-2 gap-2">
            {(data.yearlyMonthly as Array<{ month?: string; keyword?: string; content?: string; rating?: string }>).map((m, i) => (
              <div key={i} className="p-3 rounded-lg bg-surface/20 border border-white/5">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-ink-light">{m.month}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${m.rating === '상' ? 'bg-emerald-500/10 text-emerald-400' : m.rating === '하' ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-ink-light/40'}`}>{m.rating}</span>
                </div>
                <p className="text-[11px] text-gold-500/70 font-medium">{m.keyword}</p>
                <p className="text-[11px] text-ink-light/50 mt-1 leading-relaxed">{m.content}</p>
              </div>
            ))}
          </div>
        </ResultSection>
      )}

      {/* 신살 — 도화살, 역마살 등 */}
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

      {/* 직업운 */}
      {data.cheon?.career && typeof data.cheon.career === 'object' && (
        <ResultSection title="나한테 맞는 직업이에요" color="blue" show>
          {data.cheon.career.summary && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/10 mb-2">
              <p className="text-sm text-blue-400 font-medium">{data.cheon.career.summary as string}</p>
            </div>
          )}
          {data.cheon.career.personality_match && (
            <p className="text-sm text-ink-light/80 leading-relaxed">{data.cheon.career.personality_match as string}</p>
          )}
          {(data.cheon.career.best_jobs as string[])?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-ink-light/40">잘 맞는 직업</p>
              {(data.cheon.career.best_jobs as string[]).map((job: string, i: number) => (
                <p key={i} className="text-sm text-ink-light/70 flex gap-2"><span className="text-emerald-400/60 shrink-0">+</span> {job}</p>
              ))}
            </div>
          )}
          {(data.cheon.career.worst_jobs as string[])?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-ink-light/40">안 맞는 직업</p>
              {(data.cheon.career.worst_jobs as string[]).map((job: string, i: number) => (
                <p key={i} className="text-sm text-ink-light/70 flex gap-2"><span className="text-red-400/60 shrink-0">-</span> {job}</p>
              ))}
            </div>
          )}
          {data.cheon.career.business_aptitude && (
            <div className="space-y-1"><p className="text-xs text-ink-light/40">사업 적성</p><p className="text-sm text-ink-light/80 leading-relaxed">{data.cheon.career.business_aptitude as string}</p></div>
          )}
          {data.cheon.career.career_timing && (
            <div className="space-y-1"><p className="text-xs text-ink-light/40">이직·승진 타이밍</p><p className="text-sm text-ink-light/80">{data.cheon.career.career_timing as string}</p></div>
          )}
          {data.cheon.career.celebrity_comparison && (
            <p className="text-sm text-blue-400/70 mt-3 pt-3 border-t border-blue-500/10 italic">{data.cheon.career.celebrity_comparison as string}</p>
          )}
        </ResultSection>
      )}

      {/* 재물운 + 투자 성향 통합 */}
      <ResultSection title="돈은 이렇게 벌고 굴리면 돼요" color="emerald" show={!!(data.cheon?.wealth || data.cheon?.investment)}>
        {data.cheon?.wealth && typeof data.cheon.wealth === 'string' && (
          <p className="text-sm text-ink-light/80 leading-relaxed">{data.cheon.wealth}</p>
        )}
        {data.cheon?.investment?.style && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/10 mt-2">
            <p className="text-sm text-emerald-400 font-medium">{data.cheon.investment.style as string}</p>
          </div>
        )}
        {data.cheon?.investment?.stockStyle && (
          <div className="space-y-1"><p className="text-xs text-ink-light/40">주식</p><p className="text-sm text-ink-light/80 leading-relaxed">{data.cheon.investment.stockStyle as string}</p></div>
        )}
        {data.cheon?.investment?.cryptoStyle && (
          <div className="space-y-1"><p className="text-xs text-ink-light/40">코인</p><p className="text-sm text-ink-light/80 leading-relaxed">{data.cheon.investment.cryptoStyle as string}</p></div>
        )}
        {data.cheon?.investment?.riskLevel && (
          <div className="space-y-1"><p className="text-xs text-ink-light/40">위험 감수 성향</p><p className="text-sm text-ink-light/80">{data.cheon.investment.riskLevel as string}</p></div>
        )}
        {data.cheon?.investment?.bestTiming && (
          <div className="space-y-1"><p className="text-xs text-ink-light/40">투자 타이밍</p><p className="text-sm text-ink-light/80">{data.cheon.investment.bestTiming as string}</p></div>
        )}
        {data.cheon?.investment?.warning && (
          <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 mt-2"><p className="text-xs text-red-400/60 mb-1">주의</p><p className="text-sm text-ink-light/80">{data.cheon.investment.warning as string}</p></div>
        )}
        {data.cheon?.investment?.recommendation && (
          <p className="text-sm text-emerald-400/80 font-medium mt-3 pt-3 border-t border-emerald-500/10">{data.cheon.investment.recommendation as string}</p>
        )}
      </ResultSection>

      {/* 연애운 + 인간관계 통합 */}
      <ResultSection title="연애와 인간관계는 이래요" color="rose" show={!!(data.cheon?.love || data.cheon?.people)}>
        {data.cheon?.love && typeof data.cheon.love === 'string' && (
          <p className="text-sm text-ink-light/80 leading-relaxed">{data.cheon.love}</p>
        )}
        {data.cheon?.people?.good_match && (
          <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 mt-2">
            <p className="text-xs text-emerald-400/60 mb-1">나랑 잘 맞는 사람</p>
            <p className="text-sm text-ink-light/80 leading-relaxed">{(data.cheon.people.good_match as Record<string, unknown>).description as string}</p>
            {((data.cheon.people.good_match as Record<string, unknown>).examples as string[])?.map((ex: string, i: number) => (
              <p key={i} className="text-sm text-ink-light/60 flex gap-2 mt-1"><span className="text-emerald-400/60 shrink-0">+</span> {ex}</p>
            ))}
          </div>
        )}
        {data.cheon?.people?.bad_match && (
          <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 mt-2">
            <p className="text-xs text-red-400/60 mb-1">조심해야 하는 사람</p>
            <p className="text-sm text-ink-light/80 leading-relaxed">{(data.cheon.people.bad_match as Record<string, unknown>).description as string}</p>
            {((data.cheon.people.bad_match as Record<string, unknown>).examples as string[])?.map((ex: string, i: number) => (
              <p key={i} className="text-sm text-ink-light/60 flex gap-2 mt-1"><span className="text-red-400/60 shrink-0">!</span> {ex}</p>
            ))}
          </div>
        )}
        {data.cheon?.people?.noble_person && (
          <div className="space-y-1 mt-2"><p className="text-xs text-ink-light/40">나를 도와줄 귀인</p><p className="text-sm text-ink-light/80 leading-relaxed">{data.cheon.people.noble_person as string}</p></div>
        )}
        {data.cheon?.people?.relationship_advice && (
          <p className="text-sm text-rose-400/70 mt-3 pt-3 border-t border-rose-500/10">{data.cheon.people.relationship_advice as string}</p>
        )}
      </ResultSection>

      {/* 건강 */}
      {data.cheon?.health && typeof data.cheon.health === 'object' && (
        <ResultSection title="건강은 이렇게 관리하세요" color="rose" show>
          {data.cheon.health.overall && (<p className="text-sm text-ink-light/80 leading-relaxed">{data.cheon.health.overall as string}</p>)}
          {(data.cheon.health.weakOrgans as string[])?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-ink-light/40">주의가 필요한 부위</p>
              {(data.cheon.health.weakOrgans as string[]).map((organ: string, i: number) => (
                <p key={i} className="text-sm text-ink-light/70 flex gap-2"><span className="text-red-400/60 shrink-0">!</span> {organ}</p>
              ))}
            </div>
          )}
          {data.cheon.health.mentalHealth && (
            <div className="space-y-1"><p className="text-xs text-ink-light/40">멘탈 관리</p><p className="text-sm text-ink-light/80 leading-relaxed">{data.cheon.health.mentalHealth as string}</p></div>
          )}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {data.cheon.health.exerciseAdvice && (<div className="p-3 rounded-lg bg-black/20 border border-white/5"><p className="text-[10px] text-gold-500/60 mb-1">추천 운동</p><p className="text-[12px] text-ink-light/70 leading-relaxed">{data.cheon.health.exerciseAdvice as string}</p></div>)}
            {data.cheon.health.dietAdvice && (<div className="p-3 rounded-lg bg-black/20 border border-white/5"><p className="text-[10px] text-gold-500/60 mb-1">음식 추천</p><p className="text-[12px] text-ink-light/70 leading-relaxed">{data.cheon.health.dietAdvice as string}</p></div>)}
          </div>
          {data.cheon.health.warningPeriod && (<p className="text-sm text-red-400/70 mt-2 pt-2 border-t border-red-500/10">{data.cheon.health.warningPeriod as string}</p>)}
        </ResultSection>
      )}

      {/* 운의 흐름 */}
      {/* 인생 타임라인 */}
      {data.cheon?.lifeTimeline && (
        <ResultSection title="인생 타임라인이에요" color="blue" show>
          <div className="space-y-4">
            {([
              { label: '지난 10년', key: 'pastDecade', dotClass: 'border-white/20', textClass: 'text-ink-light/40' },
              { label: '지금', key: 'currentDecade', dotClass: 'border-gold-500 bg-gold-500/30', textClass: 'text-gold-500' },
              { label: '앞으로 10년', key: 'nextDecade', dotClass: 'border-blue-400', textClass: 'text-blue-400' },
            ] as const).map((item, i) => {
              const val = (data.cheon.lifeTimeline as Record<string, string>)?.[item.key]
              if (!val) return null
              return (
                <div key={item.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full border-2 shrink-0 ${item.dotClass}`} />
                    {i < 2 && <div className="w-px flex-1 bg-white/10 mt-1" />}
                  </div>
                  <div className="pb-2">
                    <p className={`text-xs font-medium ${item.textClass}`}>{item.label}</p>
                    <p className="text-sm text-ink-light/70 leading-relaxed mt-1">{val}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </ResultSection>
      )}

      {/* 개운법 상세 */}
      {data.gaewoon && (
        <ResultSection title="이렇게 하면 운이 좋아져요" color="gold" show>
          <div className="grid grid-cols-2 gap-2">
            {data.gaewoon.luckyColor && (
              <div className="p-3 rounded-lg bg-surface/20 border border-white/5">
                <p className="text-[10px] text-gold-500/50 mb-1">행운의 색상</p>
                <p className="text-sm text-ink-light font-medium">{(data.gaewoon.luckyColor as Record<string, string>).color}</p>
                <p className="text-[11px] text-ink-light/40 mt-0.5">{(data.gaewoon.luckyColor as Record<string, string>).reason}</p>
                <p className="text-[10px] text-gold-500/40 mt-1">{(data.gaewoon.luckyColor as Record<string, string>).items}</p>
              </div>
            )}
            {data.gaewoon.luckyDirection && (
              <div className="p-3 rounded-lg bg-surface/20 border border-white/5">
                <p className="text-[10px] text-gold-500/50 mb-1">행운의 방위</p>
                <p className="text-sm text-ink-light font-medium">{(data.gaewoon.luckyDirection as Record<string, string>).direction}</p>
                <p className="text-[11px] text-ink-light/40 mt-0.5">{(data.gaewoon.luckyDirection as Record<string, string>).reason}</p>
                <p className="text-[10px] text-gold-500/40 mt-1">{(data.gaewoon.luckyDirection as Record<string, string>).usage}</p>
              </div>
            )}
            {data.gaewoon.luckyFood && (
              <div className="p-3 rounded-lg bg-surface/20 border border-white/5">
                <p className="text-[10px] text-gold-500/50 mb-1">행운의 음식</p>
                <p className="text-sm text-ink-light font-medium">{((data.gaewoon.luckyFood as Record<string, unknown>).foods as string[])?.join(', ')}</p>
                <p className="text-[11px] text-ink-light/40 mt-0.5">{(data.gaewoon.luckyFood as Record<string, string>).reason}</p>
              </div>
            )}
            {data.gaewoon.luckyNumber && (
              <div className="p-3 rounded-lg bg-surface/20 border border-white/5">
                <p className="text-[10px] text-gold-500/50 mb-1">행운의 숫자</p>
                <p className="text-sm text-ink-light font-medium">{((data.gaewoon.luckyNumber as Record<string, unknown>).numbers as number[])?.join(', ')}</p>
                <p className="text-[11px] text-ink-light/40 mt-0.5">{(data.gaewoon.luckyNumber as Record<string, string>).reason}</p>
              </div>
            )}
          </div>
          {data.gaewoon.avoidItems && (
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 mt-2">
              <p className="text-[10px] text-red-400/50 mb-1">피해야 할 것</p>
              <p className="text-sm text-ink-light/70">{((data.gaewoon.avoidItems as Record<string, unknown>).items as string[])?.join(', ')}</p>
              <p className="text-[11px] text-ink-light/40 mt-0.5">{(data.gaewoon.avoidItems as Record<string, string>).reason}</p>
            </div>
          )}
          {data.gaewoon.dailyRoutine && (
            <div className="p-3 rounded-lg bg-gold-500/5 border border-gold-500/10 mt-2">
              <p className="text-[10px] text-gold-500/50 mb-1">매일 개운 루틴</p>
              <p className="text-sm text-ink-light/80 leading-relaxed">{data.gaewoon.dailyRoutine as string}</p>
            </div>
          )}
        </ResultSection>
      )}

      {/* 운의 흐름 */}
      <DetailSection title={data.ji?.title || '지금 흐르는 운의 방향이에요'} data={data.ji} color="emerald" />

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

      {/* 카카오톡/SNS 공유 */}
      <SajuShareSection targetId={target.id} targetName={target.name} summary={data.summary as string | undefined} />
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
  // career/health가 객체일 수 있으므로 문자열만 추출
  const career = typeof data.career === 'string' ? data.career : (data.career as Record<string, unknown>)?.summary as string | undefined
  const wealth = typeof data.wealth === 'string' ? data.wealth : undefined
  const love = typeof data.love === 'string' ? data.love : undefined
  const health = typeof data.health === 'string' ? data.health : (data.health as Record<string, unknown>)?.overall as string | undefined

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

// --- 카카오톡/SNS 공유 섹션 ---

function SajuShareSection({
  targetId,
  targetName,
  summary,
}: {
  targetId: string
  targetName: string
  summary?: string
}) {
  const [isSharing, setIsSharing] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const generateShareUrl = useCallback(async (): Promise<string | null> => {
    // 이미 생성된 URL이 있으면 재사용
    if (shareUrl) return shareUrl

    setIsSharing(true)
    try {
      const result = await createSajuShareTokenByTarget(targetId)
      if (result.success && result.shareUrl) {
        const cleanUrl = result.shareUrl.trim()
        setShareUrl(cleanUrl)
        return cleanUrl
      }
      toast.error(result.error || '공유 링크 생성에 실패했습니다.')
      return null
    } catch (error) {
      logger.error('[SajuShare] Error generating share URL:', error)
      toast.error('공유 링크 생성 중 오류가 발생했습니다.')
      return null
    } finally {
      setIsSharing(false)
    }
  }, [targetId, shareUrl])

  // 카카오톡 공유 (Web Share API 우선, fallback: URL 복사)
  async function handleKakaoShare() {
    const url = await generateShareUrl()
    if (!url) return

    const shareTitle = `${targetName}님의 사주풀이 - 청담해화당`
    const shareText = summary
      ? `${summary.slice(0, 80)}... 나도 내 사주를 무료로 확인해보세요!`
      : `${targetName}님의 사주풀이 결과를 확인해보세요. 나도 무료로 내 사주를 볼 수 있어요!`

    // 카카오톡 URL scheme (모바일에서 카카오톡 앱으로 직접 공유)
    const kakaoShareUrl = `https://story.kakao.com/share?url=${encodeURIComponent(url)}`

    // 모바일이면 Web Share API 시도 (카카오톡 포함 네이티브 공유)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url,
        })
        toast.success('공유가 완료되었어요!')
        return
      } catch (err) {
        // 사용자가 공유 취소한 경우 무시
        if (err instanceof Error && err.name === 'AbortError') return
        logger.error('[SajuShare] Web Share API error:', err)
      }
    }

    // 데스크톱 fallback: 카카오스토리 공유 페이지 열기
    window.open(kakaoShareUrl, '_blank', 'width=600,height=500,noopener,noreferrer')
  }

  // 링크 복사
  async function handleCopyLink() {
    const url = await generateShareUrl()
    if (!url) return

    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('공유 링크가 복사되었어요!')
      setTimeout(() => setCopied(false), 2500)
    } catch (error) {
      logger.error('[SajuShare] Clipboard error:', error)
      // fallback: 직접 선택 방식
      const textArea = document.createElement('textarea')
      textArea.value = url
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      toast.success('공유 링크가 복사되었어요!')
      setTimeout(() => setCopied(false), 2500)
    }
  }

  // 트위터 공유
  async function handleTwitterShare() {
    const url = await generateShareUrl()
    if (!url) return

    const text = `${targetName}님의 사주풀이 결과 - 청담해화당`
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
    window.open(twitterUrl, '_blank', 'width=600,height=400,noopener,noreferrer')
  }

  return (
    <section className="mx-4 mb-4 mt-6 p-5 rounded-xl border border-gold-500/20 bg-gradient-to-b from-gold-500/5 to-transparent">
      <div className="text-center space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-serif font-medium text-gold-500 flex items-center justify-center gap-2">
            <Share2 className="w-4 h-4" />
            사주풀이 결과 공유하기
          </h3>
          <p className="text-xs text-ink-light/40">친구에게 내 사주풀이 결과를 공유해보세요</p>
        </div>

        <div className="flex gap-2 justify-center">
          {/* 카카오톡 공유 */}
          <Button
            onClick={handleKakaoShare}
            disabled={isSharing}
            className="flex-1 max-w-[140px] gap-2 bg-[#FEE500] text-[#3C1E1E] hover:bg-[#FEE500]/90 border-none font-medium text-sm py-2.5"
          >
            {isSharing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.48 3 2 6.58 2 10.9c0 2.78 1.86 5.22 4.65 6.6-.15.56-.96 3.56-.99 3.78 0 0-.02.17.09.24.11.06.24.01.24.01.32-.04 3.68-2.4 4.26-2.81.57.08 1.15.13 1.75.13 5.52 0 10-3.58 10-7.95C22 6.58 17.52 3 12 3z" />
              </svg>
            )}
            카카오톡
          </Button>

          {/* 링크 복사 */}
          <Button
            onClick={handleCopyLink}
            disabled={isSharing}
            variant="outline"
            className="flex-1 max-w-[140px] gap-2 border-gold-500/20 text-ink-light/70 hover:text-gold-500 hover:border-gold-500/40 text-sm py-2.5"
          >
            {isSharing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Link2 className="w-4 h-4" />
            )}
            {copied ? '복사됨' : '링크 복사'}
          </Button>

          {/* 트위터 */}
          <Button
            onClick={handleTwitterShare}
            disabled={isSharing}
            variant="outline"
            className="gap-2 border-gold-500/20 text-ink-light/70 hover:text-[#1DA1F2] hover:border-[#1DA1F2]/40 text-sm py-2.5 px-3"
          >
            {isSharing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            )}
          </Button>
        </div>

        {/* 생성된 공유 URL 표시 */}
        {shareUrl && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-black/20 border border-white/5">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 bg-transparent text-xs text-ink-light/50 outline-none truncate"
            />
            <button
              onClick={handleCopyLink}
              className="text-gold-500/60 hover:text-gold-500 transition-colors shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

// --- 콘텐츠형 로딩 화면 ---

const ANALYSIS_STEPS = [
  { label: '사주 원국 계산', threshold: 10 },
  { label: '격국·용신 판정', threshold: 25 },
  { label: '60갑자 일주 물상 분석', threshold: 35 },
  { label: '대운·세운 흐름 분석', threshold: 50 },
  { label: '과거 사건 역추산', threshold: 65 },
  { label: 'AI 심층 분석 중...', threshold: 80 },
  { label: '결과 정리 중...', threshold: 95 },
]

const SAJU_TIPS = [
  {
    emoji: '🔮',
    title: '사주팔자란?',
    content: '태어난 연·월·일·시의 네 기둥(四柱)과 여덟 글자(八字)로 구성돼요. 이 8글자가 평생의 운명 지도를 담고 있어요.',
  },
  {
    emoji: '🌳',
    title: '일간이 뭐예요?',
    content: '사주의 일간은 "나 자신"을 뜻해요. 예를 들어 갑목(甲木)이면 큰 나무처럼 곧고 정의로운 성격이에요.',
  },
  {
    emoji: '⚖️',
    title: '용신은 뭐예요?',
    content: '사주에서 부족한 기운을 채워주는 오행이에요. 용신을 알면 나에게 도움이 되는 색상, 방향, 직업을 알 수 있어요.',
  },
  {
    emoji: '🔄',
    title: '대운이란?',
    content: '10년마다 바뀌는 큰 운의 흐름이에요. 같은 사주라도 대운이 다르면 인생이 완전히 달라질 수 있어요.',
  },
  {
    emoji: '💰',
    title: '정재 vs 편재',
    content: '정재는 월급처럼 안정적인 수입, 편재는 투자·부업 같은 돌아다니는 돈이에요. 둘 다 있으면 금상첨화!',
  },
  {
    emoji: '💕',
    title: '도화살이 있으면?',
    content: '이성에게 매력적인 기운이에요. 연예인이나 인플루언서에게 많아요. SNS하면 인기 폭발할 수 있는 타입!',
  },
  {
    emoji: '✈️',
    title: '역마살이 있으면?',
    content: '한 곳에 오래 못 있는 스타일이에요. 해외 관련 일이나 출장 많은 직업이 잘 맞아요. 여행 좋아하시죠?',
  },
  {
    emoji: '🏔️',
    title: '격국이 뭐예요?',
    content: '사주의 그릇 크기예요. 정관격이면 조직형 리더, 식신격이면 창작형 프리랜서에 잘 맞아요.',
  },
  {
    emoji: '🎯',
    title: '신강 vs 신약',
    content: '일간의 힘이 강하면 신강, 약하면 신약이에요. 신강하면 독립적이고 리더십이 강하고, 신약하면 협력형이에요.',
  },
  {
    emoji: '🌊',
    title: '오행의 상생',
    content: '목→화→토→금→수 순서로 서로 도와요. 내 사주에 부족한 오행을 채워주면 운이 좋아져요.',
  },
  {
    emoji: '📅',
    title: '왜 태어난 시간이 중요해요?',
    content: '같은 날 태어나도 시간이 다르면 사주가 달라져요. 시주(時柱)는 말년운과 자녀운을 결정해요.',
  },
  {
    emoji: '🎨',
    title: '행운의 색상',
    content: '용신 오행에 따라 나에게 좋은 색이 달라요. 목=초록, 화=빨강, 토=노랑, 금=흰색, 수=검정이에요.',
  },
]

function SajuLoadingContent({ name, progress }: { name: string; progress: number }) {
  const [tipIndex, setTipIndex] = useState(0)
  const [fadeIn, setFadeIn] = useState(true)

  // 팁 자동 전환 (8초마다)
  useEffect(() => {
    const interval = setInterval(() => {
      setFadeIn(false)
      setTimeout(() => {
        setTipIndex((prev) => (prev + 1) % SAJU_TIPS.length)
        setFadeIn(true)
      }, 300)
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  const currentStep = ANALYSIS_STEPS.findIndex((s) => progress < s.threshold)
  const tip = SAJU_TIPS[tipIndex]

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-sm mx-auto space-y-8">
        {/* 상단: 이름 + 프로그레스 */}
        <div className="text-center space-y-4 pt-8">
          <p className="text-sm text-gold-500 font-serif">{name}님의 사주를 풀어보고 있어요</p>

          {/* 프로그레스 바 */}
          <div className="relative">
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-gold-500/80 to-gold-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <p className="text-right text-xs text-gold-500/60 mt-1">{Math.round(progress)}%</p>
          </div>

          <p className="text-xs text-ink-light/30">약 1~3분 소요</p>
        </div>

        {/* 분석 단계 체크리스트 */}
        <div className="space-y-2">
          {ANALYSIS_STEPS.map((step, i) => {
            const isDone = i < currentStep
            const isCurrent = i === currentStep
            return (
              <div key={step.label} className="flex items-center gap-3 px-1">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 transition-all duration-500 ${
                  isDone
                    ? 'bg-gold-500/20 text-gold-500'
                    : isCurrent
                      ? 'bg-gold-500/10 text-gold-500 border border-gold-500/30'
                      : 'bg-white/5 text-ink-light/20'
                }`}>
                  {isDone ? '✓' : isCurrent ? (
                    <div className="w-2 h-2 bg-gold-500 rounded-full animate-pulse" />
                  ) : (
                    <span className="text-[9px]">{i + 1}</span>
                  )}
                </div>
                <p className={`text-sm transition-colors duration-500 ${
                  isDone
                    ? 'text-gold-500/60'
                    : isCurrent
                      ? 'text-ink-light font-medium'
                      : 'text-ink-light/20'
                }`}>
                  {step.label}
                </p>
              </div>
            )
          })}
        </div>

        {/* 사주 상식 카드 */}
        <div className={`p-5 rounded-xl bg-surface/30 border border-white/5 transition-opacity duration-300 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">{tip.emoji}</span>
            <div>
              <p className="text-xs text-gold-500/60 mb-1">알고 계셨나요?</p>
              <p className="text-sm text-ink-light font-medium mb-2">{tip.title}</p>
              <p className="text-sm text-ink-light/60 leading-relaxed">{tip.content}</p>
            </div>
          </div>
          {/* 팁 인디케이터 */}
          <div className="flex justify-center gap-1 mt-4">
            {SAJU_TIPS.map((_, i) => (
              <div
                key={i}
                className={`w-1 h-1 rounded-full transition-colors ${i === tipIndex ? 'bg-gold-500/60' : 'bg-white/10'}`}
              />
            ))}
          </div>
        </div>

        {/* 하단 안내 */}
        <p className="text-center text-[11px] text-ink-light/20">
          청담해화당 AI가 30년 경력의 명리학 비법으로 분석하고 있어요
        </p>
      </div>
    </div>
  )
}
