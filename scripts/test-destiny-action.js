/**
 * Test destiny-targets Server Action directly
 * 터미널에서 실행: node scripts/test-destiny-action.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAction() {
  console.log('🧪 Server Action 시뮬레이션 테스트\n');

  // Get first user for testing
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .limit(1);

  if (!profiles || profiles.length === 0) {
    console.error('❌ No profiles found');
    return;
  }

  const testUser = profiles[0];
  console.log(`👤 테스트 사용자: ${testUser.full_name} (${testUser.email})\n`);

  // Simulate the fixed getDestinyTargets() logic
  console.log('📊 Direct View Query 테스트 (Fixed Code):');
  const { data, error } = await supabase
    .from('v_destiny_targets')
    .select('*')
    .eq('owner_id', testUser.id)
    .order('target_type', { ascending: false }) // self가 먼저
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ 에러:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  빈 배열 반환 - 데이터 없음');
    return;
  }

  console.log(`✅ ${data.length}개 Target 발견:\n`);

  data.forEach((target, index) => {
    console.log(`${index + 1}. ${target.name}`);
    console.log(`   타입: ${target.target_type}`);
    console.log(`   관계: ${target.relation_type}`);
    console.log(`   생년월일: ${target.birth_date || '(없음)'}`);
    console.log(`   생시: ${target.birth_time || '(없음)'}`);
    console.log(`   성별: ${target.gender || '(없음)'}`);

    if (target.target_type === 'self') {
      console.log(`   👤 본인 데이터 - Avatar: ${target.avatar_url || '(없음)'}`);
    } else {
      console.log(`   👥 가족 데이터 - Face: ${target.face_image_url || '(없음)'}`);
    }
    console.log('');
  });

  // Test specific features
  console.log('🔍 기능별 검증:');
  const selfTargets = data.filter(t => t.target_type === 'self');
  const familyTargets = data.filter(t => t.target_type === 'family');

  console.log(`✅ 본인 데이터: ${selfTargets.length}개`);
  console.log(`✅ 가족 데이터: ${familyTargets.length}개`);

  if (selfTargets.length > 0) {
    console.log(`✅ 본인이 첫 번째: ${data[0].target_type === 'self'}`);
  }

  console.log('\n✅ 테스트 완료! 이제 브라우저에서 확인하세요:');
  console.log('   http://localhost:3000/protected/analysis');
}

testAction().catch(console.error);
