// 신당 의식 연출 고급화 (2026-09-04) — 엽전·오방기 다발 스프라이트
//
// 굽는 것은 **세 장**이다.
//   coin-front.webp      상평통보 글자면(常平通寶) — 길(吉)
//   coin-back.webp       상평통보 등면(戶 + 점 하나) — 흉(凶)
//   obangki-bundle.webp  다섯 깃대를 기폭으로 감아쥔 다발(색이 보이지 않는다)
//
// 엽전은 지금까지 CSS 원 하나에 常 한 글자였다(«웹에서 움직이는 종이쪼가리», CEO 09-04).
// 앞·뒤 두 면이 실제 그림이어야 3D 회전(rotateX)에서 면이 바뀌는 것이 보인다.
// 다발은 CSS 상자 셋(자루·통·띠)이었다 — 실물 다발 한 장으로 바꾼다.
//
// 사용:
//   node scripts/shrine-assets/ritual-chuljeon.mjs            # 누락분만 (멱등)
//   node scripts/shrine-assets/ritual-chuljeon.mjs coin-front  # 하나만
//   node scripts/shrine-assets/ritual-chuljeon.mjs --regen     # 원본부터 재생성
//   node scripts/shrine-assets/ritual-chuljeon.mjs --rekey     # 원본 캐시로 키잉만 (API 0회)
//
// 원칙 (ritual-obangki.mjs 와 동일) — STYLE / LIGHT / CHROMA 는 한 글자도 바꾸지 않고 복제한다.
// 순녹색(#00FF00) 배경 생성 → 하드 크로마키 → 트림. 접지 그림자는 굽지 않는다(런타임 담당).
//
// 산출: public/shrine/ritual/{coin-front,coin-back,obangki-bundle}.webp
// 검수: assets-src/shrine/ritual-chuljeon-check.webp (세 장 나란히, 어두운 무대색 위)
import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from 'dotenv'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

// ⚠️ .env.local 은 **메인 체크아웃만** 로드한다(ritual-obangki.mjs 와 같은 이유 — 워크트리 구키 잔존).
config({ path: 'D:/anti/haehwadang/.env.local' })

const MODEL = process.env.SHRINE_IMAGE_MODEL || 'gemini-3.1-flash-image'
const KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

const ROOT = path.resolve(import.meta.dirname, '../..')
const OUT_DIR = path.join(ROOT, 'public', 'shrine', 'ritual')
const QA_DIR = path.join(ROOT, 'assets-src', 'shrine')
const RAW_DIR = process.env.RITUAL_RAW_DIR || path.join(process.env.TEMP || '/tmp', 'shrine-ritual-chuljeon-raw')

/** 총 생성 상한(재시도 포함). 3장 × (1회 + 재시도 2회) = 9. */
const API_BUDGET = 9
let apiCalls = 0

// ────────────────────────────── 프롬프트 ──────────────────────────────
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

/** 두 면이 **같은 엽전**으로 읽히도록 앞·뒤 문장은 가운데 한 단락만 다르다. */
const COIN_HEAD =
  'A single old Korean bronze coin, Sangpyeong Tongbo, seen flat from directly in front and filling most of the frame. ' +
  'A round coin with a raised outer rim, and a square hole exactly at its centre edged by a raised square rim. '
const COIN_TAIL =
  'Warm aged bronze, soft dark patina resting in the recesses, worn bright highlights along the rims and the tops of the relief. ' +
  'Square picture, the coin centred with an even margin. '
const COIN_FRONT =
  COIN_HEAD +
  'Four raised Chinese characters are cast in relief around the hole, one at each side: 常 above the hole, 平 below it, 通 at the right, 寶 at the left. ' +
  COIN_TAIL +
  `${STYLE}, ${LIGHT}, ${CHROMA}`
const COIN_BACK =
  COIN_HEAD +
  'The face is otherwise plain: one raised Chinese character 戶 above the hole and one small raised round dot below the hole, nothing else on the field. ' +
  COIN_TAIL +
  `${STYLE}, ${LIGHT}, ${CHROMA}`

const BUNDLE =
  'Five slim round bamboo sticks held together as one upright bundle, seen flat from the front. ' +
  'Their bare lower ends spread apart slightly like a narrow fan, pale honey brown with one faint node each. ' +
  'From the middle upward the five sticks are wrapped together inside one thick roll of undyed ivory silk, ' +
  'so that no coloured cloth shows at all; the roll is a little wider than the sticks and its top edge is folded over. ' +
  'A narrow vermilion red silk band is tied around the bundle just below the middle of the roll. ' +
  'Tall picture, two units wide and four units tall, the bundle centred with an even margin. ' +
  `${STYLE}, ${LIGHT}, ${CHROMA}`

/**
 * @typedef {object} RitualAsset
 * @property {string} key
 * @property {string} file
 * @property {number} outW
 * @property {number|null} outH
 * @property {string} prompt
 */

/** @type {RitualAsset[]} */
const ASSETS = [
  { key: 'coin-front', file: 'coin-front.webp', outW: 256, outH: 256, prompt: COIN_FRONT },
  { key: 'coin-back', file: 'coin-back.webp', outW: 256, outH: 256, prompt: COIN_BACK },
  { key: 'obangki-bundle', file: 'obangki-bundle.webp', outW: 256, outH: 512, prompt: BUNDLE },
]

// ───────────────────── 크로마키 (ritual-obangki.mjs 규약 복제) ─────────────────────
const KEY_PROFILES = [
  { hi: 62, lo: 22, spill: 3, shrink: 0.14, feather: 1 },
  { hi: 50, lo: 16, spill: 1, shrink: 0.22, feather: 1 },
  { hi: 40, lo: 10, spill: 0, shrink: 0.3, feather: 2 },
]
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

/** 트림 → 최종 규격. 엽전은 정사각(1:1), 다발은 1:2 로 `fill` 한다 — 늘인 정도를 로그로 남긴다. */
async function toFinal(pngBuf, asset) {
  const { data: trimmed, info: src } = await sharp(pngBuf).trim({ threshold: 10 }).toBuffer({ resolveWithObject: true })
  const resized = asset.outH
    ? sharp(trimmed).resize({
        width: asset.outW,
        height: asset.outH,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
    : sharp(trimmed).resize({ width: asset.outW, fit: 'inside' })
  const buf = await resized.webp({ quality: 90, alphaQuality: 100 }).toBuffer()
  return { buf, srcW: src.width, srcH: src.height }
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

  for (let round = 0; round < 2; round += 1) {
    let best = null
    for (let p = 0; p < KEY_PROFILES.length; p += 1) {
      const keyed = await chromaKey(await sharp(rawPng).toBuffer(), KEY_PROFILES[p])
      const png = await sharp(keyed.data, {
        raw: { width: keyed.width, height: keyed.height, channels: keyed.channels },
      })
        .png()
        .toBuffer()
      const { buf: finalBuf, srcW, srcH } = await toFinal(png, asset)
      const { data, info } = await sharp(finalBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      const fringe = measureFringe(data, info.channels)
      const pass = fringe.ratio <= FRINGE_MAX && fringe.edgeRatio <= EDGE_FRINGE_MAX
      console.log(
        `  · 키잉 P${p + 1} ${info.width}×${info.height} 원본 ${srcW}×${srcH}(${(srcW / srcH).toFixed(2)}:1) ` +
          `fringe=${(fringe.ratio * 100).toFixed(3)}% edge=${(fringe.edgeRatio * 100).toFixed(2)}% ${pass ? 'PASS' : 'retry'}`
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
// 세 장을 화면 무대색(#16140F) 위에 3배로 나란히 — 육안 판정용.
const DARK = { r: 0x16, g: 0x14, b: 0x0f, alpha: 1 }
const PAD = 26
const GAP = 24
const COIN_QA = 216
const BUNDLE_QA = { w: 180, h: 360 }

async function makeCheckSheet() {
  const present = ASSETS.filter((a) => existsSync(path.join(OUT_DIR, a.file)))
  if (present.length === 0) return null
  const layers = []
  let x = PAD
  let maxH = 0
  for (const a of present) {
    const isCoin = a.key.startsWith('coin')
    const w = isCoin ? COIN_QA : BUNDLE_QA.w
    const h = isCoin ? COIN_QA : BUNDLE_QA.h
    const buf = await sharp(path.join(OUT_DIR, a.file))
      .resize(w, h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer()
    layers.push({ input: buf, left: x, top: PAD })
    x += w + GAP
    maxH = Math.max(maxH, h)
  }
  const W = x - GAP + PAD
  const H = PAD * 2 + maxH
  const out = path.join(QA_DIR, 'ritual-chuljeon-check.webp')
  await mkdir(QA_DIR, { recursive: true })
  await sharp({ create: { width: W, height: H, channels: 4, background: DARK } })
    .composite(layers)
    .webp({ quality: 88 })
    .toFile(out)
  return out
}

// ───────────────────────────── 실행 ─────────────────────────────
async function main() {
  const args = process.argv.slice(2)
  const regen = args.includes('--regen')
  const rekey = args.includes('--rekey')
  const only = args.filter((a) => !a.startsWith('--'))
  const targets = ASSETS.filter((a) => only.length === 0 || only.includes(a.key))

  console.log(`엽전·다발 스프라이트 — 대상 ${targets.length}장 (모델 ${MODEL}, raw ${RAW_DIR})`)
  const results = []
  for (const asset of targets) {
    const outWebp = path.join(OUT_DIR, asset.file)
    if (!regen && !rekey && existsSync(outWebp)) {
      console.log(`✓ ${asset.file} 있음 — skip`)
      continue
    }
    console.log(`▶ ${asset.file}`)
    try {
      const r = await buildAsset(asset, { regen, rekey })
      results.push(r)
      console.log(
        `  ✓ ${r.file} ${r.info.width}×${r.info.height} ${(r.bytes / 1024).toFixed(1)}KB P${r.profile}${r.warn ? ' ⚠fringe' : ''}`
      )
    } catch (e) {
      console.log(`  ✗ ${asset.file}: ${String(e?.message || e).slice(0, 200)}`)
      results.push({ key: asset.key, ok: false })
    }
  }
  const sheet = await makeCheckSheet()
  if (sheet) console.log(`검수: ${sheet}`)
  const failed = results.filter((r) => !r.ok)
  console.log(`API 호출 ${apiCalls}회 · 실패 ${failed.length}건`)
  if (failed.length > 0) process.exitCode = 1
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
