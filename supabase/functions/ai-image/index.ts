import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { requireAuth } from '../_shared/auth.ts'
import { generateContent } from '../_shared/gemini-client.ts'
import { corsResponse, errorResponse, successResponse } from '../_shared/response.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  const { action, ...body } = await req.json()
  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  // ─── 관상 분석 ──────────────────────────────────────────────
  if (action === 'analyzeFace') {
    if (!body.imageBase64) return errorResponse('이미지가 필요합니다.')
    const result = await generateContent(
      `이 얼굴 사진을 보고 관상을 분석해주세요. 이마, 눈, 코, 입, 귀, 턱 6부위를 각각 분석하고 총평을 해주세요. JSON 형식으로 응답.`,
      { systemInstruction: '당신은 한국 전통 관상 전문가입니다.' }
    )
    return successResponse({ analysis: result })
  }

  // ─── 손금 분석 ──────────────────────────────────────────────
  if (action === 'analyzePalm') {
    if (!body.imageBase64) return errorResponse('이미지가 필요합니다.')
    const result = await generateContent(
      `이 손 사진의 손금을 분석해주세요. 생명선, 두뇌선, 감정선, 운명선을 각각 분석하고 총평을 해주세요. JSON 형식으로 응답.`,
      { systemInstruction: '당신은 손금 분석 전문가입니다.' }
    )
    return successResponse({ analysis: result })
  }

  // ─── 풍수 분석 ──────────────────────────────────────────────
  if (action === 'analyzeFengshui') {
    if (!body.imageBase64) return errorResponse('이미지가 필요합니다.')
    const result = await generateContent(
      `이 실내 사진을 보고 풍수 분석을 해주세요. 8방위와 방별 추천을 포함해서 JSON 형식으로 응답.`,
      { systemInstruction: '당신은 풍수 인테리어 전문가입니다.' }
    )
    return successResponse({ analysis: result })
  }

  // ─── AI 이미지 생성 ─────────────────────────────────────────
  if (action === 'generateImage') {
    const apiKey = Deno.env.get('GOOGLE_GENERATIVE_AI_API_KEY')
    if (!apiKey) return errorResponse('API key not configured')

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: body.prompt }],
          parameters: { sampleCount: 1, aspectRatio: body.aspectRatio ?? '1:1' },
        }),
      }
    )
    if (!response.ok) {
      const err = await response.text()
      return errorResponse(`이미지 생성 실패: ${err}`)
    }
    const data = await response.json()
    const imageBase64 = data.predictions?.[0]?.bytesBase64Encoded
    if (!imageBase64) return errorResponse('이미지 생성 결과가 없습니다.')
    return successResponse({ imageBase64 })
  }

  return errorResponse('Unknown action: ' + action)
})
