// 신당 「틀(壇)」 접지 수복 — 승인된 스프라이트를 **다시 굽지 않고** 마루선에 앉힌다 (API 0회)
//
// ── 왜 (CEO 실기기 검수, 2026-08-10) ────────────────────────────────────────
// "배경 적용 확인했어. 하지만 틀과 선반들이 공중에 떠 있어. 마루 라인에 맞춰서 내려와야 해."
// 선반(사방탁자)은 상자를 마루선 파생으로 바꾸면 끝이지만(family-shelf.ts), 틀은 그림 자체가
// 원인이라 좌표만으로 못 고친다. 실측:
//
//   테마     그려진 접지   마루선(73) 대비
//   banga    y69.78        −3.22%p  (하단 투명 88px)
//   daljip   y71.21        −1.79%p  (하단 투명 76px)
//   seolbit  y73.66        +0.66%p  (하단 투명 0px · 이미 옳다)
//
// ── 왜 트림·리시드만으로는 못 고치는가 (이 스크립트의 존재 이유) ──────────────
// 하단 투명 여백은 **결과**지 원인이 아니다. 생성 파이프라인의 세로 리패드가 두 랜드마크
// (감실 바닥 45.3 · 제물 밑변 60.98)를 맞추려고 그림을 위로 끌어올린 몫이 그 여백이다.
// 투명 행을 잘라내도 **그려진 픽셀은 한 톨도 움직이지 않는다** — 상자만 작아진다.
//
// 시드(x·y·w)가 정하는 것은 «배율»과 «위치» 둘뿐인데 지켜야 할 줄은 셋이다:
//     감실 바닥 y45.3 · 제물 밑변 y60.98 · 그려진 접지 y73
// 세 점 사이의 **픽셀 거리비**가 그림에 이미 박혀 있으므로 배율·위치로는 둘까지만 맞는다.
// 계약이 요구하는 비는 (접지−상판)/(상판−감실) = 12.02/15.68 = **0.7666** 인데 실측은
//     banga 0.6173 · daljip 0.7650 · seolbit 0.8222
// 이다. banga 는 상판 아래(앞치마·다리)가 계약보다 **19% 짧고**, 그 몫이 곧 3.22%p 부양이다.
// 폭(w)을 키워 늘리는 길은 막혀 있다 — 닫집~감실 구간(A)이 그만큼 위로 자라 방 밖으로 나간다
// (w69 로 재면 banga 닫집 꼭대기가 y−3.9).
//
// ── 그래서: 세로 3구간 조각 늘림(piecewise vertical warp) ─────────────────────
// 그림을 랜드마크 두 줄로 세 구간으로 끊고 각 구간의 세로 배율만 따로 준다.
//     A = 닫집 꼭대기 ~ 감실 바닥      (신위가 서는 액자 — 손대지 않는다, 배율 1.0)
//     B = 감실 바닥 ~ 상판 앞턱        (서랍장 — 민짜 서랍 면이라 늘려도 읽히지 않는다)
//     C = 상판 앞턱 ~ 접지             (앞치마·다리·지대석 — 여기가 짧아서 뜬 것이다)
// 경계선을 **랜드마크(강한 가로 모서리)에 정확히** 두므로 이음매가 그 선에 숨는다. 구간마다
// 따로 resize 하지 않고 **행 단위 연속 워프**(단조 구간선형 매핑 + 선형 보간)라 seam 자체가 없다.
//
// 이 방식이 갖는 값(다른 안을 버린 이유):
//   · 감실 바닥·상판 앞턱이 **제자리** → 신위(PODIUM_TOP_Y 45.3)·제단 앵커(52.4/55)·**이미 놓인
//     제물**이 하나도 안 움직인다. 「틀을 내리고 신위·앵커도 같이 내린다」 안은 저장된 배치까지
//     옮겨야 해서 마이그레이션이 한 벌 더 붙고 존(ZONES.altar y≤58)도 넘긴다.
//   · 원본은 손대지 않는다 — 새 파일명(grand-altar-v2.webp)으로 나가고 구본이 원복 레버다.
//     (같은 파일명 덮어쓰기는 폰·엣지 캐시가 옛 그림을 재사용한다 — 2026-08-10 실증.)
//
// ── 산출 ────────────────────────────────────────────────────────────────────
//   public/shrine/stage/{code}/grand-altar-v2.webp        ← 접지 수복본 (신규 파일명)
//   assets-src/shrine/grand-altar-v42/backup/{code}-v41-grand-altar.webp  ← 구본 백업
//   assets-src/shrine/grand-altar-v42/{code}/…            ← 확인판·합성판(마루선 오버레이 포함)
//
// 사용:
//   node scripts/shrine-assets/stage-grand-altar-ground.mjs --plan      # 수치만 (파일 쓰기 0)
//   node scripts/shrine-assets/stage-grand-altar-ground.mjs             # 수술 + 확인판
//   node scripts/shrine-assets/stage-grand-altar-ground.mjs --compose   # + 합성판(판정 단위)
//
// ⚠️ API 호출 0회 — 이 스크립트는 이미지 «생성»을 하지 않는다(픽셀 수술·합성만).
import { mkdir, writeFile, copyFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const PUB = path.join(ROOT, 'public')
const PILOT_ROOT = path.join(ROOT, 'assets-src', 'shrine', 'harmony-pilot')
const OUT_ROOT = path.join(ROOT, 'assets-src', 'shrine', 'grand-altar-v42')

// ════════════════════ 계약 — 정본에서 읽는다 ════════════════════
function pluckNum(rel, re, fallback) {
  try {
    const m = readFileSync(path.join(ROOT, rel), 'utf8').match(re)
    if (m) return Number(m[1])
  } catch {
    /* 아래 fallback */
  }
  console.log(`  · 정본 추출 실패(${rel}) → 계약 기본값 ${fallback}`)
  return fallback
}
const ROOM_W = pluckNum('components/shrine/scene/ShrineRoomClient.tsx', /max-w-\[(\d+)px\]/, 520)
const ROOM_H = pluckNum('components/shrine/scene/ShrineRoomClient.tsx', /height:\s*'min\(\d+vh,\s*(\d+)px\)'/, 620)
const ROOM_VH = pluckNum('components/shrine/scene/ShrineRoomClient.tsx', /height:\s*'min\((\d+)vh,\s*\d+px\)'/, 72)
const ASSET_EM = pluckNum('components/shrine/scene/ShrineRoomClient.tsx', /const ASSET_EM = ([\d.]+)/, 3.2)
const ITEM_MD_PX = pluckNum('components/shrine/scene/ShrineRoomClient.tsx', /md:\s*'(\d+(?:\.\d+)?)px'/, 29)

const GEO = JSON.parse(readFileSync(path.join(ROOT, 'lib', 'domain', 'shrine', 'theme-stage-geometry.json'), 'utf8'))
const GRAND = GEO.grandAltar.structures[0]
const BANDS = GEO.bands
/** 마루선 — 접지가 앉아야 할 줄 */
const FLOOR_LINE_Y = 100 - BANDS.floor
/** 신위 발이 닿는 감실 바닥 (stage.PODIUM_TOP_Y) — 불변 */
const NICHE_FLOOR_Y = pluckNum('lib/domain/shrine/stage.ts', /export const PODIUM_TOP_Y = ([\d.]+)/, 45.3)
/** 제물 밑변 = 앵커 y53.5 + base/2 (렌더 규약: transform-origin 50% 100% 라 밑변이 y+base/2 고정) */
const SURFACE_Y = 53.5
const ITEM_BASE_Y = SURFACE_Y + ((ASSET_EM * ITEM_MD_PX) / 2 / ROOM_H) * 100
/** 틀 폭(구역 %)은 그대로 — 폭을 키우면 닫집이 방 위로 나간다(위 주석) */
const SEED_W = GRAND.w
/** 겉보기 세로 계수: hPct = K · (캔버스 세로/가로) — **기준 방(520×620)** 에서의 셈이다 */
const K_HPCT = ((SEED_W / 100) * ROOM_W * 100) / ROOM_H
/**
 * 틀 상자의 세로(방 %) — 시드 y 가 정해진 뒤 `2·(마루선 − y)` 로 채워진다(theme-stage.ts 와 같은 파생).
 * 렌더가 이 값을 **세로 기준**으로 쓰므로 접지가 전 기기에서 마루선에 앉는다.
 */
let BOX_H = 0
/** 기기 시뮬 — 방 크기는 `max-w-[520px]` · `min(72vh, 620px)` 에서 온다 */
const DEVICES = [
  { name: 'ref 520×620', vw: ROOM_W, vh: ROOM_H },
  { name: '360×800', vw: Math.min(ROOM_W, 352), vh: Math.min((ROOM_VH / 100) * 800, ROOM_H) },
  { name: '390×844', vw: Math.min(ROOM_W, 382), vh: Math.min((ROOM_VH / 100) * 844, ROOM_H) },
  { name: '430×932', vw: Math.min(ROOM_W, 422), vh: Math.min((ROOM_VH / 100) * 932, ROOM_H) },
]

/**
 * 라운드 채택분의 **육안 실측 랜드마크**(내용물 비율) — stage-grand-altar.mjs THEMES[].eye[5] 원본.
 * 자동 검출은 이 물건에서 세 번 헛짚었다(서랍 띠·상판 밑 그림자 한 줄·감실 «윗쪽만» 어둠).
 * 여기서 다시 재지 않고 **그때 사람이 읽은 값**을 쓴다 — 같은 그림이므로 같은 값이 정본이다.
 *  floor = 감실 바닥 · board = 상판 앞턱 · top = 감실 윗턱(신위 머리 여백의 출처)
 */
const THEMES = [
  { code: 'banga', name: '반가 대청', mural: 'r75', eye: { floor: 0.64, top: 0.335, board: 0.8626 } },
  { code: 'daljip', name: '달집 마당', mural: 'r75', eye: { floor: 0.635, top: 0.315, board: 0.8418 } },
  { code: 'seolbit', name: '설빛 서고', mural: 'r75', eye: { floor: 0.59, top: 0.305, board: 0.815 } },
]

const srcPath = (code) => path.join(PUB, 'shrine', 'stage', code, 'grand-altar.webp')
const outPath = (code) => path.join(PUB, 'shrine', 'stage', code, 'grand-altar-v2.webp')
const backupPath = (code) => path.join(OUT_ROOT, 'backup', `${code}-v41-grand-altar.webp`)
const themeDir = (code) => path.join(OUT_ROOT, code)

// ════════════════════ 실측 ════════════════════
/** 알파가 한 톨이라도 있는 세로 구간 = «그려진» 범위. 투명 리패드 여백은 여기서 빠진다. */
async function contentBox(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h, channels: ch } = info
  const rows = new Int32Array(h)
  for (let y = 0; y < h; y += 1) {
    let n = 0
    for (let x = 0; x < w; x += 1) if (data[(y * w + x) * ch + 3] > 0) n += 1
    rows[y] = n
  }
  let top = 0
  while (top < h && rows[top] === 0) top += 1
  let bottom = h - 1
  while (bottom > top && rows[bottom] === 0) bottom -= 1
  return { data, w, h, ch, top, bottom, contentH: bottom - top + 1 }
}

// ════════════════════ 계획 — 세 구간의 목표 길이 ════════════════════
/**
 * 계약이 요구하는 **픽셀 거리비**. 시드가 (x50 · w60) 고정이면
 *   방 %p = 픽셀 × K/W  →  B_px : C_px = (상판−감실) : (접지−상판) = 15.68 : 12.02
 * 이고, 이 비만 맞으면 배율(폭)과 위치(y)가 나머지를 정한다.
 */
const B_ROOM = ITEM_BASE_Y - NICHE_FLOOR_Y
const C_ROOM = FLOOR_LINE_Y - ITEM_BASE_Y

function planTheme(t, box) {
  const T = box.contentH
  const r1 = t.eye.floor * T // 감실 바닥
  const r2 = t.eye.board * T // 상판 앞턱
  const rTop = t.eye.top * T // 감실 윗턱
  const A = r1
  const B = r2 - r1
  const C = T - r2
  /** 폭은 그대로 → 픽셀당 방 %p 가 정해진다 → 두 구간의 목표 픽셀 길이도 정해진다 */
  const perPx = K_HPCT / box.w
  const Bf = B_ROOM / perPx
  const Cf = C_ROOM / perPx
  return {
    W: box.w,
    T,
    A,
    B,
    C,
    rTop,
    perPx,
    Bf,
    Cf,
    Tf: A + Bf + Cf,
    sA: 1,
    sB: Bf / B,
    sC: Cf / C,
    /** 현재 이 그림이 만드는 접지(방 y) — 「얼마나 떠 있나」의 실측값 */
    groundNow: null,
  }
}

// ════════════════════ 워프 — 행 단위 연속 매핑 ════════════════════
/**
 * 구간선형 세로 워프. 출력 행 j 가 보는 원본 행을 구간별 배율로 되짚고 **선형 보간**한다.
 * 구간마다 따로 resize 해서 붙이면 경계에 1px 이음매가 생긴다 — 매핑을 연속으로 두면 그 자체가 없다.
 * 알파는 프리멀티플라이해서 섞는다(투명 가장자리에서 색이 새는 것을 막는다).
 */
function warpRows(src, w, ch, srcTop, T, plan, padTop, Hf) {
  const out = Buffer.alloc(w * Hf * 4, 0)
  const { A, B, sB, sC, Bf } = plan
  for (let j = 0; j < Hf; j += 1) {
    const t = j - padTop
    if (t < 0 || t >= plan.Tf) continue
    let s
    if (t < A) s = t
    else if (t < A + Bf) s = A + (t - A) / sB
    else s = A + B + (t - A - Bf) / sC
    const sy = Math.min(T - 1, Math.max(0, s))
    const y0 = Math.floor(sy)
    const y1 = Math.min(T - 1, y0 + 1)
    const f = sy - y0
    const o0 = (srcTop + y0) * w * ch
    const o1 = (srcTop + y1) * w * ch
    const dst = j * w * 4
    for (let x = 0; x < w; x += 1) {
      const i0 = o0 + x * ch
      const i1 = o1 + x * ch
      const a0 = src[i0 + 3] / 255
      const a1 = src[i1 + 3] / 255
      const a = a0 * (1 - f) + a1 * f
      if (a <= 0) continue
      const d = dst + x * 4
      for (let c = 0; c < 3; c += 1) {
        const v = (src[i0 + c] * a0 * (1 - f) + src[i1 + c] * a1 * f) / a
        out[d + c] = Math.max(0, Math.min(255, Math.round(v)))
      }
      out[d + 3] = Math.round(a * 255)
    }
  }
  return out
}

// ════════════════════ 확인판 — 마루선 가로선 오버레이 ════════════════════
const QUALITY_LADDER = [90, 86, 82, 78, 74]
const BYTES_MAX = 260 * 1024

async function encode(raw, w, h) {
  let chosen = null
  for (const quality of QUALITY_LADDER) {
    const b = await sharp(raw, { raw: { width: w, height: h, channels: 4 } })
      .webp({ quality, alphaQuality: 100 })
      .toBuffer()
    chosen = { quality, buf: b }
    if (b.length <= BYTES_MAX) break
  }
  return chosen
}

/** 스프라이트 위에 계약선 3줄(감실 바닥·상판 앞턱·접지)을 그린 자 눈금판 */
async function writeQa(buf, marks, file) {
  const meta = await sharp(buf).metadata()
  const vw = 620
  const vh = Math.round((meta.height * vw) / meta.width)
  const y = (frac) => Math.round(frac * vh)
  const line = (frac, color, label) =>
    `<line x1="0" y1="${y(frac)}" x2="${vw}" y2="${y(frac)}" stroke="${color}" stroke-width="2"/>` +
    `<text x="6" y="${y(frac) - 5}" fill="${color}" font-size="15">${label}</text>`
  const ticks = []
  for (let i = 1; i < 40; i += 1) {
    const f = i / 40
    const yy = y(f)
    const major = i % 4 === 0
    ticks.push(
      `<line x1="0" y1="${yy}" x2="${major ? 34 : 16}" y2="${yy}" stroke="#fff" stroke-opacity="${major ? 0.75 : 0.35}" stroke-width="1"/>` +
        (major ? `<text x="37" y="${yy + 4}" fill="#fff" fill-opacity="0.8" font-size="12">${(f * 100).toFixed(0)}</text>` : '')
    )
  }
  const svg = Buffer.from(
    `<svg width="${vw}" height="${vh}" xmlns="http://www.w3.org/2000/svg">${ticks.join('')}` +
      line(marks.nicheFloor, '#7dff8f', `감실 바닥 ${(marks.nicheFloor * 100).toFixed(1)}% → 방 y${NICHE_FLOOR_Y}`) +
      line(marks.boardFront, '#ff2d2d', `상판 앞턱 ${(marks.boardFront * 100).toFixed(1)}% → 방 y${ITEM_BASE_Y.toFixed(2)}`) +
      line(0.999, '#ffd24a', `접지 → 마루선 y${FLOOR_LINE_Y}`) +
      `</svg>`
  )
  const out = await sharp(
    await sharp(buf).flatten({ background: '#241a10' }).resize(vw, vh, { fit: 'fill' }).png().toBuffer()
  )
    .composite([{ input: svg }])
    .webp({ quality: 88 })
    .toBuffer()
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, out)
  return file
}

// ════════════════════ 합성판 — 「판정 단위」 (stage-grand-altar.mjs 규약 승계) ════════════════════
const DARK = { r: 0x1a, g: 0x13, b: 0x08, alpha: 1 }
const LIGHT_BY_CODE = {
  banga: { color: '#C9A84C', intensity: 0.5, origin: { x: 50, y: 52 }, glow: 'rgba(201,168,76,0.2)' },
  daljip: { color: '#d4a017', intensity: 0.5, origin: { x: 50, y: 52 }, glow: 'rgba(230,195,122,0.17)' },
  seolbit: { color: '#c9a84c', intensity: 0.5, origin: { x: 50, y: 52 }, glow: 'rgba(200,212,220,0.16)' },
}
const OFFERINGS = ['candle-pair.webp', 'offering-rice.webp', 'incense-burner.webp', 'offering-jujube.webp', 'jar-water.webp']
const AVATARS = ['/avatars/five/wood.webp', '/avatars/five/fire.webp', '/avatars/five/water.webp']

/**
 * 살림 기하 — **코드 정본에서 읽는다**(여기서 새로 발명하지 않는다).
 * 선반장·의식각은 이번 회차에 마루선 파생이 됐다(family-shelf.ts / RitualHall.tsx).
 */
const SHELF_H = pluckNum('lib/domain/shrine/family-shelf.ts', /const FSHELF_H = (\d+)/, 42)
const SHELF = { x: [7, 16, 25, 34], w: 8.65, bottom: FLOOR_LINE_Y, top: FLOOR_LINE_Y - SHELF_H }
const HALL = { x: 88.75, w: 8.65, bottom: FLOOR_LINE_Y, top: FLOOR_LINE_Y - SHELF_H }
/** 대비판 전용 — 이번 수복 **전**의 살림 자리(밑동 62) */
const SHELF_OLD = { ...SHELF, top: 20, bottom: 62 }
const HALL_OLD = { ...HALL, top: 20, bottom: 62 }

async function clipLayer(buf, left, top, W, H) {
  const meta = await sharp(buf).metadata()
  const l = Math.round(left)
  const t = Math.round(top)
  const x0 = Math.max(0, l)
  const y0 = Math.max(0, t)
  const x1 = Math.min(W, l + meta.width)
  const y1 = Math.min(H, t + meta.height)
  if (x1 <= x0 || y1 <= y0) return null
  if (l >= 0 && t >= 0 && x1 === l + meta.width && y1 === t + meta.height) return { input: buf, left: l, top: t }
  const sub = await sharp(buf).extract({ left: x0 - l, top: y0 - t, width: x1 - x0, height: y1 - y0 }).png().toBuffer()
  return { input: sub, left: x0, top: y0 }
}
async function dropShadow(buf, { dy, blur, alpha }) {
  const { width, height } = await sharp(buf).metadata()
  const a = await sharp(buf).ensureAlpha().extractChannel(3).raw().toBuffer()
  for (let i = 0; i < a.length; i += 1) a[i] = Math.round(a[i] * alpha)
  const pad = Math.ceil(blur * 2) + 2
  const shadow = await sharp({ create: { width, height, channels: 3, background: { r: 0, g: 0, b: 0 } } })
    .joinChannel(a, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer()
  const blurred = await sharp(shadow)
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .blur(Math.max(0.3, blur / 2))
    .png()
    .toBuffer()
  return { buf: blurred, ox: -pad, oy: dy - pad }
}
async function pushSprite(layers, buf, left, top, W, H, shadow) {
  if (shadow) {
    const s = await dropShadow(buf, shadow)
    const l = await clipLayer(s.buf, left + s.ox, top + s.oy, W, H)
    if (l) layers.push(l)
  }
  const l = await clipLayer(buf, left, top, W, H)
  if (l) layers.push(l)
}

async function buildWide(r, { viewW, viewH, k = 1, sprite, seedY, shelf, hall, ruler = false, byWidth = false }) {
  const code = r.theme.code
  const light = LIGHT_BY_CODE[code]
  const W = Math.round(viewW * 3.2)
  const H = Math.round(viewH)
  const pxX = (p) => (W * p) / 100
  const pxY = (p) => (H * p) / 100
  const pxVW = (p) => (viewW * p) / 100
  const layers = []

  const mural = path.join(PILOT_ROOT, `${code}-v3`, r.theme.mural)
  const wallH = Math.round((H * BANDS.wall) / 100)
  const floorH = Math.round((H * BANDS.floor) / 100)
  layers.push({
    input: await sharp(path.join(mural, 'wall.webp')).resize(W, wallH, { fit: 'cover', position: 'bottom' }).png().toBuffer(),
    left: 0,
    top: 0,
  })
  layers.push({
    input: await sharp(path.join(mural, 'floor.webp')).resize(W, floorH, { fit: 'cover', position: 'top' }).png().toBuffer(),
    left: 0,
    top: H - floorH,
  })
  const vigH = Math.round(H * 0.38)
  layers.push({
    input: await sharp(
      Buffer.from(
        `<svg width="${W}" height="${vigH}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
          `<stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.32"/>` +
          `</linearGradient></defs><rect width="${W}" height="${vigH}" fill="url(#g)"/></svg>`
      )
    )
      .png()
      .toBuffer(),
    left: 0,
    top: H - vigH,
  })
  const gw = Math.round(pxVW(64))
  const gh = Math.round(pxY(16))
  const gpad = Math.round(24 * k)
  layers.push({
    input: await sharp(
      Buffer.from(
        `<svg width="${gw + gpad * 2}" height="${gh + gpad * 2}" xmlns="http://www.w3.org/2000/svg">` +
          `<ellipse cx="${gw / 2 + gpad}" cy="${gh / 2 + gpad}" rx="${gw / 2}" ry="${gh / 2}" fill="${light.glow}"/></svg>`
      )
    )
      .blur(Math.max(0.3, 3.5 * k))
      .png()
      .toBuffer(),
    left: Math.round(W / 2 - gw / 2 - gpad),
    top: Math.round(pxY(77) - gpad),
  })

  // 가족 선반장
  const shelfFile = path.join(PUB, 'shrine', 'stage', 'banga', 'shelf-sabang.webp')
  const unitW = Math.round(pxX(shelf.w))
  const unitH = Math.round(pxY(shelf.bottom - shelf.top))
  for (let i = 0; i < shelf.x.length; i += 1) {
    const cx = pxX(shelf.x[i])
    const buf = await sharp(shelfFile).resize(unitW, unitH, { fit: 'fill' }).png().toBuffer()
    await pushSprite(layers, buf, cx - unitW / 2, pxY(shelf.top), W, H, { dy: 5 * k, blur: 6 * k, alpha: 0.45 })
    const av = Math.round(unitW * 0.46)
    const avFile = path.join(PUB, AVATARS[i % AVATARS.length].replace(/^\//, ''))
    if (existsSync(avFile)) {
      const mask = Buffer.from(
        `<svg width="${av}" height="${av}" xmlns="http://www.w3.org/2000/svg"><circle cx="${av / 2}" cy="${av / 2}" r="${av / 2}" fill="#fff"/></svg>`
      )
      const round = await sharp(await sharp(avFile).resize(av, av, { fit: 'cover', position: 'top' }).png().toBuffer())
        .composite([{ input: await sharp(mask).png().toBuffer(), blend: 'dest-in' }])
        .png()
        .toBuffer()
      const l = await clipLayer(round, cx - av / 2, pxY(shelf.top) + 0.16 * unitH - av * 0.58, W, H)
      if (l) layers.push(l)
    }
  }
  // 의식각
  const hallW = Math.round(pxX(hall.w))
  const hallH = Math.round(pxY(hall.bottom - hall.top))
  await pushSprite(
    layers,
    await sharp(shelfFile).resize(hallW, hallH, { fit: 'fill' }).png().toBuffer(),
    pxX(hall.x) - hallW / 2,
    pxY(hall.top),
    W,
    H,
    { dy: 5 * k, blur: 6 * k, alpha: 0.45 }
  )
  const plaqueFile = path.join(PUB, 'shrine', 'ritual', 'plaque.webp')
  if (existsSync(plaqueFile)) {
    const pw = Math.round((hallW * 86) / 100)
    const ph = Math.round((pw * 2) / 5)
    for (const cy of [0.155, 0.425, 0.65, 0.865]) {
      await pushSprite(
        layers,
        await sharp(plaqueFile).resize(pw, ph, { fit: 'fill' }).png().toBuffer(),
        pxX(hall.x) - pw / 2,
        pxY(hall.top) + cy * hallH - ph / 2,
        W,
        H,
        { dy: 3 * k, blur: 4 * k, alpha: 0.5 }
      )
    }
  }

  // 틀 — **세로 기준**(StageLayers 접지 수복 규약). byWidth 는 수복 «전» 규칙(대비판 전용)이다.
  const altar = byWidth
    ? await sharp(sprite).resize({ width: Math.round(pxVW(SEED_W)), fit: 'inside' }).png().toBuffer()
    : await sharp(sprite).resize({ height: Math.round(pxY(BOX_H)), fit: 'inside' }).png().toBuffer()
  const altarMeta = await sharp(altar).metadata()
  await pushSprite(layers, altar, W / 2 - altarMeta.width / 2, pxY(seedY) - altarMeta.height / 2, W, H, {
    dy: 5 * k,
    blur: 9 * k,
    alpha: 0.45,
  })

  // 신위 — 발끝 45.3 · 머리는 감실 윗턱 밑
  const deityFile = path.join(PUB, 'shrine', 'deities', 'sansin', 'base.webp')
  const hPctSprite = (altarMeta.height / H) * 100
  const nicheTopY = seedY + hPctSprite * (r.marks.nicheTop - 0.5)
  const standH = Math.round(pxY(NICHE_FLOOR_Y - (nicheTopY + 1.5)))
  if (existsSync(deityFile) && standH > 8) {
    const buf = await sharp(deityFile).resize({ height: standH, fit: 'inside' }).png().toBuffer()
    const meta = await sharp(buf).metadata()
    await pushSprite(layers, buf, W / 2 - meta.width / 2, pxY(NICHE_FLOOR_Y) - meta.height, W, H, {
      dy: 5 * k,
      blur: 9 * k,
      alpha: 0.5,
    })
  }

  // 제물 5점 — 앵커 2열
  const base = ASSET_EM * ITEM_MD_PX * k
  const scaled = base * GEO.grandAltar.altarItemScale
  for (let i = 0; i < GRAND.anchors.length; i += 1) {
    const file = path.join(PUB, 'shrine', 'items', OFFERINGS[i])
    if (!existsSync(file)) continue
    const buf = await sharp(file).resize(Math.round(scaled), Math.round(scaled), { fit: 'inside' }).png().toBuffer()
    const meta = await sharp(buf).metadata()
    await pushSprite(
      layers,
      buf,
      pxX(GRAND.anchors[i].x) - meta.width / 2,
      pxY(GRAND.anchors[i].y) + base / 2 - meta.height,
      W,
      H,
      { dy: 3 * k, blur: 3 * k, alpha: 0.55 }
    )
  }

  // ★ 마루선 오버레이 — 「밑동이 선에 닿는가」를 픽셀로 답하는 확인판
  if (ruler) {
    const yy = Math.round(pxY(FLOOR_LINE_Y))
    layers.push({
      input: await sharp(
        Buffer.from(
          `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">` +
            `<line x1="0" y1="${yy}" x2="${W}" y2="${yy}" stroke="#ff2d2d" stroke-width="${Math.max(1, Math.round(2 * k))}"/>` +
            `<text x="${Math.round(10 * k)}" y="${yy - Math.round(6 * k)}" fill="#ff2d2d" font-size="${Math.round(15 * k)}">마루선 y${FLOOR_LINE_Y}</text></svg>`
        )
      )
        .png()
        .toBuffer(),
      left: 0,
      top: 0,
    })
  }

  const png = await sharp({ create: { width: W, height: H, channels: 4, background: DARK } }).composite(layers).png().toBuffer()
  return { png, W, H, altarMeta }
}

async function viewCrop(widePng, leftPx, code, w, h) {
  const light = LIGHT_BY_CODE[code]
  const cropped = await sharp(widePng)
    .extract({ left: Math.round(leftPx), top: 0, width: Math.round(w), height: Math.round(h) })
    .png()
    .toBuffer()
  const cx = (w * light.origin.x) / 100
  const cy = (h * light.origin.y) / 100
  const rx = 1.2 * w
  const ry = 0.9 * h
  const overlay = await sharp(
    Buffer.from(
      `<svg width="${Math.round(w)}" height="${Math.round(h)}" xmlns="http://www.w3.org/2000/svg"><defs>` +
        `<radialGradient id="g" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${rx}" ` +
        `gradientTransform="translate(0 ${cy}) scale(1 ${(ry / rx).toFixed(6)}) translate(0 ${-cy})">` +
        `<stop offset="0" stop-color="${light.color}" stop-opacity="1"/>` +
        `<stop offset="0.72" stop-color="${light.color}" stop-opacity="0"/></radialGradient></defs>` +
        `<rect width="${Math.round(w)}" height="${Math.round(h)}" fill="url(#g)" opacity="${light.intensity}"/></svg>`
    )
  )
    .png()
    .toBuffer()
  return sharp(cropped).composite([{ input: overlay, blend: 'soft-light' }]).png().toBuffer()
}

async function sideBySide(aBuf, bBuf, gap = 14) {
  const a = await sharp(aBuf).metadata()
  const b = await sharp(bBuf).metadata()
  const H = Math.max(a.height, b.height)
  return sharp({ create: { width: a.width + gap + b.width, height: H, channels: 4, background: DARK } })
    .composite([
      { input: aBuf, left: 0, top: 0 },
      { input: bBuf, left: a.width + gap, top: 0 },
      {
        input: { create: { width: 2, height: H, channels: 4, background: { r: 0xc9, g: 0xa8, b: 0x4c, alpha: 0.9 } } },
        left: a.width + Math.floor(gap / 2) - 1,
        top: 0,
      },
    ])
    .webp({ quality: 90 })
    .toBuffer()
}

// ──────────────────────────── main ────────────────────────────
const args = process.argv.slice(2)
const planOnly = args.includes('--plan')
const doCompose = args.includes('--compose')

console.log(
  `계약: 감실 바닥 y${NICHE_FLOOR_Y} · 제물 밑변 y${ITEM_BASE_Y.toFixed(2)} · 접지 = 마루선 y${FLOOR_LINE_Y}\n` +
    `시드: x${GRAND.x} w${SEED_W} (폭 불변) · 방 ${ROOM_W}×${ROOM_H} · K=${K_HPCT.toFixed(4)}\n` +
    `요구 픽셀비: B:C = ${B_ROOM.toFixed(2)} : ${C_ROOM.toFixed(2)} → C/B = ${(C_ROOM / B_ROOM).toFixed(5)}\n`
)

// ① 전 테마 계획 → 공유 시드 y 결정 (상자 종횡비가 세 장 모두 같아야 한 벌의 y 로 접지가 맞는다)
const plans = []
for (const t of THEMES) {
  const box = await contentBox(srcPath(t.code))
  const p = planTheme(t, box)
  // 현재 접지(방 y) — 「얼마나 떠 있나」
  const hPctNow = K_HPCT * (box.h / box.w)
  const topNow = GRAND.y - hPctNow / 2
  p.groundNow = topNow + (hPctNow * (box.bottom + 1)) / box.h
  plans.push({ theme: t, box, plan: p })
  console.log(
    `── ${t.code} ${box.w}×${box.h} (그려진 ${box.top}~${box.bottom}, 하단 투명 ${box.h - 1 - box.bottom}px)\n` +
      `   이 스프라이트의 접지(기하 JSON 의 현 시드 y${GRAND.y} 기준) 방 y${p.groundNow.toFixed(2)} → 마루선 대비 ${(p.groundNow - FLOOR_LINE_Y >= 0 ? '+' : '')}${(p.groundNow - FLOOR_LINE_Y).toFixed(2)}%p\n` +
      `   구간(px) A(닫집~감실바닥) ${p.A.toFixed(1)} · B(감실~상판) ${p.B.toFixed(1)} · C(상판~접지) ${p.C.toFixed(1)} · C/B=${(p.C / p.B).toFixed(5)}\n` +
      `   목표     B→${p.Bf.toFixed(1)} (×${p.sB.toFixed(4)}) · C→${p.Cf.toFixed(1)} (×${p.sC.toFixed(4)}) · A 불변`
  )
}
/** 상자 종횡비는 셋이 **같아야** 한다(공유 시드 y 하나로 세 접지를 마루선에 앉히려면). 가장 긴 쪽이 기준 */
const AR = Math.max(...plans.map((p) => p.plan.Tf / p.plan.W))
const H_PCT = K_HPCT * AR
const SEED_Y = Math.round((FLOOR_LINE_Y - H_PCT / 2) * 100) / 100
BOX_H = Math.round((FLOOR_LINE_Y - SEED_Y) * 2 * 100) / 100
console.log(
  `\n── 공유 시드 (세 장의 상자 종횡비를 맞춘다) ──\n` +
    `   AR ${AR.toFixed(5)} → 겉보기 세로 ${H_PCT.toFixed(2)}%  ·  시드 y ${GRAND.y} → **${SEED_Y}**  (상자 y${(SEED_Y - H_PCT / 2).toFixed(2)}~${(SEED_Y + H_PCT / 2).toFixed(2)})\n` +
    `   렌더 상수 GRAND_ALTAR_BOX_H = 2·(${FLOOR_LINE_Y} − ${SEED_Y}) = **${BOX_H}** (세로 기준 렌더)`
)
/**
 * ★ 기기별 접지 — 여기가 「실기기에서 떠 보이는」 진짜 지분이다.
 * 구 규칙(폭 기준)은 겉보기 세로가 **방 종횡비**에 딸려 와, 좁고 긴 폰에서 상자가 통째로 짧아졌다.
 */
console.log(`\n── 기기별 접지(틀 상자 하단) — 구 규칙(폭 기준) vs 새 규칙(세로 기준) ──`)
for (const d of DEVICES) {
  const oldH = ((SEED_W / 100) * d.vw * AR * 100) / d.vh
  const oldBottom = GRAND.y + oldH / 2
  const newBottom = SEED_Y + BOX_H / 2
  console.log(
    `   ${d.name.padEnd(12)} 방 ${Math.round(d.vw)}×${Math.round(d.vh)} · 구 접지 y${oldBottom.toFixed(2)} ` +
      `(마루선 대비 ${(oldBottom - FLOOR_LINE_Y).toFixed(2)}%p · ${Math.round((Math.abs(oldBottom - FLOOR_LINE_Y) / 100) * d.vh)}px) ` +
      `→ 새 접지 y${newBottom.toFixed(2)} (${(newBottom - FLOOR_LINE_Y).toFixed(2)}%p) · 틀 폭 ${(((BOX_H / 100) * d.vh) / AR / d.vw * 100).toFixed(1)}%`
  )
}

const results = []
for (const { theme, box, plan } of plans) {
  // 반올림이 내용물보다 한 뼘 작게 나오면 맨 아랫줄(접지)이 잘린다 — ceil 로 바닥을 받친다
  const Hf = Math.max(Math.round(AR * plan.W), Math.ceil(plan.Tf))
  const padTop = Hf - plan.Tf
  const perPx = K_HPCT / plan.W
  const boxTop = SEED_Y - (K_HPCT * Hf) / plan.W / 2
  const yOf = (row) => boxTop + perPx * row
  const marks = {
    nicheFloor: (padTop + plan.A) / Hf,
    nicheTop: (padTop + plan.rTop) / Hf,
    boardFront: (padTop + plan.A + plan.Bf) / Hf,
  }
  const got = {
    nicheFloor: yOf(padTop + plan.A),
    nicheTop: yOf(padTop + plan.rTop),
    boardFront: yOf(padTop + plan.A + plan.Bf),
    ground: yOf(Hf),
    top: yOf(padTop),
  }
  console.log(
    `\n══ ${theme.code} ══\n` +
      `   캔버스 ${plan.W}×${box.h} → ${plan.W}×${Hf} (내용물 ${plan.T.toFixed(0)}→${plan.Tf.toFixed(0)}px · 위 투명 ${padTop.toFixed(1)}px)\n` +
      `   감실 바닥 y${got.nicheFloor.toFixed(2)} (목표 ${NICHE_FLOOR_Y}) · 상판 앞턱 y${got.boardFront.toFixed(2)} (목표 ${ITEM_BASE_Y.toFixed(2)})\n` +
      `   접지 y${got.ground.toFixed(2)} (마루선 ${FLOOR_LINE_Y}) · 닫집 꼭대기 y${got.top.toFixed(2)}\n` +
      `   감실 윗턱 y${got.nicheTop.toFixed(2)} → deityHeadRoomY['${theme.code}'] = ${got.nicheTop.toFixed(1)}`
  )
  results.push({ theme, box, plan, Hf, padTop, marks, got })
}

if (planOnly) {
  console.log('\n(--plan · 파일 쓰기 0)')
  process.exit(0)
}

for (const r of results) {
  const { theme, box, plan, Hf, padTop, marks } = r
  const raw = warpRows(box.data, plan.W, box.ch, box.top, plan.T, plan, padTop, Hf)
  const enc = await encode(raw, plan.W, Hf)
  await mkdir(path.dirname(backupPath(theme.code)), { recursive: true })
  await copyFile(srcPath(theme.code), backupPath(theme.code))
  await writeFile(outPath(theme.code), enc.buf)
  r.out = outPath(theme.code)
  r.bytes = enc.buf.length
  r.quality = enc.quality
  r.qa = await writeQa(enc.buf, marks, path.join(themeDir(theme.code), 'qa-ground.webp'))
  console.log(
    `  ✔ ${theme.code} → public/shrine/stage/${theme.code}/grand-altar-v2.webp ` +
      `${plan.W}×${Hf} ${(enc.buf.length / 1024).toFixed(0)}KB q${enc.quality} (구본 백업 ${path.relative(ROOT, backupPath(theme.code)).replace(/\\/g, '/')})`
  )
}

if (doCompose) {
  console.log('\n── 합성판 (API 0회 · 판정 단위) ──')
  for (const r of results) {
    const dir = themeDir(r.theme.code)
    await mkdir(dir, { recursive: true })
    const wide = await buildWide(r, {
      viewW: ROOM_W,
      viewH: ROOM_H,
      sprite: r.out,
      seedY: SEED_Y,
      shelf: SHELF,
      hall: HALL,
    })
    await sharp(wide.png).webp({ quality: 90 }).toFile(path.join(dir, 'stage-wide.webp'))
    for (const [name, left] of Object.entries({
      center: Math.round((wide.W - ROOM_W) / 2),
      shelf: 0,
      hall: wide.W - ROOM_W,
    })) {
      await sharp(await viewCrop(wide.png, left, r.theme.code, ROOM_W, ROOM_H))
        .webp({ quality: 92 })
        .toFile(path.join(dir, `stage-view-${name}.webp`))
    }
    // 마루선 오버레이 확인판 — 밑동이 선에 닿는가
    const ruled = await buildWide(r, {
      viewW: ROOM_W,
      viewH: ROOM_H,
      sprite: r.out,
      seedY: SEED_Y,
      shelf: SHELF,
      hall: HALL,
      ruler: true,
    })
    for (const [name, left] of Object.entries({
      center: Math.round((ruled.W - ROOM_W) / 2),
      shelf: 0,
      hall: ruled.W - ROOM_W,
    })) {
      await sharp(
        await sharp(ruled.png).extract({ left: Math.round(left), top: 0, width: ROOM_W, height: ROOM_H }).png().toBuffer()
      )
        .webp({ quality: 92 })
        .toFile(path.join(dir, `ruler-${name}.webp`))
    }
    // 기기 시뮬 390×844 · DPR3 — **여기가 실기기 부양의 진짜 지분**이라 전/후를 나란히 굽는다
    const vw = Math.min(ROOM_W, 390 - 8)
    const vh = Math.min((ROOM_VH / 100) * 844, ROOM_H)
    const devArgs = { viewW: vw * 3, viewH: vh * 3, k: 3, shelf: SHELF, hall: HALL, ruler: true }
    const dev = await buildWide(r, { ...devArgs, sprite: r.out, seedY: SEED_Y })
    const devPng = await viewCrop(dev.png, Math.round((dev.W - vw * 3) / 2), r.theme.code, vw * 3, vh * 3)
    await sharp(devPng).webp({ quality: 90 }).toFile(path.join(dir, 'stage-device-390x844.webp'))
    const devOld = await buildWide(r, {
      ...devArgs,
      shelf: SHELF_OLD,
      hall: HALL_OLD,
      sprite: backupPath(r.theme.code),
      seedY: GRAND.y,
      byWidth: true,
    })
    const devOldPng = await viewCrop(devOld.png, Math.round((devOld.W - vw * 3) / 2), r.theme.code, vw * 3, vh * 3)
    await writeFile(
      path.join(dir, 'compare-device-390x844.webp'),
      await sideBySide(
        await sharp(devOldPng).resize({ width: Math.round(vw) }).png().toBuffer(),
        await sharp(devPng).resize({ width: Math.round(vw) }).png().toBuffer()
      )
    )
    // 전/후 대비판 — 옛 기하(밑동 62 · 시드 y38.5 · 구 스프라이트 · **폭 기준** 렌더) vs 이번 수복
    const old = await buildWide(r, {
      viewW: ROOM_W,
      viewH: ROOM_H,
      sprite: backupPath(r.theme.code),
      seedY: GRAND.y,
      shelf: SHELF_OLD,
      hall: HALL_OLD,
      ruler: true,
      byWidth: true,
    })
    const oldLeft = await sharp(old.png).extract({ left: 0, top: 0, width: ROOM_W, height: ROOM_H }).png().toBuffer()
    const newLeft = await sharp(ruled.png).extract({ left: 0, top: 0, width: ROOM_W, height: ROOM_H }).png().toBuffer()
    await writeFile(path.join(dir, 'compare-shelf-before-after.webp'), await sideBySide(oldLeft, newLeft))
    const oldC = await sharp(old.png)
      .extract({ left: Math.round((old.W - ROOM_W) / 2), top: 0, width: ROOM_W, height: ROOM_H })
      .png()
      .toBuffer()
    const newC = await sharp(ruled.png)
      .extract({ left: Math.round((ruled.W - ROOM_W) / 2), top: 0, width: ROOM_W, height: ROOM_H })
      .png()
      .toBuffer()
    await writeFile(path.join(dir, 'compare-altar-before-after.webp'), await sideBySide(oldC, newC))
    console.log(`  ✔ ${r.theme.code} → ${path.relative(ROOT, dir).replace(/\\/g, '/')}/`)
  }
}

console.log(
  `\n── 기하 JSON 에 적을 값 ──\n` +
    `   grandAltar.structures[0].y        : ${GRAND.y} → ${SEED_Y}\n` +
    `   grandAltar.structures[0].assetUrl : /shrine/stage/{code}/grand-altar-v2.webp\n` +
    `   grandAltar.deityHeadRoomY         : { ${results.map((r) => `"${r.theme.code}": ${r.got.nicheTop.toFixed(1)}`).join(', ')} }\n` +
    `⚠️ 숫자는 접지·용량만 본다. **격(格)은 확인판·합성판을 눈으로 봐서** 판정할 것.`
)
