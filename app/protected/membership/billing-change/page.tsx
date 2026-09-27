'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, CreditCard, Loader2, XCircle } from 'lucide-react'
import { completeBillingMethodChange } from '@/app/actions/payment/subscription'
import { isUserCanceled } from '@/lib/domain/payment/payment-failure'
import { logger } from '@/lib/utils/logger'

type Step = 'working' | 'done' | 'error'

/**
 * URL 만 보고 아는 실패 — 토스가 실패로 돌려보냈거나 인증 정보가 없다.
 * 🔴 렌더 중에 정한다. 효과 안에서 곧바로 setState 하면 연쇄 렌더가 되고(react-hooks/set-state-in-effect),
 *    이 규칙은 주석으로 끌 수 없다.
 */
function upfrontFailure(
  code: string | null,
  message: string | null,
  authKey: string | null,
  customerKey: string | null
): string | null {
  if (!code && authKey && customerKey) return null
  if (code && isUserCanceled(code)) return '결제 수단 변경을 취소하셨습니다. 기존 결제 수단은 그대로입니다.'
  return message ?? '인증 정보가 없어 결제 수단을 바꾸지 못했습니다. 기존 결제 수단은 그대로입니다.'
}

/**
 * 결제 수단 변경 복귀 화면.
 *
 * ## 🔴 이 화면이 없어서 결제 수단 변경이 끝까지 가지 못했다
 * 예전 successUrl 은 관리 화면(`/manage?changed=true`)이었는데, 그 화면은 `authKey` 를 읽지 않았다.
 * 빌링키가 발급되지 않은 채 customer_key 만 새 값으로 바뀌어 다음 갱신 청구가 토스에서 거절됐다.
 * 그래서 «돌아오는 자리»를 따로 두고, 여기서만 발급·교체를 마무리한다.
 *
 * ## 🔴 여기서 돈을 받지 않는다
 * 수단만 바꾸는 자리다. 첫 결제(executeFirstPayment)를 부르면 이번 주기를 두 번 받는다.
 * 다음 청구는 갱신 크론이 한다.
 */
function BillingChangeContent() {
  const searchParams = useSearchParams()
  const [outcome, setOutcome] = useState<{ step: Step; error: string } | null>(null)
  const started = useRef(false)

  const authKey = searchParams.get('authKey')
  const customerKey = searchParams.get('customerKey')
  const upfrontError = upfrontFailure(searchParams.get('code'), searchParams.get('message'), authKey, customerKey)

  useEffect(() => {
    if (upfrontError || !authKey || !customerKey) return
    // 🔴 정확히 한 번만 — authKey 는 일회성이라 두 번 부르면 두 번째가 실패한다.
    if (started.current) return
    started.current = true

    completeBillingMethodChange(authKey, customerKey)
      .then((result) =>
        setOutcome(
          result.success
            ? { step: 'done', error: '' }
            : { step: 'error', error: result.error ?? '결제 수단을 바꾸지 못했습니다.' }
        )
      )
      .catch((e: unknown) => {
        logger.error(e instanceof Error ? e : new Error('[BillingChange] 결제 수단 변경 처리 실패'))
        setOutcome({ step: 'error', error: '처리 중 오류가 발생했습니다.' })
      })
  }, [authKey, customerKey, upfrontError])

  const step: Step = upfrontError ? 'error' : (outcome?.step ?? 'working')
  const error = upfrontError ?? outcome?.error ?? ''

  return (
    <div className="mx-auto w-full max-w-[480px] px-3 py-10 pb-24">
      <section className="rounded-2xl border border-white/[0.08] bg-surface/50 p-6 text-center">
        {step === 'working' && (
          <>
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gold-500/25 bg-gold-500/[0.08]">
              <Loader2 className="h-6 w-6 animate-spin text-gold-400" aria-hidden />
            </span>
            <h1 className="font-serif text-lg font-bold text-ink-light">결제 수단을 바꾸는 중입니다</h1>
            <p className="mt-2 font-sans text-[12.5px] text-ink-light/50">창을 닫지 말고 잠시만 기다려 주세요.</p>
          </>
        )}

        {step === 'done' && (
          <>
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gold-500/25 bg-gold-500/[0.08]">
              <CheckCircle2 className="h-6 w-6 text-gold-400" aria-hidden />
            </span>
            <h1 className="font-serif text-lg font-bold text-ink-light">결제 수단을 바꿨습니다</h1>
            <p className="mt-2 break-keep font-sans text-[12.5px] leading-relaxed text-ink-light/50">
              다음 결제일부터 새 결제 수단으로 청구됩니다. 지금 따로 결제된 금액은 없습니다.
            </p>
          </>
        )}

        {step === 'error' && (
          <>
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-seal/30 bg-seal/10">
              <XCircle className="h-6 w-6 text-seal" aria-hidden />
            </span>
            <h1 className="font-serif text-lg font-bold text-ink-light">결제 수단을 바꾸지 못했습니다</h1>
            <p className="mt-2 break-keep font-sans text-[12.5px] leading-relaxed text-seal">{error}</p>
          </>
        )}

        {step !== 'working' && (
          <Link
            href="/protected/membership/manage"
            className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-gold-500/40 bg-gold-500/[0.12] px-5 font-serif text-sm font-bold text-gold-300 transition-colors hover:bg-gold-500/20"
          >
            <CreditCard className="h-4 w-4" aria-hidden />
            결제 · 구독 관리로
          </Link>
        )}
      </section>
    </div>
  )
}

export default function BillingChangePage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <BillingChangeContent />
    </Suspense>
  )
}
