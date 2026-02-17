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
import {
  cancelSubscription,
  reactivateSubscription,
  changeBillingMethod,
} from '@/app/actions/payment/subscription'
import { CreditCard, XCircle, RotateCcw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface SubscriptionActionsProps {
  subscriptionId: string
  status: string
  periodEnd: string | null
}

export function SubscriptionActions({
  subscriptionId,
  status,
  periodEnd,
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
    } catch (error) {
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
    } catch (error) {
      toast.error('오류가 발생했습니다.')
    } finally {
      setIsLoading(null)
    }
  }

  const handleChangeBilling = async () => {
    setIsLoading('billing')
    try {
      const result = await changeBillingMethod()

      if (result.success && result.authUrl) {
        window.location.href = result.authUrl
      } else {
        toast.error(result.error || '결제 수단 변경에 실패했습니다.')
      }
    } catch (error) {
      toast.error('오류가 발생했습니다.')
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="flex flex-wrap gap-3 pt-6 border-t border-zen-border">
      {/* 결제 수단 변경 - 활성 상태에서만 */}
      {isActive && (
        <Button
          variant="outline"
          onClick={handleChangeBilling}
          disabled={isLoading !== null}
          className="border-zen-border text-zen-text hover:bg-zen-bg rounded-sm"
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
          className="bg-zen-wood hover:bg-[#7A604D] text-white rounded-sm"
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
              className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-sm"
            >
              <XCircle className="w-4 h-4 mr-2" />
              구독 해지
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-white border-zen-border rounded-sm">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-serif text-zen-text">
                정말 구독을 해지하시겠습니까?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-zen-muted space-y-2">
                <p>
                  해지 후에도 현재 결제 기간이 끝날 때까지 모든 멤버십 혜택을 이용할 수 있습니다.
                </p>
                <p className="font-medium text-zen-text">해지 시 잃게 되는 혜택:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>매월 복채 10만냥 자동 지급</li>
                  <li>오늘의 운세 무제한 열람</li>
                  <li>매일 카카오톡 알림</li>
                  <li>분석 결과 PDF 보관</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-sm border-zen-border">취소</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancel}
                disabled={isLoading === 'cancel'}
                className="bg-red-600 hover:bg-red-700 text-white rounded-sm"
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
