'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { XCircle } from 'lucide-react'
import Link from 'next/link'

function FailContent() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message') || '결제가 취소되었거나 오류가 발생했습니다.'
  const code = searchParams.get('code')

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="w-20 h-20 mx-auto bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/30">
          <XCircle className="w-10 h-10 text-red-400" strokeWidth={1} />
        </div>

        <div>
          <h1 className="text-xl font-serif font-light text-white mb-2">결제 실패</h1>
          <p className="text-white/60 text-sm">{message}</p>
          {code && <p className="text-white/30 text-xs mt-1">오류 코드: {code}</p>}
        </div>

        <div className="space-y-3">
          <Button
            asChild
            className="w-full h-12 bg-primary hover:bg-primary/90 text-background font-serif font-bold rounded-lg"
          >
            <Link href="/protected/membership">다시 시도하기</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full h-12 border-primary/20 text-white hover:bg-surface rounded-lg"
          >
            <Link href="/protected">대시보드로 이동</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function MembershipFailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-primary">Loading...</div>}>
      <FailContent />
    </Suspense>
  )
}
