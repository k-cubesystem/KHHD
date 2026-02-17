'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createBillingAuthUrl } from '@/app/actions/payment/subscription'
import { Crown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface MembershipCardProps {
  planId: string
  planName: string
  price: number
}

export function MembershipCard({ planId, planName, price }: MembershipCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubscribe = async () => {
    setIsLoading(true)

    try {
      const result = await createBillingAuthUrl(planId)

      if (!result.success || !result.authUrl) {
        toast.error(result.error || '결제 준비에 실패했습니다.')
        return
      }

      // Toss Payments 빌링키 발급 페이지로 이동
      // 실제 환경에서는 Toss SDK 위젯을 사용
      // 테스트 환경에서는 성공 페이지로 직접 이동 (Mock)
      if (process.env.NODE_ENV === 'development') {
        // 개발 환경: Mock 처리
        toast.info('개발 환경: 테스트 결제를 진행합니다.')
        router.push(
          `/protected/membership/success?customerKey=${result.customerKey}&planId=${planId}&mock=true`
        )
      } else {
        // 프로덕션: Toss Payments로 이동
        window.location.href = result.authUrl
      }
    } catch (error) {
      console.error('Subscription error:', error)
      toast.error('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="text-center">
      <Button
        onClick={handleSubscribe}
        disabled={isLoading}
        className="w-full md:w-auto min-w-[300px] h-14 bg-zen-wood hover:bg-[#7A604D] text-white font-serif font-bold text-lg rounded-sm shadow-md transition-all duration-300 hover:shadow-lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            결제 준비 중...
          </>
        ) : (
          <>
            <Crown className="w-5 h-5 mr-2" />
            멤버십 시작하기
          </>
        )}
      </Button>

      <p className="mt-4 text-xs text-zen-muted">
        결제 시{' '}
        <a href="/terms" className="underline">
          이용약관
        </a>{' '}
        및{' '}
        <a href="/privacy" className="underline">
          개인정보처리방침
        </a>
        에 동의하게 됩니다.
      </p>
    </div>
  )
}
