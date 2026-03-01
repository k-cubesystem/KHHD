/**
 * Supabase DB 직접 연결 → roulette_history 제약 수정
 * 실행: node scripts/fix-roulette-constraint.mjs
 */
import pg from 'pg'

const { Client } = pg

// Supabase 프로젝트 연결 정보
const PROJECT_REF = 'ukuscwvkkbedszwmetfu'

// Supabase session pooler (port 5432) 또는 direct (port 5432)
// DB 비밀번호 = Supabase Dashboard > Project Settings > Database > Database password
// 환경변수에서 읽거나 직접 입력
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || ''

if (!DB_PASSWORD) {
  console.error('❌ SUPABASE_DB_PASSWORD 환경변수가 필요합니다.')
  console.error('   실행법: SUPABASE_DB_PASSWORD=YOUR_PASSWORD node scripts/fix-roulette-constraint.mjs')
  process.exit(1)
}

const client = new Client({
  host: `db.${PROJECT_REF}.supabase.co`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
})

try {
  console.log('🔌 Supabase DB 연결 중...')
  await client.connect()
  console.log('✅ 연결 성공')

  // 현재 제약 조건 확인
  const { rows: constraints } = await client.query(`
    SELECT constraint_name, check_clause
    FROM information_schema.check_constraints
    WHERE constraint_name LIKE '%roulette%'
  `)
  console.log('📋 현재 제약 조건:', constraints)

  // 제약 조건 수정
  console.log('\n🔧 제약 조건 수정 중...')

  await client.query(`
    DO $$
    DECLARE
      con_name TEXT;
    BEGIN
      -- 모든 roulette_history 체크 제약 제거
      FOR con_name IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'roulette_history'::regclass
          AND contype = 'c'
      LOOP
        EXECUTE format('ALTER TABLE roulette_history DROP CONSTRAINT IF EXISTS %I', con_name);
        RAISE NOTICE 'Dropped constraint: %', con_name;
      END LOOP;

      -- 새 제약 추가
      ALTER TABLE roulette_history
        ADD CONSTRAINT roulette_history_reward_type_check
        CHECK (reward_type IN ('bokchae', 'miss', 'talisman', 'premium', 'discount'));

      RAISE NOTICE '✅ 새 제약 추가 완료';
    END $$;
  `)

  console.log('✅ 제약 조건 수정 완료!')

  // 검증: bokchae 테스트 insert
  console.log('\n🧪 검증 중...')
  await client.query(`
    INSERT INTO roulette_history (user_id, reward_type, reward_value)
    VALUES ('00000000-0000-0000-0000-000000000099', 'bokchae', 1)
    ON CONFLICT DO NOTHING
  `)
  await client.query(`
    DELETE FROM roulette_history WHERE user_id = '00000000-0000-0000-0000-000000000099'
  `)
  console.log('✅ bokchae 타입 삽입/삭제 검증 완료!')

  // 최종 제약 확인
  const { rows: newConstraints } = await client.query(`
    SELECT constraint_name, check_clause
    FROM information_schema.check_constraints
    WHERE constraint_name LIKE '%roulette%'
  `)
  console.log('\n📋 수정 후 제약 조건:', newConstraints)

} catch (err) {
  console.error('❌ 오류:', err.message)
  process.exit(1)
} finally {
  await client.end()
  console.log('\n🔌 DB 연결 종료')
}
