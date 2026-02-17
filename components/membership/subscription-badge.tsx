'use client'

import { useEffect, useState } from 'react'
import { getSubscriptionStatus } from '@/app/actions/payment/subscription'
import Link from 'next/link'
import { Crown, Loader2 } from 'lucide-react'

export function SubscriptionBadge() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSubscriptionStatus()
  }, [])

  const loadSubscriptionStatus = async () => {
    try {
      const { isSubscribed: subscribed } = await getSubscriptionStatus()
      setIsSubscribed(subscribed)
    } catch (error) {
      console.error('Failed to load subscription status:', error)
      setIsSubscribed(false)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return null // 로딩 중에는 표시 안 함
  }

  if (!isSubscribed) {
    // 비구독자: 멤버십 가입 유도 버튼
    return (
      <Link href="/protected/membership">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-zen-gold/10 border border-zen-gold/30 hover:bg-zen-gold/20 cursor-pointer transition-all text-zen-gold text-xs font-bold">
          <Crown className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">멤버십</span>
        </div>
      </Link>
    )
  }

  // 구독자: 멤버십 뱃지
  return (
    <Link href="/protected/membership/manage">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-gradient-to-r from-zen-gold/20 to-amber-100 border border-zen-gold/50 cursor-pointer transition-all shadow-sm hover:shadow-md">
        <Crown className="w-3.5 h-3.5 text-zen-gold" />
        <span className="hidden sm:inline font-serif font-bold text-zen-gold text-xs tracking-wide">
          MEMBER
        </span>
      </div>
    </Link>
  )
}
