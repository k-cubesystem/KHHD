import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminLayoutClient } from '@/components/admin/admin-layout-client'
import { LayoutDashboard, Users, CreditCard, Package, Bell, Sparkles } from 'lucide-react'

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
    { href: '/admin', label: '대시보드', icon: 'LayoutDashboard' },
    { href: '/admin/users', label: '회원 관리', icon: 'Users' },
    { href: '/admin/payments', label: '결제 내역', icon: 'CreditCard' },
    { href: '/admin/membership/plans', label: '스토어/복채 관리', icon: 'Package' },
    { href: '/admin/roulette', label: '룰렛 확률 관리', icon: 'Sparkles' },
    { href: '/admin/features', label: '기능별 복채 소모량', icon: 'Sparkles' },
    { href: '/admin/notifications', label: '알림 및 자동화', icon: 'Bell' },
    { href: '/admin/prompts', label: 'AI 프롬프트 관리', icon: 'Sparkles' },
    { href: '/admin/saju-engine', label: '해화지기 사주 엔진', icon: 'Brain' },
    { href: '/admin/service-control', label: '서비스 키/스위치', icon: 'Power' },
    { href: '/admin/monitoring', label: '모니터링', icon: 'Activity' },
  ]

  return <AdminLayoutClient menuItems={menuItems}>{children}</AdminLayoutClient>
}
