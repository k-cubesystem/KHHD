import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { SettingsForm } from '@/components/profile/settings-form'
import { NotificationSettingsForm } from '@/components/profile/notification-settings-form'
import { ArrowLeft, Bell } from 'lucide-react'
import Link from 'next/link'
import { BrandQuote } from '@/components/ui/BrandQuote'
import { BRAND_QUOTES } from '@/lib/constants/brand-quotes'
import type { NotificationPreferences } from '@/app/actions/core/notification'
import { getTranslations } from 'next-intl/server'

export default async function SettingsPage() {
  const t = await getTranslations('settings')
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/auth/login')
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  // Fetch Saju data from family_members
  const { data: familyMember } = await supabase
    .from('family_members')
    .select('*')
    .eq('user_id', user.id)
    .eq('relationship', '본인')
    .maybeSingle()

  // 알림 설정 조회 (admin client - RLS 우회)
  const adminClient = createAdminClient()
  const { data: notificationPrefs } = await adminClient
    .from('notification_preferences')
    .select('phone_number, alimtalk_enabled, daily_fortune_enabled, attendance_reward_enabled, payment_enabled')
    .eq('user_id', user.id)
    .maybeSingle()

  const initialNotificationPrefs: NotificationPreferences = notificationPrefs ?? {
    phone_number: null,
    alimtalk_enabled: false,
    daily_fortune_enabled: false,
    attendance_reward_enabled: false,
    payment_enabled: false,
  }

  return (
    <>
      <div className="px-1 py-4 flex items-center gap-4 border-b border-primary/10 mb-6">
        <Link href="/protected/profile" className="p-1 -ml-1 hover:bg-surface/10 transition-colors rounded-full">
          <ArrowLeft className="w-5 h-5 text-ink-light/80" strokeWidth={1} />
        </Link>
        <h1 className="text-lg font-serif font-light text-ink-light">{t('title')}</h1>
      </div>

      <div className="max-w-lg mx-auto">
        <BrandQuote variant="section" className="text-center mb-6">
          {BRAND_QUOTES.settings.hero}
        </BrandQuote>

        <p className="text-sm text-center text-ink-light/90 mb-8 font-light">
          {t('description')}
          <br />
          수정된 정보는 즉시 반영됩니다.
        </p>

        <SettingsForm user={user} profile={profile} familyMember={familyMember} />

        {/* 알림 설정 섹션 구분선 */}
        <div className="my-10 flex items-center gap-3">
          <div className="flex-1 h-px bg-primary/15" />
          <div className="flex items-center gap-2 text-primary/60">
            <Bell className="w-3.5 h-3.5" strokeWidth={1} />
            <span className="text-xs font-light font-serif">{t('notifications')}</span>
          </div>
          <div className="flex-1 h-px bg-primary/15" />
        </div>

        {/* 카카오 알림톡 설정 */}
        <NotificationSettingsForm initialPrefs={initialNotificationPrefs} />
      </div>
    </>
  )
}
