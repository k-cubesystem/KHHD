// 신당 게임필 안4 「도트 신당」 — 반가 도트 **시범 1종** (PRD-shrine-gamefeel-v1.md §안4)
//
// 목적: CEO 검수용 산출물만. 서비스 배선·DB·카탈로그 연결 없음(검수 통과 후 별도).
// 산출은 public/ 밖 assets-src/shrine/dot-banga/ — 미검수 에셋을 배포에 싣지 않는다.
//
// 두 경로를 **같은 격자·같은 조립 규약**으로 만들어 한 장에서 비교한다.
//   A. 후처리   : 기존 반가 에셋(painterly) → pixelate.mjs 로 도트화
//   B. 네이티브 : Gemini 가 처음부터 도트로 그림 → 크로마키·트림 → pixelate.mjs 로 격자 정규화
//
// 사용:
//   node scripts/shrine-assets/dot-banga.mjs                    # 누락분만 (멱등, 캐시 있으면 API 0회)
//   node scripts/shrine-assets/dot-banga.mjs --regen            # B 원본 전부 재생성 (API 4회)
//   node scripts/shrine-assets/dot-banga.mjs flooring --regen   # 그 한 장만 재생성 (API 1회)
//   node scripts/shrine-assets/dot-banga.mjs --a-only           # A 경로만 (API 0회)
//
// API 예산: 생성 4장 + 전역 재시도 1회 = 최대 5회.
import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from 'dotenv'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { pixelate } from './pixelate.mjs'

// ⚠️ .env.local 은 **메인 체크아웃만** 로드한다 (stage-banga.mjs 와 동일 규약).
//    워크트리의 .env.local 에는 폐기된 구키가 잔존하고, dotenv 는 먼저 설정된 값을 덮지 않는다.
config({ path: 'D:/anti/haehwadang/.env.local' })

const MODEL = process.env.SHRINE_IMAGE_MODEL || 'gemini-3.1-flash-image'
const KEY =
  process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

const ROOT = path.resolve(import.meta.dirname, '../..')
const SRC_DIR = path.join(ROOT, 'public', 'shrine', 'stage', 'banga') // A 경로 입력(읽기 전용)
const OUT_DIR = path.join(ROOT, 'assets-src', 'shrine', 'dot-banga') // 산출 — public 밖
const RAW_DIR = process.env.DOT_RAW_DIR || path.join(process.env.TEMP || '/tmp', 'shrine-dot-banga-raw')

const MAX_API_CALLS = 5
let apiCalls = 0
let retryBudget = 1

// ────────────────────────────── 도트 격자 규약 ──────────────────────────────
// 한 방 = 160×176 도트. 조립을 **도트 해상도에서** 끝내고 마지막에 ×4 nearest 로 올린다.
// (완성 이미지를 리사이즈하면 격자가 어긋나 픽셀이 들쭉날쭉해진다 — 도트 아트의 1번 실패 원인)
const PANEL = { w: 160, h: 176 }
const SCALE = 4
// StageLayers 규약과 같은 비율: 벽지 top 0 h62% · 바닥 bottom 0 h40%
const GRID = {
  wallpaper: { w: 160, h: 110 },
  flooring: { w: 160, h: 70 },
  altar: { w: 100, h: 60 }, // inside 맞춤 — 실제 크기는 원본 비율대로
  candle: { w: 30, h: 44 },
}
const LAYOUT = {
  altarCX: 0.5, // 구조물 중심 x (시드 structures[0].x = 50)
  altarCY: 0.47, // 중심 y (= 47)
  anchorY: 78, // 제단 상판 접지선(도트 좌표) — 소품 바닥이 여기 닿는다
  propX: [0.3, 0.7],
}

// ────────────────────────────── B 경로 프롬프트 ──────────────────────────────
// 「설빛온기」 톤(한지 아이보리·짙은 호두나무·놋쇠 금빛)을 **도트 문법으로 번역**한다.
// 브랜드 격리(PRD §안4): 본선 painterly 를 대체하지 않는 컬렉터블 테마 라인.
const DOT_STYLE =
  '16-bit pixel art, Super Nintendo / Super Famicom era Japanese RPG art style, ' +
  'crisp hard-edged pixels aligned to a clean square pixel grid, chunky visible pixels, ' +
  'NO anti-aliasing, no blur, no soft gradients, no photographic detail, ' +
  'strictly limited palette of about 24 colors, flat shading in 2-3 discrete tone steps, ' +
  'clean color banding without dithering noise, orthographic straight-on view, ' +
  'readable silhouette, retro game asset'
const DOT_TONE =
  'warm dusk palette: hanji paper ivory, dark walnut brown, aged brass gold, deep ember amber and soot black; ' +
  'cozy candlelit Korean traditional mood, Joseon dynasty noble house (반가 班家) motifs, ' +
  'dignified and calm rather than cute or busy'
const DOT_LIGHT =
  'a single warm candlelight source from the UPPER LEFT, shadow tone steps falling toward the lower right, ' +
  'consistent light direction across the whole image'
const DOT_CHROMA =
  'the subject is fully isolated on a solid pure chroma green background (#00FF00) that fills the entire frame edge to edge, ' +
  'the green is one single flat color with no shading and no gradient, ' +
  'no ground plane, no floor, no cast shadow on the background, no vignette, ' +
  'no text, no letters, no watermark, no border, no frame'

/** @type {Array<{key:string,alpha:boolean,grid:keyof typeof GRID,colors:number,prompt:string}>} */
const B_ASSETS = [
  {
    key: 'wallpaper',
    alpha: false,
    grid: 'wallpaper',
    colors: 24,
    prompt:
      'Pixel art background tile: the interior wall of a Korean noble house (반가) sarangbang study room, ' +
      'flat frontal elevation. Warm ivory hanji paper panels divided by dark walnut wooden posts and a heavy lintel beam, ' +
      'one softly glowing latticed changho window (창호) whose paper diffuses warm light, thin lattice drawn as single-pixel lines. ' +
      'The wall is COMPLETELY EMPTY — no furniture, no shelves, no scrolls, no hanging objects. ' +
      'No floor and no ceiling visible, only the wall plane filling the entire frame. ' +
      `${DOT_STYLE}, ${DOT_TONE}, ${DOT_LIGHT}, full-bleed background plate, no text, no watermark, no border`,
  },
  {
    key: 'flooring',
    alpha: false,
    grid: 'flooring',
    colors: 20,
    prompt:
      'Pixel art floor plate: dark polished daecheong-maru (대청마루) wooden floor of a Korean hanok, ' +
      'seen from a low angle above. Evenly spaced parallel floorboards receding gently away from the viewer, ' +
      'all boards the same width, board seams drawn as single-pixel dark lines. ' +
      'MUTED desaturated dark walnut brown — NOT orange, NOT bright, NOT glossy; only a faint amber sheen. ' +
      'EVEN ambient light across the whole plate: no spotlight, no vignette, no large dark blob, ' +
      'no bright hotspot, no visible vanishing point, no seam splitting the plate into halves. ' +
      'The floor is COMPLETELY EMPTY — no furniture, no rugs, no cushions, no objects at all. ' +
      'No walls, no horizon, no ceiling — only the floor plane filling the entire frame, wide horizontal composition. ' +
      `${DOT_STYLE}, ${DOT_TONE}, ${DOT_LIGHT}, full-bleed background plate, no text, no watermark, no border`,
  },
  {
    key: 'altar',
    alpha: true,
    grid: 'altar',
    colors: 20,
    prompt:
      'Pixel art game sprite of a Korean traditional wooden shrine altar (제단): a wide flat lacquered top board ' +
      'on a low soban-style base with short carved legs and a simple apron rail, small brass corner fittings. ' +
      'The top surface is COMPLETELY BARE — nothing placed on it: no candles, no bowls, no incense, no cloth, no offerings. ' +
      'Seen from the front at a slight high angle so the top board reads as a flat surface, symmetrical, ' +
      'wide horizontal composition, the whole altar inside the frame with generous margin on all sides. ' +
      `${DOT_STYLE}, ${DOT_TONE}, ${DOT_LIGHT}, ${DOT_CHROMA}`,
  },
  {
    key: 'candle',
    alpha: true,
    grid: 'candle',
    colors: 14,
    prompt:
      'Pixel art game sprite of a Korean traditional brass candlestick (놋촛대): a slender polished brass stand ' +
      'with a wide round foot, a fluted stem and a small drip tray, holding ONE plain white candle standing upright. ' +
      'The candle is UNLIT — the wick is dark, there is NO flame, NO fire, NO glow, NO smoke. ' +
      'Tall narrow vertical sprite, single object centered upright, whole object inside the frame with generous margin, ' +
      'the bottom of the brass foot is the ground contact line at the bottom center. ' +
      `${DOT_STYLE}, ${DOT_TONE}, ${DOT_LIGHT}, ${DOT_CHROMA}`,
  },
]

// A 경로: 기존 painterly 에셋 → 같은 격자로 도트화
const A_ASSETS = [
  { key: 'wallpaper', src: 'wallpaper.webp', alpha: false, grid: 'wallpaper', colors: 24 },
  { key: 'flooring', src: 'flooring.webp', alpha: false, grid: 'flooring', colors: 20 },
  { key: 'altar', src: 'altar.webp', alpha: true, grid: 'altar', colors: 20 },
  // 요구 3장(벽지·마루·제단) 외 소품 1점 — B 에 촛대가 있어 방 구성이 어긋나면 비교가 성립하지 않는다.
  { key: 'candle', src: 'prop-candle.webp', alpha: true, grid: 'candle', colors: 14 },
]

// ────────────────────────── 크로마키 (도트 전용: 하드 키) ──────────────────────────
// stage-banga.mjs 의 소프트 매트(부분알파+페더)를 **쓰지 않는다** — 도트 아트에서 반투명 가장자리는
// 확대 시 격자를 흐리는 결함이다. 하드 컷 후 pixelate 가 알파를 이진화한다.
const VOID_RGB = [0x1a, 0x13, 0x08]
const G_CUT = 40 // g - max(r,b) 가 이보다 크면 배경
const G_SPILL = 12 // 그 아래 약한 초록은 디스필만

async function hardChromaKey(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const ch = info.channels
  let cut = 0
  for (let i = 0; i < data.length; i += ch) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const base = Math.max(r, b)
    const gd = g - base
    if (gd > G_CUT) {
      data[i] = VOID_RGB[0]
      data[i + 1] = VOID_RGB[1]
      data[i + 2] = VOID_RGB[2]
      data[i + 3] = 0
      cut++
    } else if (gd > G_SPILL) {
      data[i + 1] = base + G_SPILL // despill
    }
  }
  const png = await sharp(data, { raw: { width: info.width, height: info.height, channels: ch } })
    .png()
    .toBuffer()
  return { png, cutRatio: cut / (info.width * info.height) }
}

/** 남은 초록 번짐 — 보이는 픽셀 중 g 우세 비율 */
async function measureGreen(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let visible = 0
  let green = 0
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] < 16) continue
    visible++
    if (data[i + 1] - Math.max(data[i], data[i + 2]) > G_SPILL) green++
  }
  return visible ? green / visible : 0
}

async function trimAlpha(buf) {
  try {
    return await sharp(buf).trim({ threshold: 10 }).toBuffer()
  } catch {
    return buf // 전면 균일 등 트림 불가 → 원본 유지
  }
}

// ───────────────────────────── B 생성 ─────────────────────────────
function isAuthError(e) {
  const s = String(e?.message || e)
  return /401|403|API_KEY_INVALID|API key not valid|PERMISSION_DENIED|UNAUTHENTICATED/i.test(s)
}

let model = null
async function callModel(prompt) {
  if (apiCalls >= MAX_API_CALLS) throw new Error(`API 예산 소진(${MAX_API_CALLS}회)`)
  if (!model) {
    if (!KEY) throw new Error('GEMINI 키 없음 — .env.local의 GEMINI_API_KEY 확인')
    model = new GoogleGenerativeAI(KEY).getGenerativeModel({ model: MODEL })
  }
  apiCalls++
  const res = await model.generateContent([{ text: prompt }])
  const cand = res.response.candidates?.[0]
  const img = cand?.content?.parts?.find((p) => p.inlineData)?.inlineData
  if (!img) throw new Error('이미지 파트 없음 — ' + JSON.stringify(cand)?.slice(0, 240))
  return Buffer.from(img.data, 'base64')
}

async function ensureRaw(asset, { regen }) {
  const raw = path.join(RAW_DIR, `b-${asset.key}.png`)
  if (!regen && existsSync(raw)) return raw
  console.log(`  · 생성 (${MODEL})  [API ${apiCalls + 1}/${MAX_API_CALLS}]`)
  let buf
  try {
    buf = await callModel(asset.prompt)
  } catch (e) {
    if (isAuthError(e) || retryBudget <= 0) throw e
    retryBudget--
    console.log(`  · 재시도 1회 (남은 예산 ${retryBudget}) — ${String(e?.message || e).slice(0, 100)}`)
    buf = await callModel(asset.prompt)
  }
  await mkdir(RAW_DIR, { recursive: true })
  await writeFile(raw, buf)
  return raw
}

// ───────────────────────────── 공통 빌드 ─────────────────────────────
/** 원본 버퍼/경로 → 도트 정규화 → assets-src 저장. base(도트 격자 PNG)는 조립에 재사용. */
async function buildDot(input, { key, prefix, alpha, grid, colors, sat }) {
  let src = input
  let greenBefore = null
  if (alpha && prefix === 'b') {
    const keyed = await hardChromaKey(await sharp(src).toBuffer())
    greenBefore = await measureGreen(keyed.png)
    src = await trimAlpha(keyed.png)
  } else if (alpha) {
    src = await trimAlpha(await sharp(src).toBuffer())
  }

  const g = GRID[grid]
  const r = await pixelate(src, {
    px: g.w,
    pxH: g.h,
    fit: alpha ? 'inside' : 'cover',
    colors,
    scale: SCALE,
    sat,
  })
  const file = path.join(OUT_DIR, `${prefix}-${key}.webp`)
  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(file, r.webp)
  return { key, prefix, file, ...r, greenBefore }
}

// ───────────────────────────── 조립 (도트 해상도) ─────────────────────────────
const DARK = { r: 0x1a, g: 0x13, b: 0x08, alpha: 1 }

/** 도트 좌표에서 방 하나를 조립하고 마지막에만 ×SCALE nearest 업스케일 */
async function assemblePanel(byKey) {
  const layers = []
  const wall = byKey.wallpaper
  const floor = byKey.flooring
  if (wall) layers.push({ input: wall.basePng, left: 0, top: 0 })
  if (floor) layers.push({ input: floor.basePng, left: 0, top: PANEL.h - floor.baseH })

  const altar = byKey.altar
  if (altar) {
    layers.push({
      input: altar.basePng,
      left: Math.round(PANEL.w * LAYOUT.altarCX - altar.baseW / 2),
      top: Math.round(PANEL.h * LAYOUT.altarCY - altar.baseH / 2),
    })
  }
  const candle = byKey.candle
  if (candle) {
    for (const cx of LAYOUT.propX) {
      layers.push({
        input: candle.basePng,
        left: Math.round(PANEL.w * cx - candle.baseW / 2),
        top: LAYOUT.anchorY - candle.baseH,
      })
    }
  }
  if (!layers.length) return null

  const base = await sharp({ create: { width: PANEL.w, height: PANEL.h, channels: 4, background: DARK } })
    .composite(layers)
    .png()
    .toBuffer()
  return sharp(base)
    .resize(PANEL.w * SCALE, PANEL.h * SCALE, { kernel: 'nearest' })
    .png()
    .toBuffer()
}

// ───────────────────────────── 검수 프리뷰 ─────────────────────────────
const PW = PANEL.w * SCALE // 640
const PH = PANEL.h * SCALE // 704
const PAD = 28
const TITLE_H = 66
const LABEL_H = 44
const CAP_H = 58
const CANVAS = {
  w: PAD * 3 + PW * 2,
  h: TITLE_H + LABEL_H + PH + CAP_H + PAD,
}
const PANEL_TOP = TITLE_H + LABEL_H

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function captionOf(byKey) {
  const keys = ['wallpaper', 'flooring', 'altar', 'candle']
  const got = keys.filter((k) => byKey[k])
  if (!got.length) return '생성 실패 — 산출 없음'
  const cols = got.map((k) => byKey[k].colorsUsed)
  const kb = got.reduce((s, k) => s + byKey[k].webp.length, 0) / 1024
  return `격자 ${PANEL.w}×${PANEL.h} 도트 ×${SCALE}   팔레트 ${Math.min(...cols)}~${Math.max(...cols)}색   에셋 ${got.length}점 ${kb.toFixed(0)}KB`
}

async function makePreview(aByKey, bByKey) {
  const [aPanel, bPanel] = await Promise.all([assemblePanel(aByKey), assemblePanel(bByKey)])
  const layers = []
  if (aPanel) layers.push({ input: aPanel, left: PAD, top: PANEL_TOP })
  if (bPanel) layers.push({ input: bPanel, left: PAD * 2 + PW, top: PANEL_TOP })
  if (!layers.length) return null

  const FONT = 'Malgun Gothic, Segoe UI, sans-serif'
  const col = [PAD, PAD * 2 + PW]
  const meta = [
    { tag: 'A', name: '후처리 (기존 반가 에셋 → 픽셀화)', tint: '#f2c879', by: aByKey },
    { tag: 'B', name: '네이티브 도트 (Gemini 16-bit 생성)', tint: '#8fd0ff', by: bByKey },
  ]
  const parts = [
    `<rect x="0" y="0" width="${CANVAS.w}" height="${CANVAS.h}" fill="#0d0b09"/>`,
    `<text x="${PAD}" y="42" font-family="${FONT}" font-size="27" font-weight="700" fill="#efe4d0">신당 안4 「도트 신당」 — 반가 시범 A/B 비교</text>`,
    `<text x="${CANVAS.w - PAD}" y="42" text-anchor="end" font-family="${FONT}" font-size="16" fill="#7d7264">CEO 검수용 · 미배선 · assets-src (public 밖)</text>`,
  ]
  meta.forEach((m, i) => {
    const x = col[i]
    parts.push(
      `<rect x="${x}" y="${TITLE_H}" width="${PW}" height="${LABEL_H - 8}" rx="6" fill="#1c1712" stroke="${m.tint}" stroke-opacity="0.45"/>`,
      `<text x="${x + 14}" y="${TITLE_H + 26}" font-family="${FONT}" font-size="19" font-weight="700" fill="${m.tint}">${m.tag} · ${esc(m.name)}</text>`,
      `<rect x="${x - 3}" y="${PANEL_TOP - 3}" width="${PW + 6}" height="${PH + 6}" fill="none" stroke="${m.tint}" stroke-opacity="0.35" stroke-width="2"/>`,
      `<text x="${x}" y="${PANEL_TOP + PH + 32}" font-family="${FONT}" font-size="15" fill="#9a8c78">${esc(captionOf(m.by))}</text>`
    )
  })
  parts.push(
    `<text x="${PAD}" y="${CANVAS.h - 12}" font-family="${FONT}" font-size="14" fill="#6c6154">조립 규약 동일: 벽지 h62% · 마루 h40% · 제단 중심(50,47) · 소품 접지선 y=${LAYOUT.anchorY} — 도트 해상도에서 조립 후 ×${SCALE} nearest 확대</text>`
  )
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS.w}" height="${CANVAS.h}">${parts.join('')}</svg>`

  const out = path.join(OUT_DIR, 'preview-dot.webp')
  const info = await sharp(Buffer.from(svg))
    .composite(layers)
    .webp({ quality: 92 })
    .toFile(out)
  return { out, bytes: info.size }
}

// ──────────────────────────── main ────────────────────────────
const args = process.argv.slice(2)
const regen = args.includes('--regen')
const aOnly = args.includes('--a-only')
// 위치 인자 = 재생성 대상 1종 한정(--regen 과 함께). 조립·프리뷰는 항상 전 에셋으로 만든다.
const only = args.find((a) => !a.startsWith('--'))
if (only && !B_ASSETS.some((b) => b.key === only)) {
  console.error('unknown asset key:', only, '— 가능:', B_ASSETS.map((b) => b.key).join(', '))
  process.exit(1)
}

console.log(`모델: ${MODEL}\n원본 캐시: ${RAW_DIR}\n산출: ${OUT_DIR}\n`)
await mkdir(OUT_DIR, { recursive: true })

const results = []
const aByKey = {}
const bByKey = {}

console.log('── A. 후처리 경로 (기존 반가 에셋 → 픽셀화, API 0회) ──')
for (const a of A_ASSETS) {
  const src = path.join(SRC_DIR, a.src)
  if (!existsSync(src)) {
    console.error(`  ✖ ${a.key}: 원본 없음 ${src}`)
    results.push({ key: `a-${a.key}`, ok: false, error: '원본 없음' })
    continue
  }
  try {
    // painterly → 도트 변환은 평균화로 채도가 죽는다. 약한 보정으로 16-bit 톤을 되살린다.
    const r = await buildDot(src, { ...a, prefix: 'a', sat: 1.18 })
    aByKey[a.key] = r
    results.push({ ...r, key: `a-${a.key}`, ok: true })
    console.log(
      `  ✔ a-${a.key}.webp  격자 ${r.baseW}×${r.baseH} → ${r.outW}×${r.outH}  팔레트 ${r.colorsUsed}색  ${(r.webp.length / 1024).toFixed(1)}KB`
    )
  } catch (e) {
    console.error(`  ✖ a-${a.key}:`, String(e?.message || e).slice(0, 200))
    results.push({ key: `a-${a.key}`, ok: false, error: String(e?.message || e).slice(0, 200) })
  }
}

if (!aOnly) {
  console.log('\n── B. 네이티브 도트 경로 (Gemini 생성 → 크로마키 → 격자 정규화) ──')
  for (const b of B_ASSETS) {
    try {
      const raw = await ensureRaw(b, { regen: regen && (!only || only === b.key) })
      const r = await buildDot(raw, { ...b, prefix: 'b', sat: 1 })
      bByKey[b.key] = r
      results.push({ ...r, key: `b-${b.key}`, ok: true })
      const gi = r.greenBefore != null ? `  잔류초록 ${(r.greenBefore * 100).toFixed(2)}%` : ''
      console.log(
        `  ✔ b-${b.key}.webp  격자 ${r.baseW}×${r.baseH} → ${r.outW}×${r.outH}  팔레트 ${r.colorsUsed}색  ${(r.webp.length / 1024).toFixed(1)}KB${gi}`
      )
    } catch (e) {
      if (isAuthError(e)) {
        console.error('\n✖✖ API 키 인증 실패 — 즉시 중단. 재시도하지 않음.')
        console.error('   ', String(e?.message || e).slice(0, 300))
        break
      }
      console.error(`  ✖ b-${b.key}:`, String(e?.message || e).slice(0, 200))
      results.push({ key: `b-${b.key}`, ok: false, error: String(e?.message || e).slice(0, 200) })
    }
  }
}

const pv = await makePreview(aByKey, bByKey)
if (pv) console.log(`\n✔ preview-dot.webp ${(pv.bytes / 1024).toFixed(1)}KB → ${pv.out}`)

console.log(`\n── 요약 (API ${apiCalls}회 사용 / 예산 ${MAX_API_CALLS}) ──`)
for (const r of results) {
  if (!r.ok) console.log(`  ✖ ${r.key}: ${r.error}`)
  else console.log(`  ✔ ${r.key}  ${r.baseW}×${r.baseH}도트  ${r.colorsUsed}색  ${(r.webp.length / 1024).toFixed(1)}KB`)
}
const failed = results.filter((r) => !r.ok)
const aOk = A_ASSETS.every((a) => aByKey[a.key])
const bOk = aOnly || B_ASSETS.every((b) => bByKey[b.key])
console.log(`\nA 경로 ${aOk ? 'OK' : 'FAIL'} · B 경로 ${bOk ? 'OK' : 'FAIL'} · 프리뷰 ${pv ? 'OK' : 'FAIL'}`)
process.exit(failed.length || !aOk || !bOk || !pv ? 1 : 0)
