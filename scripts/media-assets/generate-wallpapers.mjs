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

/**
 * 티어 — 무료 세트(free)와 프리미엄 세트(premium)는 문법도 해상도도 다르다.
 *
 * 🔴 프리미엄만 2K 로 생성한다(장당 $0.067 → $0.101). 무료 6장이 1K 인 이유는 이미 나갔기
 *    때문이고, 프리미엄은 «고퀄리티»가 상품성 자체라 값을 더 낸다.
 * 🔴 프리미엄 산출은 `public/` 에 두지 않는다 — URL 만 알면 받아지는 자리다(PRD §5-⑤).
 *    검수본은 gitignore 된 `preview-shots/` 로 내고, 출시본은 Storage 서명 URL 로 옮긴다.
 */
const TIERS = {
  free: { rawDir: 'assets-src/wallpapers', outDir: 'public/wallpapers', w: 1080, h: 1920, imageSize: null },
  // 1440×2560 — 갤럭시 S 급 세로 해상도. 9:19.5 폰에서는 위아래가 조금 잘린다(정상).
  premium: {
    rawDir: 'assets-src/wallpapers-premium',
    outDir: 'preview-shots/premium',
    w: 1440,
    h: 2560,
    imageSize: '2K',
  },
}

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

// ── 프리미엄 문법 「여명(黎明)」 ─────────────────────────────────────────────
// 무료 세트가 «깊은 밤 · 먹빛 · 금 단색 · 정물»이라면, 이쪽은 «새벽 · 남빛에서 한지로 ·
// 오방색 채색 · 생명»이다. 계승하는 규율은 하나 — 위쪽은 어둡게 비운다(시계가 얹히는 자리).
//
// 🔴 «lock screen»·«clock» 이라고 쓰지 말 것. 모델이 그 말을 잠금화면 목업으로 읽고
//    시계와 앱 아이콘을 그려 넣는다(2026-08-22 실측). 위 여백은 «새벽 하늘»로만 부른다.
const PREMIUM_STYLE = [
  'A single vertical 9:16 painting, portrait orientation, much taller than wide.',
  'Korean minhwa (Joseon folk painting) rendered as a luxury modern art print:',
  'flat mineral-pigment color fields, hand-painted silk texture, subtle hanji paper grain,',
  'confident brush outlines, gentle humor, decorative rather than realistic.',
  'DAWN palette: the top of the canvas is deep indigo night sky (#0E1A2B), warming downward',
  'through dawn light into pale hanji cream (#EFE3C8) at the bottom edge.',
  'Obangsaek traditional colors — indigo blue, vermilion red, ochre yellow, white, ink black —',
  'with antique gold (#B08A3C) as accent linework only.',
  'The upper third is quiet empty indigo sky; the subject sits in the lower two thirds.',
  'Museum-quality, richly colored, elegant, high detail, soft depth.',
].join(' ')

// 🔴 무료 세트의 «얼굴 있는 동물 금지»를 여기서는 뒤집는다 — 십이지가 정면으로 그 반대다.
//    대신 «민화답게, 사실적이지 않게»를 못 박는다. 사실주의로 가면 얼굴이 무너진다.
const PREMIUM_NEGATIVE = [
  'ABSOLUTELY NO text, NO letters, NO Korean hangul, NO Chinese hanja characters, NO calligraphy,',
  'NO signage, NO seals with writing, NO watermark, NO logo, NO numbers, NO digits.',
  'The image contains no clock, no time display, and no app icons of any kind.',
  'NO people, NO human figures, NO human faces.',
  'Animals are drawn in flat decorative folk-painting style, never photorealistic,',
  'never 3D rendered, never anatomically detailed — stylized and charming.',
  'Not a photograph, not a 3D render, not anime, no screen mockup, no phone frame.',
  'The painting bleeds off all four edges of the canvas; there is no inner frame,',
  'no mat, no matting margin, and no rectangular outline anywhere in the image.',
].join(' ')

/**
 * 프리미엄 시안 4장 — CEO 검수용 첫 배치(PRD §6-ⓒ 권장안).
 * 명화 3 + 십이지 대표 1(닭). 명화 셋은 얼굴이 없어 실패율이 낮아, 동물이 헤매도
 * 세트가 통째로 밀리지 않는다. 통과하면 나머지 십이지 11장을 같은 문법으로 잇는다.
 */
export const PREMIUM_SPECS = [
  {
    id: 'premium-rooster',
    title: '새벽을 여는 닭 (酉)',
    tier: 'premium',
    subject:
      'A proud rooster with a brilliant vermilion comb and wattle stands on a low earthen wall in the lower third, seen from the side, painted in flat folk-painting style with bold outlines. Its tail feathers sweep in arcs of indigo, ochre and white. Behind it the horizon glows with the first orange light of dawn breaking over distant hills. A few stalks of grass and one peony blossom at its feet.',
  },
  {
    id: 'premium-ilwol-obongdo',
    title: '일월오봉도 (日月五峰圖)',
    tier: 'premium',
    subject:
      'The classic Korean royal screen composition, vertical: five stylized mountain peaks in layered indigo and jade rise across the middle, a round white moon on the left and a round vermilion sun on the right hang in the sky above them, two symmetrical red-trunked pine trees stand at the lower left and lower right, and stylized white waves roll across the very bottom. Flat decorative color fields, gold outlines, ceremonial symmetry.',
  },
  {
    id: 'premium-sipjangsaeng',
    title: '십장생 (十長生)',
    tier: 'premium',
    subject:
      'The ten longevity symbols arranged in a vertical landscape: sun, mountains, water, rock, auspicious clouds, pine tree, bullocho fungus, tortoise, crane and deer. Jade-green hills and indigo water in the lower half, a pair of white cranes flying, a spotted deer among pines, a tortoise at the water edge, gold-outlined clouds drifting upward into the dawn sky. Flat mineral color, decorative, serene.',
  },
  {
    id: 'premium-cheonwon',
    title: '십이지 천원 (天圓)',
    tier: 'premium',
    subject:
      'Twelve small Korean zodiac animals — rat, ox, tiger, rabbit, dragon, snake, horse, goat, monkey, rooster, dog, pig — arranged evenly around a large circle in the lower two thirds, each drawn tiny and flat in folk-painting style, each in its own obangsaek color. The circle itself is a thin gold ring on deep indigo, with auspicious clouds drifting through it and a soft dawn glow at the bottom edge.',
  },
]

export function wallpaperPrompt(spec) {
  if (spec.tier === 'premium') {
    return `${PREMIUM_STYLE}\n\nSUBJECT: ${spec.subject}\n\n${PREMIUM_NEGATIVE}`
  }
  return `${STYLE}\n\nSUBJECT: ${spec.subject}\n\n${NEGATIVE}`
}

/** 이 스펙이 서는 티어의 설정(해상도·경로·2K 여부). */
function tierOf(spec) {
  return TIERS[spec.tier ?? 'free']
}

// ── 인자 파싱 ────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
const wantRun = argv.includes('--run') && !argv.includes('--dry-run')
const force = argv.includes('--force')
const targetIds = argv.filter((a) => !a.startsWith('--'))
const ALL_SPECS = [...WALLPAPER_SPECS, ...PREMIUM_SPECS]
// 인자 없이 돌리면 «무료 세트만» 이다 — 프리미엄은 값이 비싸므로 반드시 id 를 찍어 부른다.
const specs = targetIds.length ? ALL_SPECS.filter((s) => targetIds.includes(s.id)) : WALLPAPER_SPECS

if (specs.length === 0) {
  console.error('대상 스펙 없음. 사용 가능한 id:', ALL_SPECS.map((s) => s.id).join(', '))
  process.exit(1)
}

// ── DRY-RUN(기본) ────────────────────────────────────────────────────────────
if (!wantRun) {
  console.log('=== 복 배경화면 생성 DRY-RUN — 실제 생성/과금 없음 ===')
  console.log(`모델: ${MODEL} · webp(q${WEBP_QUALITY})`)
  for (const s of specs) {
    console.log(`\n[${s.id}] ${s.title}`)
    console.log(
      `  티어: ${s.tier ?? 'free'} · 출력 ${tierOf(s).w}×${tierOf(s).h}${tierOf(s).imageSize ? ` · 생성 ${tierOf(s).imageSize}` : ''}`
    )
    console.log(`  출력: ${tierOf(s).outDir}/${s.id}.webp   원본: ${tierOf(s).rawDir}/${s.id}.src`)
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
async function generateImage(prompt, imageSize) {
  for (const withAspect of [true, false]) {
    // 🔴 imageSize 는 과금이 걸린 값이다(1K $0.067 / 2K $0.101). 모델이 거부하면 1K 로
    //    떨어지므로, 정말 2K 를 받았는지는 아래에서 실제 픽셀을 재서 확인한다.
    const imageConfig = { aspectRatio: '9:16', ...(imageSize ? { imageSize } : {}) }
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        ...(withAspect ? { imageConfig } : {}),
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
async function toWallpaper(rawPath, outPath, tier) {
  const sharp = (await import('sharp')).default
  const meta = await sharp(rawPath).metadata()
  await sharp(rawPath)
    .resize(tier.w, tier.h, { fit: 'cover', position: 'centre' })
    .webp({ quality: WEBP_QUALITY })
    .toFile(outPath)
  return { srcW: meta.width, srcH: meta.height }
}

for (const dir of new Set(specs.flatMap((s) => [tierOf(s).rawDir, tierOf(s).outDir]))) {
  await mkdir(dir, { recursive: true })
}

for (const spec of specs) {
  const tier = tierOf(spec)
  const out = path.join(tier.outDir, `${spec.id}.webp`)
  const raw = path.join(tier.rawDir, `${spec.id}.src`)

  if (existsSync(out) && !force) {
    console.log('skip(존재)', out)
    continue
  }

  try {
    if (existsSync(raw) && !force) {
      console.log(`reuse(원본) ${raw}`)
    } else {
      console.log(`gen ${spec.id} — ${spec.title}`)
      const buf = await generateImage(wallpaperPrompt(spec), tier.imageSize)
      await writeFile(raw, buf)
      console.log(`  원본 ${raw} (${(buf.length / 1024).toFixed(0)}KB)`)
    }
    const { srcW, srcH } = await toWallpaper(raw, out, tier)
    const size = (await readFile(out)).length
    console.log(`  원본 실측 ${srcW}×${srcH}${tier.imageSize ? ` (요청 ${tier.imageSize})` : ''}`)
    console.log(`  → ${out} ${tier.w}×${tier.h} (${(size / 1024).toFixed(0)}KB)`)
    if (size > 1024 * 1024) console.warn(`  ⚠ 1MB 초과 — WEBP_QUALITY 하향 검토`)
  } catch (e) {
    console.error('  ✖', spec.id, String(e).slice(0, 400))
    process.exitCode = 1
  }
}

console.log('\ndone. 육안 검수 후 도메인(lib/domain/analysis/wallpaper.ts) 의 id 셋과 대조할 것.')
