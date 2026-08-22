import Link from 'next/link'
import { notFound } from 'next/navigation'
import { findPreviewScene, isPreviewEnabled } from '@/lib/domain/dev-preview/scenes'
import { PreviewSceneView } from '../scene-views'

/**
 * 장면 한 컷 — 컴포넌트를 목 데이터로 세워 그대로 보여준다.
 * 🔴 프로덕션이면 존재하지 않는다(notFound) — 실수로 배포돼도 고객 노출 0.
 *
 * 촬영 스크립트가 `[data-preview-ready]` 를 기다린다 — 이 표시가 붙기 전에 찍으면
 * 폰트·이미지가 덜 온 화면을 찍게 된다.
 */

export const dynamic = 'force-dynamic'

export const metadata = { robots: { index: false, follow: false } }

interface PageProps {
  params: Promise<{ scene: string }>
}

export default async function DevPreviewScenePage({ params }: PageProps) {
  if (!isPreviewEnabled(process.env.NODE_ENV)) notFound()

  const { scene: sceneId } = await params
  const scene = findPreviewScene(sceneId)
  if (!scene) notFound()

  return (
    <main data-preview-ready data-preview-scene={scene.id} className="min-h-screen bg-background px-4 py-6">
      {/* 머리글 — 어느 장면인지 촬영본만 봐도 알게 한다. 촬영 시 잘라내지 않는다(맥락이 곧 설명) */}
      <header className="mb-4 border-b border-gold-500/15 pb-3">
        <p className="font-serif text-[13px] font-bold text-gold-500">{scene.label}</p>
        <p className="mt-0.5 text-[11px] font-light leading-snug text-ink-light/45" style={{ wordBreak: 'keep-all' }}>
          {scene.note}
        </p>
      </header>

      <PreviewSceneView sceneId={scene.id} />

      <Link href="/dev-preview" className="mt-6 block text-[11px] text-gold-500/40 hover:text-gold-500/70">
        ← 장면 목록
      </Link>
    </main>
  )
}
