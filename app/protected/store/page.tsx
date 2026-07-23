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
import { StoreFunnelTracker } from '@/components/store/StoreFunnelTracker'
import { VoucherShop } from '@/components/store/voucher-shop'
import { getMyVouchers } from '@/app/actions/payment/vouchers'
import { getCurrentUserMembership } from '@/lib/auth/subscription'
import { getTranslations } from 'next-intl/server'
import { ChevronLeft, Coins, Crown, Palette, Flame, Ticket, ArrowRight } from 'lucide-react'

const TAB_KEYS = ['bokchae', 'membership', 'voucher', 'theme', 'items'] as const
type TabKey = (typeof TAB_KEYS)[number]

/** 라벨은 messages/{locale}.json 의 store.tab* 에서 온다 */
const TABS: Array<{ key: TabKey; labelKey: string; icon: typeof Coins }> = [
  { key: 'bokchae', labelKey: 'tabBokchae', icon: Coins },
  { key: 'membership', labelKey: 'tabMembership', icon: Crown },
  { key: 'voucher', labelKey: 'tabVoucher', icon: Ticket },
  { key: 'theme', labelKey: 'tabTheme', icon: Palette },
  { key: 'items', labelKey: 'tabItems', icon: Flame },
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

  const [balance, t] = await Promise.all([getWalletBalance(), getTranslations('store')])

  return (
    <div className="min-h-screen w-full max-w-[480px] mx-auto px-3 py-6 pb-24">
      <StoreFunnelTracker tab={tab} />
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/protected/profile"
          className="inline-flex items-center gap-1 text-[12px] text-ink-light/50 hover:text-gold-300 font-serif"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('backToLibrary')}
        </Link>
        <span className="text-xs text-ink-light/45 font-sans">
          {t('balance')} <span className="text-gold-500 font-bold tabular-nums">{balance.toLocaleString()}</span>
          {t('balanceUnit')}
        </span>
      </div>

      <header className="text-center space-y-1.5 mb-5">
        <p className="text-[10px] tracking-[0.5em] text-gold-500/50 font-serif">{t('eyebrow')}</p>
        <h1 className="text-2xl font-serif font-bold text-ink-light">{t('title')}</h1>
        <p className="text-sm text-ink-light/50 font-sans">{t('subtitle')}</p>
      </header>

      {/* 탭 바 */}
      <nav className="grid grid-cols-5 gap-1.5 mb-6" aria-label={t('tabsAria')}>
        {TABS.map(({ key, labelKey, icon: Icon }) => {
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
              {t(labelKey)}
            </Link>
          )
        })}
      </nav>

      {tab === 'bokchae' && <BokchaeTab userId={user.id} />}
      {tab === 'membership' && <MembershipTab />}
      {tab === 'voucher' && <VoucherTab />}
      {tab === 'theme' && <ThemeTab />}
      {tab === 'items' && <ItemsTab />}
    </div>
  )
}

async function VoucherTab() {
  const [vouchers, membership] = await Promise.all([getMyVouchers(), getCurrentUserMembership()])
  return <VoucherShop initialVouchers={vouchers} isMember={membership !== null} />
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
  const [plans, sub, t] = await Promise.all([getMembershipPlans(), getSubscriptionStatus(), getTranslations('store')])
  const sorted = plans.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

  if (sub.isSubscribed && sub.subscription) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-gold-500/30 bg-gold-500/[0.06] p-6 text-center space-y-3">
          <Crown className="w-8 h-8 text-gold-400 mx-auto" strokeWidth={1} />
          <p className="font-serif text-lg text-ink-light">
            {t('membershipActive', { plan: sub.plan?.name ?? t('tabMembership') })}
          </p>
          <p className="text-xs text-ink-light/50">{t('membershipManageHint')}</p>
          <Link
            href="/protected/membership/manage?tab=subscription"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-gold-500/15 border border-gold-500/40 text-gold-300 text-sm font-serif"
          >
            {t('membershipManageCta')} <ArrowRight className="w-3.5 h-3.5" />
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
  const [data, t] = await Promise.all([getShopData(), getTranslations('store')])
  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-light/40 font-sans">{t('itemsHint')}</p>
      <ShrineShopClient data={data} />
    </div>
  )
}
