'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cancelSubscription, reactivateSubscription, changeBillingMethod } from '@/app/actions/payment/subscription'
import { CreditCard, XCircle, RotateCcw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { MEMBERSHIP_LOSS_LINES } from '@/lib/domain/payment/membership-benefits'

interface SubscriptionActionsProps {
  subscriptionId: string
  status: string
  periodEnd: string | null
  /** 자동 결제가 걸려 있는 구독인가 — 아니면 «바꿀 수단»이 없다(관리자가 결제 없이 부여한 구독). */
  canChangeBilling: boolean
}

/** 토스 인증이 끝나고 돌아올 자리. 이 경로의 화면이 빌링키 발급과 키 교체를 마무리한다. */
const BILLING_CHANGE_RETURN_PATH = '/protected/membership/billing-change'

export function SubscriptionActions({
  subscriptionId: _subscriptionId,
  status,
  periodEnd,
  canChangeBilling,
}: SubscriptionActionsProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const router = useRouter()

  const isActive = status === 'ACTIVE'
  const isCancelled = status === 'CANCELLED'
  const canReactivate = isCancelled && periodEnd && new Date(periodEnd) > new Date()

  const handleCancel = async () => {
    setIsLoading('cancel')
    try {
      const result = await cancelSubscription('사용자 요청')

      if (result.success) {
        toast.success('구독이 해지 예약되었습니다. 현재 기간 종료까지 혜택을 이용할 수 있습니다.')
        router.refresh()
      } else {
        toast.error(result.error || '구독 해지에 실패했습니다.')
      }
    } catch {
      toast.error('오류가 발생했습니다.')
    } finally {
      setIsLoading(null)
    }
  }

  const handleReactivate = async () => {
    setIsLoading('reactivate')
    try {
      const result = await reactivateSubscription()

      if (result.success) {
        toast.success('구독이 다시 활성화되었습니다!')
        router.refresh()
      } else {
        toast.error(result.error || '구독 재활성화에 실패했습니다.')
      }
    } catch {
      toast.error('오류가 발생했습니다.')
    } finally {
      setIsLoading(null)
    }
  }

  const handleChangeBilling = async () => {
    setIsLoading('billing')
    try {
      const result = await changeBillingMethod()

      if (!result.success || !result.customerKey) {
        toast.error(result.error || '결제 수단 변경에 실패했습니다.')
        return
      }

      const { getTossPaymentsSDK } = await import('@/lib/services/tosspayments')
      const sdk = await getTossPaymentsSDK('billing')
      if (!sdk) throw new Error('결제 모듈 로드 실패')
      const payment = sdk.payment({ customerKey: result.customerKey })
      // 🔴 복귀 자리는 «마무리하는 화면»이어야 한다. 예전엔 관리 화면으로 돌려보냈는데 그 화면은
      //    authKey 를 읽지 않아 빌링키가 발급되지 않았다 — 카드를 바꿔도 아무 일도 일어나지 않았다.
      //    authKey 는 토스가 붙여 주고, customerKey 는 우리가 직접 싣는다(가입 흐름도 이렇게 한다).
      await payment.requestBillingAuth({
        method: 'CARD',
        successUrl: `${window.location.origin}${BILLING_CHANGE_RETURN_PATH}?customerKey=${result.customerKey}`,
        failUrl: `${window.location.origin}${BILLING_CHANGE_RETURN_PATH}`,
        windowTarget: 'self',
      })
    } catch {
      toast.error('오류가 발생했습니다.')
      setIsLoading(null)
    }
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[0.08] pt-4">
      {/* 결제 수단 변경 - 자동 결제 중인 활성 구독에서만 */}
      {isActive && canChangeBilling && (
        <Button
          variant="outline"
          onClick={handleChangeBilling}
          disabled={isLoading !== null}
          className="h-10 rounded-xl border-white/15 bg-surface/60 text-[13px] text-ink-light hover:border-gold-500/40 hover:bg-surface"
        >
          {isLoading === 'billing' ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <CreditCard className="w-4 h-4 mr-2" />
          )}
          결제 수단 변경
        </Button>
      )}

      {/* 구독 재활성화 - 해지 예정 상태에서만 */}
      {canReactivate && (
        <Button
          onClick={handleReactivate}
          disabled={isLoading !== null}
          className="h-10 rounded-xl bg-gold-500 text-[13px] font-bold text-ink-950 hover:bg-gold-400"
        >
          {isLoading === 'reactivate' ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RotateCcw className="w-4 h-4 mr-2" />
          )}
          구독 재활성화
        </Button>
      )}

      {/* 구독 해지 - 활성 상태에서만 */}
      {isActive && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              disabled={isLoading !== null}
              className="h-10 rounded-xl text-[13px] text-seal hover:bg-seal/10 hover:text-seal"
            >
              <XCircle className="w-4 h-4 mr-2" />
              구독 해지
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl border-white/[0.08] bg-surface">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-serif text-ink-light">정말 구독을 해지하시겠습니까?</AlertDialogTitle>
              {/* Radix Description 기본 태그는 <p> — 안에 <p>·<ul> 블록을 넣으면 DOM 중첩 위반이라
                  asChild 로 <div> 컨테이너로 바꾼다(접근성 aria-describedby 연결은 유지). */}
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-ink-light/55">
                  <p>해지 후에도 현재 결제 기간이 끝날 때까지 모든 멤버십 혜택을 이용할 수 있습니다.</p>
                  <p className="font-medium text-ink-light">해지 시 잃게 되는 혜택:</p>
                  {/* 🔴 줄을 여기서 적지 않는다 — 해지를 말리는 자리라, 없는 혜택(웹툰 멤버십 회차 0편)이 한 줄만 섞여도
                      표시광고법 문제다. 잃는 «것»의 정본은 MEMBERSHIP_LOSS_LINES 다. */}
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {MEMBERSHIP_LOSS_LINES.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl border-white/15 bg-surface/60 text-ink-light hover:bg-surface">
                취소
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancel}
                disabled={isLoading === 'cancel'}
                className="rounded-xl bg-seal text-white hover:bg-seal/85"
              >
                {isLoading === 'cancel' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                해지하기
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
