'use client'

import { useEffect, useState } from 'react'
import { getWalletBalance } from '@/app/actions/payment/wallet'
import { logger } from '@/lib/utils/logger'
import Link from 'next/link'
import { Loader2, Coins } from 'lucide-react'

export function TalismanBalance() {
  const [balance, setBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBalance()
  }, [])

  const loadBalance = async () => {
    try {
      const bal = await getWalletBalance()
      setBalance(bal)
    } catch (error) {
      logger.error('Failed to load balance:', error)
      setBalance(0)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-zen-bg border border-zen-border">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-zen-gold" />
      </div>
    )
  }

  return (
    <Link href="/protected/membership/manage?tab=store">
      <div className="group relative flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-b from-gold-100 to-gold-300 rounded-full border border-gold-400/50 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300">
        {/* Coin Icon */}
        <div className="w-4 h-4 rounded-full bg-gold-500 flex items-center justify-center border border-gold-300 shadow-inner">
          <Coins className="w-2.5 h-2.5 text-white" />
        </div>
        <span className="font-bold text-ink-900 text-xs tracking-wide">{balance || 0}만냥</span>
        <span className="text-[9px] text-ink-700 font-medium">복채</span>

        {/* Shine Effect */}
        <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      </div>
    </Link>
  )
}
