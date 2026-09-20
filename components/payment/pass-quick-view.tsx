'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Crown, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { IconPass } from '@/components/icons/traditional-icons'
import { getMyPassOverview, type PassOverview } from '@/app/actions/payment/passes'
import { trackEvent } from '@/lib/analytics/ga4'
import { passBadgeLabel, passSummaryLines } from '@/lib/domain/entitlement/pass'
import { membershipUpsell, PASS_STORE_PATH } from '@/lib/domain/payment/membership-upsell'
import { logger } from '@/lib/utils/logger'

/**
 * 「내 이용권」 — 상단 바의 표 모양을 누르면 열리는 팝업. 지금 쓸 수 있는 이용권과 멤버십 등급을 보이고,
 * 이용권 구매와 멤버십으로 가는 문을 둔다(CEO 2026-09-20).
 *
 * 🔴 주머니(멤버십 이번 달 몫 · 보유 이용권)를 한 숫자로 합치지 않는다 — 문구는 pass.ts 의 것을 그대로 쓴다.
 * 🔴 열 때마다 다시 읽는다. 풀이를 보고 나면 장 수가 바뀌므로, 한 번 읽고 굳히면 틀린 수를 보인다.
 *    앞서 읽은 값이 있으면 그것을 보인 채로 조용히 갈아 끼운다(열 때마다 빈 화면이 깜빡이지 않게).
 *    다시 읽기에 실패하면 옛 값을 지우지 않되 «새로 읽지 못했다»고 밝힌다 — 옛 수를 최신인 것처럼 두지 않는다.
 */
export function PassQuickView() {
  const [open, setOpen] = useState(false)
  const [overview, setOverview] = useState<PassOverview | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading')
  // sent = 마지막으로 보낸 요청, applied = 화면에 반영한 요청. 늦게 온 옛 응답이 새 응답을 덮지 않게 한다.
  const requests = useRef({ sent: 0, applied: 0 })

  const openPopup = () => {
    setOpen(true)
    trackEvent({ action: 'pass_popup_open', category: 'conversion' })
    // 앞서 실패·비로그인으로 끝났어도 다시 열면 다시 읽는 중이다.
    if (!overview) setStatus('loading')

    const request = (requests.current.sent += 1)
    getMyPassOverview()
      .then((next) => {
        if (request < requests.current.applied) return
        requests.current.applied = request
        setOverview(next)
        setStatus('ready')
      })
      .catch((e: unknown) => {
        logger.error('[pass-quick-view] 이용권 요약 조회 실패:', e)
        // 더 새 요청이 나가 있으면 그쪽 결과에 맡긴다.
        if (request === requests.current.sent) setStatus('failed')
      })
  }

  const close = () => setOpen(false)

  return (
    <>
      <button
        type="button"
        onClick={openPopup}
        aria-label="내 이용권 보기"
        className="flex h-11 w-11 items-center justify-center text-ink-light/70 transition-colors hover:text-primary"
      >
        <IconPass className="h-5 w-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden border-gold-500/25 bg-surface p-0 sm:max-w-md">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-3">
            <DialogTitle className="flex items-center gap-1.5 font-serif text-gold-500">
              <IconPass className="h-4 w-4 shrink-0" />내 이용권
            </DialogTitle>
            <DialogDescription className="sr-only">
              지금 쓸 수 있는 이용권과 멤버십 등급을 보고, 이용권 구매나 멤버십으로 갈 수 있어요.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-6">
            {overview ? (
              <>
                {status === 'failed' ? (
                  <p
                    role="status"
                    className="mb-3 rounded-lg border border-seal/40 px-3 py-2 text-[12px] text-ink-light/80"
                  >
                    방금 새로 읽지 못했습니다. 아래는 앞서 읽은 값입니다.
                  </p>
                ) : null}
                <PassQuickViewBody overview={overview} onNavigate={close} />
              </>
            ) : status === 'loading' ? (
              <p className="flex items-center justify-center gap-2 py-8 text-[12px] text-ink-light/60">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                불러오는 중
              </p>
            ) : (
              <div className="flex flex-col items-center gap-1 py-8 text-center text-[12px] text-ink-light/60">
                {status === 'failed' ? (
                  <p>이용권을 불러오지 못했습니다. 잠시 후 다시 열어 주세요.</p>
                ) : (
                  <>
                    <p>로그인이 필요합니다.</p>
                    {/* 상단 바는 공개 화면(/webtoon)에도 있다 — 비로그인 방문자에게 갈 곳을 준다. */}
                    <Link
                      href="/auth/login"
                      onClick={close}
                      className="flex min-h-11 items-center px-2 font-serif font-bold text-gold-500 underline-offset-2 hover:underline"
                    >
                      로그인하러 가기
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** 팝업 본문 — 미리보기 장면(app/dev-preview)이 목 데이터로 그대로 세운다. */
export function PassQuickViewBody({ overview, onNavigate }: { overview: PassOverview; onNavigate: () => void }) {
  const lines = passSummaryLines(overview.passes)
  const upsell = membershipUpsell({
    tier: overview.tier,
    isSubscribed: overview.isSubscribed,
    firstMonthEligible: overview.firstMonthEligible,
    unlimited: overview.passes.unlimited,
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2.5">
        <span className="flex min-w-0 items-center gap-1.5">
          <Crown className="h-3.5 w-3.5 shrink-0 text-gold-500" />
          <span className="text-[11px] font-light text-ink-light/60">등급</span>
          <span className="truncate font-serif text-[13px] font-bold text-gold-500">{overview.planName}</span>
        </span>
        {/* 관리자·검수 계정은 구독이 없어도 등급 상수가 is_subscribed=true 다 — 관리할 구독이 없으니 링크를 두지 않는다. */}
        {overview.isSubscribed && !overview.passes.unlimited ? (
          <Link
            href="/protected/membership/manage"
            onClick={onNavigate}
            className="-my-2.5 flex min-h-11 shrink-0 items-center px-1 text-[11px] text-ink-light/60 transition-colors hover:text-gold-500"
          >
            결제 · 구독 관리
            <ChevronRight className="h-3 w-3" />
          </Link>
        ) : null}
      </div>

      <div className="rounded-lg border border-gold-500/20 bg-gold-500/[0.05] px-3 py-3">
        <p className="font-serif text-[20px] font-bold leading-tight text-gold-500">
          {passBadgeLabel(overview.passes)}
        </p>
        {lines.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-1">
            {/* 같은 날 같은 팩을 두 번 사면 같은 문장이 둘 나온다 — 문장만으로는 key 가 겹친다. */}
            {lines.map((line, index) => (
              <li
                key={`${index}:${line}`}
                className="text-[12px] font-light text-ink-light/80"
                style={{ wordBreak: 'keep-all' }}
              >
                {line}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[12px] font-light text-ink-light/70">지금 쓸 수 있는 이용권이 없어요.</p>
        )}
      </div>

      {overview.passes.unlimited ? null : (
        <Link
          href={PASS_STORE_PATH}
          onClick={() => {
            trackEvent({ action: 'pass_popup_cta', category: 'conversion', label: 'buy_pass' })
            onNavigate()
          }}
          className="flex w-full items-center justify-center gap-1.5 rounded-[3px] border border-seal/60 bg-seal/20 py-3 font-serif text-[13px] font-bold text-[#f2dcdc] shadow-dojang transition-colors hover:bg-seal/30"
        >
          <IconPass className="h-4 w-4" />
          이용권 구매하기
        </Link>
      )}

      {upsell ? (
        <div className="flex flex-col gap-1.5">
          <Link
            href={upsell.href}
            onClick={() => {
              trackEvent({
                action: 'pass_popup_cta',
                category: 'conversion',
                label: `membership_${upsell.target.toLowerCase()}`,
              })
              onNavigate()
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-[3px] border border-gold-500/50 bg-gold-500/15 py-3 font-serif text-[13px] font-bold text-gold-200 shadow-dojang transition-colors hover:bg-gold-500/25"
          >
            <Crown className="h-4 w-4" />
            {upsell.label}
          </Link>
          <p
            className="text-center text-[11px] font-light leading-relaxed text-ink-light/60"
            style={{ wordBreak: 'keep-all' }}
          >
            {upsell.note}
          </p>
        </div>
      ) : null}

      <Link
        href="/pass-policy"
        onClick={onNavigate}
        className="-my-2 flex min-h-11 items-center self-center px-2 text-[11px] text-ink-light/55 underline-offset-2 transition-colors hover:text-gold-500 hover:underline"
      >
        이용권 안내 · 환불 정책
      </Link>
    </div>
  )
}
