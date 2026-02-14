"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * 오늘 출석 체크 가능 여부 확인
 */
export async function checkAttendanceAvailability() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "로그인이 필요합니다.", canCheckIn: false };
  }

  const today = new Date().toISOString().split("T")[0];

  const { data: todayRecord } = await supabase
    .from("attendance_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("checked_date", today)
    .single();

  if (todayRecord) {
    return { success: true, canCheckIn: false, alreadyChecked: true };
  }

  return { success: true, canCheckIn: true, alreadyChecked: false };
}

/**
 * 출석 체크 실행
 * - 매일 1 복채 지급
 * - 주 7일 완료 시 마지막날 +3 복채 보너스 (주당 총 10 복채)
 */
export async function checkInAttendance() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  // 이미 체크인했는지 확인
  const avail = await checkAttendanceAvailability();
  if (!avail.canCheckIn) {
    return { success: false, error: "오늘은 이미 출석 체크를 완료했습니다." };
  }

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // 이번 주 월요일 계산 (ISO 주)
  const dayOfWeek = today.getDay(); // 0=일, 1=월, ..., 6=토
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - daysFromMonday);
  const weekStartStr = weekStart.toISOString().split("T")[0];

  // 이번 주 출석 횟수 확인
  const { data: weekRecords } = await supabase
    .from("attendance_logs")
    .select("checked_date")
    .eq("user_id", user.id)
    .eq("week_start", weekStartStr);

  const weekCount = weekRecords?.length || 0;
  const isLastDayOfWeek = weekCount === 6; // 이번이 7번째(마지막)
  const baseReward = 1;
  const weeklyBonus = isLastDayOfWeek ? 3 : 0;
  const totalReward = baseReward + weeklyBonus;

  // 출석 기록 저장
  const { error: insertError } = await supabase
    .from("attendance_logs")
    .insert({
      user_id: user.id,
      checked_date: todayStr,
      week_start: weekStartStr,
      bokchae_awarded: totalReward,
      is_weekly_bonus: isLastDayOfWeek,
    });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  // 복채 지급
  const { error: walletError } = await supabase.rpc("add_bokchae", {
    p_user_id: user.id,
    p_amount: totalReward,
    p_reason: isLastDayOfWeek
      ? `출석 체크 (${totalReward}만냥 = 기본 1 + 주간 보너스 3)`
      : `출석 체크 (${totalReward}만냥)`,
  });

  if (walletError) {
    // 복채 함수 없을 경우 직접 처리
    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    const currentBalance = wallet?.balance || 0;
    await supabase
      .from("wallets")
      .upsert({ user_id: user.id, balance: currentBalance + totalReward });

    await supabase.from("wallet_transactions").insert({
      user_id: user.id,
      amount: totalReward,
      type: "BONUS",
      description: isLastDayOfWeek
        ? `출석 체크 (${totalReward}만냥 = 기본 1 + 주간 보너스 3)`
        : `출석 체크 (${totalReward}만냥)`,
    });
  }

  return {
    success: true,
    reward: totalReward,
    isWeeklyBonus: isLastDayOfWeek,
    weeklyBonusAmount: weeklyBonus,
    weekCount: weekCount + 1,
    message: isLastDayOfWeek
      ? `주간 출석 완료! 복채 ${totalReward}만냥 (보너스 포함) 지급!`
      : `출석 체크 완료! 복채 ${totalReward}만냥 지급!`,
  };
}

/**
 * 이번 주 출석 현황 조회
 */
export async function getWeeklyAttendance() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, records: [], weekDays: [] as Array<{ date: string; dayLabel: string; checked: boolean; isToday: boolean; isFuture: boolean }>, weekCount: 0, totalBokchae: 0 };

  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - daysFromMonday);
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const { data: records } = await supabase
    .from("attendance_logs")
    .select("checked_date, bokchae_awarded, is_weekly_bonus")
    .eq("user_id", user.id)
    .eq("week_start", weekStartStr)
    .order("checked_date", { ascending: true });

  const todayStr = today.toISOString().split("T")[0];
  const checkedDates = new Set(records?.map((r) => r.checked_date) || []);

  // 이번 주 7일 배열 생성 (월~일)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    return {
      date: dateStr,
      dayLabel: ["월", "화", "수", "목", "금", "토", "일"][i],
      checked: checkedDates.has(dateStr),
      isToday: dateStr === todayStr,
      isFuture: dateStr > todayStr,
    };
  });

  return {
    success: true,
    records: records || [],
    weekDays,
    weekCount: records?.length || 0,
    totalBokchae: records?.reduce((sum, r) => sum + r.bokchae_awarded, 0) || 0,
  };
}
