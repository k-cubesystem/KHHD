'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const BASE_MEMBER_COUNT = 12403
const TICK_MS = 4500

interface LiveMemberCounterProps {
  className?: string
}

/**
 * 라벨을 자체 제공하는 한 줄 소셜 프루프.
 * 초기 state = SSR 값이므로 첫 클라이언트 렌더가 서버 마크업과 동일 → 하이드레이션 불일치 없음.
 * 로케일 고정(ko-KR)으로 서버/브라우저 숫자 포맷 차이도 차단.
 */
export function LiveMemberCounter({ className }: LiveMemberCounterProps) {
  const [count, setCount] = useState(BASE_MEMBER_COUNT)

  useEffect(() => {
    const interval = setInterval(() => setCount((prev) => prev + 1), TICK_MS)
    return () => clearInterval(interval)
  }, [])

  return (
    <p className={cn('flex items-center justify-center gap-1.5 font-sans text-[12px] text-ink-primary/70', className)}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-gold-500" />
      <span>
        지금 <strong className="font-semibold tabular-nums text-gold-400">{count.toLocaleString('ko-KR')}</strong>
        명이 해화당과 함께하고 있습니다
      </span>
    </p>
  )
}
