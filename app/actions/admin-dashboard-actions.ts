"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// 권한 체크 헬퍼
async function checkAdminPermission() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile?.role === 'admin';
}

// 1. Recent Activity 조회
export async function getRecentActivities(limit: number = 50) {
  if (!await checkAdminPermission()) {
    return { success: false, error: "권한 없음" };
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('get_recent_activities', { p_limit: limit });

  if (error) {
    console.error(error);
    return { success: false, error: error.message };
  }

  return { success: true, activities: data };
}

// 2. UTM 성과 분석
export async function getUTMPerformance(startDate?: Date, endDate?: Date) {
  if (!await checkAdminPermission()) {
    return { success: false, error: "권한 없음" };
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('get_utm_performance', {
    p_start_date: startDate?.toISOString().split('T')[0] || undefined,
    p_end_date: endDate?.toISOString().split('T')[0] || undefined
  });

  if (error) {
    console.error(error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// 3. Funnel 분석
export async function getFunnelAnalysis(startDate?: Date, endDate?: Date) {
  if (!await checkAdminPermission()) {
    return { success: false, error: "권한 없음" };
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('get_funnel_analysis', {
    p_start_date: startDate?.toISOString().split('T')[0] || undefined,
    p_end_date: endDate?.toISOString().split('T')[0] || undefined
  });

  if (error) {
    console.error(error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// 4. 시간대별 트래픽
export async function getHourlyTraffic(hours: number = 24) {
  if (!await checkAdminPermission()) {
    return { success: false, error: "권한 없음" };
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('get_hourly_traffic', { p_hours: hours });

  if (error) {
    console.error(error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// 5. 빠른 액션: 전체 공지 발송
export async function sendGlobalNotification(title: string, message: string) {
  if (!await checkAdminPermission()) {
    return { success: false, error: "권한 없음" };
  }

  const supabase = createAdminClient();

  // 모든 사용자 조회
  const { data: users } = await supabase.from('profiles').select('id');

  if (!users) return { success: false, error: "사용자 조회 실패" };

  // 알림 일괄 삽입 (notifications 테이블이 있다고 가정)
  const notifications = users.map(u => ({
    user_id: u.id,
    title,
    message,
    type: 'admin_announcement',
    is_read: false
  }));

  const { error } = await supabase.from('notifications').insert(notifications);

  if (error) {
    console.error(error);
    return { success: false, error: error.message };
  }

  // 활동 로그 기록
  await supabase.from('activity_logs').insert({
    activity_type: 'admin_action',
    activity_category: 'notification',
    description: `전체 공지 발송: ${title}`,
    metadata: { title, message, recipient_count: users.length }
  });

  return { success: true, count: users.length };
}

// 6. 빠른 액션: 쿠폰 일괄 발급
export async function issueCouponToAll(couponCode: string, talismanAmount: number, expiryDays: number = 30) {
  if (!await checkAdminPermission()) {
    return { success: false, error: "권한 없음" };
  }

  const supabase = createAdminClient();

  const { data: users } = await supabase.from('profiles').select('id');
  if (!users) return { success: false, error: "사용자 조회 실패" };

  // 쿠폰 일괄 생성
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  const coupons = users.map(u => ({
    user_id: u.id,
    code: couponCode,
    talisman_amount: talismanAmount,
    is_used: false,
    expires_at: expiresAt.toISOString()
  }));

  const { error } = await supabase.from('coupons').insert(coupons);

  if (error) {
    console.error(error);
    return { success: false, error: error.message };
  }

  // 활동 로그 기록
  await supabase.from('activity_logs').insert({
    activity_type: 'admin_action',
    activity_category: 'coupon',
    description: `전체 쿠폰 발급: ${couponCode} (부적 ${talismanAmount}장)`,
    metadata: { code: couponCode, amount: talismanAmount, recipient_count: users.length }
  });

  return { success: true, count: users.length };
}

// 7. 빠른 액션: 이벤트 생성
export async function createEvent(eventData: {
  title: string;
  description: string;
  cta_text: string;
  cta_link: string;
  icon?: string;
  priority?: number;
  start_date?: Date;
  end_date?: Date;
}) {
  if (!await checkAdminPermission()) {
    return { success: false, error: "권한 없음" };
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase.from('event_banners').insert({
    title: eventData.title,
    description: eventData.description,
    cta_text: eventData.cta_text,
    cta_link: eventData.cta_link,
    icon: eventData.icon || '🎉',
    priority: eventData.priority || 0,
    is_active: true,
    start_date: eventData.start_date?.toISOString(),
    end_date: eventData.end_date?.toISOString()
  }).select();

  if (error) {
    console.error(error);
    return { success: false, error: error.message };
  }

  // 활동 로그 기록
  await supabase.from('activity_logs').insert({
    activity_type: 'admin_action',
    activity_category: 'event',
    description: `새 이벤트 생성: ${eventData.title}`,
    metadata: { event_id: data?.[0]?.id, title: eventData.title }
  });

  return { success: true, event: data?.[0] };
}
