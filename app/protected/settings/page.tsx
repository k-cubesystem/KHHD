import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsForm } from '@/components/profile/settings-form'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { BrandQuote } from '@/components/ui/BrandQuote'
import { BRAND_QUOTES } from '@/lib/constants/brand-quotes'

export default async function SettingsPage() {
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

  return (
    <>
      <div className="px-1 py-4 flex items-center gap-4 border-b border-primary/10 mb-6">
        <Link
          href="/protected/profile"
          className="p-1 -ml-1 hover:bg-surface/10 transition-colors rounded-full"
        >
          <ArrowLeft className="w-5 h-5 text-ink-light/80" strokeWidth={1} />
        </Link>
        <h1 className="text-lg font-serif font-light text-ink-light">내 정보 수정</h1>
      </div>

      <div className="max-w-lg mx-auto">
        <BrandQuote variant="section" className="text-center mb-6">
          {BRAND_QUOTES.settings.hero}
        </BrandQuote>

        <p className="text-sm text-center text-ink-light/90 mb-8 font-light">
          정확한 사주 분석을 위해 올바른 정보를 입력해주세요.
          <br />
          수정된 정보는 즉시 반영됩니다.
        </p>

        <SettingsForm user={user} profile={profile} familyMember={familyMember} />
      </div>
    </>
  )
}
