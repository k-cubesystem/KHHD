#!/usr/bin/env node
/**
 * 장면 스크린샷 수집 — 「클로드코드 프리뷰」의 촬영부.
 *
 * 배포 없이 바뀐 화면을 그림으로 먼저 보이려는 도구다. 이미 떠 있는 dev 서버의
 * `/dev-preview/manifest` 에서 장면 표를 읽고(단일 출처), 장면마다 모바일·데스크톱 두 장을 찍어
 * `preview-shots/{scene}-{viewport}.png` 로 떨군다.
 *
 * 사용법:
 *   node scripts/preview/shoot.mjs                          전부
 *   node scripts/preview/shoot.mjs journey-complete-unclaimed wallpaper-member   지정 장면만
 *   node scripts/preview/shoot.mjs --viewport=mobile         한 뷰포트만
 *   node scripts/preview/shoot.mjs --base=http://localhost:3000
 *   PREVIEW_BASE_URL=... node scripts/preview/shoot.mjs
 *
 * 한 장이 실패해도 나머지는 계속 찍고, 끝에 성공/실패 수와 실패 목록을 적는다 —
 * 한 장면이 깨졌다고 촬영 전체가 없어지면 무엇이 깨졌는지도 못 본다.
 */

import { chromium } from '@playwright/test'
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT_DIR = path.join(REPO_ROOT, 'preview-shots')

const DEFAULT_BASE = 'http://localhost:3020'
/** 장면 하나가 안 서면 그 자리에서 실패로 적고 넘어간다 — 전체가 멈추지 않게. */
const SCENE_TIMEOUT_MS = 30_000

/**
 * 개발 도구 껍데기 감추기 — dev 서버에서만 붙는 것들이라 촬영본에 나오면 안 된다.
 * 실측으로 걸린 것 셋: Next 개발 배지, agentation 피드백 위젯, TanStack Query 개발도구 —
 * 셋 다 카드 위에 겹쳐 앉아 화면을 가렸다(배경화면 그리드에서는 타일 한 장을 덮었다).
 * 여기서 감추는 것은 전부 dev 전용 UI 라 실제 화면 판단에 영향이 없다.
 */
const HIDE_DEV_CHROME_CSS = `
  nextjs-portal,
  [data-nextjs-dev-overlay],
  [data-nextjs-toast],
  next-route-announcer,
  [data-feedback-toolbar],
  .tsqd-open-btn-container,
  .tsqd-parent-container { display: none !important; }
`

function parseArgs(argv) {
  const scenes = []
  let base = process.env.PREVIEW_BASE_URL || DEFAULT_BASE
  let viewportFilter = null
  let auth = false

  for (const arg of argv) {
    if (arg.startsWith('--base=')) base = arg.slice('--base='.length)
    else if (arg.startsWith('--viewport=')) viewportFilter = arg.slice('--viewport='.length)
    else if (arg === '--auth') auth = true
    else if (arg.startsWith('--')) throw new Error(`알 수 없는 옵션: ${arg}`)
    else scenes.push(arg)
  }
  return { scenes, base: base.replace(/\/+$/, ''), viewportFilter, auth }
}

async function fetchManifest(base) {
  const url = `${base}/dev-preview/manifest`
  let res
  try {
    res = await fetch(url)
  } catch (err) {
    throw new Error(
      `미리보기 서버에 못 닿았습니다 (${url}).\n` +
        `  먼저 서버를 띄우세요:  npm run preview:serve\n` +
        `  원인: ${err instanceof Error ? err.message : String(err)}`
    )
  }
  if (!res.ok) {
    throw new Error(`장면 표를 못 읽었습니다 (${url} → HTTP ${res.status}). 프로덕션 빌드로 떠 있지 않은지 확인하세요.`)
  }
  return res.json()
}

async function shootOne(context, base, scene, viewportName, viewport) {
  const page = await context.newPage()
  try {
    await page.setViewportSize(viewport)
    const url = `${base}/dev-preview/${scene.id}`
    const res = await page.goto(url, { waitUntil: 'networkidle', timeout: SCENE_TIMEOUT_MS })
    if (!res || !res.ok()) {
      throw new Error(`HTTP ${res ? res.status() : '응답 없음'} — ${url}`)
    }
    // 장면이 실제로 섰다는 표시. 이게 없으면 notFound·오류 화면을 찍고 있는 것이다.
    await page.waitForSelector('[data-preview-ready]', { timeout: SCENE_TIMEOUT_MS })
    await page.addStyleTag({ content: HIDE_DEV_CHROME_CSS })
    // 폰트 교체(FOUT)로 글자가 흔들린 채 찍히지 않게 한 박자 기다린다.
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(400)

    const file = path.join(OUT_DIR, `${scene.id}-${viewportName}.png`)
    await page.screenshot({ path: file, fullPage: true })
    return file
  } finally {
    await page.close()
  }
}

async function main() {
  const { scenes: wanted, base, viewportFilter, auth } = parseArgs(process.argv.slice(2))

  if (auth) {
    // 실계정 층은 아직 없다 — 조용히 무시하면 로그인된 줄 알고 촬영본을 읽게 된다.
    console.error(
      '⚠ --auth 는 아직 붙어 있지 않습니다. e2e/.auth/user.json(Playwright storageState)이 없습니다.\n' +
        '  붙이려면 E2E_USER_EMAIL/E2E_USER_PASSWORD 가 필요합니다 — docs/PREVIEW.md 「한계」 참조.'
    )
    process.exitCode = 1
    return
  }

  const manifest = await fetchManifest(base)
  const all = manifest.scenes
  const viewports = Object.entries(manifest.viewports).filter(
    ([name]) => !viewportFilter || name === viewportFilter
  )

  if (viewports.length === 0) {
    throw new Error(`알 수 없는 뷰포트: ${viewportFilter} (가능: ${Object.keys(manifest.viewports).join(', ')})`)
  }

  const unknown = wanted.filter((id) => !all.some((s) => s.id === id))
  if (unknown.length > 0) {
    throw new Error(`알 수 없는 장면: ${unknown.join(', ')}\n  등록된 장면: ${all.map((s) => s.id).join(', ')}`)
  }

  const targets = wanted.length > 0 ? all.filter((s) => wanted.includes(s.id)) : all

  // 지정 촬영일 땐 남의 장면을 지우지 않는다 — 전체 촬영일 때만 판을 비운다.
  if (wanted.length === 0 && !viewportFilter) await rm(OUT_DIR, { recursive: true, force: true })
  await mkdir(OUT_DIR, { recursive: true })

  console.log(`▶ ${base} · 장면 ${targets.length} × 뷰포트 ${viewports.length}`)

  const browser = await chromium.launch()
  const context = await browser.newContext({ deviceScaleFactor: 2, colorScheme: 'dark' })

  const ok = []
  const failed = []

  try {
    for (const scene of targets) {
      for (const [viewportName, viewport] of viewports) {
        try {
          const file = await shootOne(context, base, scene, viewportName, viewport)
          ok.push(path.relative(REPO_ROOT, file))
          console.log(`  ✓ ${scene.id} · ${viewportName}`)
        } catch (err) {
          failed.push({ scene: scene.id, viewport: viewportName, reason: err instanceof Error ? err.message : String(err) })
          console.log(`  ✗ ${scene.id} · ${viewportName} — ${err instanceof Error ? err.message : String(err)}`)
        }
      }
    }
  } finally {
    await context.close()
    await browser.close()
  }

  console.log(`\n성공 ${ok.length} / 실패 ${failed.length}`)
  if (failed.length > 0) {
    console.log('실패 목록:')
    for (const f of failed) console.log(`  - ${f.scene} · ${f.viewport}: ${f.reason}`)
    process.exitCode = 1
    return
  }
  console.log(`산출물: preview-shots/ (${ok.length}장)`)
}

main().catch((err) => {
  console.error(`\n촬영 실패: ${err instanceof Error ? err.message : String(err)}`)
  process.exitCode = 1
})
