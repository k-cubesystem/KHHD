// 「복 배경화면」 배치 생성 — 폰 잠금화면용 9:16 아트 6장(오행 5 + 이달의 복 1).
// scripts/shrine-assets/generate.mjs · media-assets/generate-videos.mjs 골격 미러링
// (env 키 폴백 → 스펙 배열 → 생성 → 멱등 skip → CLI 필터 → 기본 --dry-run).
//
// ⚠️ 기본은 --dry-run(프롬프트만 출력, 과금 없음). 실제 생성은 --run.
//
// 사용:
//   node scripts/media-assets/generate-wallpapers.mjs                    # dry-run(기본)
//   node scripts/media-assets/generate-wallpapers.mjs --run              # 실제 생성
//   node scripts/media-assets/generate-wallpapers.mjs --run element-fire # 한 장만
//   node scripts/media-assets/generate-wallpapers.mjs --run --force      # 기존 파일 덮어쓰기(재생성)
//
// 흐름(--run): env 키 → REST generateContent → assets-src/wallpapers/{id}.src(원본)
//              → sharp 중앙 crop 9:16 · 1080×1920 · webp q80 → public/wallpapers/{id}.webp
//
// 🔴 REST 직호출인 이유: @google/generative-ai SDK 는 generationConfig.imageConfig
//    (비율 지정)를 통과시키지 못한다. 비율을 못 주면 정사각형이 와서 세로 배경이 안 된다.
//    비율 파라미터가 거부되면(400) 프롬프트의 세로 구도 지시 + 중앙 crop 으로 자동 폴백한다.

import { config } from 'dotenv'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

config({ path: path.resolve('D:/anti/haehwadang/.env.local') })

const MODEL = process.env.WALLPAPER_IMAGE_MODEL || 'gemini-3.1-flash-image-preview'
const KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY

const RAW_DIR = 'assets-src/wallpapers'
const OUT_DIR = 'public/wallpapers'
const OUT_W = 1080
const OUT_H = 1920
const WEBP_QUALITY = 80

// ── 공통 문법 ────────────────────────────────────────────────────────────────
// 해화당 세계관: 조선 반가의 서재 + 럭셔리 다크·금. 폰 아이콘이 얹히므로 어둡고 조용해야 한다.
// 🔴 글자 금지는 두 번 말한다(이미지 모델은 «한국 전통»을 간판·현판으로 오해해 한자를 그린다).
// 🔴 «phone lock-screen wallpaper»·«clock area» 라고 쓰지 말 것 — 1차 생성에서 모델이 그 말을
//    잠금화면 «목업»으로 읽고 시계 「12:03」과 전화·카메라 아이콘을 그려 넣었다(2026-08-22 실측).
//    지금 문법은 «세로 회화 한 점»으로 부르고, 위쪽 여백은 구도상의 여백으로만 지시한다.
const STYLE = [
  'A single vertical 9:16 painting, portrait orientation, much taller than wide.',
  'Korean traditional fine-art aesthetic rendered as a luxury modern art print:',
  'Joseon-dynasty motifs, hand-painted mineral pigment texture, subtle hanji paper grain.',
  'Very dark near-black ground (#0A0A08 to #16140F) filling most of the canvas.',
  'Thin antique gold (#C9A84C) linework and gold-leaf accents as the only bright element.',
  'The upper third is empty unbroken dark ground; the motif sits in the lower two thirds.',
  'Museum-quality, restrained, elegant, high detail, soft depth, no harsh highlights.',
].join(' ')

const NEGATIVE = [
  'ABSOLUTELY NO text, NO letters, NO Korean hangul, NO Chinese hanja characters, NO calligraphy,',
  'NO signage, NO seals with writing, NO watermark, NO logo, NO numbers, NO digits.',
  'The image contains no clock, no time display, and no app icons of any kind.',
  'NO people, NO faces, NO human figures, NO animals with faces.',
  'Not a photograph, not 3D render, not cartoon, no screen mockup, no phone frame, no border.',
  // 🔴 2차 생성에서 물·이달의복이 «액자에 걸린 판화»로 왔다(안쪽 금색 사각 테두리 + 매트 여백).
  //    「art print」가 매트를 부른다 — 네 변까지 꽉 차야 배경화면이 된다는 사실을 못 박는다.
  'The painting bleeds off all four edges of the canvas; there is no inner frame,',
  'no mat, no matting margin, and no rectangular outline anywhere in the image.',
].join(' ')

/**
 * 배경화면 스펙 6종. id 가 곧 파일명이자 도메인(lib/domain/analysis/wallpaper.ts)의 id 다.
 * 🔴 id 를 바꾸면 도메인 WALLPAPER_SET · 테스트 · public 파일 셋을 같이 바꿔야 한다.
 */
export const WALLPAPER_SPECS = [
  {
    id: 'element-wood',
    title: '나무 (木)',
    subject:
      'A deep forest-green field. Tall gold-outlined pine branches and slender bamboo stalks rise from the bottom edge, their needles and leaves drawn in fine gold strokes. Faint layered mist between the trunks. Emerald and moss-green washes, gold veining.',
  },
  {
    id: 'element-fire',
    title: '불 (火)',
    subject:
      'A deep crimson field. Rows of round Korean paper lanterns glow warm at the lower edge, hanging on gold cords. Above them, stylized traditional flame patterns (dancheong fire motif) curl upward in gold outline. Deep vermilion and oxblood washes.',
  },
  {
    id: 'element-earth',
    title: '흙 (土)',
    subject:
      'A warm ochre-brown field. Layered folded mountain ridges in traditional Korean landscape style fill the lower half, edged in gold. A single pale moon jar (baekja moon jar) silhouette rests among the ridges, its round form catching soft gold light. Loess and amber earth tones.',
  },
  {
    id: 'element-metal',
    title: '쇠 (金)',
    subject:
      'A near-monochrome black and pearl-white field. A large full moon hangs low, rendered in cool white porcelain glaze. Below it a single white porcelain vessel silhouette. Thin gold rim lines trace the moon and the vessel. Ink-wash grays, restrained gold.',
  },
  {
    id: 'element-water',
    title: '물 (水)',
    subject:
      'A deep indigo-navy field. Stylized traditional wave patterns roll across the lower half in gold outline, crest over crest. Two koi carp shapes glide through the waves, drawn as flowing gold silhouettes without faces. Prussian blue and midnight washes, gold foam speckles.',
  },
  {
    id: 'monthly-202608',
    title: '이달의 복 — 2026년 8월',
    subject:
      'A deep oxblood-and-black field. An embroidered silk bokjumeoni (Korean fortune pouch) hangs at center-lower, its drawstring tassels falling long, stitched with gold thread in a lotus pattern. Around it, square-holed brass coins and fine gold dust drift upward. A late-summer full moon glows faintly behind. Rich crimson silk sheen, heavy gold embroidery.',
  },
]

export function wallpaperPrompt(spec) {
  return `${STYLE}\n\nSUBJECT: ${spec.subject}\n\n${NEGATIVE}`
}

// ── 인자 파싱 ────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
const wantRun = argv.includes('--run') && !argv.includes('--dry-run')
const force = argv.includes('--force')
const targetIds = argv.filter((a) => !a.startsWith('--'))
const specs = targetIds.length ? WALLPAPER_SPECS.filter((s) => targetIds.includes(s.id)) : WALLPAPER_SPECS

if (specs.length === 0) {
  console.error('대상 스펙 없음. 사용 가능한 id:', WALLPAPER_SPECS.map((s) => s.id).join(', '))
  process.exit(1)
}

// ── DRY-RUN(기본) ────────────────────────────────────────────────────────────
if (!wantRun) {
  console.log('=== 복 배경화면 생성 DRY-RUN — 실제 생성/과금 없음 ===')
  console.log(`모델: ${MODEL} · 출력: ${OUT_W}×${OUT_H} webp(q${WEBP_QUALITY})`)
  for (const s of specs) {
    console.log(`\n[${s.id}] ${s.title}`)
    console.log(`  출력: ${OUT_DIR}/${s.id}.webp   원본: ${RAW_DIR}/${s.id}.src`)
    console.log(`  프롬프트:\n${wallpaperPrompt(s).replace(/^/gm, '    ')}`)
  }
  console.log(`\n총 ${specs.length}장. 실제 생성: --run (기존 파일은 skip, 재생성은 --force)`)
  process.exit(0)
}

// ── --run: 실제 생성 ─────────────────────────────────────────────────────────
if (!KEY) {
  console.error('GEMINI 키 없음 (.env.local 의 GEMINI_API_KEY 또는 GOOGLE_GENERATIVE_AI_API_KEY)')
  process.exit(1)
}

const BASE = 'https://generativelanguage.googleapis.com/v1beta'

/** 응답 트리에서 첫 inlineData(이미지) 파트를 찾는다 — 스키마 변동 방어. */
function findInlineImage(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) return null
  for (const p of parts) {
    const inline = p?.inlineData ?? p?.inline_data
    if (inline?.data) return inline
  }
  return null
}

/**
 * 1회 생성. aspectRatio 를 먼저 시도하고, 모델이 거부(400)하면 없이 재시도한다.
 * 어느 쪽이든 결과는 sharp 가 9:16 으로 중앙 crop 하므로 최종 비율은 같다.
 */
async function generateImage(prompt) {
  for (const withAspect of [true, false]) {
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        ...(withAspect ? { imageConfig: { aspectRatio: '9:16' } } : {}),
      },
    }
    const res = await fetch(`${BASE}/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const text = (await res.text()).slice(0, 400)
      if (withAspect && res.status === 400) {
        console.log('  aspectRatio 미지원 → 프롬프트 세로 구도 + 중앙 crop 폴백')
        continue
      }
      throw new Error(`generateContent ${res.status}: ${text}`)
    }
    const img = findInlineImage(await res.json())
    if (!img) throw new Error('이미지 파트 없음 — 모델 ID/응답 형식 확인 필요')
    // 원본 바이트는 png 일 수도 jpeg 일 수도 있다(모델이 고른다) — 그래서 확장자 없이
    // `{id}.src` 로 보관한다. sharp 가 포맷을 스스로 판별하므로 파이프라인은 무관하다.
    return Buffer.from(img.data, 'base64')
  }
  throw new Error('생성 실패(두 경로 모두)')
}

/** 원본 → 9:16 중앙 crop → 1080×1920 → webp q80. */
async function toWallpaper(rawPath, outPath) {
  const sharp = (await import('sharp')).default
  await sharp(rawPath)
    .resize(OUT_W, OUT_H, { fit: 'cover', position: 'centre' })
    .webp({ quality: WEBP_QUALITY })
    .toFile(outPath)
}

await mkdir(RAW_DIR, { recursive: true })
await mkdir(OUT_DIR, { recursive: true })

for (const spec of specs) {
  const out = path.join(OUT_DIR, `${spec.id}.webp`)
  const raw = path.join(RAW_DIR, `${spec.id}.src`)

  if (existsSync(out) && !force) {
    console.log('skip(존재)', out)
    continue
  }

  try {
    if (existsSync(raw) && !force) {
      console.log(`reuse(원본) ${raw}`)
    } else {
      console.log(`gen ${spec.id} — ${spec.title}`)
      const buf = await generateImage(wallpaperPrompt(spec))
      await writeFile(raw, buf)
      console.log(`  원본 ${raw} (${(buf.length / 1024).toFixed(0)}KB)`)
    }
    await toWallpaper(raw, out)
    const size = (await readFile(out)).length
    console.log(`  → ${out} (${(size / 1024).toFixed(0)}KB)`)
    if (size > 1024 * 1024) console.warn(`  ⚠ 1MB 초과 — WEBP_QUALITY 하향 검토`)
  } catch (e) {
    console.error('  ✖', spec.id, String(e).slice(0, 400))
    process.exitCode = 1
  }
}

console.log('\ndone. 육안 검수 후 도메인(lib/domain/analysis/wallpaper.ts) 의 id 셋과 대조할 것.')
