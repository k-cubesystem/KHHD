// 신당 의식 R-2 「오방기 점괘」 깃발 에셋 (PRD-shrine-rituals-v1 §2)
//
// 굽는 것은 **다섯 장**이다 — 오방색 깃발 하나씩(홍·백·황·청·녹).
//   obangki-{red,white,yellow,blue,green}.webp   펼쳐진 깃발 한 기(깃대 포함)
//
// ⚠️ 접힌 상태는 굽지 않는다. PRD 는 접힌/펼친 2상태를 말하지만, 접힘은 화면에서
//    **말아둔 깃발(런타임 CSS 도형)** 이 맡고 펼침은 `.obangki-unfurl` 의 scaleY·rotate 가 맡는다.
//    말린 기 다섯은 서로 같아야 하므로(색이 미리 보이면 뽑기가 아니라 고르기가 된다)
//    애초에 색이 있는 스프라이트로 만들 수가 없다 — 그래서 스프라이트는 5장으로 끝난다.
//
// 사용:
//   node scripts/shrine-assets/ritual-obangki.mjs           # 누락분만 (멱등)
//   node scripts/shrine-assets/ritual-obangki.mjs red        # 하나만
//   node scripts/shrine-assets/ritual-obangki.mjs --regen    # 원본부터 재생성
//   node scripts/shrine-assets/ritual-obangki.mjs --rekey    # 원본 캐시로 키잉만 (API 0회)
//
// 원칙 (ritual-talisman.mjs · stage-banga.mjs 와 동일)
//   - STYLE / LIGHT / CHROMA 를 **한 글자도 바꾸지 않고 복제**한다.
//   - 다섯 장은 **색 이름 한 단어만 다르고 나머지 문구가 완전히 같다**. 한 문장이라도 갈리면
//     기하(깃대 위치·기폭 비율·꼬리 수)가 서로 달라져 다섯 기가 한 다발로 안 읽힌다.
//   - 순녹색(#00FF00) 배경 생성 → 하드 크로마키 → 트림. 접지 그림자는 굽지 않는다(런타임 담당).
//
// 산출: public/shrine/ritual/obangki-*.webp
// 검수: assets-src/shrine/ritual-obangki-check.webp  (5색 나란히 + 펼침 중간 시뮬)
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
const RAW_DIR = process.env.RITUAL_RAW_DIR || path.join(process.env.TEMP || '/tmp', 'shrine-ritual-obangki-raw')

/** 총 생성 상한(재시도 포함). 5장 × (1회 + 재시도 2회) = 15. */
const API_BUDGET = 15
let apiCalls = 0

// ────────────────────────────── 프롬프트 ──────────────────────────────
// STYLE·LIGHT·CHROMA 는 ritual-talisman.mjs 원문 그대로.
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
 * 깃발 한 기의 묘사. `{COLOR}` 두 자리에만 색 이름이 들어가고 나머지는 다섯 장이 동일하다.
 * 관찰 가능한 사실(개수·방향·비율)로만 쓰여 있다 — 지시문·강조어를 넣으면 모델이 그림 대신
 * 설명도(캐릭터 시트)를 그린다.
 */
const FLAG_PROMPT =
  'A single Korean shaman ritual flag on a slim bamboo pole, seen flat from the front. ' +
  'A rectangular banner of {COLOR} silk hangs from a short crossbar at the top of the pole, ' +
  'twice as tall as it is wide, its lower edge cut into three short pointed tails. ' +
  'Four soft vertical folds run down the silk and the bottom edge drifts a little to the right. ' +
  'A narrow strip of the same {COLOR} silk binds the banner to each end of the crossbar. ' +
  // ⚠️ 두 번 어긋난 자리다. "single"만으로는 백기에 여분 깃대가 하나 더 그려졌고(1·2차),
  //    "기폭 중앙을 지난다"로 고치자 이번엔 깃대가 천 **앞으로** 지나갔다(3차).
  //    정상 4기의 실제 모습을 그대로 적는다 — 깃대는 천 뒤에 가려 위아래로만 보인다.
  'Exactly one vertical pole in the whole picture, and it passes behind the banner: ' +
  'the pole is visible only above the crossbar and below the bottom hem, never across the fabric. ' +
  'The bamboo pole is pale honey brown with two faint nodes and continues a short way below the banner. ' +
  'Portrait proportion, one unit wide and two units tall, the flag upright and centred with an even margin. ' +
  `${STYLE}, ${LIGHT}, ${CHROMA}`

/** 색 이름 — 두 단어로 통일한다(단어 수가 달라지면 문장 무게가 갈려 기하까지 흔들린다). */
const COLORS = [
  { key: 'red', word: 'vermilion red' },
  { key: 'white', word: 'ivory white' },
  { key: 'yellow', word: 'golden yellow' },
  { key: 'blue', word: 'indigo blue' },
  { key: 'green', word: 'pine green' },
]

/**
 * @typedef {object} RitualAsset
 * @property {string} key
 * @property {string} file
 * @property {number} outW  최종 스프라이트 폭(px)
 * @property {number|null} outH  고정 높이(px). null 이면 내용물 종횡비가 정한다.
 * @property {string} prompt
 */

/** @type {RitualAsset[]} — 화면 무대의 깃발 천은 46×92px(1:2). 같은 비로 구워두면 CSS 가 늘일 일이 없다. */
const ASSETS = COLORS.map(({ key, word }) => ({
  key,
  file: `obangki-${key}.webp`,
  outW: 256,
  outH: 512,
  prompt: FLAG_PROMPT.replaceAll('{COLOR}', word),
}))

// ───────────────────── 크로마키 (ritual-talisman.mjs 규약 복제) ─────────────────────
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
// 화면(ObangkiSheet)의 무대 그대로 본다 — 실제로 보게 될 것만 본다.
//   윗줄 ①~⑤ 오방색 깃발 5기 나란히(펼친 상태)
//   아랫줄 ⑥ 말아둔 기(런타임 CSS 도형 재현) ⑦ 펼침 45% 시뮬(위끝 고정 scaleY)
const DARK = { r: 0x16, g: 0x14, b: 0x0f, alpha: 1 }
/** 무대 실측(ObangkiSheet 깃발 천 46×92) 의 3배 — 검수는 육안 판정이라 확대해 본다 */
const CELL = { w: 138, h: 276 }
const PAD = 26
const GAP = 18

/** 세로 그라디언트 판 — 말아둔 기(런타임 linear-gradient) 근사. */
function verticalGradient(w, h, stops) {
  const data = Buffer.alloc(w * h * 4)
  for (let y = 0; y < h; y += 1) {
    const p = h === 1 ? 0 : y / (h - 1)
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
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4
      data[i] = mix(0)
      data[i + 1] = mix(1)
      data[i + 2] = mix(2)
      data[i + 3] = 255
    }
  }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } })
}

async function makeCheckSheet() {
  const present = ASSETS.filter((a) => existsSync(path.join(OUT_DIR, a.file)))
  if (present.length === 0) return null

  const cells = []
  for (const a of present) {
    cells.push(await sharp(path.join(OUT_DIR, a.file)).resize(CELL.w, CELL.h, { fit: 'fill' }).png().toBuffer())
  }

  // ⑥ 말아둔 기 — .obangki-cloth 안의 캡슐(#D8C9A6 → #5C4B2E) + 붉은 매듭 띠
  const rollW = Math.round(CELL.w * 0.42)
  const rollH = Math.round(CELL.h * 0.38)
  const bandH = Math.max(3, Math.round(rollH * 0.09))
  const roll = await verticalGradient(rollW, rollH, [
    { at: 0, c: [0xd8, 0xc9, 0xa6] },
    { at: 0.62, c: [0x8e, 0x7a, 0x54] },
    { at: 1, c: [0x5c, 0x4b, 0x2e] },
  ])
    .composite([
      {
        input: await verticalGradient(Math.round(rollW * 0.56), bandH, [
          { at: 0, c: [0x9e, 0x2b, 0x2b] },
          { at: 1, c: [0x6a, 0x1a, 0x1a] },
        ])
          .png()
          .toBuffer(),
        left: Math.round(rollW * 0.22),
        top: Math.round(rollH * 0.42),
      },
    ])
    .png()
    .toBuffer()
  const rollCell = await sharp({ create: { width: CELL.w, height: CELL.h, channels: 4, background: DARK } })
    .composite([{ input: roll, left: Math.round((CELL.w - rollW) / 2), top: Math.round(CELL.h * 0.12) }])
    .png()
    .toBuffer()

  // ⑦ 펼침 45% — 위끝을 고정한 scaleY(런타임 .obangki-unfurl 의 transform-origin: 50% 0)
  const UNFURL = 0.45
  const midH = Math.max(1, Math.round(CELL.h * UNFURL))
  const midFlag = await sharp(path.join(OUT_DIR, present[0].file))
    .resize(CELL.w, midH, { fit: 'fill' })
    .png()
    .toBuffer()
  const midCell = await sharp({ create: { width: CELL.w, height: CELL.h, channels: 4, background: DARK } })
    .composite([{ input: midFlag, left: 0, top: 0 }])
    .png()
    .toBuffer()

  const row1 = cells.length
  const row2 = 2
  const cols = Math.max(row1, row2)
  const W = PAD * 2 + CELL.w * cols + GAP * (cols - 1)
  const H = PAD * 3 + CELL.h * 2
  const composite = []
  cells.forEach((buf, i) => composite.push({ input: buf, left: PAD + (CELL.w + GAP) * i, top: PAD }))
  composite.push({ input: rollCell, left: PAD, top: PAD * 2 + CELL.h })
  composite.push({ input: midCell, left: PAD + CELL.w + GAP, top: PAD * 2 + CELL.h })

  const out = path.join(QA_DIR, 'ritual-obangki-check.webp')
  await mkdir(QA_DIR, { recursive: true })
  const info = await sharp({ create: { width: W, height: H, channels: 4, background: DARK } })
    .composite(composite)
    .webp({ quality: 90 })
    .toFile(out)
  return { out, bytes: info.size, W, H, count: cells.length }
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
  console.log('  윗줄 오방색 5기(펼친 상태) · 아랫줄 말아둔 기 / 펼침 45% 시뮬')
}

console.log(`\nAPI 호출 ${apiCalls}/${API_BUDGET}회`)
process.exit(results.some((r) => !r.ok) ? 1 : 0)
