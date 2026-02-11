"use server";

import { createClient } from "@/lib/supabase/server";

const ROULETTE_REWARDS = [
  { type: "talisman", value: 50, probability: 40, label: "부적 50장" },
  { type: "talisman", value: 100, probability: 30, label: "부적 100장" },
  { type: "talisman", value: 300, probability: 20, label: "부적 300장" },
  { type: "talisman", value: 1000, probability: 9, label: "부적 1000장" },
  { type: "premium", value: 30, probability: 1, label: "프리미엄 30일" }
];

export async function checkRouletteAvailability() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "로그인이 필요합니다.", canSpin: false };
    }

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const { data: todayRecord } = await supabase
      .from('roulette_history')
      .select('*')
      .eq('user_id', user.id)
      .gte('spun_at', todayStart.toISOString())
      .single();

    if (todayRecord) {
      const nextAvailable = new Date(todayRecord.spun_at);
      nextAvailable.setDate(nextAvailable.getDate() + 1);
      nextAvailable.setHours(0, 0, 0, 0);

      return {
        success: true,
        canSpin: false,
        nextAvailableTime: nextAvailable.toISOString()
      };
    }

    return {
      success: true,
      canSpin: true
    };
  } catch (error: any) {
    console.error('checkRouletteAvailability error:', error);
    return {
      success: false,
      error: error.message || "룰렛 사용 가능 여부 확인 중 오류가 발생했습니다.",
      canSpin: false
    };
  }
}

export async function spinRoulette() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "로그인이 필요합니다." };
    }

    // 사용 가능 여부 확인
    const availCheck = await checkRouletteAvailability();
    if (!availCheck.canSpin) {
      return { success: false, error: "오늘은 이미 룰렛을 돌렸습니다." };
    }

    // 확률 계산 (서버 사이드)
    const rand = Math.random() * 100;
    let cumulative = 0;
    let selectedReward = ROULETTE_REWARDS[0];

    for (const reward of ROULETTE_REWARDS) {
      cumulative += reward.probability;
      if (rand <= cumulative) {
        selectedReward = reward;
        break;
      }
    }

    // 기록 저장
    const { error: insertError } = await supabase
      .from('roulette_history')
      .insert({
        user_id: user.id,
        reward_type: selectedReward.type,
        reward_value: selectedReward.value
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      return { success: false, error: insertError.message };
    }

    // 보상 지급
    if (selectedReward.type === "talisman") {
      const { error: walletError } = await supabase.rpc('add_talisman', {
        p_user_id: user.id,
        p_amount: selectedReward.value,
        p_reason: "행운의 룰렛 보상"
      });

      if (walletError) {
        console.error('Wallet error:', walletError);
        // 기록은 저장되었으므로 계속 진행
      }
    } else if (selectedReward.type === "premium") {
      // TODO: 프리미엄 멤버십 지급 로직 (PHASE 2에서 구현)
      console.log('Premium reward - to be implemented in PHASE 2');
    }

    const nextAvailable = new Date();
    nextAvailable.setDate(nextAvailable.getDate() + 1);
    nextAvailable.setHours(0, 0, 0, 0);

    return {
      success: true,
      reward: {
        type: selectedReward.type,
        value: selectedReward.value,
        label: selectedReward.label
      },
      nextAvailableTime: nextAvailable.toISOString()
    };
  } catch (error: any) {
    console.error('spinRoulette error:', error);
    return {
      success: false,
      error: error.message || "룰렛 회전 중 오류가 발생했습니다."
    };
  }
}

export async function getRouletteRewards() {
  return {
    success: true,
    rewards: ROULETTE_REWARDS
  };
}
