/**
 * DB 마이그레이션 테스트 스크립트
 * Phase 2-4: Destiny Targets, Storage, Analysis History 확인
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// .env.local 로드
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ 환경 변수가 설정되지 않았습니다.");
  console.error("NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "✓" : "✗");
  console.error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:", supabaseKey ? "✓" : "✗");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMigrations() {
  console.log("🧪 DB 마이그레이션 테스트 시작\n");

  // 1. v_destiny_targets 뷰 확인
  console.log("1️⃣ v_destiny_targets 뷰 확인...");
  try {
    const { data, error } = await supabase
      .from("v_destiny_targets")
      .select("*")
      .limit(1);

    if (error) {
      console.error("❌ v_destiny_targets 뷰가 존재하지 않거나 권한이 없습니다:", error.message);
    } else {
      console.log("✅ v_destiny_targets 뷰 정상 작동");
      console.log("   샘플 데이터:", data?.length || 0, "개");
    }
  } catch (e) {
    console.error("❌ 테스트 실패:", e);
  }

  // 2. destiny-images 버킷 확인
  console.log("\n2️⃣ destiny-images 스토리지 버킷 확인...");
  try {
    const { data, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error("❌ 스토리지 버킷 조회 실패:", error.message);
    } else {
      const destinyBucket = data?.find((b) => b.name === "destiny-images");
      if (destinyBucket) {
        console.log("✅ destiny-images 버킷 존재 확인");
        console.log("   Public:", destinyBucket.public);
      } else {
        console.error("❌ destiny-images 버킷이 존재하지 않습니다");
      }
    }
  } catch (e) {
    console.error("❌ 테스트 실패:", e);
  }

  // 3. analysis_history 테이블 확인
  console.log("\n3️⃣ analysis_history 테이블 확인...");
  try {
    const { data, error } = await supabase
      .from("analysis_history")
      .select("*")
      .limit(1);

    if (error) {
      console.error("❌ analysis_history 테이블이 존재하지 않거나 권한이 없습니다:", error.message);
    } else {
      console.log("✅ analysis_history 테이블 정상 작동");
      console.log("   샘플 데이터:", data?.length || 0, "개");
    }
  } catch (e) {
    console.error("❌ 테스트 실패:", e);
  }

  // 4. RPC 함수 확인
  console.log("\n4️⃣ get_user_destiny_targets() 함수 확인...");
  try {
    // 임시 UUID로 테스트 (실제 사용자가 아니어도 함수 존재 여부 확인 가능)
    const testUserId = "00000000-0000-0000-0000-000000000000";
    const { data, error } = await supabase.rpc("get_user_destiny_targets", {
      user_id_param: testUserId,
    });

    if (error && error.message.includes("does not exist")) {
      console.error("❌ get_user_destiny_targets() 함수가 존재하지 않습니다");
    } else {
      console.log("✅ get_user_destiny_targets() 함수 정상 작동");
    }
  } catch (e) {
    console.error("❌ 테스트 실패:", e);
  }

  console.log("\n✨ 테스트 완료\n");
}

testMigrations();
