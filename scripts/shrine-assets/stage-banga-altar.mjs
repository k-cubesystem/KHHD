// 신당 안2.3 「제단·단상 정립」 — 반가(班家) 큰 방 제단 2단 세트 (PRD-shrine-gamefeel-v1 부록 C ③)
//
// ── 왜 다시 굽는가 (CEO 3차 검수 ③ "신이 있고 아래 단상이 있어야 하는데 어색하다") ────────
// 현행 반가 큰 방에는 제단 스프라이트(altar.webp) **한 장**뿐이다. 신위는 `bottom:50%` 고정이고
// 제단은 y47 중심이라, 겉보기로 신위 발이 제단 몸통 **안쪽**(상판보다 아래·밑동보다 위)에 박힌다.
// 서 있는 자리가 없으니 신위가 떠 보인다 — 위계가 없는 것이 원인이다.
//
// ── 기준 관찰: 달집 마당(daljip) legacy room.webp ──────────────────────────────
// daljip 은 stage 미보유 = 배경 한 장에 제단이 **그려진** 완성 일러스트다. 그 그림의 제단은
// 깊이 방향으로 **3층**이고, 뒤로 갈수록 좁아지며 높아진다:
//   ① 뒤·가장 높은 층  : 처마·초각(草刻) 장식이 달린 벽감(龕) — 신위의 자리를 건축으로 감싼다
//   ② 가운데 층        : 좁은 상단 선반 — 가운데 위패함(작은 맞배지붕 궤), 좌우로 합·물그릇·꽂이병
//   ③ 앞·가장 낮고 넓은 층 : 긴 공물상 — 흰 수(繡)보가 중앙에 깔려 앞으로 뾰족하게 드리우고
//                          그 위에 놋잔·백자·편·메(밥) 그릇, 좌우 대칭으로 놋촛대 2 (불 켜짐)
//   · 조명: 촛불 2점이 최고 휘도로 가운데를 밝히고, 좌우 등롱 2개가 벽감 높이에서 감싼다.
//           빛은 앞·위에서 들어와 상 앞치마(阿板)는 그림자로 죽고 상판 윗면만 호박색으로 뜬다.
//   · 놓임새: 위패함을 축으로 **완전 좌우대칭**, 키 큰 것(촛대·병)은 바깥, 낮은 것(그릇·접시)은 안쪽.
//           흰 보가 나무와 공물 사이를 끊어 "신성한 면"을 만든다. 놋=따뜻한 금, 백자=유일한 찬 색.
//   · 접지: 상은 다리가 보이고 그 아래 짙은 그림자 틈이 있다. 떠 있는 물건이 하나도 없다.
// 옮길 것 = **층의 위계(뒤가 높고 좁다)** + **앞 상판의 흰 보** + **좌우대칭 놓임새**.
// 반가 큰 방은 소품이 사용자 배치라 공물은 굽지 않는다 — 굽는 것은 **면(面)** 두 개다.
//
// 산출: public/shrine/stage/banga/
//   platform.webp   단상(壇上) — 신위가 올라서는 2단 계단형 대. 뒤·위, 좁다.
//   altar-top.webp  제단 상판 — 공물·촛대 놓는 긴 상. 앞·아래, 넓다.
// ⚠️ 기존 altar.webp 는 **삭제하지 않는다** — 시드 §3 원복 경로가 그 한 장을 다시 가리킨다.
//
// 사용:
//   node scripts/shrine-assets/stage-banga-altar.mjs           # 누락분만 (멱등)
//   node scripts/shrine-assets/stage-banga-altar.mjs platform  # 하나만
//   node scripts/shrine-assets/stage-banga-altar.mjs --regen    # 원본부터 재생성
//   node scripts/shrine-assets/stage-banga-altar.mjs --rekey    # 원본 캐시로 키잉만 (API 0회)
//
// 원칙 (stage-banga.mjs · stage-banga-mural.mjs 와 동일)
//   - STYLE / LIGHT / CHROMA 문구를 **한 글자도 바꾸지 않고 복제**한다. 이 두 장은 기존 12품목과
//     한 화면에서 만나므로 붓·빛이 갈리면 "다른 그림에서 오려붙인 제단"이 된다.
//   - 접지 그림자를 굽지 않는다(런타임 담당).
//   - 순녹색(#00FF00) 배경 생성 → 하드 크로마키 → 트림.
//   - **캔버스 = 내용물** 로 굽는다(레터박스 없음). 렌더가 스프라이트 폭으로 크기를 정하므로
//     투명 여백이 있으면 시드 좌표와 실제 접지선이 어긋난다 — 그 오차가 "떠 보임"의 원인이었다.
import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from 'dotenv'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { warmDespill } from './despill.mjs'

// ⚠️ .env.local 은 **메인 체크아웃만** 로드한다.
//    워크트리(.claude/worktrees/*)의 .env.local 에는 폐기된 구키(AIzaSy…)가 잔존하며,
//    dotenv 는 먼저 설정된 값을 덮지 않으므로 워크트리를 같이 로드하면 구키가 우선권을 가진다.
config({ path: 'D:/anti/haehwadang/.env.local' })

const MODEL = process.env.SHRINE_IMAGE_MODEL || 'gemini-3.1-flash-image'
const KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

const ROOT = path.resolve(import.meta.dirname, '../..')
const OUT_DIR = path.join(ROOT, 'public', 'shrine', 'stage', 'banga')
const RAW_DIR = process.env.STAGE_ALTAR_RAW_DIR || path.join(process.env.TEMP || '/tmp', 'shrine-stage-banga-altar-raw')

/** 총 생성 상한(재시도 포함). 2장 × (1회 + 재시도 2회) = 6. */
const API_BUDGET = 6
let apiCalls = 0

// ────────────────────────────── 프롬프트 ──────────────────────────────
// STYLE·LIGHT·CHROMA 는 stage-banga.mjs 원문 그대로.
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
 * @typedef {object} AltarAsset
 * @property {string} key
 * @property {string} file
 * @property {number} outW  최종 스프라이트 폭(px). 높이는 내용물 종횡비가 정한다.
 * @property {string} prompt
 */

/** @type {AltarAsset[]} */
const ASSETS = [
  {
    key: 'platform',
    file: 'platform.webp',
    outW: 640,
    prompt:
      'A Korean traditional two-step wooden dais (단상) for a shrine, the raised seat where a deity stands. ' +
      'A wide lower step and a narrower upper platform stacked on it, both built of DEEP DARK WALNUT planks — ' +
      'the same dark cool-toned walnut as the heavy posts and beams of a hanok wall, NOT honey oak, NOT light pine, ' +
      'NOT golden yellow wood — with visible plank seams, a moulded nosing along each step edge ' +
      'and a plain recessed panel on each riser face. ' +
      'The upper platform top is a broad flat empty standing surface. ' +
      'Seen from the front at a slight high angle (about 18 degrees above eye level) so BOTH the flat upper top surface ' +
      'and the two riser faces below it read clearly as separate planes. ' +
      'It is COMPLETELY EMPTY — nothing standing or placed on it: no figure, no statue, no cushion, no cloth, no vessels, no candles. ' +
      'Perfectly symmetrical, seen straight on, wide horizontal composition, no railing, no canopy, no steps at the sides, ' +
      'the whole dais fully inside the frame with generous margin on all sides, ' +
      'the bottom of the lower step is the ground contact line at the bottom center of the frame. ' +
      `${STYLE}, ${LIGHT}, ${CHROMA}`,
  },
  {
    key: 'altar-top',
    file: 'altar-top.webp',
    outW: 768,
    despill: 'warm', // 황록 스필 이력(2026-08-10 잔량 0.66% 수술)
    prompt:
      'A Korean traditional shrine offering table (제단 상판): a long wide flat lacquered top board with a moulded ' +
      'edge lip, carried on a low decorated apron rail with carved key-fret side panels and short stout front legs. ' +
      'An ivory hanji-white embroidered runner cloth is laid across the middle of the board and drapes over the front ' +
      'edge in a soft point, with a single small restrained red flower embroidery at its tip. ' +
      'Dark walnut wood with warm amber highlights and small brass corner fittings, dignified restrained craftsmanship. ' +
      'The board is COMPLETELY BARE apart from that runner cloth — absolutely nothing placed on it: ' +
      'no candles, no bowls, no cups, no incense, no rice, no fruit, no flowers in vases, no tablet box. ' +
      'Seen from the front at a slight high angle (about 15 degrees above eye level) so the top board reads as a ' +
      'usable surface with visible depth. Perfectly symmetrical, wide low horizontal composition, ' +
      'the whole table fully inside the frame with generous margin on all sides, ' +
      'the bottom of the legs is the ground contact line at the bottom center of the frame. ' +
      `${STYLE}, ${LIGHT}, ${CHROMA}`,
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

// ───────────────────────── 상면 검출 (접지 계약) ─────────────────────────
/** 상면 앞턱을 찾는 탐색 구간 — 스프라이트 높이의 이 비율 안에서만 본다(밑동 그림자를 오검출하지 않게) */
const SURFACE_SCAN_LO = 0.1
const SURFACE_SCAN_HI = 0.65
/** 접지선 = 상면 앞턱까지의 이 비율 지점. 0.5 = 상면 깊이의 가운데(발이 상면 중앙에 놓인다) */
const CONTACT_DEPTH_FRAC = 0.5

/**
 * 스프라이트의 **상면 앞턱**(top surface 앞쪽 경계)을 행 평균 휘도의 최대 하강 지점으로 찾는다.
 * 위에서 본 상면은 빛을 받아 밝고 그 아래 앞면(riser/앞치마)은 그림자로 어둡다 → 가장 큰 하강이 앞턱이다.
 * 반환값은 **불투명 내용물 기준 비율**(0 = 내용물 top, 1 = 내용물 bottom)이다.
 */
function findTopSurfaceEdge(data, w, h, ch) {
  const rowLuma = new Float64Array(h)
  const rowOpaque = new Int32Array(h)
  for (let y = 0; y < h; y += 1) {
    let s = 0
    let n = 0
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * ch
      if (data[i + 3] < 200) continue
      s += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
      n += 1
    }
    rowOpaque[y] = n
    rowLuma[y] = n ? s / n : 0
  }
  let y0 = 0
  let y1 = h - 1
  while (y0 < h && rowOpaque[y0] < w * 0.05) y0 += 1
  while (y1 > y0 && rowOpaque[y1] < w * 0.05) y1 -= 1
  const span = y1 - y0
  if (span < 8) return { edgeFrac: 0.5, contactFrac: 0.5, drop: 0, contentTop: y0, contentBottom: y1 }
  let bestY = y0 + Math.round(span * 0.35)
  let bestDrop = -Infinity
  const from = y0 + Math.round(span * SURFACE_SCAN_LO)
  const to = y0 + Math.round(span * SURFACE_SCAN_HI)
  for (let y = from; y < to; y += 1) {
    if (!rowOpaque[y] || !rowOpaque[y + 1]) continue
    const drop = rowLuma[y] - rowLuma[y + 1]
    if (drop > bestDrop) {
      bestDrop = drop
      bestY = y
    }
  }
  const edgeFrac = (bestY - y0) / span
  return {
    edgeFrac,
    contactFrac: edgeFrac * CONTACT_DEPTH_FRAC,
    drop: bestDrop,
    contentTop: y0,
    contentBottom: y1,
  }
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
      if (asset.despill === 'warm') warmDespill(keyed.data, keyed.channels)
      const png = await sharp(keyed.data, {
        raw: { width: keyed.width, height: keyed.height, channels: keyed.channels },
      })
        .png()
        .toBuffer()
      // 트림 → 폭만 맞춘다. 높이는 내용물이 정한다 = **캔버스 = 내용물**(레터박스 0).
      const finalBuf = await sharp(await sharp(png).trim({ threshold: 10 }).toBuffer())
        .resize({ width: asset.outW, fit: 'inside' })
        .webp({ quality: 88, alphaQuality: 100 })
        .toBuffer()
      const { data, info } = await sharp(finalBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      const fringe = measureFringe(data, info.channels)
      const pass = fringe.ratio <= FRINGE_MAX && fringe.edgeRatio <= EDGE_FRINGE_MAX
      console.log(
        `  · 키잉 P${p + 1} ${info.width}×${info.height} fringe=${(fringe.ratio * 100).toFixed(3)}% edge=${(fringe.edgeRatio * 100).toFixed(2)}% ${pass ? 'PASS' : 'retry'}`
      )
      const surface = findTopSurfaceEdge(data, info.width, info.height, info.channels)
      const candidate = { buf: finalBuf, fringe, profile: p + 1, info, surface }
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

// ──────────────────────── 좌표 계약 계산 ────────────────────────
// 시드에 적을 숫자를 **여기서 계산해 출력**한다. 손으로 어림하면 접지선이 어긋난다(= 지금의 버그).
//
// ⚠️ 스프라이트의 겉보기 **세로**는 방의 가로:세로 비에 딸려 온다(w 는 뷰포트 폭 %, y 는 방 높이 %).
//    그래서 한 상수로 모든 기기의 접지선을 정확히 맞출 수는 없다 → 두 극단(넓은 데스크톱 / 좁은 폰)의
//    **상면 밴드가 겹치는 구간**을 구하고 그 가운데를 계약값으로 준다. 어느 기기에서도 발이 상면
//    안(뒤쪽으로 조금 들어가는 것은 정상)에 놓이고, "떠 있음"은 발생하지 않는다.
/** 렌더 기준 방 — ShrineRoomClient 실측: 컨테이너 `max-w-[520px]`, 높이 `min(72vh, 620px)`(안2.3) */
const ROOM_REF_W = 520
const ROOM_REF_H = 620
/** 좁은 쪽 극단 — 세로 긴 폰(방 폭 380px, 높이는 같은 620 상한) */
const ROOM_NARROW_W = 380
/** 시드 좌표(단일 출처 = supabase/migrations/20260730_shrine_banga_altar_platform.sql) */
const SEED = {
  platform: { x: 50, y: 51, w: 44 },
  'altar-top': { x: 50, y: 58, w: 58 },
}

/** w(뷰포트 폭 %) → 주어진 방에서의 겉보기 세로 범위(방 높이 %) */
function bandIn(roomW, seed, info) {
  const pxW = (roomW * seed.w) / 100
  const pxH = (pxW / info.width) * info.height
  const hPct = (pxH / ROOM_REF_H) * 100
  return { pxW, pxH, hPct, topPct: seed.y - hPct / 2, botPct: seed.y + hPct / 2 }
}

function apparentGeometry(asset, info) {
  const seed = SEED[asset.key]
  if (!seed) return null
  return { seed, ...bandIn(ROOM_REF_W, seed, info) }
}

/** 상면 밴드(스프라이트 상단 ~ 상면 앞턱)를 두 방에서 구해 교집합을 낸다 */
function surfaceBandOverlap(asset, info, edgeFrac) {
  const seed = SEED[asset.key]
  if (!seed) return null
  const bands = [ROOM_REF_W, ROOM_NARROW_W].map((roomW) => {
    const b = bandIn(roomW, seed, info)
    return { roomW, from: b.topPct, to: b.topPct + b.hPct * edgeFrac }
  })
  const from = Math.max(...bands.map((b) => b.from))
  const to = Math.min(...bands.map((b) => b.to))
  return { bands, from, to, center: (from + to) / 2, valid: to > from }
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

console.log(`모델: ${MODEL}\n원본 캐시: ${RAW_DIR}\n산출: ${OUT_DIR}\n`)

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

console.log(`\n── 좌표 계약 (기준 방 ${ROOM_REF_W}×${ROOM_REF_H}px) ──`)
for (const r of results) {
  if (!r.ok) continue
  const g = apparentGeometry(r.asset, r.info)
  if (!g) continue
  const surfacePct = g.topPct + (g.hPct * r.surface.edgeFrac)
  const contactPct = g.topPct + g.hPct * r.surface.contactFrac
  console.log(
    `  ${r.key}: 시드 x${g.seed.x} y${g.seed.y} w${g.seed.w} → ${Math.round(g.pxW)}×${Math.round(g.pxH)}px ` +
      `(세로 ${g.hPct.toFixed(1)}%, y ${g.topPct.toFixed(1)}%~${g.botPct.toFixed(1)}%)\n` +
      `      상면 앞턱 = 스프라이트 ${(r.surface.edgeFrac * 100).toFixed(2)}% 지점(행 휘도 하강 ${r.surface.drop.toFixed(1)}) → 방 y ${surfacePct.toFixed(1)}%\n` +
      `      접지선(상면 깊이 ${(CONTACT_DEPTH_FRAC * 100).toFixed(0)}%) → 방 y **${contactPct.toFixed(1)}%**` +
      `${r.key === 'platform' ? `  ← 신위 발끝. 배선: 신위 래퍼 bottom = ${(100 - contactPct).toFixed(0)}%` : '  ← 공물 앵커 y 기준'}`
  )
  if (r.key !== 'platform') continue
  const ov = surfaceBandOverlap(r.asset, r.info, r.surface.edgeFrac)
  if (!ov) continue
  for (const b of ov.bands) {
    console.log(`      · 방 ${b.roomW}×${ROOM_REF_H} 상면 밴드 y ${b.from.toFixed(2)}% ~ ${b.to.toFixed(2)}%`)
  }
  console.log(
    `      ★ 두 방 교집합 y ${ov.from.toFixed(2)}% ~ ${ov.to.toFixed(2)}% → **가운데 ${ov.center.toFixed(2)}%**` +
      ` = lib/domain/shrine/stage.ts PODIUM_TOP_Y 계약값 ${ov.valid ? '' : '⚠️ 교집합 없음(시드 재조정 필요)'}`
  )
}
console.log(`\nAPI 호출 ${apiCalls}/${API_BUDGET}회`)
process.exit(results.some((r) => !r.ok) ? 1 : 0)
