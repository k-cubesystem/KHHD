'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { chargeRefundPolicyLine } from '@/lib/domain/payment/self-cancel'

/**
 * 「구매조건 확인 및 결제진행 동의」 — 결제 직전에 **판매자가** 받아야 하는 동의.
 *
 * ## 🔴 왜 필요한가
 * 카드사 결제경로 심사(토스페이먼츠 「홈페이지 결제경로 제작 가이드」 12~14p)가 ⑤ 구매과정
 * 예시에서 이 체크박스를 강조한다. 근거는 「전자상거래 등에서의 소비자보호에 관한 법률」
 * 제8조 — 사업자는 대금을 받기 전에 **구매 내용을 확인시키고 동의를 받아야** 한다.
 *
 * 🔴 **토스 결제창의 「[필수] 서비스 이용 약관, 개인정보 처리 동의」로 갈음되지 않는다.**
 *    그건 결제대행사(PG)의 약관 동의라 성격이 다르다. 판매자 화면에서 따로 받아야 한다.
 *
 * ## 쓰는 법
 * 동의 전에는 결제 버튼을 **비활성**으로 둔다 — 체크를 안 해도 결제가 되면 받는 의미가 없다.
 */
export function PurchaseConsent({
  checked,
  onChange,
  /** 주문 상품명. 「무엇을」 샀는지 동의 문구 안에서 다시 확인시킨다. */
  orderName,
  /** 결제 금액(원). */
  amount,
  /** 정기결제면 「매월」 같은 주기어. 일반결제면 비운다. */
  interval,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  orderName: string
  amount: number
  interval?: string
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const panelId = `${id}-detail`

  return (
    <div className="rounded-xl border border-white/[0.10] bg-surface/40">
      <label
        htmlFor={id}
        className="flex min-h-[52px] cursor-pointer items-center gap-3 px-4 py-3 font-sans text-[13px] leading-snug text-ink-light"
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-[18px] w-[18px] shrink-0 cursor-pointer accent-gold-500"
        />
        <span>
          <span className="font-bold">구매조건을 확인했으며 결제진행에 동의합니다</span>
          <span className="ml-1 text-seal">(필수)</span>
        </span>
      </label>

      <div className="border-t border-white/[0.06]">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex min-h-[44px] w-full items-center justify-between gap-2 px-4 font-sans text-[11.5px] text-ink-light/45 transition-colors hover:text-ink-light/75"
        >
          구매조건 자세히 보기
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
        </button>

        {open && (
          <dl id={panelId} className="space-y-1.5 px-4 pb-4 font-sans text-[11.5px] leading-relaxed text-ink-light/60">
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-ink-light/40">주문 상품</dt>
              <dd className="min-w-0 flex-1 text-ink-light/80">{orderName}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-ink-light/40">결제 금액</dt>
              <dd className="min-w-0 flex-1 tabular-nums text-ink-light/80">
                {amount.toLocaleString('ko-KR')}원{interval ? ` · ${interval} 자동 결제` : ''}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-ink-light/40">공급자</dt>
              <dd className="min-w-0 flex-1 text-ink-light/80">큐브시스템 (사업자 205-16-69546)</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-ink-light/40">청약철회</dt>
              <dd className="min-w-0 flex-1">
                {interval ? '해지 시 잔여 기간을 일할 계산하여 환불합니다.' : chargeRefundPolicyLine()} 이미 사용한 분은
                「전자상거래법」 제17조 제2항에 따라 청약철회가 제한됩니다.
              </dd>
            </div>
            <p className="pt-1">
              자세한 내용은{' '}
              <Link href="/terms" className="text-gold-300 underline underline-offset-2">
                이용약관 제7조
              </Link>
              {' · '}
              <Link href="/privacy" className="text-gold-300 underline underline-offset-2">
                개인정보처리방침
              </Link>
              에서 확인하실 수 있습니다.
            </p>
          </dl>
        )}
      </div>
    </div>
  )
}
