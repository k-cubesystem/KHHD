// 신당 의식 R-1 「액막이 — 부적 태우기」 부적지 에셋 (PRD-shrine-rituals-v1 §1)
//
// 굽는 것은 **두 장**이다. 화면에서 겹쳐 쓰기 때문에 서로 다른 역할을 갖는다.
//   paper.webp  빈 부적지 — 연소 마스크가 걸리는 면. 위에 아무것도 쓰여 있지 않다.
//   sigil.webp  경면주사 주문 문양 — 액운 원문에서 파생된 SVG 획 아래에 깔리는 바탕 문양.
//               흐림(blur 1.4px)을 먹고 들어가므로 획이 굵고 성글어야 한다.
//
// ⚠️ 왜 원문을 그리지 않는가: 액운 원문은 서버로도, 이미지로도 나가지 않는다(기획의 핵심 가치).
//    부적 위의 "글씨"는 원문 해시에서 나온 **읽을 수 없는 획**이고 그건 런타임 SVG 가 그린다.
//    여기서 굽는 sigil 은 그 획이 앉을 붉은 바탕일 뿐이다.
//
// 사용:
//   node scripts/shrine-assets/ritual-talisman.mjs           # 누락분만 (멱등)
//   node scripts/shrine-assets/ritual-talisman.mjs paper      # 하나만
//   node scripts/shrine-assets/ritual-talisman.mjs --regen    # 원본부터 재생성
//   node scripts/shrine-assets/ritual-talisman.mjs --rekey    # 원본 캐시로 키잉만 (API 0회)
//
// 원칙 (stage-banga.mjs · stage-banga-altar.mjs 와 동일)
//   - STYLE / LIGHT 문구를 **한 글자도 바꾸지 않고 복제**한다. 부적지는 제단 위에서 기존 12품목과
//     한 화면에 서므로 붓·빛이 갈리면 "다른 그림에서 오려붙인 부적"이 된다.
//   - 순녹색(#00FF00) 배경 생성 → 하드 크로마키 → 트림.
//   - 접지 그림자를 굽지 않는다(런타임 담당).
//
// 산출: public/shrine/ritual/{paper,sigil}.webp
// 검수: assets-src/shrine/ritual-talisman-check.webp  (부적지 / 문양 겹침 / 연소 50% 시뮬)
import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from 'dotenv'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

// ⚠️ .env.local 은 **메인 체크아웃만** 로드한다.
//    워크트리(.claude/worktrees/*)의 .env.local 에는 폐기된 구키가 잔존하며,
//    dotenv 는 먼저 설정된 값을 덮지 않으므로 워크트리를 같이 로드하면 구키가 우선권을 가진다.
config({ path: 'D:/anti/haehwadang/.env.local' })

const MODEL = process.env.SHRINE_IMAGE_MODEL || 'gemini-3.1-flash-image'
const KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

const ROOT = path.resolve(import.meta.dirname, '../..')
const OUT_DIR = path.join(ROOT, 'public', 'shrine', 'ritual')
/** 검수 산출물 — 제품 번들(public)에 QA 이미지를 흘리지 않는다 */
const QA_DIR = path.join(ROOT, 'assets-src', 'shrine')
const RAW_DIR = process.env.RITUAL_RAW_DIR || path.join(process.env.TEMP || '/tmp', 'shrine-ritual-talisman-raw')

/** 총 생성 상한(재시도 포함). 2장 × (1회 + 재시도 2회) = 6. */
const API_BUDGET = 6
let apiCalls = 0

// ────────────────────────────── 프롬프트 ──────────────────────────────
// STYLE·LIGHT 는 stage-banga.mjs 원문 그대로.
const STYLE =
  'warm painterly watercolor illustration, soft K-anime aesthetic, visible gentle brush texture, ' +
  'muted sepia and dark-walnut palette with hanji ivory, candlelit warmth, ' +
  'calm and tidy composition rather than busy detail, refined key-art quality'
const LIGHT =
  'a single warm candlelight source from the UPPER LEFT, soft shadows falling toward the lower right, ' +
  'consistent light direction, no rim light from other directions'
const CHROMA =
  'the subject is fully isolated on a solid pure chroma green background (#00FF00) that fills the entire frame edge to edge, ' +
  'no ground plane, no floor, no table, no cast shadow on the background, no vignette, ' +
  'no text, no letters, no watermark, no border, no frame'
/**
 * 문양 전용 크로마 — CHROMA 에서 "no text, no letters" 만 뺀 것.
 * 그 두 마디를 남기면 붓자국 자체가 사라져 빈 녹색 판이 나온다(주문 문양이 곧 글씨꼴이기 때문).
 * 나머지(배경·그림자·워터마크·테두리)는 그대로다.
 */
const CHROMA_MARKS =
  'the subject is fully isolated on a solid pure chroma green background (#00FF00) that fills the entire frame edge to edge, ' +
  'no ground plane, no floor, no table, no cast shadow on the background, no vignette, ' +
  'no watermark, no border, no frame'

/**
 * @typedef {object} RitualAsset
 * @property {string} key
 * @property {string} file
 * @property {number} outW  최종 스프라이트 폭(px)
 * @property {number|null} outH  고정 높이(px). null 이면 내용물 종횡비가 정한다.
 * @property {string} prompt
 */

/** @type {RitualAsset[]} */
const ASSETS = [
  {
    key: 'paper',
    file: 'paper.webp',
    // 화면 무대는 186×279px(2:3) — 에셋을 같은 비로 구워두면 CSS 가 늘일 일이 없다.
    // 연소 마스크가 이 면 위에서 움직이므로 여백 한 줄이 그대로 "타지 않는 띠"가 된다.
    outW: 512,
    outH: 768,
    prompt:
      'A single Korean paper talisman strip (부적), tall and narrow, seen flat from the front. ' +
      'Hand-made hanji paper in warm ivory-yellow with visible plant fibres and faint mottling, ' +
      'the top and bottom edges softly deckled and slightly uneven, the long sides straight. ' +
      'A thin cinnabar-red rule runs down the full length a little inside each long side. ' +
      'The paper between the two rules is bare hanji surface. ' +
      'Portrait proportion, two units wide and three units tall, filling the frame with a small even margin, ' +
      'the strip perfectly upright and centred. ' +
      `${STYLE}, ${LIGHT}, ${CHROMA}`,
  },
  {
    key: 'sigil',
    file: 'sigil.webp',
    outW: 384,
    outH: null,
    prompt:
      'A vertical column of cinnabar-red brush marks for a Korean paper talisman, painted with a stiff dry brush. ' +
      'At the top a small three-peaked crown mark. Below it five stacked angular marks, each a thick downstroke ' +
      'crossed by one or two short bars and ending in a hooked flick, the brush lifting so the stroke tapers. ' +
      'The marks are abstract shapes rather than any real writing, spaced evenly with clear gaps between them, ' +
      'a few tiny spatter dots beside the column. ' +
      'Deep cinnabar red with darker edges where the pigment pooled, dry-brush streaks inside the thick strokes. ' +
      'Narrow upright column, taller than wide, centred with a generous margin on every side. ' +
      `${STYLE}, ${LIGHT}, ${CHROMA_MARKS}`,
  },
]

// ───────────────────── 크로마키 (stage-banga.mjs 규약 복제) ─────────────────────
const KEY_PROFILES = [
  { hi: 62, lo: 22, spill: 3, shrink: 0.14, feather: 1 },
  { hi: 50, lo: 16, spill: 1, shrink: 0.22, feather: 1 },
  { hi: 40, lo: 10, spill: 0, shrink: 0.3, feather: 2 },
]
/** 완전 투명 픽셀의 RGB — 순녹색을 남기면 리사이즈·인코딩 때 가장자리로 번진다. */
const VOID_RGB = [0x1a, 0x13, 0x08]
const GREEN_HARD = 20
const GREEN_EDGE = 12
const FRINGE_MAX = 0.004
const EDGE_FRINGE_MAX = 0.03

function boxBlurAlpha(data, width, height, channels, radius) {
  if (radius < 1) return
  const n = width * height
  const src = new Uint8Array(n)
  for (let p = 0; p < n; p += 1) src[p] = data[p * channels + 3]
  const tmp = new Uint8Array(n)
  const win = radius * 2 + 1
  for (let y = 0; y < height; y += 1) {
    const row = y * width
    for (let x = 0; x < width; x += 1) {
      let sum = 0
      for (let k = -radius; k <= radius; k += 1) sum += src[row + Math.min(width - 1, Math.max(0, x + k))]
      tmp[row + x] = Math.round(sum / win)
    }
  }
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      let sum = 0
      for (let k = -radius; k <= radius; k += 1) sum += tmp[Math.min(height - 1, Math.max(0, y + k)) * width + x]
      data[(y * width + x) * channels + 3] = Math.round(sum / win)
    }
  }
}

async function chromaKey(inputBuf, profile) {
  const { hi, lo, spill, shrink, feather } = profile
  const { data, info } = await sharp(inputBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info
  const span = hi - lo
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const base = Math.max(r, b)
    const gd = g - base
    let a = 255
    if (gd >= hi) a = 0
    else if (gd > lo) a = Math.round(255 * (1 - (gd - lo) / span))
    if (gd > 0) data[i + 1] = Math.min(g, base + spill)
    if (a > 0 && shrink > 0) a = Math.round((Math.max(0, a / 255 - shrink) / (1 - shrink)) * 255)
    if (a === 0) {
      data[i] = VOID_RGB[0]
      data[i + 1] = VOID_RGB[1]
      data[i + 2] = VOID_RGB[2]
    }
    data[i + 3] = a
  }
  boxBlurAlpha(data, width, height, channels, feather)
  return { data, width, height, channels }
}

function measureFringe(data, channels) {
  let visible = 0
  let green = 0
  let edge = 0
  let edgeGreen = 0
  for (let i = 0; i < data.length; i += channels) {
    const a = data[i + 3]
    if (a < 16) continue
    const gd = data[i + 1] - Math.max(data[i], data[i + 2])
    visible += 1
    if (gd > GREEN_HARD) green += 1
    if (a < 240) {
      edge += 1
      if (gd > GREEN_EDGE) edgeGreen += 1
    }
  }
  return { visible, ratio: visible ? green / visible : 0, edgeRatio: edge ? edgeGreen / edge : 0 }
}

// ───────────────────────────── 생성 ─────────────────────────────
async function callModel(prompt) {
  if (!KEY) throw new Error('GEMINI 키 없음 — 메인 체크아웃 .env.local 의 GOOGLE_GENERATIVE_AI_API_KEY 확인')
  if (apiCalls >= API_BUDGET) throw new Error(`API 예산(${API_BUDGET}회) 소진 — 생성 중단`)
  apiCalls += 1
  const genAI = new GoogleGenerativeAI(KEY)
  const model = genAI.getGenerativeModel({ model: MODEL })
  const res = await model.generateContent([{ text: prompt }])
  const cand = res.response.candidates?.[0]
  const img = cand?.content?.parts?.find((p) => p.inlineData)?.inlineData
  if (!img) throw new Error('이미지 파트 없음 — 응답: ' + JSON.stringify(cand)?.slice(0, 300))
  return Buffer.from(img.data, 'base64')
}

function isAuthError(e) {
  const s = String(e?.message || e)
  return /401|403|API_KEY_INVALID|API key not valid|PERMISSION_DENIED|UNAUTHENTICATED/i.test(s)
}

/** 트림된 내용물을 최종 규격으로. outH 가 있으면 그 비로 채운다(무대 비와 1:1). */
async function toFinal(pngBuf, asset) {
  const trimmed = await sharp(pngBuf).trim({ threshold: 10 }).toBuffer()
  const resized = asset.outH
    ? sharp(trimmed).resize({ width: asset.outW, height: asset.outH, fit: 'fill' })
    : sharp(trimmed).resize({ width: asset.outW, fit: 'inside' })
  return resized.webp({ quality: 90, alphaQuality: 100 }).toBuffer()
}

async function buildAsset(asset, { regen, rekey }) {
  const rawPng = path.join(RAW_DIR, `${asset.key}.png`)
  const outWebp = path.join(OUT_DIR, asset.file)

  async function ensureRaw(force) {
    if (!force && existsSync(rawPng)) return
    console.log(`  · 생성 (${MODEL}) — API ${apiCalls + 1}/${API_BUDGET}`)
    const buf = await callModel(asset.prompt)
    await mkdir(path.dirname(rawPng), { recursive: true })
    await writeFile(rawPng, buf)
  }

  await ensureRaw(regen && !rekey)
  await mkdir(OUT_DIR, { recursive: true })

  // 키잉 3프로파일 → 전부 fringe 초과면 1회 재생성 → 다시 3프로파일 → 최선값 채택
  for (let round = 0; round < 2; round += 1) {
    let best = null
    for (let p = 0; p < KEY_PROFILES.length; p += 1) {
      const keyed = await chromaKey(await sharp(rawPng).toBuffer(), KEY_PROFILES[p])
      const png = await sharp(keyed.data, {
        raw: { width: keyed.width, height: keyed.height, channels: keyed.channels },
      })
        .png()
        .toBuffer()
      const finalBuf = await toFinal(png, asset)
      const { data, info } = await sharp(finalBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      const fringe = measureFringe(data, info.channels)
      const pass = fringe.ratio <= FRINGE_MAX && fringe.edgeRatio <= EDGE_FRINGE_MAX
      console.log(
        `  · 키잉 P${p + 1} ${info.width}×${info.height} fringe=${(fringe.ratio * 100).toFixed(3)}% edge=${(fringe.edgeRatio * 100).toFixed(2)}% ${pass ? 'PASS' : 'retry'}`
      )
      const candidate = { buf: finalBuf, fringe, profile: p + 1, info }
      if (!best || fringe.ratio < best.fringe.ratio) best = candidate
      if (pass) {
        await writeFile(outWebp, finalBuf)
        return { key: asset.key, ok: true, file: asset.file, bytes: finalBuf.length, ...candidate }
      }
    }
    if (round === 0 && apiCalls < API_BUDGET && !rekey) {
      console.log('  · 3프로파일 모두 fringe 초과 → 원본 재생성')
      try {
        await ensureRaw(true)
        continue
      } catch (e) {
        console.log('  · 재생성 불가:', String(e?.message || e).slice(0, 160))
      }
    }
    await writeFile(outWebp, best.buf)
    return { key: asset.key, ok: true, file: asset.file, bytes: best.buf.length, ...best, warn: true }
  }
}

// ──────────────────────── 검수 이미지 ────────────────────────
// 화면(AekmakSheet)의 무대 그대로 세 칸을 만든다 — 실제로 보게 될 것만 본다.
//   ① 부적지 단독  ② 부적지 + 주문양(런타임 겹침 재현)  ③ 연소 50% 시뮬(마스크 램프)
const DARK = { r: 0x16, g: 0x14, b: 0x0f, alpha: 1 }
/** 무대 실측(AekmakSheet STAGE) 의 2배 — 검수는 육안 판정이라 레티나 배율로 본다 */
const CELL = { w: 372, h: 558 }
const PAD = 28
const GAP = 24

/**
 * 아래에서 위로 타들어간 상태의 **알파 마스크**. frac = 이미 탄 높이 비율.
 * ⚠️ 4채널이어야 한다 — `blend:'dest-in'` 은 입력의 알파만 본다. 1채널 그레이스케일을 주면
 *    알파가 전부 불투명이라 아무것도 지워지지 않는다(첫 검수판이 그 상태였다).
 */
function burnMask(w, h, frac) {
  const data = Buffer.alloc(w * h * 4)
  const edge = h * (1 - frac)
  const band = h * 0.05
  for (let y = 0; y < h; y += 1) {
    const t = (y - edge) / band
    const a = t <= 0 ? 255 : t >= 1 ? 0 : Math.round(255 * (1 - t))
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4
      data[i] = 255
      data[i + 1] = 255
      data[i + 2] = 255
      data[i + 3] = a
    }
  }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } })
}

/** 타는 선 — .ritual-char 그라디언트의 근사(재현이 목적이라 색만 맞춘다). 띠의 **아래끝**이 경계다. */
function charBand(w, h) {
  const data = Buffer.alloc(w * h * 4)
  // 아래에서 위로: 밝은 심지 → 주황 → 그을음 → 투명
  const stops = [
    { at: 0.0, c: [255, 240, 200], a: 0 },
    { at: 0.12, c: [255, 236, 190], a: 0.75 },
    { at: 0.28, c: [255, 176, 60], a: 0.95 },
    { at: 0.48, c: [214, 92, 20], a: 0.5 },
    { at: 0.7, c: [58, 30, 10], a: 0.4 },
    { at: 1.0, c: [58, 30, 10], a: 0 },
  ]
  for (let y = 0; y < h; y += 1) {
    const p = 1 - y / (h - 1) // 아래끝이 0
    let lo = stops[0]
    let hi = stops[stops.length - 1]
    for (let k = 0; k < stops.length - 1; k += 1) {
      if (p >= stops[k].at && p <= stops[k + 1].at) {
        lo = stops[k]
        hi = stops[k + 1]
        break
      }
    }
    const t = hi.at === lo.at ? 0 : (p - lo.at) / (hi.at - lo.at)
    const mix = (i) => Math.round(lo.c[i] + (hi.c[i] - lo.c[i]) * t)
    const a = Math.round(255 * (lo.a + (hi.a - lo.a) * t))
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4
      data[i] = mix(0)
      data[i + 1] = mix(1)
      data[i + 2] = mix(2)
      data[i + 3] = a
    }
  }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } })
}

async function makeCheckSheet() {
  const paper = path.join(OUT_DIR, 'paper.webp')
  const sigil = path.join(OUT_DIR, 'sigil.webp')
  if (!existsSync(paper)) return null

  const paperCell = await sharp(paper).resize(CELL.w, CELL.h, { fit: 'fill' }).png().toBuffer()

  // ② 런타임 겹침 — 주문양은 opacity 0.72 + blur 로 깔린다(.ritual-sigil 계약)
  let overlaid = paperCell
  if (existsSync(sigil)) {
    const sw = Math.round(CELL.w * 0.62)
    const marks = await sharp(sigil)
      .resize({ width: sw, height: Math.round(CELL.h * 0.74), fit: 'inside' })
      .blur(2.6)
      .ensureAlpha()
      .composite([
        {
          input: Buffer.from([255, 255, 255, Math.round(255 * 0.72)]),
          raw: { width: 1, height: 1, channels: 4 },
          tile: true,
          blend: 'dest-in',
        },
      ])
      .png()
      .toBuffer()
    const meta = await sharp(marks).metadata()
    overlaid = await sharp(paperCell)
      .composite([
        {
          input: marks,
          left: Math.round((CELL.w - meta.width) / 2),
          top: Math.round(CELL.h * 0.16),
        },
      ])
      .png()
      .toBuffer()
  }

  // ③ 연소 50% — 실제 마스크와 같은 방향(아래에서 위로) + 경계의 잉걸불 띠.
  // 순서가 중요하다: 런타임에서 잉걸불 띠(.ritual-char)는 마스크가 걸린 요소 **안**에 있다 —
  // 띠를 먼저 얹고 그 위에 마스크를 씌워야 화면과 같은 그림이 나온다.
  const BURNT = 0.5
  const bandH = Math.round(CELL.h * 0.14)
  const edgeY = Math.round(CELL.h * (1 - BURNT))
  const burning = await sharp(
    await sharp(overlaid)
      .ensureAlpha()
      .composite([{ input: await charBand(CELL.w, bandH).png().toBuffer(), left: 0, top: edgeY - bandH }])
      .png()
      .toBuffer()
  )
    .composite([{ input: await burnMask(CELL.w, CELL.h, BURNT).png().toBuffer(), blend: 'dest-in' }])
    .png()
    .toBuffer()

  const W = PAD * 2 + CELL.w * 3 + GAP * 2
  const H = PAD * 2 + CELL.h
  const out = path.join(QA_DIR, 'ritual-talisman-check.webp')
  await mkdir(QA_DIR, { recursive: true })
  const info = await sharp({ create: { width: W, height: H, channels: 4, background: DARK } })
    .composite([
      { input: paperCell, left: PAD, top: PAD },
      { input: overlaid, left: PAD + CELL.w + GAP, top: PAD },
      { input: burning, left: PAD + (CELL.w + GAP) * 2, top: PAD },
    ])
    .webp({ quality: 90 })
    .toFile(out)
  return { out, bytes: info.size, W, H }
}

// ──────────────────────────── main ────────────────────────────
const args = process.argv.slice(2)
const regen = args.includes('--regen')
const rekey = args.includes('--rekey')
const only = args.find((a) => !a.startsWith('--'))
const targets = only && only !== 'all' ? ASSETS.filter((a) => a.key === only) : ASSETS
if (!targets.length) {
  console.error('unknown asset key:', only, '— 가능:', ASSETS.map((a) => a.key).join(', '), ', all')
  process.exit(1)
}

console.log(`모델: ${MODEL}\n원본 캐시: ${RAW_DIR}\n산출: ${OUT_DIR}\n검수: ${QA_DIR}\n`)

const results = []
for (const asset of targets) {
  const outWebp = path.join(OUT_DIR, asset.file)
  if (!regen && !rekey && existsSync(outWebp)) {
    console.log('skip', asset.file, '(이미 존재 — 재생성은 --regen / 키잉만 --rekey)')
    continue
  }
  console.log(`── ${asset.key} ──`)
  try {
    const r = await buildAsset(asset, { regen, rekey })
    console.log(`  ✔ ${asset.file} ${r.info.width}×${r.info.height} ${(r.bytes / 1024).toFixed(1)}KB`)
    results.push({ asset, ...r })
  } catch (e) {
    if (isAuthError(e)) {
      console.error('\n✖✖ API 키 인증 실패 — 즉시 중단합니다. 재시도하지 않음.')
      console.error('   ', String(e?.message || e).slice(0, 400))
      process.exit(2)
    }
    console.error('  ✖', asset.key, String(e?.message || e).slice(0, 300))
    results.push({ asset, key: asset.key, ok: false, error: String(e?.message || e).slice(0, 300) })
  }
}

console.log('\n── 요약 ──')
for (const r of results) {
  if (!r.ok) {
    console.log(`  ✖ ${r.key}: ${r.error}`)
    continue
  }
  console.log(
    `  ${r.warn ? '⚠️' : '✔'} ${r.key} ${r.info.width}×${r.info.height} ${(r.bytes / 1024).toFixed(1)}KB ` +
      `fringe=${(r.fringe.ratio * 100).toFixed(3)}% edge=${(r.fringe.edgeRatio * 100).toFixed(2)}% (P${r.profile})` +
      `${r.warn ? ' ⚠️임계 초과(최선값 채택)' : ''}`
  )
}

const sheet = await makeCheckSheet()
if (sheet) {
  console.log(`\n✔ 검수 이미지 ${sheet.W}×${sheet.H} ${(sheet.bytes / 1024).toFixed(1)}KB`)
  console.log(`  ${sheet.out}`)
  console.log('  ① 부적지 단독  ② 부적지+주문양(런타임 겹침)  ③ 연소 50% 시뮬')
}

console.log(`\nAPI 호출 ${apiCalls}/${API_BUDGET}회`)
process.exit(results.some((r) => !r.ok) ? 1 : 0)
