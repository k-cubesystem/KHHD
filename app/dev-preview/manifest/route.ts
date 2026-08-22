import { NextResponse } from 'next/server'
import { PREVIEW_SCENES, PREVIEW_VIEWPORTS, isPreviewEnabled } from '@/lib/domain/dev-preview/scenes'

/**
 * 장면 표를 그대로 내주는 개발 전용 엔드포인트.
 *
 * 촬영 스크립트(`scripts/preview/shoot.mjs`)가 이걸 읽는다 — .mjs 가 .ts 표를 못 읽어서
 * 목록을 정규식으로 긁거나 손으로 복사하면 두 곳이 조용히 어긋난다. 서버는 어차피 떠 있어야
 * 찍을 수 있으니, 「돌고 있는 앱 자신의 진실」을 그대로 묻는 편이 안전하다.
 *
 * 🔴 프로덕션이면 404 — 라우트 두 장(page)과 같은 가드를 쓴다.
 */

export const dynamic = 'force-dynamic'

export function GET() {
  if (!isPreviewEnabled(process.env.NODE_ENV)) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
  }
  return NextResponse.json({ scenes: PREVIEW_SCENES, viewports: PREVIEW_VIEWPORTS })
}
