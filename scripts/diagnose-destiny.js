/**
 * Destiny Targets 자동 진단 스크립트
 * 터미널에서 실행: node scripts/diagnose-destiny.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnose() {
  console.log('🔍 Destiny Targets 진단 시작...\n');

  // 1. Profiles 확인
  console.log('1️⃣ Profiles 테이블 확인:');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .limit(5);

  if (profilesError) {
    console.error('❌ 에러:', profilesError.message);
  } else {
    console.log(`✅ ${profiles.length}개 프로필 발견`);
    profiles.forEach(p => console.log(`   - ${p.full_name} (${p.email})`));
  }

  // 2. View 확인
  console.log('\n2️⃣ v_destiny_targets View 확인:');
  const { data: viewData, error: viewError } = await supabase
    .from('v_destiny_targets')
    .select('*')
    .limit(5);

  if (viewError) {
    console.error('❌ 에러:', viewError.message);
    console.log('💡 해결: View가 생성되지 않았습니다. 마이그레이션 필요!');
  } else {
    console.log(`✅ ${viewData.length}개 Target 발견`);
    viewData.forEach(t => console.log(`   - ${t.name} (${t.target_type})`));
  }

  // 3. RPC 함수 테스트
  if (profiles && profiles.length > 0) {
    console.log('\n3️⃣ RPC 함수 테스트:');
    const testUserId = profiles[0].id;
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_user_destiny_targets', { user_id_param: testUserId });

    if (rpcError) {
      console.error('❌ 에러:', rpcError.message);
      console.log('💡 해결: RPC 함수가 없습니다. 마이그레이션 필요!');
    } else {
      console.log(`✅ ${rpcData.length}개 Target 반환`);
    }
  }

  // 4. Family Members 확인
  console.log('\n4️⃣ Family Members 확인:');
  const { data: family, error: familyError } = await supabase
    .from('family_members')
    .select('id, name, relationship')
    .limit(5);

  if (familyError) {
    console.error('❌ 에러:', familyError.message);
  } else {
    console.log(`✅ ${family.length}개 가족 발견`);
    family.forEach(f => console.log(`   - ${f.name} (${f.relationship})`));
  }

  console.log('\n✅ 진단 완료!');
}

diagnose().catch(console.error);
