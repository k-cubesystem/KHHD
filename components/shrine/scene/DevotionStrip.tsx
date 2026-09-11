'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Flame, Lock, Check, Gift, X, Loader2, Sparkles } from 'lucide-react'
import { claimDevotionReward, type DevotionStatus, type DevotionRewardStatus } from '@/app/actions/shrine/devotion'
import { DEVOTION_THRESHOLDS, DEVOTION_MAX_LEVEL } from '@/lib/domain/shrine/devotion'
import { trackEvent } from '@/lib/analytics/ga4'

const CLAIM_ERROR_MSG: Record<string, string> = {
  ALREADY_OWNED: '이미 지닌 보상입니다',
  ALREADY_CLAIMED: '이미 수령한 보상입니다',
  LEVEL_NOT_REACHED: '아직 기원이 닿지 않았습니다',
  REWARD_NOT_FOUND: '보상을 찾을 수 없습니다',
  UNAUTHORIZED: '로그인이 필요합니다',
}

/** 현재 단 구간 내 진행 비율(0~1). 최고 단이면 1. */
function bandRatio(totalDays: number, level: number): number {
  if (level >= DEVOTION_MAX_LEVEL) return 1
  const lower = level >= 1 ? (DEVOTION_THRESHOLDS[level - 1] ?? 0) : 0
  const upper = DEVOTION_THRESHOLDS[level] ?? lower
  if (upper <= lower) return 1
  return Math.max(0.03, Math.min(1, (totalDays - lower) / (upper - lower)))
}

function RewardBadge({ status }: { status: DevotionRewardStatus['status'] }) {
  if (status === 'claimed')
    return (
      <span className="flex items-center gap-1 text-[10px] text-ink-primary/45">
        <Check className="h-3 w-3" /> 수령됨
      </span>
    )
  if (status === 'owned')
    return (
      <span className="flex items-center gap-1 text-[10px] text-success-text/80">
        <Check className="h-3 w-3" /> 보유 중
      </span>
    )
  return null
}

/**
 * 신당 기원(祈願) 스트립 + 보상 트랙 시트.
 * 소유자 전용. devotion 은 서버에서 주입(SSR 즉시 렌더), 수령/적립 후 router.refresh 로 갱신.
 * 연출은 CSS/SVG만(EffectsCanvas·캔버스 금지 — 과거 흰화면 사고).
 */
export function DevotionStrip({ devotion }: { devotion: DevotionStatus }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [claiming, setClaiming] = useState<number | null>(null)

  const { totalDays, level, nextLevel, daysToNext, prayedToday, rewards } = devotion
  const atMax = nextLevel === null
  const ratio = useMemo(() => bandRatio(totalDays, level), [totalDays, level])
  const claimable = rewards.filter((r) => r.status === 'claimable')
  const nextLocked = rewards.find((r) => r.status === 'locked') ?? null

  const onClaim = useCallback(
    async (r: DevotionRewardStatus) => {
      setClaiming(r.level)
      const res = await claimDevotionReward(r.level)
      setClaiming(null)
      if (res.success) {
        toast.success(`${r.name} — 기원으로 받았습니다`, {
          description: r.kind === 'theme' ? '신당 테마에서 적용하세요' : '보관함에 담겼어요 · 꾸미기에서 배치',
        })
        trackEvent({ action: 'devotion_claim', category: 'shrine', label: `${r.kind}:${r.code}`, value: r.level })
        router.refresh()
      } else {
        toast.error(CLAIM_ERROR_MSG[res.error ?? ''] ?? '수령이 이루어지지 않았습니다')
        // 상태 어긋남(이미 보유/수령) — 최신 상태로 갱신
        if (res.error === 'ALREADY_OWNED' || res.error === 'ALREADY_CLAIMED') router.refresh()
      }
    },
    [router]
  )

  return (
    <>
      {/* 스트립 — 主神 緣 스트립과 동일 톤 */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="기원 보상 트랙 열기"
        className="flex w-full items-center gap-2 px-2.5 py-1.5 mb-2 rounded-[10px] bg-surface/60 border border-gold-500/20"
      >
        <span
          className="grid h-5 w-5 place-items-center rounded-full"
          style={{
            background: prayedToday ? 'rgba(201,168,76,0.18)' : 'rgba(255,255,255,0.04)',
            boxShadow: prayedToday ? '0 0 9px rgba(201,168,76,0.4)' : 'none',
          }}
          title={prayedToday ? '오늘 기도 완료' : '오늘 기도 전'}
        >
          <Flame
            className="h-3 w-3"
            style={{ color: prayedToday ? '#E8D5A0' : '#5C564C' }}
            fill={prayedToday ? '#C9A84C' : 'none'}
          />
        </span>
        <span className="whitespace-nowrap font-serif text-[11px] text-gold-200">
          기원 <b className="text-gold-300">{level}</b>단<span className="text-gold-500/60"> 壇</span>
        </span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-primary/15">
          <div className="h-full rounded-full bg-gold-500 transition-all" style={{ width: `${ratio * 100}%` }} />
        </div>
        <span className="whitespace-nowrap font-serif text-[9.5px] tabular-nums text-ink-primary/45">
          {atMax ? '정진' : `${nextLevel}단 ${daysToNext}일`}
        </span>
        {claimable.length > 0 && (
          <span className="grid h-[15px] min-w-[15px] place-items-center rounded-full bg-seal px-1 text-[9px] font-bold tabular-nums text-[#f2dcdc]">
            {claimable.length}
          </span>
        )}
      </button>

      {/* 보상 트랙 시트 (바텀시트) */}
      {open && (
        <div
          className="fixed inset-0 z-toast flex items-end justify-center"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="기원 보상 트랙"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
          <div
            className="relative w-full max-w-[480px] max-h-[82vh] overflow-y-auto rounded-t-2xl hanji-card border-t border-x border-gold-500/25 p-5 pb-8 devotion-sheet"
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#16140F' }}
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="font-serif text-[10px] tracking-[0.3em] text-gold-500/60">祈 願</p>
                <h2 className="font-serif text-lg font-bold text-ink-primary">
                  기원 <span className="text-gold-300">{level}</span>단
                  <span className="ml-2 text-[11px] font-normal text-ink-primary/45">
                    {atMax ? '· 최고 경지' : `· ${nextLevel}단까지 ${daysToNext}일`}
                  </span>
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="grid h-8 w-8 place-items-center rounded-full bg-surface border border-white/10 text-ink-primary/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-4 rounded-lg bg-gold-500/[0.06] border border-gold-500/15 px-3 py-2 font-sans text-[11px] leading-relaxed text-ink-primary/70">
              매일 기도 한 번이면 충분합니다 — 기원은 끊겨도 사라지지 않습니다.
            </p>

            <ol className="space-y-2">
              {rewards.map((r) => {
                const isNext = nextLocked?.level === r.level
                const busy = claiming === r.level
                return (
                  <li
                    key={r.level}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                      r.status === 'claimable'
                        ? 'border-gold-500/45 bg-gold-500/[0.08]'
                        : isNext
                          ? 'border-gold-500/25 bg-surface/60'
                          : 'border-white/[0.06] bg-white/[0.02]'
                    }`}
                  >
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full font-serif text-[11px] font-bold tabular-nums"
                      style={
                        r.status === 'locked'
                          ? {
                              background: 'rgba(255,255,255,0.04)',
                              color: '#5C564C',
                              border: '1px solid rgba(255,255,255,0.08)',
                            }
                          : {
                              background: 'rgba(201,168,76,0.14)',
                              color: '#E8D5A0',
                              border: '1px solid rgba(201,168,76,0.4)',
                            }
                      }
                    >
                      {r.level}단
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-serif text-[13px] font-bold text-ink-primary">{r.name}</span>
                        <span className="shrink-0 rounded-sm border border-white/10 px-1 text-[8.5px] text-ink-primary/40">
                          {r.kind === 'theme' ? '테마' : '신물'}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-ink-primary/45">
                        {r.priceBokchae > 0 ? (
                          <span className="tabular-nums">복채 {r.priceBokchae}만냥</span>
                        ) : (
                          <span>무료 신물</span>
                        )}
                        <span className="text-gold-500/50">· 기원 {r.level}단 무료</span>
                      </div>
                    </div>

                    {/* 우측 액션/상태 */}
                    {r.status === 'claimable' ? (
                      <button
                        type="button"
                        onClick={() => void onClaim(r)}
                        disabled={busy}
                        className="flex shrink-0 items-center gap-1 rounded-lg bg-seal/20 border border-seal/50 px-3 py-1.5 font-serif text-[11px] font-bold text-seal disabled:opacity-50"
                      >
                        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Gift className="h-3 w-3" />}
                        무료 수령
                      </button>
                    ) : r.status === 'locked' ? (
                      <span className="flex shrink-0 items-center gap-1 text-[10px] text-ink-primary/35">
                        <Lock className="h-3 w-3" /> {r.level}단
                      </span>
                    ) : (
                      <span className="shrink-0">
                        <RewardBadge status={r.status} />
                      </span>
                    )}
                  </li>
                )
              })}
            </ol>

            <p className="mt-4 flex items-center justify-center gap-1 text-center font-sans text-[10px] text-ink-primary/35">
              <Sparkles className="h-3 w-3 text-gold-500/40" />
              돈으로 바로 사고 싶다면 상점에서 언제든 봉헌할 수 있어요
            </p>
          </div>
        </div>
      )}
    </>
  )
}
