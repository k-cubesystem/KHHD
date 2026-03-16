import { z } from 'zod'

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('올바른 Supabase URL이 필요합니다'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase Anon Key가 필요합니다'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase Service Role Key가 필요합니다').optional(),

  // AI Services
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1, 'Google Generative AI API Key가 필요합니다').optional(),
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API Key가 필요합니다').optional(),

  // Payments
  NEXT_PUBLIC_TOSS_CLIENT_KEY: z.string().min(1, 'Toss Client Key가 필요합니다').optional(),
  TOSS_PAYMENTS_SECRET_KEY: z.string().min(1, 'Toss Payments Secret Key가 필요합니다').optional(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url('올바른 App URL이 필요합니다').optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export type Env = z.infer<typeof envSchema>

export function validateEnv() {
  try {
    const parsed = envSchema.parse(process.env)
    console.log('✅ Environment variables validated successfully')
    return { success: true, data: parsed }
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:')
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })

      // 프로덕션 환경에서는 에러를 발생시킴
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Invalid environment variables in production')
      }

      // 개발 환경에서는 경고만 표시
      console.warn('⚠️  Some environment variables are missing or invalid. The app may not work correctly.')
    }
    return { success: false, error }
  }
}

// 개발 환경에서 자동 검증 (테스트 환경 제외)
if (process.env.NODE_ENV !== 'test' && typeof window === 'undefined') {
  validateEnv()
}
