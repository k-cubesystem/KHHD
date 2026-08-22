import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  PREVIEW_SCENES,
  isPreviewEnabled,
  previewScenePath,
  type PreviewSceneGroup,
} from '@/lib/domain/dev-preview/scenes'

/**
 * 미리보기 목록 — 등록된 장면 전부를 링크로 편다.
 * 🔴 프로덕션이면 존재하지 않는다(notFound) — 실수로 배포돼도 고객 노출 0.
 */

export const dynamic = 'force-dynamic'

export const metadata = { robots: { index: false, follow: false } }

const GROUP_ORDER: readonly PreviewSceneGroup[] = ['복주머니', '복 배경화면', '종합사주풀이']

export default function DevPreviewIndexPage() {
  if (!isPreviewEnabled(process.env.NODE_ENV)) notFound()

  return (
    <main className="min-h-screen bg-background px-5 py-10 text-ink-light">
      <h1 className="font-serif text-xl font-bold text-gold-500">클로드코드 프리뷰</h1>
      <p className="mt-1 text-[12px] font-light text-ink-light/55" style={{ wordBreak: 'keep-all' }}>
        배포 없이 바뀐 화면을 그림으로 먼저 보기 위한 개발 전용 목록입니다. 로그인·DB 없이 목 데이터로 섭니다.
      </p>

      {GROUP_ORDER.map((group) => {
        const scenes = PREVIEW_SCENES.filter((s) => s.group === group)
        if (scenes.length === 0) return null
        return (
          <section key={group} className="mt-7">
            <h2 className="font-serif text-[13px] tracking-[0.25em] text-gold-500/70">{group}</h2>
            <ul className="mt-2.5 flex flex-col gap-2">
              {scenes.map((scene) => (
                <li key={scene.id}>
                  <Link
                    href={previewScenePath(scene.id)}
                    className="block rounded-lg border border-gold-500/20 bg-white/[0.02] px-3.5 py-2.5 transition-colors hover:border-gold-500/45"
                  >
                    <p className="font-serif text-[13px] font-bold text-ink-light">{scene.label}</p>
                    <p className="mt-0.5 text-[11px] font-light leading-snug text-ink-light/50">{scene.note}</p>
                    <p className="mt-1 font-mono text-[10px] text-gold-500/45">{scene.id}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      <p className="mt-9 text-[11px] font-light text-ink-light/35" style={{ wordBreak: 'keep-all' }}>
        전부 찍기: <span className="font-mono text-gold-500/50">npm run preview:shots</span> · 자세한 사용법은
        docs/PREVIEW.md
      </p>
    </main>
  )
}
