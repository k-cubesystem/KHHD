import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminLayoutClient } from '@/components/admin/admin-layout-client'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // Middleware에서 이미 체크하지만, Double Check for Safety
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Middleware에서 이미 admin role을 검증하지만, Defense-in-depth로 한 번 더 확인
  // is_admin() SECURITY DEFINER 함수를 사용하여 RLS 재귀 없이 안전하게 확인
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'admin') {
    redirect('/protected')
  }

  const menuItems = [
    // 운영 관리
    { href: '/admin', label: '대시보드', icon: 'LayoutDashboard' },
    { type: 'divider' as const, label: '운영 관리' },
    { href: '/admin/users', label: '회원 관리', icon: 'Users' },
    { href: '/admin/payments', label: '결제 내역', icon: 'CreditCard' },
    { href: '/admin/subscriptions', label: '구독 관리', icon: 'CreditCard' },
    { href: '/admin/membership/plans', label: '멤버십/스토어', icon: 'Package' },
    // AI & 콘텐츠
    { type: 'divider' as const, label: 'AI & 콘텐츠' },
    { href: '/admin/prompts', label: 'AI 프롬프트', icon: 'Sparkles' },
    { href: '/admin/saju-engine', label: '사주 엔진', icon: 'Brain' },
    // 이벤트 & 마케팅
    { type: 'divider' as const, label: '이벤트 & 마케팅' },
    { href: '/admin/roulette', label: '룰렛 확률', icon: 'Sparkles' },
    { href: '/admin/features', label: '기능별 복채', icon: 'Sparkles' },
    { href: '/admin/notifications', label: '알림 자동화', icon: 'Bell' },
    // 시스템
    { type: 'divider' as const, label: '시스템' },
    { href: '/admin/service-control', label: '서비스 제어', icon: 'Power' },
    { href: '/admin/monitoring', label: '모니터링', icon: 'Activity' },
    { href: '/admin/gemini-usage', label: 'Gemini 사용량', icon: 'Activity' },
  ]

  return <AdminLayoutClient menuItems={menuItems}>{children}</AdminLayoutClient>
}
