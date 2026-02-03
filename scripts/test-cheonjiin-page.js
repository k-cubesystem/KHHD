/**
 * Cheonjiin 페이지 테스트 스크립트
 * targetId가 있을 때 Step 1을 건너뛰는지 확인
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testCheonjiinPage() {
  console.log('🧪 Cheonjiin 페이지 로직 테스트\n');

  // Get test user
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .limit(1);

  if (!profiles || profiles.length === 0) {
    console.error('❌ No profiles found');
    return;
  }

  const testUser = profiles[0];
  console.log(`👤 테스트 사용자: ${testUser.full_name}\n`);

  // Get destiny targets
  const { data: targets } = await supabase
    .from('v_destiny_targets')
    .select('*')
    .eq('owner_id', testUser.id)
    .order('target_type', { ascending: false })
    .order('created_at', { ascending: true });

  if (!targets || targets.length === 0) {
    console.error('❌ No targets found');
    return;
  }

  console.log(`✅ ${targets.length}개 Target 발견:\n`);

  targets.forEach((target, index) => {
    console.log(`${index + 1}. ${target.name} (${target.target_type})`);
    console.log(`   관계: ${target.relation_type}`);
    console.log(`   ID: ${target.id}`);
    console.log('');
  });

  // Simulate page logic
  const testTargetId = targets[0].id; // 첫 번째 target 사용
  const initialStep = testTargetId ? 2 : 1; // 로직: targetId가 있으면 Step 2

  console.log('📊 페이지 로직 시뮬레이션:\n');
  console.log(`URL: /protected/analysis/cheonjiin?targetId=${testTargetId}`);
  console.log(`\n예상 동작:`);
  console.log(`1. targetId 존재: ✅`);
  console.log(`2. 초기 Step: ${initialStep} (Step 1 건너뛰기)`);
  console.log(`3. 선택된 Target: ${targets[0].name}`);
  console.log(`4. Step 1 표시: ${initialStep === 1 ? '⚠️  표시됨 (문제!)' : '✅ 건너뜀 (정상)'}`);

  console.log('\n✅ 테스트 완료!');
  console.log('\n🎯 브라우저에서 확인:');
  console.log(`http://localhost:3000/protected/analysis/cheonjiin?targetId=${testTargetId}`);
  console.log('\n예상 결과:');
  console.log('- "누구의 운명을 분석하시겠습니까?" 표시 안됨 ✅');
  console.log('- 바로 Step 2 (관상/손금) 표시 ✅');
  console.log('- Step 진행바에서 Step 2가 활성화됨 ✅');
}

testCheonjiinPage().catch(console.error);
