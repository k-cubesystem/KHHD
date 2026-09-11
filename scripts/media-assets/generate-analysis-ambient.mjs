// 사주 상세풀이 결과 화면용 「앰비언스 배경」 3장 — 실사(photorealistic) · 극저조도.
// 골격은 generate-wallpapers.mjs 를 그대로 미러링한다(env 폴백 → 스펙 → REST 생성 →
// 멱등 skip → CLI 필터 → 기본 --dry-run).
//
// ⚠️ 기본은 --dry-run(프롬프트만 출력, 과금 없음). 실제 생성은 --run.
//
// 사용:
//   node scripts/media-assets/generate-analysis-ambient.mjs                     # dry-run(기본)
//   node scripts/media-assets/generate-analysis-ambient.mjs --run               # 3장 생성
//   node scripts/media-assets/generate-analysis-ambient.mjs --run ambient-roof  # 한 장만
//   node scripts/media-assets/generate-analysis-ambient.mjs --run --force       # 재생성
//
// 흐름(--run): REST generateContent → 원본을 D:/anti/media-out/analysis-ambient/{id}.src
//              → sharp cover 리사이즈 → webp → public/images/analysis/{id}.webp
//
// 🔴 원본(.src)은 저장소 밖(D: 드라이브)에 둔다 — C 드라이브 여유가 없고, 원본은 산출물이
//    아니라 재료다. 저장소에는 최종 webp 만 들어간다.
// 🔴 REST 직호출인 이유는 배경화면 스크립트와 같다 — SDK 가 imageConfig(비율)를 못 넘긴다.
// 🔴 이 배경은 «본문 글자 뒤»에 깔린다. 밝은 덩어리가 있으면 가독성이 죽으므로 프롬프트가
//    암부 위주·저채도를 계속 못 박는다. 화면 쪽 그라디언트 마스크는 보조일 뿐이다.

import { config } from 'dotenv'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

config({ path: path.resolve('D:/anti/haehwadang/.env.local') })

const MODEL = process.env.WALLPAPER_IMAGE_MODEL || 'gemini-3.1-flash-image-preview'
const KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY

// 저장소 경로는 «스크립트 위치» 기준으로 잡는다 — cwd 가 본체든 워크트리든 산출물은 항상
// 이 체크아웃의 public/ 으로 간다(cwd 리셋 함정 방어).
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const RAW_DIR = 'D:/anti/media-out/analysis-ambient'
const OUT_DIR = path.join(REPO_ROOT, 'public/images/analysis')
const WEBP_QUALITY = 68

// ── 공통 문법 ────────────────────────────────────────────────────────────────
// 배경화면 세트가 «회화»라면 이쪽은 정반대다 — 사진이어야 한다. 그래서 STYLE 첫 문장부터
// 카메라·렌즈·필름을 부른다(모델은 «한국 전통»을 주면 곧장 민화·수묵으로 간다).
const STYLE = [
  'A photorealistic photograph taken with a full-frame camera, 50mm lens, wide aperture,',
  'shallow depth of field, natural film grain, subtle lens vignetting.',
  'EXTREMELY LOW-KEY LIGHTING: the frame is mostly deep shadow, near-black (#0A0A08 to #14120C),',
  'with only a small area of warm light. Underexposed by two stops, moody and cinematic.',
  'Desaturated, muted color; the only warm accent is a faint antique-gold candle glow.',
  'No bright highlights, no blown-out areas, no large light surfaces — nothing in the frame',
  'is brighter than a dim candle flame. Quiet, still, contemplative.',
].join(' ')

const NEGATIVE = [
  'ABSOLUTELY NO text, NO letters, NO Korean hangul, NO Chinese hanja characters, NO calligraphy',
  'visible as readable writing, NO signage, NO watermark, NO logo, NO numbers, NO digits.',
  'NO people, NO faces, NO hands, NO human figures, NO animals.',
  'Not an illustration, not a painting, not a 3D render, not anime, no HDR look.',
  'The photograph bleeds off all four edges; there is no frame, no border, no mat, no vignette',
  'shaped as a rectangle, and no rounded corners.',
].join(' ')

/**
 * 3장 스펙. id 가 곧 파일명이고 화면(components/analysis/report/ambient-backdrop.tsx)의
 * AMBIENT_SOURCES 키와 1:1 이다.
 * 🔴 id 를 바꾸면 컴포넌트의 키도 같이 바꿔야 한다.
 */
export const AMBIENT_SPECS = [
  {
    id: 'ambient-study',
    title: '깊은 밤 한옥 서재',
    // 세로 — 결과 헤더 + 리포트 카드 뒤에 깔린다(화면 상단 전체).
    aspect: '3:4',
    w: 1080,
    h: 1440,
    subject:
      'The corner of a Korean hanok scholar study deep at night. On a low dark-wood desk lie a black ' +
      'inkstone with a pool of wet ink, an ink stick, and two brushes resting on a brush rest, all on ' +
      'a sheet of unwritten hanji paper. A single small candle at the edge of the frame throws a narrow ' +
      'warm pool of light across the paper; everything beyond it falls into darkness. The wooden lattice ' +
      'door behind is barely readable in the dark.',
  },
  {
    id: 'ambient-incense',
    // 가로 — 하단 얇은 비주얼 브레이크 밴드(높이 제한)라 가로 프레임이 덜 잘린다.
    title: '향로의 연기 한 줄기',
    aspect: '4:3',
    w: 1440,
    h: 1080,
    subject:
      'A small bronze incense burner standing in near-total darkness, one thin thread of smoke rising ' +
      'from it and curling slowly. A single hard side light from the left rakes across the smoke so the ' +
      'thread glows pale against the black; the burner itself is only a dim silhouette with one soft ' +
      'highlight along its rim. Ink-black background with nothing else in it.',
  },
  {
    id: 'ambient-roof',
    title: '밤하늘 아래 기와 처마',
    aspect: '3:4',
    w: 1080,
    h: 1440,
    subject:
      'Looking up at the curved eaves of a Korean tiled roof against the night sky. The roof tiles and ' +
      'the upturned corner of the eave are a black silhouette occupying the lower part of the frame; ' +
      'above them a very dark blue-black sky with a scattering of faint stars. No moon. The only ' +
      'definition on the roof is a thin cold rim of starlight along the tile ridges.',
  },
]

export function ambientPrompt(spec) {
  return `${STYLE}\n\nSUBJECT: ${spec.subject}\n\n${NEGATIVE}`
}

// ── 인자 파싱 ────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
const wantRun = argv.includes('--run') && !argv.includes('--dry-run')
const force = argv.includes('--force')
const targetIds = argv.filter((a) => !a.startsWith('--'))
const specs = targetIds.length ? AMBIENT_SPECS.filter((s) => targetIds.includes(s.id)) : AMBIENT_SPECS

if (specs.length === 0) {
  console.error('대상 스펙 없음. 사용 가능한 id:', AMBIENT_SPECS.map((s) => s.id).join(', '))
  process.exit(1)
}

if (!wantRun) {
  console.log('=== 결과 화면 앰비언스 생성 DRY-RUN — 실제 생성/과금 없음 ===')
  console.log(`모델: ${MODEL} · webp(q${WEBP_QUALITY})`)
  console.log(`원본: ${RAW_DIR}  출력: ${OUT_DIR}`)
  for (const s of specs) {
    console.log(`\n[${s.id}] ${s.title} — ${s.aspect} → ${s.w}×${s.h}`)
    console.log(`  프롬프트:\n${ambientPrompt(s).replace(/^/gm, '    ')}`)
  }
  console.log(`\n총 ${specs.length}장. 실제 생성: --run (기존 파일은 skip, 재생성은 --force)`)
  process.exit(0)
}

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

/** 1회 생성. aspectRatio 를 먼저 시도하고 모델이 거부(400)하면 없이 재시도(중앙 crop 폴백). */
async function generateImage(prompt, aspect) {
  for (const withAspect of [true, false]) {
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        ...(withAspect ? { imageConfig: { aspectRatio: aspect } } : {}),
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
        console.log('  aspectRatio 미지원 → 중앙 crop 폴백')
        continue
      }
      throw new Error(`generateContent ${res.status}: ${text}`)
    }
    const img = findInlineImage(await res.json())
    if (!img) throw new Error('이미지 파트 없음 — 모델 ID/응답 형식 확인 필요')
    return Buffer.from(img.data, 'base64')
  }
  throw new Error('생성 실패(두 경로 모두)')
}

/**
 * 원본 → cover 리사이즈 → webp. 300KB 를 넘으면 품질을 단계적으로 낮춰 다시 굽는다
 * (배경 장식이라 품질보다 무게가 먼저다).
 */
async function toAmbient(rawPath, outPath, spec) {
  const sharp = (await import('sharp')).default
  const meta = await sharp(rawPath).metadata()
  let quality = WEBP_QUALITY
  let size = Infinity
  for (const q of [quality, 55, 45, 35]) {
    quality = q
    await sharp(rawPath)
      .resize(spec.w, spec.h, { fit: 'cover', position: 'centre' })
      .webp({ quality: q })
      .toFile(outPath)
    size = (await readFile(outPath)).length
    if (size <= 300 * 1024) break
  }
  return { srcW: meta.width, srcH: meta.height, size, quality }
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
      const buf = await generateImage(ambientPrompt(spec), spec.aspect)
      await writeFile(raw, buf)
      console.log(`  원본 ${raw} (${(buf.length / 1024).toFixed(0)}KB)`)
    }
    const { srcW, srcH, size, quality } = await toAmbient(raw, out, spec)
    console.log(`  원본 실측 ${srcW}×${srcH} (요청 ${spec.aspect})`)
    console.log(`  → ${out} ${spec.w}×${spec.h} q${quality} (${(size / 1024).toFixed(0)}KB)`)
    if (size > 300 * 1024) console.warn(`  ⚠ 300KB 초과 — 해상도 하향 검토`)
  } catch (e) {
    console.error('  ✖', spec.id, String(e).slice(0, 400))
    process.exitCode = 1
  }
}

console.log('\ndone. 육안 검수 후 components/analysis/report/ambient-backdrop.tsx 의 키와 대조할 것.')
