// 신당 의식 R-3 「백일기도」 완주 보상 에셋 (PRD-shrine-rituals-v1 §3)
//
// 굽는 것은 **네 장**이다 — 회차 트로피 3등급 + 신당에 거는 완주 아이템 1종.
//   trophy-{wood,brass,gold}.webp   완주패(完走牌). 1~2회차 목패 · 3~5회차 놋패 · 6회차부터 금패
//   cord-baekil.webp                「백일 소원끈」 — placement_layer='hanging' 카탈로그 품목
//
// ⚠️ 트로피 세 장은 **재질 단어 두 마디만 다르고 나머지 문구가 완전히 같다**. 한 문장이라도 갈리면
//    기하(명패 비율·받침 폭·끈 위치)가 서로 달라져 세 개가 한 세트로 안 읽힌다 — 진열장에 나란히 선다.
//
// ⚠️ 소원끈은 카탈로그 품목이라 산출 위치가 다르다. 기존 12품목과 같은 폴더(public/shrine/items)에
//    두고 sprite_url 이 그 경로를 가리킨다(마이그레이션 20260730_shrine_vows.sql 의 시드).
//    트로피는 카탈로그 품목이 아니라 의식 UI 전용이라 public/shrine/ritual 에 남는다.
//
// 사용:
//   node scripts/shrine-assets/ritual-baekil.mjs           # 누락분만 (멱등)
//   node scripts/shrine-assets/ritual-baekil.mjs gold       # 하나만
//   node scripts/shrine-assets/ritual-baekil.mjs --regen    # 원본부터 재생성
//   node scripts/shrine-assets/ritual-baekil.mjs --rekey    # 원본 캐시로 키잉만 (API 0회)
//
// 원칙 (ritual-obangki.mjs · ritual-talisman.mjs 와 동일)
//   - STYLE / LIGHT / CHROMA 를 **한 글자도 바꾸지 않고 복제**한다.
//   - 지시문·강조어(CRITICAL, must not …)를 넣지 않는다. 넣으면 모델이 그림 대신 설명도를 그린다.
//   - 방향·가림 관계를 **관찰된 사실로** 적는다("받침은 명패 양옆으로 드러난다").
//   - 순녹색(#00FF00) 배경 생성 → 하드 크로마키 → 트림. 접지 그림자는 굽지 않는다(런타임 담당).
//
// 산출: public/shrine/ritual/trophy-*.webp · public/shrine/items/cord-baekil.webp
// 검수: assets-src/shrine/ritual-baekil-check.webp  (트로피 3등급 나란히 + 소원끈)
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
const RITUAL_DIR = path.join(ROOT, 'public', 'shrine', 'ritual')
const ITEMS_DIR = path.join(ROOT, 'public', 'shrine', 'items')
/** 검수 산출물 — 제품 번들(public)에 QA 이미지를 흘리지 않는다 */
const QA_DIR = path.join(ROOT, 'assets-src', 'shrine')
const RAW_DIR = process.env.RITUAL_RAW_DIR || path.join(process.env.TEMP || '/tmp', 'shrine-ritual-baekil-raw')

/** 총 생성 상한(재시도 포함). 4장 × (1회 + 재시도 1회) = 8. 예산 ~$0.2 안. */
const API_BUDGET = 8
let apiCalls = 0

// ────────────────────────────── 프롬프트 ──────────────────────────────
// STYLE·LIGHT·CHROMA 는 ritual-obangki.mjs 원문 그대로.
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
 * 완주패 한 점의 묘사. `{MATERIAL}` 두 자리에만 재질 이름이 들어가고 나머지는 세 장이 동일하다.
 * 관찰 가능한 사실(개수·방향·가림 관계·비율)로만 쓰여 있다.
 * 명패와 받침이 어떻게 만나는지를 적어 두는 이유는 오방기의 깃대 사고와 같다 —
 * 안 적으면 받침이 명패 앞을 가리거나 두 장짜리 판이 그려진다.
 */
const TROPHY_PROMPT =
  'A small Korean commemorative tablet standing on a low base, seen flat from the front. ' +
  'The tablet is {MATERIAL}, upright, half as wide as it is tall, and its top edge is cut into a shallow three-peaked crown. ' +
  'The lower end of the tablet sits in a slot across the middle of a wider oblong base, ' +
  'and the base stays visible on both sides of the tablet, never in front of it. ' +
  'A plain sunken oval panel is centred on the face of the tablet with a slightly raised rim and nothing inside it. ' +
  'A thin red cord is tied around the tablet just below the crown and its two short ends hang down along the left side. ' +
  'The base is dark walnut wood with a simple moulded edge. ' +
  'The whole piece is upright and centred with an even margin, a little taller than it is wide. ' +
  `${STYLE}, ${LIGHT}, ${CHROMA}`

/** 재질 이름 — 두 단어로 통일한다(단어 수가 달라지면 문장 무게가 갈려 기하까지 흔들린다). */
const TROPHY_TIERS = [
  { key: 'wood', word: 'dark walnut' },
  { key: 'brass', word: 'aged brass' },
  { key: 'gold', word: 'polished gold' },
]

/**
 * 「백일 소원끈」 — 처마에 매다는 오색 끈. 오방색 다섯 가닥이 백 일의 걸음을 뜻한다.
 * 오방기와 같은 다섯 색을 쓰되 여기서는 한 그림 안에 다섯이 함께 있다.
 */
const CORD_PROMPT =
  'A hanging Korean wish-cord ornament, seen flat from the front. ' +
  'A short horizontal wooden bar hangs from one loop of cord at the top. ' +
  'Five narrow silk ribbons hang side by side from the bar in a row, ' +
  'the first vermilion red, the second ivory white, the third golden yellow, the fourth indigo blue, the fifth pine green. ' +
  'Each ribbon is twice as long as the bar is wide and ends in a slanted cut, and the five lower ends drift a little to the right. ' +
  'A small round knot is tied at the middle of every ribbon with one tiny brass bead hanging just below it. ' +
  'The bar is pale honey brown and stays visible above all five ribbons, never in front of them. ' +
  'Portrait proportion, one unit wide and two units tall, the ornament hanging straight and centred with an even margin. ' +
  `${STYLE}, ${LIGHT}, ${CHROMA}`

/**
 * @typedef {object} RitualAsset
 * @property {string} key
 * @property {string} file
 * @property {string} dir   산출 폴더(트로피=ritual, 카탈로그 품목=items)
 * @property {number} outW  최종 스프라이트 폭(px)
 * @property {number|null} outH  고정 높이(px). null 이면 내용물 종횡비가 정한다.
 * @property {boolean} [box]  상자 고정 + 밑변 정렬(비율 보존). 세 등급을 한 선반에 세울 때 쓴다.
 * @property {string} prompt
 */

/** @type {RitualAsset[]} */
const ASSETS = [
  // 트로피 세 등급은 상자를 384×512 로 통일하고 밑변만 맞춘다(box). 비율은 각자 그대로다 —
  // 늘려서 맞추면 받침 두께·명패 폭이 등급마다 달라 보여 한 세트로 안 읽힌다.
  ...TROPHY_TIERS.map(({ key, word }) => ({
    key,
    file: `trophy-${key}.webp`,
    dir: RITUAL_DIR,
    outW: 384,
    outH: 512,
    box: true,
    prompt: TROPHY_PROMPT.replaceAll('{MATERIAL}', word),
  })),
  {
    key: 'cord',
    file: 'cord-baekil.webp',
    dir: ITEMS_DIR,
    // 걸이(hanging) 품목은 무대에서 세로로 길게 매달린다 — 오방기 천과 같은 1:2 로 굽는다.
    outW: 256,
    outH: 512,
    prompt: CORD_PROMPT,
  },
]

// ───────────────────── 크로마키 (ritual-obangki.mjs 규약 복제) ─────────────────────
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

/**
 * 트림된 내용물을 최종 규격으로.
 *   box=true : 상자 크기를 고정하고 내용물은 **비율 그대로** 넣어 밑변을 상자 아래에 붙인다.
 *              같은 문구로 구워도 모델이 내는 세로비가 장마다 조금씩 달라(476/352/606) 화면에서
 *              높이를 맞추면 폭이 제각각이 된다. 상자를 통일하고 접지선만 맞추면 세 등급이
 *              **한 선반 위에 선 세 물건**으로 읽힌다 — 비율을 강제로 늘리지 않으니 왜곡도 없다.
 *   outH     : 그 비로 채운다(무대 비와 1:1).
 *   그 외     : 내용물 종횡비가 정한다.
 */
async function toFinal(pngBuf, asset) {
  const trimmed = await sharp(pngBuf).trim({ threshold: 10 }).toBuffer()

  if (asset.box) {
    const fitted = await sharp(trimmed)
      .resize({ width: asset.outW, height: asset.outH, fit: 'inside' })
      .png()
      .toBuffer()
    const meta = await sharp(fitted).metadata()
    // 투명 여백의 RGB 도 VOID_RGB 로 둔다 — 0,0,0 을 남기면 리사이즈·인코딩 때 검은 테가 번진다
    return sharp({
      create: {
        width: asset.outW,
        height: asset.outH,
        channels: 4,
        background: { r: VOID_RGB[0], g: VOID_RGB[1], b: VOID_RGB[2], alpha: 0 },
      },
    })
      .composite([
        {
          input: fitted,
          left: Math.round((asset.outW - (meta.width ?? asset.outW)) / 2),
          top: asset.outH - (meta.height ?? asset.outH),
        },
      ])
      .webp({ quality: 90, alphaQuality: 100 })
      .toBuffer()
  }

  const resized = asset.outH
    ? sharp(trimmed).resize({ width: asset.outW, height: asset.outH, fit: 'fill' })
    : sharp(trimmed).resize({ width: asset.outW, fit: 'inside' })
  return resized.webp({ quality: 90, alphaQuality: 100 }).toBuffer()
}

async function buildAsset(asset, { regen, rekey }) {
  const rawPng = path.join(RAW_DIR, `${asset.key}.png`)
  const outWebp = path.join(asset.dir, asset.file)

  async function ensureRaw(force) {
    if (!force && existsSync(rawPng)) return
    console.log(`  · 생성 (${MODEL}) — API ${apiCalls + 1}/${API_BUDGET}`)
    const buf = await callModel(asset.prompt)
    await mkdir(path.dirname(rawPng), { recursive: true })
    await writeFile(rawPng, buf)
  }

  await ensureRaw(regen && !rekey)
  await mkdir(asset.dir, { recursive: true })

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
// 실제로 보게 될 것만 본다.
//   윗줄 ①~③ 트로피 3등급 나란히(진열장 순서 그대로 — 목→놋→금)
//   아랫줄 ④ 백일 소원끈(신당 걸이 층에 매달린 크기)
const DARK = { r: 0x16, g: 0x14, b: 0x0f, alpha: 1 }
/** 육안 판정이라 확대해 본다. 칸 비는 산출 스프라이트 비 그대로(트로피 3:4 · 걸이 1:2) */
const TROPHY_CELL = { w: 192, h: 256 }
const CORD_CELL = { w: 138, h: 276 }
const PAD = 26
const GAP = 18

async function makeCheckSheet() {
  const present = ASSETS.filter((a) => existsSync(path.join(a.dir, a.file)))
  if (present.length === 0) return null

  const trophies = present.filter((a) => a.dir === RITUAL_DIR)
  const cords = present.filter((a) => a.dir === ITEMS_DIR)

  /** 칸 안에 밑변을 맞춰 앉힌다 — 진열장에서 실제로 그렇게 선다. */
  async function bottomCell(file, cell) {
    const fitted = await sharp(file)
      .resize(cell.w, cell.h, { fit: 'inside', withoutEnlargement: false })
      .png()
      .toBuffer()
    const meta = await sharp(fitted).metadata()
    return sharp({ create: { width: cell.w, height: cell.h, channels: 4, background: DARK } })
      .composite([
        {
          input: fitted,
          left: Math.round((cell.w - (meta.width ?? cell.w)) / 2),
          top: cell.h - (meta.height ?? cell.h),
        },
      ])
      .png()
      .toBuffer()
  }

  const trophyCells = []
  for (const a of trophies) trophyCells.push(await bottomCell(path.join(a.dir, a.file), TROPHY_CELL))
  const cordCells = []
  for (const a of cords) cordCells.push(await bottomCell(path.join(a.dir, a.file), CORD_CELL))

  const topW = trophyCells.length ? TROPHY_CELL.w * trophyCells.length + GAP * (trophyCells.length - 1) : 0
  const botW = cordCells.length ? CORD_CELL.w * cordCells.length + GAP * (cordCells.length - 1) : 0
  const W = PAD * 2 + Math.max(topW, botW)
  const H = PAD * 3 + (trophyCells.length ? TROPHY_CELL.h : 0) + (cordCells.length ? CORD_CELL.h : 0)

  const composite = []
  trophyCells.forEach((buf, i) => composite.push({ input: buf, left: PAD + (TROPHY_CELL.w + GAP) * i, top: PAD }))
  const row2Top = PAD * 2 + (trophyCells.length ? TROPHY_CELL.h : 0)
  cordCells.forEach((buf, i) => composite.push({ input: buf, left: PAD + (CORD_CELL.w + GAP) * i, top: row2Top }))

  const out = path.join(QA_DIR, 'ritual-baekil-check.webp')
  await mkdir(QA_DIR, { recursive: true })
  const info = await sharp({ create: { width: W, height: H, channels: 4, background: DARK } })
    .composite(composite)
    .webp({ quality: 90 })
    .toFile(out)
  return { out, bytes: info.size, W, H, trophies: trophyCells.length, cords: cordCells.length }
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

console.log(`모델: ${MODEL}\n원본 캐시: ${RAW_DIR}\n산출: ${RITUAL_DIR} · ${ITEMS_DIR}\n검수: ${QA_DIR}\n`)

const results = []
for (const asset of targets) {
  const outWebp = path.join(asset.dir, asset.file)
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
  console.log('  윗줄 완주패 목→놋→금 · 아랫줄 백일 소원끈')
}

console.log(`\nAPI 호출 ${apiCalls}/${API_BUDGET}회`)
process.exit(results.some((r) => !r.ok) ? 1 : 0)
