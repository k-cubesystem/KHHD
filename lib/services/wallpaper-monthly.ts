/**
 * 「이달의 복」 월간 갱신 — 크론 라우트의 **순수 절차**.
 *
 * 라우트(`app/api/cron/wallpaper-monthly/route.ts`)는 인증과 배선만 지고, 순서·멱등 규칙은
 * 여기 있다. 바깥 세계(Gemini · sharp · Storage · DB)는 전부 주입받으므로 단위테스트가 선다 —
 * 크론은 배포 뒤에나 실기동하는 물건이라, 실행 전에 절차가 맞는지 볼 방법이 이것뿐이다.
 *
 * 🔴 **멱등이 이 절차의 전부다.** 스케줄이 매월 1·2·3일 세 번 돌아(한 번 죽어도 이어받는다)
 *    같은 달에 여러 번 들어온다. 이미 그 달 행이 있으면 **아무것도 만들지 않고 끝낸다** —
 *    이 검사가 빠지면 매달 그림값을 세 번 낸다.
 */

import { kstYearMonth, monthlyWallpaperObject } from '@/lib/domain/analysis/wallpaper'
import { buildMonthlyWallpaperPrompt } from '@/lib/domain/analysis/wallpaper-monthly'

/** 바깥 세계 — 라우트가 실물로, 테스트가 가짜로 채운다. */
export interface MonthlyWallpaperDeps {
  /** 이미 그 달 판이 DB 에 있는가. */
  hasEdition(ym: string): Promise<boolean>
  /** 프롬프트 → 원본 이미지 바이트(png/jpeg — 모델이 고른다). */
  generateImage(prompt: string): Promise<Uint8Array>
  /** 원본 → 1080×1920 cover crop · webp q80. */
  toWallpaper(raw: Uint8Array): Promise<Uint8Array>
  /** 공개 버킷에 올리고(upsert) 공개 URL 을 돌려준다. */
  upload(objectName: string, webp: Uint8Array): Promise<string>
  /** `wallpaper_monthly` 에 행 1건. */
  recordEdition(ym: string, url: string): Promise<void>
}

export type MonthlyWallpaperJobResult = { status: 'noop'; ym: string } | { status: 'created'; ym: string; url: string }

/**
 * 이번 달(KST) 판을 만든다. 이미 있으면 no-op.
 * 실패는 던진다 — 라우트가 잡아 logger.error + 500 으로 올린다(재시도는 다음 날 스케줄이 진다).
 */
export async function runMonthlyWallpaperJob(
  now: Date,
  deps: MonthlyWallpaperDeps
): Promise<MonthlyWallpaperJobResult> {
  const ym = kstYearMonth(now)
  if (await deps.hasEdition(ym)) return { status: 'noop', ym }

  const raw = await deps.generateImage(buildMonthlyWallpaperPrompt(ym))
  const webp = await deps.toWallpaper(raw)
  const url = await deps.upload(monthlyWallpaperObject(ym), webp)
  await deps.recordEdition(ym, url)

  return { status: 'created', ym, url }
}
