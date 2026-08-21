'use client'

import Link from 'next/link'
import { ChevronDown, RotateCcw, ShieldAlert, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { describePaymentFailure, type PaymentFailureKind } from '@/lib/domain/payment/payment-failure'

/**
 * 결제가 끝나지 못했을 때 보는 화면 — **복채 충전과 멤버십이 함께 쓴다**.
 *
 * 🔴 두 화면이 각자 그리던 것을 하나로 모았다. 예전엔 같은 상황(사용자 취소)을 한쪽은 붉은
 *    느낌표 + 「결제 실패」로, 다른 쪽은 X 아이콘 + 다른 문구로 그렸다. 문구를 화면에서 만들면
 *    반드시 갈라진다 — 무슨 말을 할지는 `lib/domain/payment/payment-failure.ts` 가 정한다.
 *
 * 🔴 취소는 실패가 아니다. 붉은색·경고 아이콘·고객센터 안내를 **취소에는 쓰지 않는다.**
 */
export function PaymentFailureView({
  code,
  message,
  retryHref,
  retryLabel,
  exitHref,
  exitLabel,
}: {
  code: string | null
  message: string | null
  /** 원래 하려던 자리로 돌아가는 곳. */
  retryHref: string
  retryLabel: string
  /** 그만두고 나가는 곳. */
  exitHref: string
  exitLabel: string
}) {
  const notice = describePaymentFailure(code, message)
  const [showCode, setShowCode] = useState(false)

  const tone: Record<PaymentFailureKind, { ring: string; icon: string; Icon: typeof Undo2 }> = {
    canceled: { ring: 'border-white/[0.12] bg-white/[0.03]', icon: 'text-ink-light/70', Icon: Undo2 },
    rejected: { ring: 'border-gold-500/25 bg-gold-500/[0.06]', icon: 'text-gold-400', Icon: RotateCcw },
    failed: { ring: 'border-seal/30 bg-seal/[0.07]', icon: 'text-seal-light', Icon: ShieldAlert },
  }
  const { ring, icon, Icon } = tone[notice.kind]

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-7 px-5 py-12">
      <div className={`flex h-16 w-16 items-center justify-center rounded-full border ${ring}`}>
        <Icon className={`h-7 w-7 ${icon}`} strokeWidth={1.4} aria-hidden />
      </div>

      <div className="max-w-[22rem] space-y-2.5 text-center">
        <h1 className="break-keep font-serif text-[1.35rem] font-bold leading-snug text-ink-light">{notice.title}</h1>
        <p className="break-keep font-sans text-[13.5px] font-light leading-relaxed text-ink-light/70">
          {notice.description}
        </p>
      </div>

      <div className="flex w-full max-w-[20rem] flex-col gap-2.5">
        {notice.canRetry && (
          <Button
            asChild
            className="h-12 rounded-xl bg-primary font-serif font-bold text-background hover:bg-primary/90"
          >
            <Link href={retryHref}>{retryLabel}</Link>
          </Button>
        )}
        <Button
          asChild
          variant="outline"
          className="h-12 rounded-xl border-white/[0.12] font-sans text-ink-light/80 hover:bg-surface"
        >
          <Link href={exitHref}>{exitLabel}</Link>
        </Button>
      </div>

      {/* 🔴 오류 코드는 사용자에게 의미가 없다. 문의할 때만 필요하므로 접어 둔다. */}
      {code && (
        <div className="w-full max-w-[20rem] text-center">
          <button
            type="button"
            onClick={() => setShowCode((v) => !v)}
            aria-expanded={showCode}
            className="inline-flex min-h-[44px] items-center gap-1 px-3 font-sans text-[11px] text-ink-light/35 transition-colors hover:text-ink-light/60"
          >
            자세한 정보
            <ChevronDown className={`h-3 w-3 transition-transform ${showCode ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          {showCode && (
            <p className="select-all break-all font-mono text-[11px] leading-relaxed text-ink-light/40">{code}</p>
          )}
        </div>
      )}

      {notice.showSupport && (
        <p className="max-w-[20rem] break-keep text-center font-sans text-[11.5px] leading-relaxed text-ink-light/45">
          같은 일이 반복되면 고객센터로 알려주세요. 결제된 것이 있는지 저희가 먼저 확인해 드립니다.
        </p>
      )}
    </div>
  )
}
