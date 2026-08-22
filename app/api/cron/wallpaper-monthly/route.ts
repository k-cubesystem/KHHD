import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { runMonthlyWallpaperJob, type MonthlyWallpaperDeps } from '@/lib/services/wallpaper-monthly'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BUCKET = 'wallpapers'
const MODEL = process.env.WALLPAPER_IMAGE_MODEL || 'gemini-3.1-flash-image-preview'
const OUT_W = 1080
const OUT_H = 1920
const WEBP_QUALITY = 80

/**
 * 「이달의 복」 월간 갱신 크론 — 매월 1·2·3일 01:00 UTC(10:00 KST).
 *
 * 하루 죽어도 이튿날이 이어받도록 3회 돌리고, 절차가 멱등이라(이미 그 달 행이 있으면 no-op)
 * 여러 번 들어와도 그림값은 한 번만 낸다. 절차 자체는 `lib/services/wallpaper-monthly.ts`.
 *
 * 인증은 다른 크론과 같은 규약 — `Authorization: Bearer ${CRON_SECRET}`.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    if (process.env.NODE_ENV !== 'development') {
      return new NextResponse('Unauthorized', { status: 401 })
    }
  }

  try {
    const result = await runMonthlyWallpaperJob(new Date(), buildDeps())
    if (result.status === 'noop') {
      return NextResponse.json({ success: true, message: '이번 달 판 이미 존재 — 생성 생략', ym: result.ym })
    }
    logger.info('[cron/wallpaper-monthly] 새 판 생성', { ym: result.ym, url: result.url })
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    logger.error('[cron/wallpaper-monthly] 생성 실패', err)
    return NextResponse.json({ success: false, error: '이달의 복 생성 실패' }, { status: 500 })
  }
}

/** 실물 배선 — DB(admin) · Gemini REST · sharp · 공개 Storage 버킷. */
function buildDeps(): MonthlyWallpaperDeps {
  const admin = createAdminClient()

  return {
    async hasEdition(ym) {
      const { data, error } = await admin.from('wallpaper_monthly').select('ym').eq('ym', ym).maybeSingle()
      // 조회가 깨졌는데 «없다»로 답하면 중복 생성으로 이어진다 — 던져서 멈춘다.
      if (error) throw new Error(`wallpaper_monthly 조회 실패: ${error.message}`)
      return Boolean(data)
    },
    generateImage,
    async toWallpaper(raw) {
      const sharp = (await import('sharp')).default
      const out = await sharp(Buffer.from(raw))
        .resize(OUT_W, OUT_H, { fit: 'cover', position: 'centre' })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer()
      return new Uint8Array(out)
    },
    async upload(objectName, webp) {
      const { error } = await admin.storage.from(BUCKET).upload(objectName, webp, {
        contentType: 'image/webp',
        upsert: true,
      })
      if (error) throw new Error(`Storage 업로드 실패: ${error.message}`)
      const { data } = admin.storage.from(BUCKET).getPublicUrl(objectName)
      if (!data?.publicUrl) throw new Error('공개 URL 발급 실패')
      return data.publicUrl
    },
    async recordEdition(ym, url) {
      const { error } = await admin.from('wallpaper_monthly').insert({ ym, image_url: url })
      if (error) throw new Error(`wallpaper_monthly 기록 실패: ${error.message}`)
    },
  }
}

/** 응답 트리에서 첫 inlineData(이미지) 파트 — 스키마 변동 방어(생성 스크립트와 같은 방식). */
function findInlineImage(payload: unknown): { data: string } | null {
  if (typeof payload !== 'object' || payload === null) return null
  const candidates = (payload as { candidates?: unknown }).candidates
  if (!Array.isArray(candidates)) return null
  const parts = (candidates[0] as { content?: { parts?: unknown } } | undefined)?.content?.parts
  if (!Array.isArray(parts)) return null
  for (const part of parts) {
    if (typeof part !== 'object' || part === null) continue
    const inline =
      (part as { inlineData?: unknown; inline_data?: unknown }).inlineData ??
      (part as { inline_data?: unknown }).inline_data
    if (typeof inline === 'object' && inline !== null) {
      const data = (inline as { data?: unknown }).data
      if (typeof data === 'string' && data.length > 0) return { data }
    }
  }
  return null
}

/**
 * Gemini 이미지 1장(REST 직호출).
 * 🔴 SDK 가 `generationConfig.imageConfig`(비율)를 통과시키지 못해 REST 를 쓴다 —
 *    비율을 못 주면 정사각형이 와서 세로 그림이 안 된다. 400 이면 비율 없이 재시도하고,
 *    최종 비율은 어차피 sharp 의 cover crop 이 맞춘다.
 */
async function generateImage(prompt: string): Promise<Uint8Array> {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY
  if (!key) throw new Error('GEMINI 키 없음')

  for (const withAspect of [true, false]) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          ...(withAspect ? { imageConfig: { aspectRatio: '9:16' } } : {}),
        },
      }),
    })
    if (!res.ok) {
      if (withAspect && res.status === 400) continue
      throw new Error(`generateContent ${res.status}: ${(await res.text()).slice(0, 300)}`)
    }
    const img = findInlineImage(await res.json())
    if (!img) throw new Error('이미지 파트 없음 — 모델 ID/응답 형식 확인 필요')
    return new Uint8Array(Buffer.from(img.data, 'base64'))
  }
  throw new Error('이미지 생성 실패(두 경로 모두)')
}
