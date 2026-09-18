'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { UserRole } from '@/types/auth'
import { revalidatePath, unstable_noStore } from 'next/cache'
import { logger } from '@/lib/utils/logger'
import { logAdminAction } from '@/lib/admin/audit'
import { requireAdmin } from '@/lib/admin/require-admin'
import { adjustPassesAsAdmin } from '@/lib/admin/pass-adjust'
import { getPassLedger, getPassSummary } from '@/lib/services/entitlement'
import { grantMembershipDeity } from '@/lib/services/membership-deity'

export interface AdminUser {
  id: string
  email: string | null
  full_name: string | null
  role: UserRole
  created_at: string
  last_sign_in_at?: string
}

export async function getUsers(
  page: number = 1,
  limit: number = 20,
  search: string = ''
): Promise<{ data: AdminUser[]; total: number }> {
  // 캐시 비활성화 — 신규 가입자가 항상 최신 데이터로 표시되도록
  unstable_noStore()

  try {
    // 🔴 회원 전원의 이메일을 돌려주는 공개 엔드포인트다 — 로그인만으로 부를 수 있으면 안 된다.
    const adminCheck = await requireAdmin()
    if (!adminCheck.authorized) {
      logger.warn('getUsers: 관리자 아님', adminCheck.error)
      return { data: [], total: 0 }
    }

    const adminClient = createAdminClient()

    // 2. auth.users를 1차 소스로 사용 (신규 가입자 누락 방지)
    //    profiles trigger 실패 여부와 무관하게 모든 회원 조회 가능
    const { data: authData, error: authErr } = await adminClient.auth.admin.listUsers({
      perPage: 1000,
    })

    if (authErr || !authData) {
      logger.error('[getUsers] auth.admin.listUsers 실패:', authErr)
      return { data: [], total: 0 }
    }

    // 3. profiles 테이블에서 보조 데이터 조회 (full_name, role)
    const { data: profiles } = await adminClient.from('profiles').select('id, full_name, role, email')

    const profileMap: Record<string, { full_name: string | null; role: UserRole; email: string | null }> = {}
    for (const p of profiles ?? []) {
      profileMap[p.id] = { full_name: p.full_name, role: p.role ?? 'user', email: p.email }
    }

    // 4. 병합 후 검색 필터 적용
    let merged: AdminUser[] = authData.users.map((u) => ({
      id: u.id,
      email: profileMap[u.id]?.email || u.email || null,
      full_name: profileMap[u.id]?.full_name || null,
      role: (profileMap[u.id]?.role as UserRole) || 'user',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? undefined,
    }))

    if (search) {
      const s = search.toLowerCase()
      merged = merged.filter((u) => u.email?.toLowerCase().includes(s) || u.full_name?.toLowerCase().includes(s))
    }

    // 5. 최신 가입순 정렬 후 페이지네이션
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const total = merged.length
    const from = (page - 1) * limit
    const data = merged.slice(from, from + limit)

    logger.log(`[getUsers] auth 기준 ${authData.users.length}명 중 ${data.length}명 반환 (page ${page})`)

    return { data, total }
  } catch (e) {
    logger.error('getUsers Critical Error:', e)
    return { data: [], total: 0 }
  }
}

export async function updateUserRole(targetUserId: string, newRole: UserRole) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.authorized) return { success: false, error: adminCheck.error }

  const adminClient = createAdminClient()
  // 감사용 전 역할 스냅샷
  const { data: prev } = await adminClient.from('profiles').select('role').eq('id', targetUserId).single()

  const { error } = await adminClient.from('profiles').update({ role: newRole }).eq('id', targetUserId)

  if (error) {
    logger.error('Error updating role:', error)
    return { success: false, error: error.message }
  }

  await logAdminAction({
    actorId: adminCheck.actorId,
    actorEmail: adminCheck.actorEmail,
    action: 'role_change',
    targetUser: targetUserId,
    detail: { before: prev?.role ?? null, after: newRole },
  })

  revalidatePath('/admin/users')
  return { success: true }
}

export async function getUserDetails(userId: string) {
  try {
    // 🔴 남의 결제·이용권·가족 정보를 통째로 돌려준다 — 로그인 확인만으로는 안 된다.
    const adminCheck = await requireAdmin()
    if (!adminCheck.authorized) return { error: 'Forbidden' }

    const adminClient = createAdminClient()

    const [profileRes, sajuRes, familyRes, paymentsRes, subscriptionRes, shrinesRes, passSummary, passLedger] =
      await Promise.all([
        adminClient.from('profiles').select('*').eq('id', userId).single(),
        adminClient.from('saju_records').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        adminClient.from('family_members').select('*').eq('user_id', userId),
        adminClient
          .from('payments')
          .select('id, amount, cancelled_amount, order_id, status, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        // 🔴 billing_key 는 결제를 일으키는 비밀이다 — 화면(브라우저)으로 보내지 않게 열을 골라 읽는다.
        adminClient
          .from('subscriptions')
          .select('status, current_period_end, end_date, membership_plans(tier)')
          .eq('user_id', userId)
          .eq('status', 'ACTIVE')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        // 신당 현황 (본인 + 가족별) — 主神·테마·배치 신물 수
        adminClient
          .from('shrines')
          .select(
            'id, name, family_member_id, visibility, visitor_count, shrine_deities:main_deity_id(name, code), shrine_theme_packs:active_pack_id(name, code)'
          )
          .eq('user_id', userId),
        // 이용권 — 멤버십 몫과 보유분을 따로(합치지 않는다) + 발급·사용 내역(CS 대응)
        getPassSummary(userId),
        getPassLedger(userId, 50),
      ])

    // 신당별 배치 신물 수 (한 번에 집계)
    const shrineRows = shrinesRes.data ?? []
    const placementCounts: Record<string, number> = {}
    if (shrineRows.length > 0) {
      const { data: placements } = await adminClient
        .from('shrine_placements')
        .select('shrine_id')
        .in(
          'shrine_id',
          shrineRows.map((s) => s.id)
        )
      for (const p of placements ?? []) {
        placementCounts[p.shrine_id] = (placementCounts[p.shrine_id] ?? 0) + 1
      }
    }

    const familyNameById: Record<string, string> = {}
    for (const f of familyRes.data ?? []) familyNameById[f.id] = f.name

    // 3. Fetch auth user for email and real created_at (가입일)
    const profile = profileRes.data
    let authCreatedAt: string | null = null
    try {
      const {
        data: { user: targetUser },
      } = await adminClient.auth.admin.getUserById(userId)
      if (targetUser) {
        if (profile && !profile.email) profile.email = targetUser.email
        authCreatedAt = targetUser.created_at || null
      }
    } catch (e) {
      logger.warn('getUserDetails: Failed to fetch auth user', e)
    }

    interface SubscriptionJoinRow {
      current_period_end: string | null
      end_date: string | null
      membership_plans: { tier: string } | { tier: string }[] | null
    }
    const subRow = subscriptionRes.data as unknown as SubscriptionJoinRow | null
    const subPlan = Array.isArray(subRow?.membership_plans) ? subRow.membership_plans[0] : subRow?.membership_plans
    const subscription = subRow
      ? {
          current_period_end: subRow.current_period_end,
          end_date: subRow.end_date,
          membership_plans: subPlan ? { tier: subPlan.tier } : undefined,
        }
      : null

    interface ShrineJoinRow {
      id: string
      name: string
      family_member_id: string | null
      visibility: string
      visitor_count: number
      shrine_deities: { name: string; code: string } | null
      shrine_theme_packs: { name: string; code: string } | null
    }

    const shrines = (shrineRows as unknown as ShrineJoinRow[]).map((s) => ({
      id: s.id,
      name: s.name,
      targetName: s.family_member_id ? (familyNameById[s.family_member_id] ?? '삭제된 가족') : '본인',
      isFamily: s.family_member_id !== null,
      deityName: s.shrine_deities?.name ?? null,
      themeName: s.shrine_theme_packs?.name ?? null,
      visibility: s.visibility,
      visitorCount: s.visitor_count,
      placedItems: placementCounts[s.id] ?? 0,
    }))

    return {
      profile: profile,
      sajuRecords: sajuRes.data || [],
      familyMembers: familyRes.data || [],
      payments: paymentsRes.data || [],
      subscription,
      passSummary,
      passLedger,
      shrines,
      authCreatedAt,
      error: null,
    }
  } catch (e) {
    logger.error('getUserDetails Error:', e)
    return { error: 'Failed to fetch user details' }
  }
}

export async function deleteUser(userId: string) {
  try {
    const adminCheck = await requireAdmin()
    if (!adminCheck.authorized) return { success: false, error: adminCheck.error }

    // 2. Prevent self-deletion
    if (adminCheck.actorId === userId) {
      return { success: false, error: '본인 계정은 삭제할 수 없습니다.' }
    }

    const adminClient = createAdminClient()

    // 약관 제12조 2호 — 구매한 이용권 미사용분과 이용 중인 정기결제 멤버십은 «환불한 뒤» 탈퇴를 처리한다.
    // 기한이 지난 미사용분도 환불 청구 대상이다(상사소멸시효 5년) — 만료 여부로 거르지 않는다.
    const [{ data: purchasedGrants, error: grantsError }, { data: paidSubs, error: subsError }] = await Promise.all([
      adminClient
        .from('entitlement_grants')
        .select('quantity, consumed, revoked')
        .eq('user_id', userId)
        .eq('source', 'purchase'),
      adminClient
        .from('subscriptions')
        .select('id, current_period_end')
        .eq('user_id', userId)
        .in('status', ['ACTIVE', 'CANCELLED'])
        .not('billing_key', 'is', null),
    ])
    if (grantsError || subsError) {
      logger.error('[deleteUser] 환불 선행 확인 실패', { userId, grantsError, subsError })
      return { success: false, error: '환불 대상 확인에 실패해 삭제하지 않았습니다. 잠시 후 다시 시도해 주세요.' }
    }
    const unusedPurchased = (purchasedGrants ?? []).reduce(
      (n, g) => n + Math.max(0, g.quantity - g.consumed - g.revoked),
      0
    )
    const nowMs = Date.now()
    const livePaidSub = (paidSubs ?? []).some(
      (s) => !s.current_period_end || new Date(s.current_period_end).getTime() > nowMs
    )
    if (unusedPurchased > 0 || livePaidSub) {
      const parts = [
        unusedPurchased > 0 ? `구매한 이용권 미사용 ${unusedPurchased}장` : null,
        livePaidSub ? '이용 중인 정기결제 멤버십' : null,
      ].filter(Boolean)
      return {
        success: false,
        error: `${parts.join('·')}이 남아 있어 삭제할 수 없습니다. 결제 취소(환불)를 먼저 처리해 주세요.`,
      }
    }

    // 감사: 삭제 전 대상 스냅샷 (감사 로그는 FK 없어 삭제 후에도 보존)
    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('email, full_name, role')
      .eq('id', userId)
      .maybeSingle()
    await logAdminAction({
      actorId: adminCheck.actorId,
      actorEmail: adminCheck.actorEmail,
      action: 'user_delete',
      targetUser: userId,
      detail: {
        email: targetProfile?.email ?? null,
        fullName: targetProfile?.full_name ?? null,
        role: targetProfile?.role ?? null,
      },
    })

    // 3. Delete related data first to avoid FK constraint issues
    await adminClient.from('wallet_transactions').delete().eq('user_id', userId)
    await adminClient.from('wallets').delete().eq('user_id', userId)
    await adminClient.from('attendance_logs').delete().eq('user_id', userId)
    // roulette_* 는 폐지된 기능의 잔존 테이블(0행). 테이블은 남아 있으므로 정리 대상에 유지.
    await adminClient.from('roulette_history').delete().eq('user_id', userId)
    await adminClient.from('analysis_history').delete().eq('user_id', userId)
    await adminClient.from('family_members').delete().eq('user_id', userId)
    await adminClient.from('subscriptions').delete().eq('user_id', userId)
    await adminClient.from('payments').delete().eq('user_id', userId)
    await adminClient.from('profiles').delete().eq('id', userId)

    // 4. Delete from Auth (Hard Delete)
    const { error } = await adminClient.auth.admin.deleteUser(userId)
    if (error) throw error

    revalidatePath('/admin/users')
    return { success: true }
  } catch (e: unknown) {
    logger.error('deleteUser Error:', e)
    return { success: false, error: e instanceof Error ? e.message : 'Failed to delete user' }
  }
}

/**
 * 회원 이용권 조정 — 양수 = 발급(유효기간, 기본 90일), 음수 = 회수. 사유 필수, 감사에 전·후가 남는다.
 * `requestKey` 는 화면이 조정 폼을 열 때 한 번 만든다 — 같은 키로는 한 번만 발급된다.
 */
export async function adjustUserPasses(
  targetUserId: string,
  delta: number,
  reason: string,
  validDays: number | null,
  requestKey: string
) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.authorized) return { success: false as const, error: adminCheck.error }

  const result = await adjustPassesAsAdmin({
    actor: adminCheck,
    targetUserId,
    delta,
    reason,
    validDays,
    requestKey,
    via: 'user_detail',
  })
  if (result.success) revalidatePath(`/admin/users/${targetUserId}`)
  return result
}

/** 관리자가 여는 멤버십 기간(일) — 결제 없이 한 번 연다. 자동 갱신은 없다. */
const ADMIN_GRANT_DAYS = 30

export async function updateUserSubscription(targetUserId: string, planTier: string | null) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.authorized) return { success: false, error: adminCheck.error }

  const adminClient = createAdminClient()

  // 1. Get Plan ID if not null
  let planId = null
  if (planTier) {
    const { data: plan } = await adminClient.from('membership_plans').select('id').eq('tier', planTier).single()

    if (!plan) return { success: false, error: 'Plan not found' }
    planId = plan.id
  }

  // 🔴 정기결제 중인 구독을 여기서 덮거나 끄면 청구가 조용히 멈춘다 — 결제 구독은 구독 관리 화면에서 다룬다.
  const { data: liveRows, error: liveError } = await adminClient
    .from('subscriptions')
    .select('id, billing_key')
    .eq('user_id', targetUserId)
    .eq('status', 'ACTIVE')
  if (liveError) return { success: false, error: liveError.message }
  const live = (liveRows ?? []) as Array<{ id: string; billing_key: string | null }>
  if (live.some((row) => row.billing_key)) {
    return { success: false, error: '정기결제 중인 구독이 있어요. 구독 관리에서 먼저 처리하세요.' }
  }

  if (live.length > 0) {
    const { error: expireError } = await adminClient
      .from('subscriptions')
      .update({ status: 'EXPIRED', current_period_end: new Date().toISOString() })
      .in(
        'id',
        live.map((row) => row.id)
      )
    if (expireError) return { success: false, error: expireError.message }
  }

  if (planId) {
    // 🔴 subscriptions 에는 user_id 유니크가 없고 customer_key 가 NOT NULL 이라, 예전 upsert(onConflict: user_id)는
    //    매번 실패했다(관리자 부여 0건). 새 행으로 연다 — 월 이용권 창은 current_period_start 에 앵커된다.
    const now = new Date()
    const end = new Date(now.getTime() + ADMIN_GRANT_DAYS * 86_400_000)
    const { error } = await adminClient.from('subscriptions').insert({
      user_id: targetUserId,
      plan_id: planId,
      status: 'ACTIVE',
      customer_key: `admin-${targetUserId}`,
      current_period_start: now.toISOString(),
      current_period_end: end.toISOString(),
      start_date: now.toISOString(),
      end_date: end.toISOString(),
      payment_status: 'PAID',
    })
    if (error) return { success: false, error: error.message }
  }

  // Update Profile is_subscribed flag for easier frontend check
  await adminClient.from('profiles').update({ is_subscribed: !!planId }).eq('id', targetUserId)

  // 어드민이 등급을 부여한 경우도 무료신 증정 대상 (멱등)
  if (planTier) await grantMembershipDeity(targetUserId, planTier)

  await logAdminAction({
    actorId: adminCheck.actorId,
    actorEmail: adminCheck.actorEmail,
    action: 'subscription_change',
    targetUser: targetUserId,
    detail: { tier: planTier ?? 'FREE' },
  })

  revalidatePath(`/admin/users/${targetUserId}`)
  return { success: true }
}
