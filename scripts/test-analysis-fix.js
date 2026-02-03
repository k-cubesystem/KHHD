/**
 * AI 분석 오류 수정 확인 스크립트
 * DestinyTarget 시스템 지원 확인
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testAnalysisFix() {
  console.log('🧪 AI 분석 시스템 수정 확인\n');

  // 1. Destiny Targets 확인
  console.log('1️⃣ Destiny Targets 확인:');
  const { data: targets, error: targetsError } = await supabase
    .from('v_destiny_targets')
    .select('id, name, target_type, birth_date, birth_time, relation_type')
    .limit(3);

  if (targetsError) {
    console.error('❌ 에러:', targetsError.message);
    return;
  }

  console.log(`✅ ${targets.length}개 Target 발견:\n`);
  targets.forEach((t, i) => {
    console.log(`${i + 1}. ${t.name} (${t.target_type})`);
    console.log(`   ID: ${t.id}`);
    console.log(`   생년월일: ${t.birth_date || '(없음)'} ${t.birth_time || ''}`);
    console.log(`   관계: ${t.relation_type}`);
    console.log('');
  });

  // 2. 천지인 프롬프트 확인
  console.log('2️⃣ 천지인 프롬프트 확인:');
  const { data: prompts, error: promptsError } = await supabase
    .from('ai_prompts')
    .select('key, label, category, talisman_cost')
    .eq('key', 'cheonjiin_analysis');

  if (promptsError) {
    console.error('❌ 에러:', promptsError.message);
  } else if (!prompts || prompts.length === 0) {
    console.log('⚠️  천지인 프롬프트가 없습니다!');
    console.log('💡 해결: supabase/migrations/20260204_add_cheonjiin_prompt.sql 실행 필요');
  } else {
    console.log('✅ 천지인 프롬프트 존재:');
    console.log(`   키: ${prompts[0].key}`);
    console.log(`   레이블: ${prompts[0].label}`);
    console.log(`   카테고리: ${prompts[0].category}`);
    console.log(`   부적 비용: ${prompts[0].talisman_cost}개`);
  }

  // 3. 분석 가능 여부 체크
  console.log('\n3️⃣ 분석 가능 Target:');
  const analyzableTargets = targets.filter(t => t.birth_date);
  console.log(`✅ 생년월일이 있는 Target: ${analyzableTargets.length}개`);

  if (analyzableTargets.length > 0) {
    console.log('\n분석 가능한 대상:');
    analyzableTargets.forEach((t, i) => {
      console.log(`${i + 1}. ${t.name} (${t.target_type}) - ${t.birth_date}`);
    });
  }

  const noDateTargets = targets.filter(t => !t.birth_date);
  if (noDateTargets.length > 0) {
    console.log(`\n⚠️  생년월일이 없는 Target: ${noDateTargets.length}개`);
    noDateTargets.forEach((t) => {
      console.log(`   - ${t.name} (${t.target_type}): 분석 불가`);
    });
  }

  // 4. AI 프롬프트 전체 목록
  console.log('\n4️⃣ 등록된 AI 프롬프트:');
  const { data: allPrompts } = await supabase
    .from('ai_prompts')
    .select('key, label, category')
    .order('category', { ascending: true });

  if (allPrompts && allPrompts.length > 0) {
    console.log(`✅ ${allPrompts.length}개 프롬프트 등록됨:\n`);

    const byCategory = allPrompts.reduce((acc, p) => {
      acc[p.category] = acc[p.category] || [];
      acc[p.category].push(p);
      return acc;
    }, {});

    Object.keys(byCategory).forEach(cat => {
      console.log(`📁 ${cat}:`);
      byCategory[cat].forEach(p => {
        console.log(`   - ${p.label} (${p.key})`);
      });
      console.log('');
    });
  } else {
    console.log('⚠️  등록된 프롬프트가 없습니다.');
  }

  console.log('\n✅ 테스트 완료!');

  console.log('\n📋 다음 단계:');
  console.log('1. 천지인 프롬프트가 없으면:');
  console.log('   → Supabase SQL Editor에서 supabase/migrations/20260204_add_cheonjiin_prompt.sql 실행');
  console.log('\n2. 브라우저에서 테스트:');
  console.log('   → http://localhost:3000/protected/analysis');
  console.log('   → 천지인 원명 분석 클릭');
  if (analyzableTargets.length > 0) {
    console.log(`   → ${analyzableTargets[0].name} 선택`);
  }
  console.log('   → 분석 시작');
}

testAnalysisFix().catch(console.error);
