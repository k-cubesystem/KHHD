import { z } from 'zod'

export const sajuInputSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요').max(50, '이름은 50자 이내로 입력해주세요'),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '올바른 날짜 형식이 아닙니다 (YYYY-MM-DD)'),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/, '올바른 시간 형식이 아닙니다 (HH:mm)'),
  isLunar: z.boolean(),
  gender: z.enum(['male', 'female'], { required_error: '성별을 선택해주세요' }),
})

export type SajuInput = z.infer<typeof sajuInputSchema>

export const sajuProfileSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요').max(50, '이름은 50자 이내로 입력해주세요'),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '올바른 날짜 형식이 아닙니다 (YYYY-MM-DD)'),
  birth_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, '올바른 시간 형식이 아닙니다 (HH:mm 또는 HH:mm:ss)').optional(),
  is_lunar: z.boolean().optional().default(false),
  gender: z.enum(['male', 'female'], { required_error: '성별을 선택해주세요' }),
  relation: z.string().optional(),
})

export type SajuProfile = z.infer<typeof sajuProfileSchema>
