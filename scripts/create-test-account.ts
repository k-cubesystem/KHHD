/**
 * 토스페이먼츠 계약심사용 테스트 계정 생성 스크립트
 * 실행: npx tsx scripts/create-test-account.ts
 */
import { config } from 'dotenv'
import path from 'path'
config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const TEST_EMAIL = 'test@k-haehwadang.com'
const TEST_PASSWORD = 'Haehwadang2026!'

async function createTestAccount() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log('테스트 계정 생성 중...')

  // 1. 유저 생성 (이메일 인증 스킵)
  const { data: user, error: createError } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: '테스트 계정' },
  })

  if (createError) {
    if (createError.message.includes('already been registered')) {
      console.log('⚠️  이미 존재하는 계정입니다. 비밀번호 업데이트 중...')

      const { data: users } = await supabase.auth.admin.listUsers()
      const existing = users?.users.find((u) => u.email === TEST_EMAIL)

      if (existing) {
        await supabase.auth.admin.updateUserById(existing.id, {
          password: TEST_PASSWORD,
          email_confirm: true,
        })
        console.log('✅ 비밀번호 업데이트 완료')
      }
    } else {
      console.error('❌ 생성 실패:', createError.message)
      process.exit(1)
    }
  } else {
    console.log('✅ 계정 생성 완료:', user.user?.id)
  }

  // 2. 지갑 생성 (복채 충전) — 프로필 트리거 대기 후 실행
  const { data: users } = await supabase.auth.admin.listUsers()
  const testUser = users?.users.find((u) => u.email === TEST_EMAIL)
  if (!testUser) {
    console.error('❌ 유저 조회 실패')
    process.exit(1)
  }

  // 프로필 확인 후 없으면 직접 생성
  const { data: existingProfile } = await supabase.from('profiles').select('id').eq('id', testUser.id).single()
  if (!existingProfile) {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: testUser.id,
      email: TEST_EMAIL,
      full_name: '테스트 계정',
      role: 'tester',
    })
    if (profileError) console.warn('⚠️  프로필 생성 실패:', profileError.message)
    else console.log('✅ 프로필 생성 완료 (role: tester)')
  } else {
    console.log('✅ 프로필 확인 완료')
  }

  const profileReady = true
  if (profileReady) {
    const { error: walletError } = await supabase.from('wallets').upsert({
      user_id: testUser.id,
      balance: 100, // 복채 100만냥 (테스트용)
    })
    if (walletError) console.warn('⚠️  지갑 설정 실패:', walletError.message)
    else console.log('✅ 복채 100만냥 충전 완료')
  }

  console.log('\n========================================')
  console.log('🎉 테스트 계정 준비 완료')
  console.log('========================================')
  console.log(`  ID(이메일): ${TEST_EMAIL}`)
  console.log(`  비밀번호  : ${TEST_PASSWORD}`)
  console.log('========================================\n')
}

createTestAccount()
