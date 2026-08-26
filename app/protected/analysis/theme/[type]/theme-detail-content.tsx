'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, MessageCircle, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { RemedyPanel, RemedyTeaserPanel } from '@/components/analysis/RemedyPanel'
import { AddRelationInline } from '@/components/destiny/add-relation-inline'
import { ThemeThumbnail } from '@/components/analysis/ThemeThumbnail'
import { ServiceDisclaimer } from '@/components/shared/ServiceDisclaimer'
import { ShareSaveButtons } from '@/components/studio/share-save-buttons'
import { MembershipNudgeModal } from '@/components/membership/membership-nudge-modal'
import { useUpgradeNudge } from '@/hooks/use-upgrade-nudge'
import { logger } from '@/lib/utils/logger'
import {
  isFreeReading,
  isFreeTheme,
  relatedThemes,
  themeReadingCostLabel,
  themeReadingPath,
  type ThemeFortune,
} from '@/lib/domain/theme-fortune/themes'
import { BAND_LABEL, timingsOf, type ThemeReading, type ThemeVerdict } from '@/lib/domain/theme-fortune/verdict-types'
import type { DestinyTarget } from '@/app/actions/user/destiny'

/**
 * 인기테마운세 상세 — **테마 32종이 공유하는 하나의 화면**(마스터 §4-2).
 *
 * 테마마다 다른 것은 «채우는 내용»뿐이다. 지표 이름도, 판정 라벨도, 시기도 전부 서버가 만든
 * `ThemeVerdict` 에서 온다 — 이 파일에 테마 이름이 하나도 없는 것이 그 증거다.
 *
 * ## 🔴 페이지 로드는 정적이다
 * 마운트에서 분석을 부르지 않는다. 9차에 「오늘의 운세 카드가 마운트마다 Gemini 생성」 사고가
 * 났고(직장·재물 §3-7), 여기는 복채까지 나가는 자리라 더 엄하다. AI 는 **버튼**에서만 돈다.
 *
 * ## 🔴 숫자 점수를 내보내지 않는다
 * 지표는 밴드(낮음/보통/높음)와 막대 길이로만 나간다(마스터 §9-1 · §12-2). 「85점」은 측정
 * 방법을 제시할 수 없는 수치이고, 그 목업이 이 라우트가 접수한 라이브 버그였다.
 */
interface ThemeDetailContentProps {
  readonly theme: ThemeFortune
  /** 판정이 등록된 테마인가. 아니면 「준비 중」으로 닫는다. */
  readonly hasReading: boolean
  /** 이 풀이가 답하는 질문 한 문장(판정기 계약에서 온다). */
  readonly question: string | null
  readonly targets: DestinyTarget[]
  readonly initialTargetId: string | null
  readonly related: ThemeFortune[]
  readonly listPath: string
}

const CHAT_PATH = '/protected/ai-shaman'
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

/**
 * 무료 맛보기가 가리킬 유료 테마 한 장.
 *
 * 🔴 «유료로 가라»가 아니라 «같은 결의 다음 자리»를 가리킨다. 같은 갈래에서 복채를 받는
 *    테마를 고르고, 없으면 링크 없이 개수만 밝힌다(없는 상품을 가리키지 않는다).
 */
function relatedPaidTheme(theme: ThemeFortune): ThemeFortune | null {
  return relatedThemes(theme, 4).find((candidate) => !isFreeTheme(candidate)) ?? null
}

function targetLabel(target: DestinyTarget): string {
  return target.name?.trim() || (target.target_type === 'self' ? '본인' : '이름 없음')
}

function daysAgo(iso: string): number {
  const diff = Date.now() - new Date(iso).getTime()
  return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)))
}

export function ThemeDetailContent({
  theme,
  hasReading,
  question,
  targets,
  initialTargetId,
  related,
  listPath,
}: ThemeDetailContentProps) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(initialTargetId)
  const [analyzing, setAnalyzing] = useState(false)
  const [reading, setReading] = useState<ThemeReading | null>(null)
  const [cached, setCached] = useState(false)
  const [confirmingRedo, setConfirmingRedo] = useState(false)
  const { nudgeModal, closeNudge, handleDeductResult, trackAnalysis } = useUpgradeNudge()

  const target = targets.find((candidate) => candidate.id === selectedId) ?? null
  const costLabel = themeReadingCostLabel(theme)
  const free = isFreeReading(theme)

  const runAnalysis = async (force: boolean) => {
    if (!target?.birth_date) return
    setAnalyzing(true)
    setConfirmingRedo(false)
    try {
      const { analyzeThemeFortune } = await import('@/app/actions/theme-fortune/analyze')
      const result = await analyzeThemeFortune({ themeId: theme.id, targetId: target.id, force })

      // 복채 부족·일일 한도는 모달로 받는다(다른 분석 화면과 같은 경로).
      if (!result.success && handleDeductResult(result, { featureLabel: theme.title })) return

      if (!result.success) throw new Error(result.error)

      setReading(result.reading)
      setCached(result.cached)
      trackAnalysis()
    } catch (error) {
      logger.error('[ThemeDetail] 분석 실패:', error)
      toast.error(error instanceof Error ? error.message : '풀이 중 오류가 발생했습니다.')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-screen-sm px-4 pb-32 pt-6">
        <div className="mb-4">
          <Link
            href={listPath}
            className="inline-flex items-center gap-1 text-xs text-ink-light/50 transition-colors hover:text-ink-light"
          >
            <ChevronLeft className="h-4 w-4" />
            인기테마운세
          </Link>
        </div>

        {/* ① 히어로 — 썸네일 + 후킹 제목. 그림은 목록·허브와 같은 컴포넌트를 쓴다. */}
        <header className="overflow-hidden rounded-2xl border border-white/10 bg-surface/60">
          <ThemeThumbnail theme={theme} eager className="aspect-[16/9] w-full" />
          <div className="space-y-2 p-4">
            <h1 className="font-serif text-xl font-bold leading-snug text-ink-light">{theme.title}</h1>
            <p className="text-[13px] font-light leading-relaxed text-ink-light/60">{theme.subcopy}</p>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                  free
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                    : 'border-gold-500/20 bg-gold-500/10 text-gold-300'
                }`}
              >
                {costLabel}
              </span>
              {theme.input === 'SOLO' && (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-ink-light/60">
                  본인 사주만
                </span>
              )}
            </div>
          </div>
        </header>

        {/* 상단 강화 고지(마스터 §9-4) — 투자·사업 부류는 이 박스가 출하 게이트다(§9-5 6번).
            결제 «전»에도 보여야 하는 문장이라 결과가 아니라 히어로 바로 아래 선다. */}
        {theme.extraDisclaimer && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-700/30 bg-amber-900/20 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
            <p className="text-[11px] font-light leading-relaxed text-amber-400/80">{theme.extraDisclaimer}</p>
          </div>
        )}

        {/* «무엇을 보는지» — 누르기 전에 밝힌다. 표시와 내용이 어긋나면 환불 민원의 씨앗이다. */}
        <section className="mt-4 space-y-2 rounded-xl border border-white/10 bg-surface/30 p-4">
          <h2 className="font-serif text-sm text-gold-500/80">무엇을 보는 풀이인가</h2>
          {question && <p className="text-[12px] font-light leading-relaxed text-ink-light/70">{question}</p>}
          <p className="text-[12px] font-light leading-relaxed text-ink-light/50">{theme.target}</p>
          {theme.input === 'SOLO' && (
            <p className="text-[11px] font-light leading-relaxed text-ink-light/40">
              상대의 정보를 받지 않습니다. 회사·직무를 묻지 않고 본인 생년월일시만 봅니다.
            </p>
          )}
        </section>

        {/* 진입 — 🔴 여기서만 AI 가 돈다 */}
        <section className="mt-4">
          {!hasReading ? (
            <p className="rounded-xl border border-white/10 bg-surface/30 p-4 text-center text-[12px] text-ink-light/50">
              이 테마의 풀이는 준비 중입니다.
            </p>
          ) : !target ? (
            <div className="space-y-3 rounded-xl border border-white/10 bg-surface/30 p-4 text-center">
              <p className="text-[12px] text-ink-light/60">등록된 사주 정보가 없습니다.</p>
              <Link
                href="/protected/settings"
                className="inline-block rounded-lg border border-gold-500/30 px-4 py-2 text-[12px] text-gold-300"
              >
                내 정보 입력하기
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {targets.length > 1 && (
                <label className="block">
                  <span className="sr-only">풀이 대상</span>
                  <select
                    value={selectedId ?? ''}
                    onChange={(event) => {
                      setSelectedId(event.target.value || null)
                      setReading(null)
                    }}
                    className="w-full rounded-lg border border-white/10 bg-surface/60 px-3 py-2 text-[12px] text-ink-light"
                  >
                    {targets.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {targetLabel(candidate)}
                        {candidate.target_type === 'self' ? ' (본인)' : ` (${candidate.relation_type})`}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {/* 인연 추가 — 이 화면을 떠나지 않고 등록하고 바로 선택된다(2026-08-16). */}
              <AddRelationInline
                onAdded={(id) => {
                  setSelectedId(id)
                  setReading(null)
                  router.refresh()
                }}
              />

              {!reading && (
                <button
                  type="button"
                  onClick={() => void runAnalysis(false)}
                  disabled={analyzing || !target.birth_date}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gold-500/40 bg-gold-500/[0.12] py-3 font-serif text-sm font-bold text-gold-300 transition-colors hover:bg-gold-500/20 disabled:opacity-50"
                >
                  {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {analyzing ? '풀이 중…' : `풀이 보기 · ${costLabel}`}
                </button>
              )}

              {!target.birth_date && (
                <p className="text-center text-[11px] text-ink-light/40">생년월일이 없어 풀이할 수 없습니다.</p>
              )}
            </div>
          )}
        </section>

        {reading && (
          <ThemeReadingBody
            reading={reading}
            theme={theme}
            cached={cached}
            costLabel={costLabel}
            confirmingRedo={confirmingRedo}
            analyzing={analyzing}
            onAskRedo={() => setConfirmingRedo(true)}
            onCancelRedo={() => setConfirmingRedo(false)}
            onConfirmRedo={() => void runAnalysis(true)}
            related={related}
          />
        )}

        {/* ⑧ 다음 걸음 — 관련 테마 2장 + 고민상담. 풀이 전에도 길을 열어 둔다. */}
        {!reading && <NextSteps related={related} />}

        <div className="mt-8">
          <ServiceDisclaimer />
        </div>
      </div>

      <MembershipNudgeModal {...nudgeModal} onClose={closeNudge} />
    </div>
  )
}

// ===================== 결과 =====================

function ThemeReadingBody({
  reading,
  theme,
  cached,
  costLabel,
  confirmingRedo,
  analyzing,
  onAskRedo,
  onCancelRedo,
  onConfirmRedo,
  related,
}: {
  reading: ThemeReading
  theme: ThemeFortune
  cached: boolean
  costLabel: string
  confirmingRedo: boolean
  analyzing: boolean
  onAskRedo: () => void
  onCancelRedo: () => void
  onConfirmRedo: () => void
  related: ThemeFortune[]
}) {
  const { verdict, narration } = reading
  const openEnded = verdict.verdictLabel?.openEnded === true

  return (
    <div className="mt-6 space-y-6">
      <div id="theme-result-capture" className="space-y-6">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* «갈라드립니다» — 판정표가 있는 테마는 답을 고르지 않는다는 것을 결과 맨 위에 밝힌다. */}
          {verdict.matrix && (
            <span className="rounded-full border border-gold-500/30 bg-gold-500/10 px-2 py-0.5 text-[10px] text-gold-300">
              골라드리지 않습니다 · 갈라드립니다
            </span>
          )}
          {cached && (
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-ink-light/50">
              {daysAgo(reading.analyzedAt)}일 전 풀이
            </span>
          )}
          <span className="text-[10px] text-ink-light/40">{reading.targetName} 님</span>
        </div>

        {/* ② 한 줄 답 */}
        <section className="rounded-2xl border border-gold-500/25 bg-gold-500/[0.06] p-4">
          <p className="font-serif text-base font-bold leading-relaxed text-ink-light">{narration.headline}</p>
        </section>

        {/* ③ 지표 3종 + 판정표 */}
        <section className="space-y-3">
          <h2 className="font-serif text-sm text-gold-500/80">지금 걸린 세 가지</h2>
          <ul className="space-y-3">
            {verdict.indicators.map((indicator, index) => (
              <li key={indicator.key} className="rounded-xl border border-white/10 bg-surface/40 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-serif text-[13px] text-ink-light">{indicator.label}</span>
                  <span className="text-[11px] text-gold-300">{BAND_LABEL[indicator.band]}</span>
                </div>
                {/* 🔴 숫자를 쓰지 않는다 — 막대 길이만. */}
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-gold-500/70" style={{ width: `${indicator.score}%` }} />
                </div>
                <p className="mt-2 text-[11px] font-light text-ink-light/45">{indicator.basis}</p>
                {narration.indicatorNotes[index] && (
                  <p className="mt-1.5 text-[12px] font-light leading-relaxed text-ink-light/70">
                    {narration.indicatorNotes[index]}
                  </p>
                )}
              </li>
            ))}
          </ul>

          {verdict.matrix && <VerdictMatrix verdict={verdict} />}
        </section>

        {/* ④ 지금 상황 */}
        {narration.situation && (
          <section className="space-y-2">
            <h2 className="font-serif text-sm text-gold-500/80">왜 그런가</h2>
            <p className="whitespace-pre-line text-[13px] font-light leading-relaxed text-ink-light/75">
              {narration.situation}
            </p>
          </section>
        )}

        {/* ⑤ 시기 — 12개월 띠 */}
        {verdict.timings.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-serif text-sm text-gold-500/80">언제가 열리고 언제가 막히나</h2>
            {[...new Set(verdict.timings.map((timing) => timing.year))]
              .sort((a, b) => a - b)
              .map((year) => (
                <MonthStrip key={year} year={year} verdict={verdict} />
              ))}
            {narration.timingNotes.filter(Boolean).map((note, index) => (
              <p key={index} className="text-[12px] font-light leading-relaxed text-ink-light/70">
                {note}
              </p>
            ))}
          </section>
        )}

        {/* ⑥ 할 일 3가지 */}
        {narration.actions.some(Boolean) && (
          <section className="space-y-2">
            <h2 className="font-serif text-sm text-gold-500/80">지금 해볼 수 있는 것</h2>
            <ol className="space-y-2">
              {narration.actions.filter(Boolean).map((action, index) => (
                <li key={index} className="flex gap-2 text-[13px] font-light leading-relaxed text-ink-light/75">
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-gold-500/25 bg-gold-500/10 text-[10px] text-gold-300">
                    {index + 1}
                  </span>
                  {action}
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* ⑥-2 개운 처방 — 🔴 엔진이 정한 값이다. 문장은 AI 가 쓰지만 항목은 결정론이라
            같은 사주면 언제 봐도 같은 처방이 나온다. */}
        {reading.remedy && <RemedyPanel remedy={reading.remedy} notes={narration.remedyNotes} />}

        {/* 무료 풀이의 맛보기 — 한 가지는 실제로 주고, 남은 개수는 배열 길이 그대로 밝힌다. */}
        {reading.remedyTeaser && (
          <RemedyTeaserPanel
            preview={reading.remedyTeaser.preview}
            hiddenCount={reading.remedyTeaser.hiddenCount}
            ctaHref={relatedPaidTheme(theme) ? themeReadingPath(relatedPaidTheme(theme)!.id) : undefined}
            ctaLabel={relatedPaidTheme(theme) ? `${relatedPaidTheme(theme)!.title} 보기` : undefined}
          />
        )}

        {/* ⑦ 되짚기 — 근거(pastHint)가 있을 때만. 없는 과거를 지어내 싣지 않는다. */}
        {verdict.pastHint && narration.pastEcho && (
          <section className="space-y-1.5 rounded-xl border border-white/10 bg-surface/30 p-4">
            <h2 className="font-serif text-sm text-gold-500/80">되짚어 보면</h2>
            <p className="text-[13px] font-light leading-relaxed text-ink-light/70">{narration.pastEcho}</p>
            <p className="text-[10px] text-ink-light/35">
              {verdict.pastHint.period} · {verdict.pastHint.basis}
            </p>
          </section>
        )}

        {narration.caution && (
          <p className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[11px] font-light leading-relaxed text-ink-light/50">
            {narration.caution}
          </p>
        )}
      </div>

      <ShareSaveButtons
        resultContainerId="theme-result-capture"
        analysisTitle={theme.title}
        memberName={reading.targetName}
      />

      {/* 재분석 — 🔴 복채가 다시 나간다는 것을 버튼 문구가 밝히고, 두 번 눌러야 돈다(§7-2). */}
      <div className="text-center">
        {confirmingRedo ? (
          <div className="space-y-2">
            <p className="text-[11px] text-ink-light/60">다시 풀면 {costLabel}가 새로 나갑니다.</p>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={onCancelRedo}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-ink-light/60"
              >
                그만두기
              </button>
              <button
                type="button"
                onClick={onConfirmRedo}
                disabled={analyzing}
                className="rounded-lg border border-gold-500/40 bg-gold-500/10 px-3 py-1.5 text-[11px] text-gold-300 disabled:opacity-50"
              >
                {analyzing ? '풀이 중…' : '다시 풀기'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onAskRedo}
            className="text-[11px] text-ink-light/40 underline-offset-2 hover:underline"
          >
            다시 풀기
          </button>
        )}
      </div>

      <NextSteps related={related} openEnded={openEnded} />
    </div>
  )
}

/**
 * 판정표 2×2 — 「내가 어느 칸인가」.
 * 네 칸을 다 그리는 것이 «결론을 주지 않는다»는 증거다(직장·재물 §3-4).
 */
function VerdictMatrix({ verdict }: { verdict: ThemeVerdict }) {
  const matrix = verdict.matrix
  if (!matrix) return null
  const activeKey = verdict.verdictLabel?.key

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-surface/40 p-3">
      <div className="grid grid-cols-[auto_1fr_1fr] gap-1.5 text-[10px]">
        <span aria-hidden="true" />
        {matrix.colLabels.map((label) => (
          <span key={label} className="text-center text-ink-light/40">
            {label}
          </span>
        ))}
        {matrix.cells.map((row, rowIndex) => (
          <ThemeMatrixRow
            key={matrix.rowLabels[rowIndex]}
            label={matrix.rowLabels[rowIndex]}
            row={row}
            activeKey={activeKey}
          />
        ))}
      </div>
      {verdict.verdictLabel && (
        <p className="pt-1 text-[12px] font-light leading-relaxed text-ink-light/70">{verdict.verdictLabel.note}</p>
      )}
    </div>
  )
}

function ThemeMatrixRow({
  label,
  row,
  activeKey,
}: {
  label: string
  row: NonNullable<ThemeVerdict['matrix']>['cells'][number]
  activeKey: string | undefined
}) {
  return (
    <>
      <span className="flex items-center pr-1 text-ink-light/40">{label}</span>
      {row.map((cell) => (
        <span
          key={cell.key}
          aria-current={cell.key === activeKey ? 'true' : undefined}
          className={`rounded-lg border px-2 py-2 text-center text-[11px] leading-tight ${
            cell.key === activeKey
              ? 'border-gold-500/50 bg-gold-500/[0.14] font-bold text-gold-300'
              : 'border-white/[0.06] bg-white/[0.02] text-ink-light/35'
          }`}
        >
          {cell.label}
        </span>
      ))}
    </>
  )
}

/** 12개월 띠 — 열리는 달은 금색, 막히는 달은 회색. 숫자는 달(月)뿐이다. */
function MonthStrip({ year, verdict }: { year: number; verdict: ThemeVerdict }) {
  const opportunity = new Set(
    timingsOf(verdict, 'opportunity')
      .filter((timing) => timing.year === year)
      .flatMap((timing) => timing.months)
  )
  const caution = new Set(
    timingsOf(verdict, 'caution')
      .filter((timing) => timing.year === year)
      .flatMap((timing) => timing.months)
  )
  const bases = verdict.timings.filter((timing) => timing.year === year).map((timing) => timing.basis)

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-ink-light/50">{year}년</p>
      <ul className="grid grid-cols-12 gap-0.5">
        {MONTHS.map((month) => {
          const open = opportunity.has(month)
          const blocked = !open && caution.has(month)
          return (
            <li
              key={month}
              className={`rounded py-1 text-center text-[9px] ${
                open
                  ? 'bg-gold-500/25 font-bold text-gold-200'
                  : blocked
                    ? 'bg-white/[0.07] text-ink-light/35'
                    : 'bg-white/[0.02] text-ink-light/20'
              }`}
            >
              {month}
            </li>
          )
        })}
      </ul>
      {bases.map((basis) => (
        <p key={basis} className="text-[10px] text-ink-light/35">
          {basis}
        </p>
      ))}
    </div>
  )
}

/**
 * ⑧ 다음 걸음 — 관련 테마 2장 + 고민상담.
 * `openEnded` 판정이면 상담을 **맨 위에** 세운다. 답을 주지 않기로 한 자리에서 다시 답을
 * 파는 카드를 앞에 두면, 그 판정이 장식이 된다.
 */
function NextSteps({ related, openEnded = false }: { related: ThemeFortune[]; openEnded?: boolean }) {
  const chat = (
    <Link
      href={CHAT_PATH}
      className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-surface/40 px-3 py-3 text-[12px] text-ink-light/70 transition-colors hover:border-gold-500/30"
    >
      <span className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-gold-500/70" />
        {openEnded ? '이 이야기를 더 풀어보기' : '신령님께 여쭙기'}
      </span>
      <ChevronRight className="h-4 w-4 text-ink-light/30" />
    </Link>
  )

  const themes = related.map((item) => (
    <Link
      key={item.id}
      href={themeReadingPath(item.id)}
      className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-surface/40 px-3 py-3 text-[12px] text-ink-light/70 transition-colors hover:border-gold-500/30"
    >
      <span className="line-clamp-1">{item.title}</span>
      <ChevronRight className="h-4 w-4 flex-shrink-0 text-ink-light/30" />
    </Link>
  ))

  return (
    <section className="mt-8 space-y-2">
      <div className="dancheong-divider my-4" />
      <h2 className="px-1 font-serif text-sm text-gold-500/80">다음 걸음</h2>
      {openEnded ? (
        <>
          {chat}
          {themes}
        </>
      ) : (
        <>
          {themes}
          {chat}
        </>
      )}
    </section>
  )
}
