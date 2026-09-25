'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Crown, Loader2, ScrollText, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { generateNarrative, type CachedNarrative } from '@/app/actions/circle/narrative'
import type { NarrativeKind } from '@/lib/domain/circle/narrative'
import { formatFeatureCost } from '@/lib/domain/payment/feature-costs'
import { useInsufficientPass } from '@/hooks/use-insufficient-pass'
import { useRefreshPasses } from '@/hooks/use-passes'
import { InsufficientPassModal } from '@/components/payment/insufficient-pass-modal'
import { trackEvent } from '@/lib/analytics/ga4'

/**
 * AI 풀이 패널 — 처방전·그룹 지도 아래. 지난 풀이가 있으면 바로 보이고(무료), 새로 받으면 이용권을 쓴다.
 * 값은 엔진이 정하고 AI 는 풀어 쓴다 — 패널 머리에 그 말을 적어 둔다.
 * 등급(패밀리부터)은 서버가 판정한다. 막히면 서버 문구(tierUpsellLine) 그대로 멤버십 안내를 띄운다.
 */

const STORE_HREF = '/protected/store?tab=pass'
const MEMBERSHIP_HREF = '/protected/store?tab=membership'
const TIER_ERRORS: ReadonlySet<string> = new Set(['TIER_REQUIRED', 'MEMBERSHIP'])

function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}

export function NarrativePanel({
  kind,
  targetKey,
  initial,
  title = 'AI 풀이',
}: {
  kind: NarrativeKind
  targetKey: string
  initial: CachedNarrative | null
  title?: string
}) {
  const [narrative, setNarrative] = useState<CachedNarrative | null>(initial)
  const [pending, startTransition] = useTransition()
  const [tierBlocked, setTierBlocked] = useState<string | null>(null)
  const { passModal, closePassModal, handleChargeResult } = useInsufficientPass()
  const refreshPasses = useRefreshPasses()

  const run = () => {
    startTransition(async () => {
      const result = await generateNarrative(kind, targetKey)
      if (!result.success) {
        if (handleChargeResult(result, { featureLabel: 'AI 풀이' })) {
          trackEvent({ action: 'circle_narrative_insufficient', category: 'conversion', label: kind })
          return
        }
        if (TIER_ERRORS.has(result.errorType)) {
          setTierBlocked(result.error)
          trackEvent({ action: 'circle_narrative_tier_required', category: 'conversion', label: kind })
          return
        }
        toast.error(result.error)
        return
      }
      if (!result.cached) void refreshPasses()
      setNarrative({ text: result.text, createdAt: result.createdAt })
      trackEvent({
        action: result.cached ? 'circle_narrative_cached' : 'circle_narrative_generate',
        category: 'engagement',
        label: kind,
      })
      if (!result.cached) toast.success('풀이를 받았습니다.')
    })
  }

  const when = narrative
    ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeZone: 'Asia/Seoul' }).format(
        new Date(narrative.createdAt)
      )
    : null

  return (
    <section className="space-y-3 rounded-xl border border-gold-500/25 bg-gradient-to-b from-gold-500/[0.07] to-transparent p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 font-serif text-[13px] font-bold text-ink-primary">
          <ScrollText className="h-3.5 w-3.5 text-gold-400" /> {title}
        </p>
        {when && <span className="text-[10.5px] text-ink-light/40">{when}</span>}
      </div>

      {narrative ? (
        <div className="space-y-3 text-[13px] leading-relaxed text-ink-light/85" style={{ wordBreak: 'keep-all' }}>
          {paragraphs(narrative.text).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      ) : (
        <p className="text-[12px] leading-relaxed text-ink-light/55" style={{ wordBreak: 'keep-all' }}>
          위의 값은 엔진이 정한 것입니다. AI 는 그 값을 쉬운 말로 풀어 씁니다 — 무엇이 왜 그런지, 오늘 무엇을 할지 세
          문단으로.
        </p>
      )}

      {tierBlocked ? (
        <div className="space-y-2 rounded-lg border border-gold-500/30 bg-gold-500/[0.08] p-3 text-center">
          <p className="text-[12px] leading-relaxed text-gold-200/90" style={{ wordBreak: 'keep-all' }}>
            {tierBlocked}
          </p>
          <Link
            href={MEMBERSHIP_HREF}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gold-500/45 bg-gold-500/[0.12] px-4 py-2 font-serif text-[12px] font-bold text-gold-200 hover:bg-gold-500/20"
          >
            <Crown className="h-3.5 w-3.5" /> 멤버십 보기
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={run}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gold-500/45 bg-gold-500/[0.12] py-2.5 font-serif text-[12.5px] font-bold text-gold-200 hover:bg-gold-500/20 disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {narrative ? '다시 풀이 받기' : 'AI 풀이 받기'}
            <span className="font-sans text-[11px] font-normal text-gold-200/70">
              · {formatFeatureCost('circleNarrative')}
            </span>
          </button>
          <Link href={STORE_HREF} className="font-serif text-[11px] text-ink-light/45 hover:text-gold-300">
            이용권 구매
          </Link>
        </div>
      )}
      <p className="text-[10px] leading-snug text-ink-light/35" style={{ wordBreak: 'keep-all' }}>
        같은 기운이면 30일 안에는 이용권을 다시 쓰지 않습니다. 기운이 바뀌었을 때만 새로 짓습니다.
      </p>
      <InsufficientPassModal {...passModal} onClose={closePassModal} />
    </section>
  )
}
