// 신당 안2.2 「큰 방 v2」 — 반가(班家) 실내 **와이드 무라 + 문간** 에셋 (PRD-shrine-gamefeel-v1 부록 B)
//
// ── 왜 무라인가 (CEO 2차 검수 ② "오른쪽에 세로줄") ─────────────────────────────
// 안2.1 은 타일 2장을 `repeat-x` + `background-size: auto 100%` 로 깔았다. 그런데 타일의 렌더 폭은
// **밴드 높이 × 종횡비** 라 거의 항상 소수점(예: 640/420 밴드에서 794.4px)이 된다. 브라우저는 반복
// 타일마다 그 소수 좌표를 정수 픽셀로 재샘플링하므로 **반복 경계마다 서브픽셀 세로선**이 남는다.
// 이건 이미지 픽셀 값의 문제가 아니다 — stage-banga-room.mjs 의 랩 크로스페이드로 경계 열 차이를
// 내부 이웃 열 수준까지 눌러도(실측 PASS) 선은 그대로 보였다. **반복 자체가 원인**이기 때문이다.
//
// 그래서 반복을 폐지한다. 타일을 미리 이어붙여 **한 장짜리 와이드 무라**로 굽고, 렌더는 기존
// 단일 이미지 stretch 경로(`<img class="w-full object-cover">`)로 되돌린다. 반복이 없으면 경계도 없다.
//
// ── 미러 타일링 (이 파일의 핵심) ─────────────────────────────────────────────
//   [ T | flop(T) | T | flop(T) ]
// 이렇게 이어붙이면 경계에서 **같은 픽셀 열이 공유된다**:
//   x=W-1 은 T[W-1], x=W 는 flop(T)[0] = T[W-1]  → 인접 두 열이 동일 → 불연속 **수학적으로 0**
//   x=2W-1 은 flop(T)[W-1] = T[0], x=2W 는 T[0]  → 역시 동일
// 랩(끝↔처음)도 T[0] 끼리 만나므로 0 이다 — 무라를 다시 반복해도 이음선이 없다(보험).
// 크로스페이드로도 못 없앤 선이 사라지는 이유가 이 항등성이다. 대신 미러 대칭이 생기므로
// 눈에 거슬리지 않는지 **검사 이미지 1장**으로 확인한다(벽 타일은 좌우 끝이 같은 폭·같은 톤의
// 평한지 패널로 끝나게 구워져 있어 대칭축이 "넓은 한지 한 칸"으로 읽힌다 — 낮은 위험).
//
// ⚠️ **API 호출 0회** — 입력은 검수 통과한 기존 타일 2장 재사용이다. 톤을 다시 굽지 않는다.
//    (문간 스프라이트만 예외적으로 생성한다. 아래 API_BUDGET 참조.)
//
// 산출: public/shrine/stage/banga/
//   room-wall-mural.webp   4096×640 불투명 — 벽 무라 (타일 1024 × 4, 미러 교대)
//   room-floor-mural.webp  4096×420 불투명 — 마루 무라
//   room-door.webp          512×768 투명   — 분합문(들어열개) 문간 랜드마크
// 검수(assets-src/shrine/ — public 에 QA 산출물을 남기지 않는다):
//   room-mural-check.webp  — 무라 전체 축소 + 문간 조립 미리보기 (CEO 판단용 1장)
//
// 사용:
//   node scripts/shrine-assets/stage-banga-mural.mjs           # 누락분만 (멱등)
//   node scripts/shrine-assets/stage-banga-mural.mjs --regen    # 있어도 재생성
//   node scripts/shrine-assets/stage-banga-mural.mjs mural      # 무라 2장만 (API 0회)
//   node scripts/shrine-assets/stage-banga-mural.mjs door       # 문간만
//
// 원칙 (stage-banga.mjs · stage-banga-room.mjs 와 동일 — 한 화면에서 만나므로 규율이 갈리면 안 된다)
//   - STYLE / LIGHT / CHROMA 문구는 **한 글자도 바꾸지 않고 복제**한다.
//   - 접지 그림자를 굽지 않는다(런타임 담당).
//   - 무라는 불투명 배경판이라 크로마키가 없다. 문간만 순녹색 배경 → 하드 크로마키.
import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from 'dotenv'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

// ⚠️ .env.local 은 **메인 체크아웃만** 로드한다.
//    워크트리(.claude/worktrees/*)의 .env.local 에는 폐기된 구키(AIzaSy…)가 잔존하며,
//    dotenv 는 먼저 설정된 값을 덮지 않으므로 워크트리를 같이 로드하면 구키가 우선권을 가진다.
//    키 우선순위도 GOOGLE_GENERATIVE_AI_API_KEY 를 앞에 둔다(앱 런타임과 동일 변수).
config({ path: 'D:/anti/haehwadang/.env.local' })

const MODEL = process.env.SHRINE_IMAGE_MODEL || 'gemini-3.1-flash-image'
const KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

const ROOT = path.resolve(import.meta.dirname, '../..')
const OUT_DIR = path.join(ROOT, 'public', 'shrine', 'stage', 'banga')
/** 검수 산출물 — 제품 번들(public)에 QA 이미지를 흘리지 않는다 */
const QA_DIR = path.join(ROOT, 'assets-src', 'shrine')
const RAW_DIR = process.env.STAGE_MURAL_RAW_DIR || path.join(process.env.TEMP || '/tmp', 'shrine-stage-banga-mural-raw')

/** 문간 생성 전용 상한(재시도 포함). 무라 경로는 이 카운터를 절대 건드리지 않는다(API 0회). */
const API_BUDGET = 3
let apiCalls = 0

/** 무라 1장 용량 목표. 초과 시 q 를 낮춰 재인코딩하고, 그래도 넘으면 반복 수를 3배로 줄인다. */
const MURA_MAX_BYTES = 300 * 1024
const MURA_QUALITY_LADDER = [78, 72, 66, 60]

// ────────────────────────────── 프롬프트 ──────────────────────────────
// STYLE·LIGHT·CHROMA 는 stage-banga.mjs 원문 그대로. 기존 실내 에셋과 붓·빛이 갈리면
// 문간이 "다른 그림에서 오려붙인 문"으로 읽힌다.
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
 * 무라 사양. repeats 4 = 폭 4096 — 320% 방(=3.2화면)을 데스크톱 1280px 뷰포트에서 1:1 로 덮는다
 * (3.2 × 1280 = 4096). 모바일에서는 2배 오버샘플이라 선명하다.
 * @type {Array<{key:string,tile:string,file:string,repeats:number}>}
 */
const MURALS = [
  { key: 'room-wall-mural', tile: 'room-wall-tile.webp', file: 'room-wall-mural.webp', repeats: 4 },
  { key: 'room-floor-mural', tile: 'room-floor-tile.webp', file: 'room-floor-mural.webp', repeats: 4 },
]

/**
 * 문간 랜드마크 — 입장 걷기의 **시작점이 눈에 보이게** 하는 유일한 목적의 구조물.
 * 균일 반복 무늬만 있는 큰 방에서는 카메라가 70%p 를 움직여도 "이동"으로 지각되지 않는다(CEO ①).
 */
const DOOR = {
  key: 'room-door',
  file: 'room-door.webp',
  w: 512,
  h: 768,
  prompt:
    'A Korean traditional bunhap-mun (분합문) doorway of a noble house daecheong hall, flat frontal elevation view. ' +
    'A tall pair of latticed double doors set in a dark walnut frame: a fine geometric ttisal wooden lattice ' +
    'over warm ivory hanji paper, a straight lintel beam across the top and a low worn wooden threshold (문턱) at the bottom. ' +
    'The left leaf stands slightly ajar, revealing a narrow sliver of dim warm depth beyond — it reads unmistakably as the way in. ' +
    'Tall vertical composition, seen straight on at eye level, perfectly upright, symmetrical framing, ' +
    'the whole doorway fully inside the frame with generous margin on all sides, ' +
    'the bottom of the threshold is the ground contact line at the bottom center of the frame. ' +
    'ONLY the doorway itself — no surrounding wall, no floor plane, no furniture, no plants, nothing hanging. ' +
    `${STYLE}, ${LIGHT}, ${CHROMA}`,
}

// ───────────────────────── 계측 ─────────────────────────
/** 열 평균 휘도 프로파일 (stage-banga-room.mjs 와 동일 규약) */
function columnLuma(data, w, h, ch) {
  const col = new Float64Array(w)
  for (let x = 0; x < w; x += 1) {
    let s = 0
    for (let y = 0; y < h; y += 1) {
      const i = (y * w + x) * ch
      s += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
    }
    col[x] = s / h
  }
  return col
}

function stdev(arr) {
  let m = 0
  for (const v of arr) m += v
  m /= arr.length
  let s = 0
  for (const v of arr) s += (v - m) ** 2
  return Math.sqrt(s / arr.length)
}

/** 두 열의 채널당 평균 절대차 — 이음선의 정의 그 자체 */
function colDiff(data, w, h, ch, x1, x2) {
  let s = 0
  for (let y = 0; y < h; y += 1) {
    const i = (y * w + x1) * ch
    const j = (y * w + x2) * ch
    s += Math.abs(data[i] - data[j]) + Math.abs(data[i + 1] - data[j + 1]) + Math.abs(data[i + 2] - data[j + 2])
  }
  return s / (h * 3)
}

/**
 * 미러 경계 + 랩 경계의 열 차이. repeats=4 면 내부 3곳 + 랩 1곳 = **4곳**.
 * 미러 타일링이 성립하면 전부 정확히 0 이어야 한다(인코딩 전). 0 이 아니면 조립이 틀린 것이다.
 */
function boundaryDiffs(data, w, h, ch, tileW, repeats) {
  const out = []
  for (let k = 1; k < repeats; k += 1) {
    out.push({ at: k * tileW, diff: colDiff(data, w, h, ch, k * tileW - 1, k * tileW) })
  }
  out.push({ at: 0, wrap: true, diff: colDiff(data, w, h, ch, w - 1, 0) })
  return out
}

/** 내부 이웃 열 차이 분포 — 경계값을 견줄 기준선(절대 임계값을 쓰지 않는 이유는 room 스크립트 주석 ④) */
function interiorStats(data, w, h, ch) {
  const diffs = []
  for (let x = 0; x < w - 1; x += 1) diffs.push(colDiff(data, w, h, ch, x, x + 1))
  diffs.sort((a, b) => a - b)
  const at = (r) => diffs[Math.min(diffs.length - 1, Math.max(0, Math.round(r * (diffs.length - 1))))]
  return { median: at(0.5), p95: at(0.95), max: diffs[diffs.length - 1] }
}

const fmt = (v) => v.toFixed(3)

// ───────────────────────── 무라 굽기 ─────────────────────────
const DARK = { r: 0x1a, g: 0x13, b: 0x08, alpha: 1 }

/**
 * 미러 교대 이어붙이기 → webp. 리사이즈를 **한 번도 하지 않는다** —
 * 스케일이 끼면 경계 픽셀 공유가 깨져(재샘플링) 미러의 항등성이 무너진다.
 */
async function composeMural(tilePath, tileW, tileH, repeats) {
  const normal = await sharp(tilePath).removeAlpha().png().toBuffer()
  const flopped = await sharp(tilePath).removeAlpha().flop().png().toBuffer()
  const W = tileW * repeats
  const layers = []
  for (let i = 0; i < repeats; i += 1) {
    layers.push({ input: i % 2 === 0 ? normal : flopped, left: i * tileW, top: 0 })
  }
  const raw = await sharp({ create: { width: W, height: tileH, channels: 3, background: DARK } })
    .composite(layers)
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { raw, W }
}

async function buildMural(spec) {
  const tilePath = path.join(OUT_DIR, spec.tile)
  if (!existsSync(tilePath)) throw new Error(`입력 타일이 없다: ${tilePath} — stage-banga-room.mjs 를 먼저 실행할 것`)
  const meta = await sharp(tilePath).metadata()
  const tileW = meta.width
  const tileH = meta.height

  // 원본 타일의 열 휘도 산포 — 무라가 이보다 나빠지면(=밝기 물결 악화) 미러 조립이 잘못된 것이다.
  const tileRaw = await sharp(tilePath).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const tileStd = stdev(columnLuma(tileRaw.data, tileW, tileH, tileRaw.info.channels))

  let repeats = spec.repeats
  let chosen = null

  // 용량 사다리: q 를 낮춰 보고, 그래도 넘으면 반복 수를 하나 줄여(4→3) 폭을 깎는다.
  for (; repeats >= 3 && !chosen; repeats -= 1) {
    const { raw, W } = await composeMural(tilePath, tileW, tileH, repeats)
    const ch = raw.info.channels
    // ① 인코딩 **전** 경계 검증 — 미러 항등성 그 자체. 여기서 0 이 아니면 조립 버그다.
    const preBoundary = boundaryDiffs(raw.data, W, tileH, ch, tileW, repeats)

    for (const quality of MURA_QUALITY_LADDER) {
      const webp = await sharp(raw.data, { raw: { width: W, height: tileH, channels: ch } })
        .webp({ quality })
        .toBuffer()
      if (webp.length > MURA_MAX_BYTES && quality !== MURA_QUALITY_LADDER[MURA_QUALITY_LADDER.length - 1]) {
        console.log(`  · q${quality} → ${(webp.length / 1024).toFixed(1)}KB (예산 초과, q 하향)`)
        continue
      }
      // ② 검증은 **인코딩된 최종본**을 다시 디코드해서 잰다 — webp 손실이 경계에 남기는 것까지 포함해야 정직하다.
      const dec = await sharp(webp).removeAlpha().raw().toBuffer({ resolveWithObject: true })
      const postBoundary = boundaryDiffs(dec.data, W, tileH, dec.info.channels, tileW, repeats)
      const interior = interiorStats(dec.data, W, tileH, dec.info.channels)
      const muralStd = stdev(columnLuma(dec.data, W, tileH, dec.info.channels))
      chosen = { webp, quality, W, repeats, preBoundary, postBoundary, interior, tileStd, muralStd, tileW, tileH }
      break
    }
  }

  const outPath = path.join(OUT_DIR, spec.file)
  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(outPath, chosen.webp)

  const worstPre = Math.max(...chosen.preBoundary.map((b) => b.diff))
  const worstPost = Math.max(...chosen.postBoundary.map((b) => b.diff))
  return {
    key: spec.key,
    ok: true,
    file: spec.file,
    bytes: chosen.webp.length,
    quality: chosen.quality,
    width: chosen.W,
    height: chosen.tileH,
    repeats: chosen.repeats,
    tileW: chosen.tileW,
    preBoundary: chosen.preBoundary,
    postBoundary: chosen.postBoundary,
    interior: chosen.interior,
    tileStd: chosen.tileStd,
    muralStd: chosen.muralStd,
    // 합격 조건 ① 미러 항등(인코딩 전 정확히 0) ② 인코딩 후도 내부 이웃 열 분포 안 ③ 밝기 산포 무악화
    passMirror: worstPre === 0,
    passEncoded: worstPost <= Math.max(chosen.interior.p95, chosen.interior.median * 2 + 0.5),
    passRipple: chosen.muralStd <= chosen.tileStd * 1.02 + 0.01,
    withinBudget: chosen.webp.length <= MURA_MAX_BYTES,
    worstPre,
    worstPost,
  }
}

// ───────────────────── 크로마키 (stage-banga.mjs 규약 복제) ─────────────────────
// gd = g - max(r,b) 를 "초록 우세도"로 삼아 알파를 선형 램프로 만든다(하드 임계값 → 계단 fringe 방지).
const KEY_PROFILES = [
  { hi: 62, lo: 22, spill: 3, shrink: 0.14, feather: 1 },
  { hi: 50, lo: 16, spill: 1, shrink: 0.22, feather: 1 },
  { hi: 40, lo: 10, spill: 0, shrink: 0.3, feather: 2 },
]
/** 완전 투명 픽셀의 RGB — 순녹색을 남기면 리사이즈·인코딩 때 가장자리로 번진다. */
const VOID_RGB = [0x1a, 0x13, 0x08]

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

const GREEN_HARD = 20
const GREEN_EDGE = 12
const FRINGE_MAX = 0.004
const EDGE_FRINGE_MAX = 0.03

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

// ───────────────────────────── 문간 생성 ─────────────────────────────
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

async function buildDoor({ regen }) {
  const rawPng = path.join(RAW_DIR, `${DOOR.key}.png`)
  const outWebp = path.join(OUT_DIR, DOOR.file)

  async function ensureRaw(force) {
    if (!force && existsSync(rawPng)) return
    console.log(`  · 생성 (${MODEL}) — API ${apiCalls + 1}/${API_BUDGET}`)
    const buf = await callModel(DOOR.prompt)
    await mkdir(path.dirname(rawPng), { recursive: true })
    await writeFile(rawPng, buf)
  }

  await ensureRaw(regen)
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
      const trimmed = await sharp(png).trim({ threshold: 10 }).toBuffer()
      const finalBuf = await sharp(trimmed)
        .resize(DOOR.w, DOOR.h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 88, alphaQuality: 100 })
        .toBuffer()
      const { data, info } = await sharp(finalBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      const fringe = measureFringe(data, info.channels)
      const pass = fringe.ratio <= FRINGE_MAX && fringe.edgeRatio <= EDGE_FRINGE_MAX
      console.log(
        `  · 키잉 P${p + 1} fringe=${(fringe.ratio * 100).toFixed(3)}% edge=${(fringe.edgeRatio * 100).toFixed(2)}% ${pass ? 'PASS' : 'retry'}`
      )
      if (!best || fringe.ratio < best.fringe.ratio) best = { buf: finalBuf, fringe, profile: p + 1 }
      if (pass) {
        await writeFile(outWebp, finalBuf)
        return { key: DOOR.key, ok: true, file: DOOR.file, bytes: finalBuf.length, fringe, profile: p + 1 }
      }
    }
    if (round === 0 && apiCalls < API_BUDGET) {
      console.log('  · 3프로파일 모두 fringe 초과 → 원본 재생성')
      try {
        await ensureRaw(true)
        continue
      } catch (e) {
        console.log('  · 재생성 불가:', String(e?.message || e).slice(0, 160))
      }
    }
    await writeFile(outWebp, best.buf)
    return {
      key: DOOR.key,
      ok: true,
      file: DOOR.file,
      bytes: best.buf.length,
      fringe: best.fringe,
      profile: best.profile,
      warn: true,
    }
  }
}

// ──────────────────────── 검사 이미지 1장 ────────────────────────
/** 시드 구조물 좌표 — 검사 이미지는 시드와 **같은 숫자**로 조립해야 판단 근거가 된다 */
const SEED_WORLD_WIDTH = 320
const SEED_STRUCTURES = [
  // 겉보기 w(%): 렌더가 w × 100/320 을 구역 폭(=3.2화면)에 적용하므로 결과는 "뷰포트 폭의 w%" 다
  { file: 'altar.webp', x: 50, y: 47, w: 62 },
  { file: DOOR.file, x: 8, y: 56, w: 14 },
]

/**
 * CEO 가 이 한 장으로 판단한다.
 *   ①·② 무라 전폭 축소 — **미러 대칭이 거슬리는지**만 본다(이음선은 수치로 이미 0).
 *   ③ 320% 방 전체 조립 — StageLayers 실측 규약(벽 top0 h62% · 바닥 bottom h40% · object-cover,
 *     구조물 x/y = 스프라이트 중심 %, w = 구역폭 대비 % × zoneWidthScale)을 그대로 재현한다.
 *     문간이 입장 시작점으로 읽히는지, 제단과의 크기 관계가 성립하는지를 여기서 본다.
 */
async function makeCheckImage() {
  const wall = path.join(OUT_DIR, 'room-wall-mural.webp')
  const floor = path.join(OUT_DIR, 'room-floor-mural.webp')
  if (!existsSync(wall) || !existsSync(floor)) return null

  const SHOW_W = 1600 // 4096 → 1600 축소(2.56:1). 대칭은 축소해도 보인다.
  const GAP = 12
  const wallMeta = await sharp(wall).metadata()
  const floorMeta = await sharp(floor).metadata()
  const wallH = Math.round((SHOW_W * wallMeta.height) / wallMeta.width)
  const floorH = Math.round((SHOW_W * floorMeta.height) / floorMeta.width)

  const rows = [
    { buf: await sharp(wall).resize(SHOW_W, wallH).png().toBuffer(), h: wallH },
    { buf: await sharp(floor).resize(SHOW_W, floorH).png().toBuffer(), h: floorH },
  ]

  // ③ 방 전체 조립 — 기준 뷰포트 640×800 의 320% 방을 SHOW_W 폭으로 축소한 것
  const VIEW_W = 640
  const ROOM_H = 800
  const viewPx = Math.round(SHOW_W / (SEED_WORLD_WIDTH / 100)) // 이 그림에서 화면 1장 = 500px
  const roomH = Math.round((viewPx * ROOM_H) / VIEW_W)
  const bandWallH = Math.round(roomH * 0.62)
  const bandFloorH = Math.round(roomH * 0.4)
  const layers = [
    // object-cover 와 같은 기하: 짧은 축을 채우고 가로 중앙 크롭 (stretch 왜곡이 아니다)
    { input: await sharp(wall).resize(SHOW_W, bandWallH, { fit: 'cover' }).png().toBuffer(), left: 0, top: 0 },
    {
      input: await sharp(floor).resize(SHOW_W, bandFloorH, { fit: 'cover' }).png().toBuffer(),
      left: 0,
      top: roomH - bandFloorH,
    },
  ]
  for (const s of SEED_STRUCTURES) {
    const file = path.join(OUT_DIR, s.file)
    if (!existsSync(file)) continue
    const sw = Math.max(4, Math.round((viewPx * s.w) / 100))
    const buf = await sharp(file).resize({ width: sw, fit: 'inside' }).png().toBuffer()
    const meta = await sharp(buf).metadata()
    layers.push({
      input: buf,
      left: Math.round((SHOW_W * s.x) / 100 - meta.width / 2),
      top: Math.round((roomH * s.y) / 100 - meta.height / 2),
    })
  }
  rows.push({
    buf: await sharp({ create: { width: SHOW_W, height: roomH, channels: 4, background: DARK } })
      .composite(layers)
      .png()
      .toBuffer(),
    h: roomH,
  })

  const totalH = rows.reduce((s, r) => s + r.h, 0) + GAP * (rows.length - 1)
  let top = 0
  const composite = []
  for (const r of rows) {
    composite.push({ input: r.buf, left: 0, top })
    top += r.h + GAP
  }
  const out = path.join(QA_DIR, 'room-mural-check.webp')
  await mkdir(QA_DIR, { recursive: true })
  const info = await sharp({ create: { width: SHOW_W, height: totalH, channels: 4, background: DARK } })
    .composite(composite)
    .webp({ quality: 86 })
    .toFile(out)
  return { out, bytes: info.size, width: SHOW_W, height: totalH, rows: rows.length }
}

// ──────────────────────────── main ────────────────────────────
const args = process.argv.slice(2)
const regen = args.includes('--regen')
const only = args.find((a) => !a.startsWith('--'))
const wantMural = !only || only === 'mural' || only === 'all'
const wantDoor = !only || only === 'door' || only === 'all'
if (only && !['mural', 'door', 'all'].includes(only)) {
  console.error('unknown target:', only, '— 가능: mural, door, all')
  process.exit(1)
}

console.log(`산출: ${OUT_DIR}\n검수: ${QA_DIR}\n원본 캐시(문간): ${RAW_DIR}\n`)

const results = []

if (wantMural) {
  for (const spec of MURALS) {
    const outPath = path.join(OUT_DIR, spec.file)
    if (!regen && existsSync(outPath)) {
      console.log('skip', spec.file, '(이미 존재 — 재생성은 --regen)')
      continue
    }
    console.log(`── ${spec.key} (미러 타일링, API 0회) ──`)
    try {
      const r = await buildMural(spec)
      console.log(
        `  ✔ ${r.file} ${r.width}×${r.height} ${(r.bytes / 1024).toFixed(1)}KB (q${r.quality}, 타일 ${r.tileW}px × ${r.repeats})`
      )
      results.push(r)
    } catch (e) {
      console.error('  ✖', spec.key, String(e?.message || e).slice(0, 300))
      results.push({ key: spec.key, ok: false, error: String(e?.message || e).slice(0, 300) })
    }
  }
}

let doorResult = null
if (wantDoor) {
  const outPath = path.join(OUT_DIR, DOOR.file)
  if (!regen && existsSync(outPath)) {
    console.log('skip', DOOR.file, '(이미 존재 — 재생성은 --regen)')
  } else {
    console.log(`── ${DOOR.key} (${DOOR.w}×${DOOR.h} 투명) ──`)
    try {
      doorResult = await buildDoor({ regen })
      console.log(`  ✔ ${doorResult.file} ${(doorResult.bytes / 1024).toFixed(1)}KB (P${doorResult.profile})`)
    } catch (e) {
      if (isAuthError(e)) {
        console.error('\n✖✖ API 키 인증 실패 — 즉시 중단합니다. 재시도하지 않음.')
        console.error('   ', String(e?.message || e).slice(0, 400))
      }
      console.error('  ✖', DOOR.key, String(e?.message || e).slice(0, 300))
      doorResult = { key: DOOR.key, ok: false, error: String(e?.message || e).slice(0, 300) }
    }
  }
}

const check = await makeCheckImage()
if (check) {
  console.log(
    `\n✔ room-mural-check.webp ${(check.bytes / 1024).toFixed(1)}KB — ${check.width}×${check.height} (${check.rows}행: 벽 무라 · 마루 무라 · 320% 방 전체 조립)`
  )
}

console.log('\n── 미러 경계 검증 ──')
for (const r of results) {
  if (!r.ok) {
    console.log(`  ✖ ${r.key}: ${r.error}`)
    continue
  }
  const pre = r.preBoundary.map((b) => `${b.wrap ? '랩' : `x=${b.at}`}:${fmt(b.diff)}`).join('  ')
  const post = r.postBoundary.map((b) => `${b.wrap ? '랩' : `x=${b.at}`}:${fmt(b.diff)}`).join('  ')
  const verdict = r.passMirror && r.passEncoded && r.passRipple && r.withinBudget
  console.log(
    `  ${verdict ? '✔' : '⚠️'} ${r.key} ${r.width}×${r.height} ${(r.bytes / 1024).toFixed(1)}KB q${r.quality}\n` +
      `      ① 경계 ${r.preBoundary.length}곳 (인코딩 전) ${pre}  → ${r.passMirror ? '전부 0 = 미러 항등 성립' : '⚠️ 0 이 아니다 = 조립 버그'}\n` +
      `      ① 경계 ${r.postBoundary.length}곳 (webp 후)   ${post}\n` +
      `        내부 이웃 열 차이 중앙값 ${fmt(r.interior.median)} · p95 ${fmt(r.interior.p95)} · 최대 ${fmt(r.interior.max)}` +
      ` → ${r.passEncoded ? '경계가 내부 분포 안(육안 불가시)' : '⚠️ 내부 분포 초과'}\n` +
      `      ② 열 휘도 표준편차 원본타일 ${fmt(r.tileStd)} → 무라 ${fmt(r.muralStd)}` +
      ` → ${r.passRipple ? '무악화' : '⚠️ 악화'}\n` +
      `      ③ 용량 ${(r.bytes / 1024).toFixed(1)}KB / 목표 ${(MURA_MAX_BYTES / 1024).toFixed(0)}KB ${r.withinBudget ? 'OK' : '⚠️ 초과'}`
  )
}
if (doorResult) {
  console.log('\n── 문간 ──')
  console.log(
    doorResult.ok
      ? `  ${doorResult.warn ? '⚠️' : '✔'} ${doorResult.file} ${(doorResult.bytes / 1024).toFixed(1)}KB ` +
          `fringe=${(doorResult.fringe.ratio * 100).toFixed(3)}% edge=${(doorResult.fringe.edgeRatio * 100).toFixed(2)}% (P${doorResult.profile})` +
          `${doorResult.warn ? ' — 임계 초과, 최선값 채택' : ''}`
      : `  ✖ ${doorResult.key}: ${doorResult.error}\n     → 시드에서 문만 빼고 무라만 적용할 것(세로줄은 무라로 이미 해결된다)`
  )
}
console.log(`\nAPI 호출 ${apiCalls}/${API_BUDGET}회 (무라는 0회 — 기존 타일 재사용)`)

const failed = results.some((r) => !r.ok)
process.exit(failed ? 1 : 0)
