'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { analyzeCheonjiinAction } from '@/app/actions/ai/cheonjiin'
import { createSajuShareTokenByTarget } from '@/app/actions/ai/share-saju'
import { useAnalysisQuota } from '@/hooks/use-analysis-quota'
import { deductTalisman, getWalletBalance, refundStudioCost } from '@/app/actions/payment/wallet'
import { FEATURE_COST } from '@/lib/domain/payment/feature-costs'
import { useInsufficientBokchae } from '@/hooks/use-insufficient-bokchae'
import { InsufficientBokchaeModal } from '@/components/payment/insufficient-bokchae-modal'
import { PaywallModal } from '@/components/shared/paywall-modal'
import { PremiumBlurSection } from '@/components/shared/premium-blur-section'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { DestinyTarget } from '@/app/actions/user/destiny'
import { RefreshCw, AlertTriangle, Settings, ChevronDown, Share2, Link2, Check, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { logger } from '@/lib/utils/logger'
import { GA } from '@/lib/analytics/ga4'
import { useShrineAudio } from '@/components/shrine/scene/useShrineAudio'
import { PillarsStrip } from '@/components/analysis/PillarsStrip'
import { ElementDistribution } from '@/components/analysis/report/element-distribution'
import { InSection } from '@/components/analysis/cheonjiin/InSection'
import {
  SajuCrossAnalysisSection,
  SajuDeepSections,
  SajuFreeSections,
  type SajuReadingData,
} from '@/components/analysis/saju/saju-reading-sections'
import { ServiceDisclaimer } from '@/components/shared/ServiceDisclaimer'
import { AmbientVideo } from '@/components/shared/AmbientVideo'
import { motion } from 'framer-motion'

type AnalysisData = SajuReadingData

const SAJU_COST = FEATURE_COST.saju.display // 단일 소스 — 표시 = 실차감(2만냥)

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
  const { checkQuota, paywallProps, quota } = useAnalysisQuota()
  const { bokchaeModal, closeBokchaeModal, handleDeductResult } = useInsufficientBokchae()
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  useEffect(() => {
    getWalletBalance().then(setWalletBalance)
  }, [])
  const started = useRef(false)
  // 분석 결과 공개 순간 효과음(풍경) 1회 — 전역 음소거·최초 제스처 정책 존중(useShrineAudio 내부)
  const { play: playShrineFx } = useShrineAudio()
  const revealSoundRef = useRef(false)
  useEffect(() => {
    if (data && !isLoading && !revealSoundRef.current) {
      revealSoundRef.current = true
      playShrineFx('chime')
    }
  }, [data, isLoading, playShrineFx])

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
    GA.analysisStart('saju')

    // 복채 차감(2만냥) — 마스터/무제한은 wallet 내부에서 면제. 부족 시 업셀 모달.
    const deduct = await deductTalisman('SAJU', SAJU_COST)
    if (!deduct.success) {
      setIsLoading(false)
      const handled = handleDeductResult(deduct, {
        currentBalance: walletBalance ?? 0,
        requiredAmount: SAJU_COST,
        featureLabel: '사주 분석',
      })
      if (!handled) toast.error(deduct.error || '풀이를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.')
      return
    }
    if (deduct.remainingBalance !== undefined) setWalletBalance(deduct.remainingBalance)

    try {
      const result = await analyzeCheonjiinAction(target.id, null, false, true)
      if (result.success && result.data) {
        // 캐시 히트(신규 연산 아님)면 환불 — 신규 분석만 과금(표시=실차감)
        if (result.cached) await refundStudioCost('SAJU').catch(() => {})
        setData(result.data as AnalysisData)
        GA.analysisComplete('saju')
        setApiDone(true) // progress가 80% 미만이어도 완료 처리
      } else {
        await refundStudioCost('SAJU').catch(() => {})
        setError(result.error || '분석 중 오류가 발생했습니다.')
        setIsLoading(false)
      }
    } catch (err) {
      await refundStudioCost('SAJU').catch(() => {})
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

  // 데이터 없음 — 차감 실패(잔액 부족)/할당 초과 등. 업셀·페이월 모달 + 복구 CTA.
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <PaywallModal {...paywallProps} />
        <InsufficientBokchaeModal {...bokchaeModal} onClose={closeBokchaeModal} />
        <div className="text-center space-y-4">
          <p className="text-ink-light/60 text-sm">분석을 시작하려면 복채가 필요합니다.</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={runAnalysis} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              다시 시도
            </Button>
            <Link href="/protected/store?tab=bokchae">
              <Button size="sm">복채 충전</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // --- 결과 ---
  // 로딩→결과 하드 스왑을 부드러운 크로스페이드로(로더가 사라지고 결과가 떠오른다)
  return (
    <motion.div
      className="min-h-screen bg-background pb-24"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <PaywallModal {...paywallProps} />
      <InsufficientBokchaeModal {...bokchaeModal} onClose={closeBokchaeModal} />

      {/* 헤더 — 모양 정본은 /story 섹션 헤딩(story-section-heading.tsx) */}
      <header className="text-center pt-8 pb-6 px-4">
        <div className="flex items-center justify-center gap-2.5 mb-3">
          <span className="h-px w-5 bg-gold-500/60" aria-hidden />
          <span className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-gold-500">
            Cheonjiin Report
          </span>
          <span className="h-px w-5 bg-gold-500/60" aria-hidden />
        </div>
        <h1 className="text-2xl font-serif font-bold text-ink-light tracking-tight">
          {target.name}님의 <span className="text-gold-300">사주 상세풀이</span>
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

      {/* 리포트 카드 — 명식·오행 분포·행운 요소를 한 장으로.
          모양 정본은 /story 리포트 미리보기(story-report-preview.tsx) — 단청 상단 보더 + 금테 카드. */}
      <section className="mx-4 mb-6 rounded-2xl border border-gold-500/25 bg-surface overflow-hidden shadow-gold-glow divide-y divide-white/10">
        <div className="dancheong-border-top" />
        <div className="px-4 py-4">
          <PillarsStrip
            frameless
            birthDate={target.birth_date}
            birthTime={target.birth_time}
            isSolar={target.calendar_type !== 'lunar'}
            isLeapMonth={target.is_leap_month ?? false}
            birthTimeUnknown={!target.birth_time}
          />
        </div>
        <div className="px-4 py-4">
          <ElementDistribution
            birthDate={target.birth_date}
            birthTime={target.birth_time}
            isSolar={target.calendar_type !== 'lunar'}
            isLeapMonth={target.is_leap_month ?? false}
            birthTimeUnknown={!target.birth_time}
          />
        </div>
        {data.lucky && (
          <div className="px-4 py-4">
            <h3 className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-ink-light/70 mb-2.5 m-0">
              행운 요소
            </h3>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: '색상', value: data.lucky.color },
                { label: '방위', value: data.lucky.direction },
                { label: '숫자', value: data.lucky.number },
                { label: '키워드', value: data.lucky.keyword },
              ].map(
                (item) =>
                  item.value && (
                    <div
                      key={item.label}
                      className="text-center py-2 px-1 rounded-lg bg-white/[0.03] border border-white/10"
                    >
                      <p className="text-[9px] text-ink-light/60">{item.label}</p>
                      <p className="text-xs text-gold-300 font-medium mt-0.5 break-keep">{String(item.value)}</p>
                    </div>
                  )
              )}
            </div>
          </div>
        )}
      </section>

      <SajuFreeSections data={data} />

      {/* 프리미엄 섹션 — 무료 사용자에게 블러 처리 */}
      <PremiumBlurSection isPaid={quota.isPaid}>
        {/* 타고난 성격 */}
        <DetailSection
          title={data.cheon?.title || '타고난 성격과 재능이에요'}
          data={data.cheon}
          hanja="天"
          tagline="하늘의 기운 · 타고난 것"
        />

        <SajuDeepSections data={data} />

        {/* 天 → 地 시네마틱 전환 구분자 */}
        <CheonToJiDivider />

        {/* 운의 흐름 (地) */}
        <DetailSection
          title={data.ji?.title || '지금 흐르는 운의 방향이에요'}
          data={data.ji}
          hanja="地"
          tagline="땅의 기운 · 흐르는 것"
        />

        {/* 인연과 내면 (人)
            🔴 라이브가 天·地만 그리고 人 을 통째로 빠뜨리고 있었다(2026-08-18 발견). 저장본에는
               귀인·관계 조언은 물론 **관상·손금 교차 해석**까지 들어 있는데 결과 화면에서 한 줄도
               안 보였다. 기록 화면이 쓰던 `InSection` 을 그대로 재사용한다 — 세 번째 렌더러 금지. */}
        <InSection data={data.in ?? null} />

        <SajuCrossAnalysisSection data={data} />
      </PremiumBlurSection>

      {/* 카카오톡/SNS 공유 */}
      <SajuShareSection targetId={target.id} targetName={target.name} summary={data.summary as string | undefined} />

      <ServiceDisclaimer className="mt-6" />
    </motion.div>
  )
}

/**
 * 天 → 地 전환 구분자 — 타고난 성격/구조(天)에서 삶의 터전·운의 흐름(地)으로 넘어가는 챕터 경계.
 * 유휴 analysis-ambient 영상을 얇은 시네마틱 배경으로 배선. 영상 없으면 단청풍 그라디언트로 폴백.
 */
function CheonToJiDivider() {
  return (
    <div className="relative mx-4 my-6 h-[120px] rounded-2xl overflow-hidden border border-gold-500/20">
      <AmbientVideo
        id="analysis-ambient"
        rate={0.5}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.55 }}
        fallback={
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(100deg, #0d0a06 0%, #1a130a 50%, #0d0a06 100%)' }}
          />
        }
      />
      {/* 캡션 가독성용 어둠막 */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/35 to-background/65" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center px-4">
        <span className="text-[10px] tracking-[0.5em] text-gold-500/60 font-serif">天 · 地</span>
        <span className="font-serif text-lg font-bold text-gold-200">地 · 삶의 터전</span>
        <span className="text-[11px] text-ink-light/50">타고난 것에서, 살아갈 자리로</span>
      </div>
    </div>
  )
}

function DetailSection({
  title,
  data,
  hanja,
  tagline,
}: {
  title: string
  data: Record<string, unknown> | null | undefined
  /** 챕터 한자 — 天 · 地 · 人 */
  hanja: string
  /** 헤더 오버라인 — 예) 하늘의 기운 · 타고난 것 */
  tagline: string
}) {
  const [isOpen, setIsOpen] = useState(true)
  if (!data) return null

  const content = data.content as string | undefined
  const strengths = data.strengths as string[] | undefined
  const weaknesses = data.weaknesses as string[] | undefined
  // career/health가 객체일 수 있으므로 문자열만 추출
  const career =
    typeof data.career === 'string'
      ? data.career
      : ((data.career as Record<string, unknown>)?.summary as string | undefined)
  const wealth = typeof data.wealth === 'string' ? data.wealth : undefined
  const love = typeof data.love === 'string' ? data.love : undefined
  const health =
    typeof data.health === 'string'
      ? data.health
      : ((data.health as Record<string, unknown>)?.overall as string | undefined)

  return (
    <section className="mx-4 mb-4 rounded-2xl border border-gold-500/20 bg-surface/50 overflow-hidden">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between gap-3 p-4">
        <div className="flex flex-col gap-1.5 text-left min-w-0">
          <span className="flex items-center gap-2.5">
            <span className="font-serif text-[15px] leading-none text-gold-500" aria-hidden>
              {hanja}
            </span>
            <span className="h-px w-5 bg-gold-500/60" aria-hidden />
            <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-light/65">
              {tagline}
            </span>
          </span>
          <span className="font-serif text-[16px] font-bold text-ink-light break-keep leading-snug">{title}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-ink-light/30 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4">
          {content && (
            <p className="text-sm text-ink-light/85 font-light leading-[1.85] break-keep whitespace-pre-line">
              {content}
            </p>
          )}

          {strengths && strengths.length > 0 && (
            <div>
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-ink-light/60 mb-1.5">
                강점
              </p>
              <ul className="space-y-1">
                {strengths.map((s, i) => (
                  <li key={i} className="text-sm text-ink-light/70 flex gap-2">
                    <span className="text-gold-500/70 shrink-0">+</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {weaknesses && weaknesses.length > 0 && (
            <div>
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-ink-light/60 mb-1.5">
                보완점
              </p>
              <ul className="space-y-1">
                {weaknesses.map((w, i) => (
                  <li key={i} className="text-sm text-ink-light/70 flex gap-2">
                    <span className="text-error/60 shrink-0">-</span>
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
    content:
      '태어난 연·월·일·시의 네 기둥(四柱)과 여덟 글자(八字)로 구성돼요. 이 8글자가 평생의 운명 지도를 담고 있어요.',
  },
  {
    emoji: '🌳',
    title: '일간이 뭐예요?',
    content: '사주의 일간은 "나 자신"을 뜻해요. 예를 들어 갑목(甲木)이면 큰 나무처럼 곧고 정의로운 성격이에요.',
  },
  {
    emoji: '⚖️',
    title: '용신은 뭐예요?',
    content:
      '사주에서 부족한 기운을 채워주는 오행이에요. 용신을 알면 나에게 도움이 되는 색상, 방향, 직업을 알 수 있어요.',
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
    <div className="min-h-screen bg-background px-4 py-8 relative overflow-hidden">
      {/* 앰비언트 배경 영상 — 프로그레스·상식카드 뒤 레이어. 없으면 폴백(렌더 안 함), reduced-motion 존중 */}
      <AmbientVideo
        id="analysis-ambient"
        rate={0.5}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ opacity: 0.16, mixBlendMode: 'screen' }}
      />
      <div className="max-w-sm mx-auto space-y-8 relative z-10">
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
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 transition-all duration-500 ${
                    isDone
                      ? 'bg-gold-500/20 text-gold-500'
                      : isCurrent
                        ? 'bg-gold-500/10 text-gold-500 border border-gold-500/30'
                        : 'bg-white/5 text-ink-light/20'
                  }`}
                >
                  {isDone ? (
                    '✓'
                  ) : isCurrent ? (
                    <div className="w-2 h-2 bg-gold-500 rounded-full animate-pulse" />
                  ) : (
                    <span className="text-[9px]">{i + 1}</span>
                  )}
                </div>
                <p
                  className={`text-sm transition-colors duration-500 ${
                    isDone ? 'text-gold-500/60' : isCurrent ? 'text-ink-light font-medium' : 'text-ink-light/20'
                  }`}
                >
                  {step.label}
                </p>
              </div>
            )
          })}
        </div>

        {/* 사주 상식 카드 */}
        <div
          className={`p-5 rounded-xl bg-surface/30 border border-white/5 transition-opacity duration-300 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}
        >
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
