import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getSubscriptionStatus, getSubscriptionPayments } from '@/app/actions/payment/subscription'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Crown,
  Calendar,
  CreditCard,
  Clock,
  History,
  Gift,
  AlertTriangle,
  Coins,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { SubscriptionActions } from '@/components/membership/subscription-actions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PaymentWidget } from '@/components/payment/payment-widget'

export const metadata: Metadata = {
  title: '멤버십 관리',
  description: '멤버십 구독 상태를 확인하고 관리하세요.',
}

export default async function MembershipManagePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/auth/login')
  }

  return (
    <div className="min-h-screen py-12 px-4 md:px-6 bg-zen-bg animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-zen-text">
            멤버십 & 부적 결제
          </h1>
          <p className="text-zen-muted font-sans text-sm md:text-base max-w-2xl mx-auto">
            매달 전해지는 천기를 무제한으로 누리는 멤버십과
            <br className="hidden md:block" />
            필요할 때마다 정성을 담아 사용하는 부적 패키지 중 선택해 주세요.
          </p>
        </div>

        {/* Features Highlights (from previous Store tab) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-white border border-zen-border rounded-sm space-y-2 text-center shadow-sm">
            <div className="w-8 h-8 bg-zen-bg flex items-center justify-center rounded-sm mx-auto">
              <ShieldCheck className="w-4 h-4 text-zen-gold" />
            </div>
            <h4 className="font-serif font-bold text-sm text-zen-text">안전한 결제</h4>
          </div>
          <div className="p-4 bg-white border border-zen-border rounded-sm space-y-2 text-center shadow-sm">
            <div className="w-8 h-8 bg-zen-bg flex items-center justify-center rounded-sm mx-auto">
              <Sparkles className="w-4 h-4 text-zen-gold" />
            </div>
            <h4 className="font-serif font-bold text-sm text-zen-text">영구 소장</h4>
          </div>
          <div className="p-4 bg-white border border-zen-border rounded-sm space-y-2 text-center shadow-sm">
            <div className="w-8 h-8 bg-zen-bg flex items-center justify-center rounded-sm mx-auto">
              <Zap className="w-4 h-4 text-zen-gold" />
            </div>
            <h4 className="font-serif font-bold text-sm text-zen-text">즉시 반영</h4>
          </div>
        </div>

        {/* Payment Widget Container */}
        <div className="bg-white border border-zen-border shadow-xl rounded-sm p-4 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zen-gold/20 via-zen-gold to-zen-gold/20" />
          <PaymentWidget memberId={user.id} />
        </div>

        {/* Back Link */}
        <div className="text-center pt-8">
          <Link href="/protected" className="text-zen-muted hover:text-zen-wood transition-colors">
            ← 대시보드로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}
