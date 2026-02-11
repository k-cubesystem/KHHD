"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const ATTENDANCE_REWARDS = {
  base: 50,
  consecutive_bonus: {
    3: 100,  // 3일 연속 시 +100
    7: 500,  // 7일 연속 시 +500
    30: 2000 // 30일 연속 시 +2000
  }
};

export async function checkDailyAttendance() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "로그인이 필요합니다.", checked: false, consecutiveDays: 0 };
    }

    const today = new Date().toISOString().split('T')[0];

    // 오늘 출석 여부 확인
    const { data: todayRecord } = await supabase
      .from('daily_attendance')
      .select('*')
      .eq('user_id', user.id)
      .eq('checked_at', today)
      .single();

    if (todayRecord) {
      return {
        success: true,
        checked: true,
        consecutiveDays: todayRecord.consecutive_days
      };
    }

    // 어제 출석 여부로 연속 일수 계산
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const { data: yesterdayRecord } = await supabase
      .from('daily_attendance')
      .select('consecutive_days')
      .eq('user_id', user.id)
      .eq('checked_at', yesterdayStr)
      .single();

    const consecutiveDays = yesterdayRecord ? yesterdayRecord.consecutive_days : 0;

    return {
      success: true,
      checked: false,
      consecutiveDays
    };
  } catch (error: any) {
    console.error('checkDailyAttendance error:', error);
    return {
      success: false,
      error: error.message || "출석 확인 중 오류가 발생했습니다.",
      checked: false,
      consecutiveDays: 0
    };
  }
}

export async function recordDailyAttendance() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "로그인이 필요합니다." };
    }

    const today = new Date().toISOString().split('T')[0];

    // 중복 체크
    const { data: existing } = await supabase
      .from('daily_attendance')
      .select('*')
      .eq('user_id', user.id)
      .eq('checked_at', today)
      .single();

    if (existing) {
      return { success: false, error: "이미 출석하셨습니다." };
    }

    // 연속 일수 계산
    const checkResult = await checkDailyAttendance();
    if (!checkResult.success) {
      return { success: false, error: checkResult.error };
    }

    const newConsecutiveDays = checkResult.consecutiveDays + 1;

    // 보상 계산
    let reward = ATTENDANCE_REWARDS.base;
    if (ATTENDANCE_REWARDS.consecutive_bonus[newConsecutiveDays as keyof typeof ATTENDANCE_REWARDS.consecutive_bonus]) {
      reward += ATTENDANCE_REWARDS.consecutive_bonus[newConsecutiveDays as keyof typeof ATTENDANCE_REWARDS.consecutive_bonus];
    }

    // DB 기록
    const { error: insertError } = await supabase
      .from('daily_attendance')
      .insert({
        user_id: user.id,
        checked_at: today,
        consecutive_days: newConsecutiveDays,
        reward_talisman: reward
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      return { success: false, error: insertError.message };
    }

    // 부적 지급 (wallet에 추가)
    // wallet 테이블이 있다고 가정하고 업데이트
    const { error: walletError } = await supabase.rpc('add_talisman', {
      p_user_id: user.id,
      p_amount: reward,
      p_reason: `일일 출석 보상 (${newConsecutiveDays}일 연속)`
    });

    if (walletError) {
      console.error('Wallet error:', walletError);
      // 출석은 기록되었으므로 계속 진행
    }

    return {
      success: true,
      reward,
      consecutiveDays: newConsecutiveDays
    };
  } catch (error: any) {
    console.error('recordDailyAttendance error:', error);
    return {
      success: false,
      error: error.message || "출석 체크 중 오류가 발생했습니다."
    };
  }
}
