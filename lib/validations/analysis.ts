import { z } from 'zod'

export const analysisRequestSchema = z.object({
  category: z.enum(['saju', 'compatibility', 'wealth', 'health', 'career', 'family', 'study', 'travel', 'TODAY', 'FACE', 'HAND', 'FENGSHUI']),
  targetMemberId: z.string().uuid('올바른 구성원 ID가 아닙니다').optional(),
  options: z.object({
    depth: z.enum(['basic', 'standard', 'premium']).optional(),
    includeAdvice: z.boolean().optional(),
  }).optional(),
})

export type AnalysisRequest = z.infer<typeof analysisRequestSchema>

export const sajuAnalysisSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  gender: z.enum(['male', 'female'], { required_error: '성별을 선택해주세요' }),
  birthDate: z.string().min(1, '생년월일을 입력해주세요'),
  birthTime: z.string().min(1, '출생시간을 입력해주세요'),
  calendarType: z.enum(['solar', 'lunar'], { required_error: '달력 형식을 선택해주세요' }),
  saveToHistory: z.boolean().optional().default(true),
})

export type SajuAnalysis = z.infer<typeof sajuAnalysisSchema>

export const faceAnalysisSchema = z.object({
  imageBase64: z.string().min(1, '이미지를 업로드해주세요'),
  goal: z.enum(['wealth', 'love', 'authority'], { required_error: '목표를 선택해주세요' }),
  saveToHistory: z.boolean().optional().default(true),
})

export type FaceAnalysis = z.infer<typeof faceAnalysisSchema>

export const palmAnalysisSchema = z.object({
  imageBase64: z.string().min(1, '이미지를 업로드해주세요'),
  saveToHistory: z.boolean().optional().default(true),
})

export type PalmAnalysis = z.infer<typeof palmAnalysisSchema>

export const fengshuiAnalysisSchema = z.object({
  imageBase64: z.string().min(1, '이미지를 업로드해주세요'),
  theme: z.enum(['wealth', 'romance', 'health'], { required_error: '테마를 선택해주세요' }),
  roomType: z.string().min(1, '방 종류를 입력해주세요'),
  saveToHistory: z.boolean().optional().default(true),
})

export type FengshuiAnalysis = z.infer<typeof fengshuiAnalysisSchema>
