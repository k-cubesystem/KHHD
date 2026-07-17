import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getMembershipPlans, getSubscriptionStatus } from '@/app/actions/payment/subscription'
import { getActivePlans, getCurrentUserRole } from '@/app/actions/payment/products'
import { hasChargedBefore } from '@/app/actions/payment/payment'
import { getWalletBalance } from '@/app/actions/payment/wallet'
import { getShopData } from '@/app/actions/shrine/inventory'
import { listThemePacks } from '@/app/actions/shrine/deities'
import { MembershipTabs } from '@/components/membership/membership-tabs'
import { TalismanPurchaseSection } from '@/components/membership/talisman-purchase-section'
import { ShrineShopClient } from '@/components/shrine/ShrineShopClient'
import { ThemeShopGrid } from '@/components/store/ThemeShopGrid'
import { ChevronLeft, Coins, Crown, Palette, Flame, ArrowRight } from 'lucide-react'

const TAB_KEYS = ['bokchae', 'membership', 'theme', 'items'] as const
type TabKey = (typeof TAB_KEYS)[number]

const TABS: Array<{ key: TabKey; label: string; icon: typeof Coins }> = [
  { key: 'bokchae', label: '복채 충전', icon: Coins },
  { key: 'membership', label: '멤버십', icon: Crown },
  { key: 'theme', label: '신당 테마', icon: Palette },
  { key: 'items', label: '신물', icon: Flame },
]

export const dynamic = 'force-dynamic'

/** 통합 상점 — 복채 충전 · 멤버십 · 신당 테마 · 신물을 한 곳에서. */
export default async function StorePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { tab: rawTab } = await searchParams
  const tab: TabKey = TAB_KEYS.includes(rawTab as TabKey) ? (rawTab as TabKey) : 'bokchae'

  const balance = await getWalletBalance()

  return (
    <div className="min-h-screen w-full max-w-[480px] mx-auto px-3 py-6 pb-24">
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/protected/profile"
          className="inline-flex items-center gap-1 text-[12px] text-ink-light/50 hover:text-gold-300 font-serif"
        >
          <ChevronLeft className="w-4 h-4" />내 서재로
        </Link>
        <span className="text-xs text-ink-light/45 font-sans">
          보유 복채 <span className="text-gold-500 font-bold tabular-nums">{balance.toLocaleString()}</span>만냥
        </span>
      </div>

      <header className="text-center space-y-1.5 mb-5">
        <p className="text-[10px] tracking-[0.5em] text-gold-500/50 font-serif">奉 獻 所</p>
        <h1 className="text-2xl font-serif font-bold text-ink-light">상점</h1>
        <p className="text-sm text-ink-light/50 font-sans">복채 충전부터 멤버십·신당 테마·신물까지 한 곳에서</p>
      </header>

      {/* 탭 바 */}
      <nav className="grid grid-cols-4 gap-1.5 mb-6" aria-label="상점 분류">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = key === tab
          return (
            <Link
              key={key}
              href={`/protected/store?tab=${key}`}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[11px] font-serif transition-colors ${
                active
                  ? 'bg-gold-500/[0.12] border-gold-500/50 text-gold-300 font-bold'
                  : 'bg-surface/40 border-white/8 text-ink-light/55'
              }`}
            >
              <Icon className="w-4 h-4" strokeWidth={1.5} />
              {label}
            </Link>
          )
        })}
      </nav>

      {tab === 'bokchae' && <BokchaeTab userId={user.id} />}
      {tab === 'membership' && <MembershipTab />}
      {tab === 'theme' && <ThemeTab />}
      {tab === 'items' && <ItemsTab />}
    </div>
  )
}

async function BokchaeTab({ userId }: { userId: string }) {
  const [talismanPlans, roleData, alreadyCharged] = await Promise.all([
    getActivePlans(),
    getCurrentUserRole(),
    hasChargedBefore(),
  ])
  return (
    <TalismanPurchaseSection
      initialPlans={talismanPlans}
      userRole={roleData.role}
      memberId={userId}
      hasCharged={alreadyCharged}
    />
  )
}

async function MembershipTab() {
  const [plans, sub] = await Promise.all([getMembershipPlans(), getSubscriptionStatus()])
  const sorted = plans.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

  if (sub.isSubscribed && sub.subscription) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-gold-500/30 bg-gold-500/[0.06] p-6 text-center space-y-3">
          <Crown className="w-8 h-8 text-gold-400 mx-auto" strokeWidth={1} />
          <p className="font-serif text-lg text-ink-light">{sub.plan?.name ?? '멤버십'} 이용중</p>
          <p className="text-xs text-ink-light/50">플랜 변경·해지·결제 내역은 멤버십 관리에서</p>
          <Link
            href="/protected/membership/manage?tab=subscription"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gold-500/15 border border-gold-500/40 text-gold-300 text-sm font-serif"
          >
            멤버십 관리 <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <MembershipTabs plans={sorted} isGuest={false} />
      </div>
    )
  }

  return <MembershipTabs plans={sorted} isGuest={false} />
}

async function ThemeTab() {
  const themes = await listThemePacks()
  return <ThemeShopGrid themes={themes} />
}

async function ItemsTab() {
  const data = await getShopData()
  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-light/40 font-sans">신물을 보관함에 담고, 신당 꾸미기에서 배치하세요</p>
      <ShrineShopClient data={data} />
    </div>
  )
}
