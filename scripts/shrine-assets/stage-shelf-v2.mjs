// 사방탁자 v2 — 「1가족 1진열」 선반장 + 의식각 현판 걸이 (PLAN-family-shelf-v2 B안)
//
// ── 왜 만드는가 ────────────────────────────────────────────────────────────────
// CEO 지시(2026-08-12) ②「가족선반 B안으로 수정」. B안의 산술 근거는 PLAN-family-shelf-v2 §1 이다:
//   · 칸 안폭이 스프라이트 폭의 **53.5%** 뿐 — 나머지 46.5%가 기둥과 **투명 여백**이다.
//     (실측: 271px 중 좌 25 + 우 32 = 57px 이 아예 빈 픽셀이고, 기둥이 69px)
//   · 그래서 폰에서 칸 안폭 56.6px < 아이템 그린 폭 60.9px → **한 점도 칸에 안 들어간다.**
// 처방은 「칸을 줄이는 것」이 아니라 **「프레임 낭비를 걷는 것」** 이다. 그림을 새로 그리지 않고
// 원본 스프라이트를 **잘라 다시 조립**한다(생성 API 0회 — stage-grand-altar-ground.mjs 전례).
//
// ── 원본 실측 (public/shrine/stage/banga/shelf-sabang.webp · 271×640 알파 주사) ──────
//   가로  0..24 빈칸 | 25..58 왼기둥 | 59..203 **칸 안폭 145** | 204..238 오른기둥 | 239..270 빈칸
//   세로  0..49 천판 | 50..152 칸1(가족 자리) | 153..181 널1 | 182..302 칸2 | 303..327 널2
//         328..439 칸3 | 440..593 수납장(닫힌 문짝) | 594..622 다리 | 623..639 **빈칸**
//
// ── 산출 두 장 ────────────────────────────────────────────────────────────────
//  ① shelf-sabang-v2.webp  가족 선반장 — 2단(가족 자리 + 진열 한 칸). 칸3·수납장을 걷는다.
//  ② shelf-rack-v2.webp    의식각 현판 걸이 — 4면 그대로(현판이 4문이다). 여백만 걷는다.
// 둘 다 **아래 빈칸을 잘라** 상자 하단 = 그려진 발끝이 되게 한다. 그 1.1%p 가 v5 까지 남아 있던
// 「붕 떠 보임」의 마지막 몫이었다(종전에는 drop-shadow 가 덮는다고 적어 두고 넘어갔다).
//
// ── 두 개의 자(尺)를 한 번에 맞춘다 ─────────────────────────────────────────────
// 스프라이트는 `objectFit:'fill'` 로 상자에 **늘려** 그려진다. 상자의 종횡비는 기기마다 다르다:
//   가족 유닛(6.8%p × 28%p) → 기준 방 0.652 · 390폰 0.488   (세계 폭 3.2화면이라 x 만 3.2배)
// 원본(0.423)을 그대로 쓰면 기준 방에서 가로로 31% 뚱뚱해진다(PLAN §4 부록의 지적).
// 그래서 새 스프라이트의 종횡비를 **두 기기의 기하평균**으로 굽는다 — 왜곡이 ±15% 로 갈린다.
// 칸 안폭 비율 f 는 fill 에 **불변**이므로(가로 전체가 같은 배율로 늘어난다) 종횡비를 어떻게
// 잡든 f 는 유지된다 — 그래서 «칸에 드는가»와 «뚱뚱한가»를 따로 풀 수 있다.
//
// 사용:
//   node scripts/shrine-assets/stage-shelf-v2.mjs            # 두 장 굽고 QA 판 출력
//   node scripts/shrine-assets/stage-shelf-v2.mjs --verify   # 굽지 않고 실측만 (public 무접촉)
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const SRC = path.join(ROOT, 'public', 'shrine', 'stage', 'banga', 'shelf-sabang.webp')
const OUT_DIR = path.join(ROOT, 'public', 'shrine', 'stage', 'banga')
const QA_DIR = path.join(ROOT, 'assets-src', 'shrine', 'shelf-v2')
const DARK = { r: 0x1a, g: 0x13, b: 0x08, alpha: 1 }

/** 원본 랜드마크 — 알파 주사값. 원본이 바뀌면 assertLandmarks 가 소리 내며 죽는다. */
const SRC_W = 271
const SRC_H = 640
const COL = { leftPost: [25, 58], bay: [59, 203], rightPost: [204, 238] }
const ROW = {
  topAndFamilyBay: [0, 152], // 천판 + 칸1(가족 자리)
  board1: [153, 181],
  displayBay: [182, 302], // 칸2 — B안의 유일한 진열 칸
  board2: [303, 327],
  bay3: [328, 439], // (가족 v2 에서 걷는다)
  cabinet: [440, 593], // (가족 v2 에서 걷는다 · 의식각은 넷째 면으로 쓴다)
  legs: [594, 622],
}

/**
 * 칸 안폭 목표 비율 — PLAN-family-shelf-v2 B안의 「프레임 15%」 그대로.
 *
 * 역산: 가장 좁은 폰(방 382 · 세계 1222.4px · 1%p = 12.224px)에서 유닛 6.8%p = 83.1px.
 *   개구 = 83.1 × 0.85 = **70.7px** ≥ 아이템 상자 70px(3.2em × 36.25px × 0.6 = 69.6)
 * 즉 **상자 전체가** 칸에 든다 — 그린 폭(평균 60.9px)만 겨우 드는 것이 아니다.
 * 0.80 으로 구운 1차는 상자가 6px 넘쳐 넓은 신물(꽹과리·요령)이 기둥 밖으로 삐져나왔다(육안 반려).
 */
const TARGET_OPEN_FRAC = 0.85

const len = ([a, b]) => b - a + 1

function usage() {
  return `사방탁자 v2 — 원본 ${SRC_W}×${SRC_H} 을 잘라 다시 조립한다 (생성 API 0회)`
}

/** 세 세로 띠(왼기둥·칸·오른기둥)를 목표 폭으로 다시 짜맞춘다 — f(칸 안폭 비율)를 여기서 정한다. */
async function remapColumns(input, srcH, targetW, openFrac) {
  const openW = Math.round(targetW * openFrac)
  const postW = targetW - openW
  const lw = Math.round((postW * len(COL.leftPost)) / (len(COL.leftPost) + len(COL.rightPost)))
  const rw = postW - lw
  const strip = async (range, w) =>
    sharp(input)
      .extract({ left: range[0], top: 0, width: len(range), height: srcH })
      .resize(w, srcH, { fit: 'fill' })
      .png()
      .toBuffer()
  const [l, m, r] = await Promise.all([
    strip(COL.leftPost, lw),
    strip(COL.bay, openW),
    strip(COL.rightPost, rw),
  ])
  const buf = await sharp({ create: { width: targetW, height: srcH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([
      { input: l, left: 0, top: 0 },
      { input: m, left: lw, top: 0 },
      { input: r, left: lw + openW, top: 0 },
    ])
    .png()
    .toBuffer()
  return { buf, lw, openW, rw, openFrac: openW / targetW }
}

/** 가로 띠(단·널·다리)를 목표 높이로 이어 붙인다. 늘리는 것은 **빈 칸**뿐이라 나뭇결이 안 뭉개진다. */
async function stackRows(input, srcW, segments) {
  const totalH = segments.reduce((s, seg) => s + seg.h, 0)
  const parts = []
  let top = 0
  for (const seg of segments) {
    const buf = await sharp(input)
      .extract({ left: 0, top: seg.range[0], width: srcW, height: len(seg.range) })
      .resize(srcW, seg.h, { fit: 'fill' })
      .png()
      .toBuffer()
    parts.push({ input: buf, left: 0, top })
    top += seg.h
  }
  const buf = await sharp({ create: { width: srcW, height: totalH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(parts)
    .png()
    .toBuffer()
  return { buf, totalH }
}

async function assertLandmarks() {
  const meta = await sharp(SRC).metadata()
  if (meta.width !== SRC_W || meta.height !== SRC_H) {
    throw new Error(`원본 규격이 바뀌었다: ${meta.width}×${meta.height} (기대 ${SRC_W}×${SRC_H}) — 랜드마크를 다시 재고 이 표를 고칠 것`)
  }
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const opaque = (x, y) => data[(y * info.width + x) * info.channels + 3] > 24
  // 칸 안이 실제로 비어 있는가(= 늘려도 안전한가) · 널이 실제로 꽉 찼는가
  const bayMid = Math.round((ROW.displayBay[0] + ROW.displayBay[1]) / 2)
  let bayInk = 0
  for (let x = COL.bay[0]; x <= COL.bay[1]; x += 1) if (opaque(x, bayMid)) bayInk += 1
  if (bayInk > len(COL.bay) * 0.1) throw new Error(`칸 ${COL.bay} 이 비어 있지 않다(ink ${bayInk}) — 늘리면 그림이 뭉개진다`)
  const boardMid = Math.round((ROW.board2[0] + ROW.board2[1]) / 2)
  let boardInk = 0
  for (let x = COL.bay[0]; x <= COL.bay[1]; x += 1) if (opaque(x, boardMid)) boardInk += 1
  if (boardInk < len(COL.bay) * 0.9) throw new Error(`널 ${ROW.board2} 이 꽉 차 있지 않다(ink ${boardInk}) — 랜드마크가 어긋났다`)
  // 아래 빈칸이 실제로 비어 있는가(= 잘라야 할 몫)
  for (let y = ROW.legs[1] + 1; y < SRC_H; y += 1) {
    for (let x = 0; x < SRC_W; x += 1) {
      if (opaque(x, y)) throw new Error(`발밑 빈칸이 y${y} 에서 끝나지 않는다 — legs 랜드마크를 다시 잴 것`)
    }
  }
}

/**
 * 가족 선반장 v2 — 2단.
 * 세로 규격은 **칸2(진열 칸)가 아이템을 담는 크기**에서 역산한다:
 *   아이템 그린 세로 69.6px(3.2em × 36.25px × 0.6) ÷ 0.87 ≈ 80px = 유닛 세로 28%p 의 46.1%
 * 나머지 네 띠(천판+칸1 · 널1 · 널2 · 다리 = 236px)는 원본 비율 그대로 두고 칸2만 늘린다.
 */
async function buildFamily() {
  const nonOpen = len(ROW.topAndFamilyBay) + len(ROW.board1) + len(ROW.board2) + len(ROW.legs)
  const OPEN_FRAC_V = 12.9 / 28 // 칸2가 유닛 세로에서 차지할 몫
  const totalH = Math.round(nonOpen / (1 - OPEN_FRAC_V))
  const displayH = totalH - nonOpen
  // 상자 종횡비 두 벌(기준 방 · 390폰)의 기하평균 — 어느 기기에서도 왜곡이 ±15% 를 넘지 않는다
  const targetW = Math.round(totalH * boxAspectGeoMean(6.8, 28))
  const cols = await remapColumns(SRC, SRC_H, targetW, TARGET_OPEN_FRAC)
  const rows = await stackRows(cols.buf, targetW, [
    { range: ROW.topAndFamilyBay, h: len(ROW.topAndFamilyBay) },
    { range: ROW.board1, h: len(ROW.board1) },
    { range: ROW.displayBay, h: displayH },
    { range: ROW.board2, h: len(ROW.board2) },
    { range: ROW.legs, h: len(ROW.legs) },
  ])
  const marks = {
    familyBayTop: ROW.topAndFamilyBay[0] + 50, // 천판 아래 = 칸1 시작(원본 y50)
    familyBayBottom: len(ROW.topAndFamilyBay),
    board1Top: len(ROW.topAndFamilyBay),
    displayTop: len(ROW.topAndFamilyBay) + len(ROW.board1),
    board2Top: len(ROW.topAndFamilyBay) + len(ROW.board1) + displayH,
    legsTop: len(ROW.topAndFamilyBay) + len(ROW.board1) + displayH + len(ROW.board2),
  }
  return { buf: rows.buf, w: targetW, h: rows.totalH, cols, marks }
}

/** 의식각 현판 걸이 — 4면 그대로(현판이 4문). 빈 여백만 걷고 종횡비만 다시 잡는다. */
async function buildRack() {
  const totalH = ROW.legs[1] + 1 // 아래 빈칸 잘라내기
  const targetW = Math.round(totalH * boxAspectGeoMean(7.6, 36))
  const cols = await remapColumns(SRC, SRC_H, targetW, TARGET_OPEN_FRAC)
  const buf = await sharp(cols.buf).extract({ left: 0, top: 0, width: targetW, height: totalH }).png().toBuffer()
  const cy = (range) => Math.round(((range[0] + range[1]) / 2 / totalH) * 1000) / 1000
  return {
    buf,
    w: targetW,
    h: totalH,
    cols,
    faces: [cy([50, ROW.topAndFamilyBay[1]]), cy(ROW.displayBay), cy(ROW.bay3), cy(ROW.cabinet)],
  }
}

/**
 * 상자 종횡비의 기하평균. 세계 폭이 3.2화면이라 x 1%p = 방폭의 3.2% 이고 y 1%p = 방높이의 1% 다.
 * 기준 방 520×620 · 390폰(페이지 여백 px-1 → 방폭 382 · 방높이 min(72vh,620)=608).
 */
function boxAspectGeoMean(wPct, hPct) {
  const dev = [
    { w: 520, h: 620 },
    { w: 382, h: 608 },
  ].map((d) => (wPct * d.w * 3.2) / 100 / ((hPct * d.h) / 100))
  return Math.sqrt(dev[0] * dev[1])
}

/** 검수판 — 원본 / 가족 v2 / 걸이 v2 를 **실제 렌더 상자 비율**로 나란히 굽는다(눈이 정본). */
async function qaSheet(family, rack) {
  const H = 420
  const cell = async (buf, wPct, hPct, dev) => {
    const boxH = Math.round((H * hPct) / 42) // 42%p(구 유닛 세로)를 세로 기준으로 삼아 크기 비교가 성립하게
    const boxW = Math.max(4, Math.round((boxH * ((wPct * dev.w * 3.2) / 100)) / ((hPct * dev.h) / 100)))
    const img = await sharp(buf).resize(boxW, boxH, { fit: 'fill' }).png().toBuffer()
    return sharp({ create: { width: boxW + 24, height: H, channels: 4, background: { r: 0x1a, g: 0x13, b: 0x08, alpha: 1 } } })
      .composite([{ input: img, left: 12, top: H - boxH - 8 }])
      .png()
      .toBuffer()
  }
  for (const dev of [
    { name: 'desktop-520x620', w: 520, h: 620 },
    { name: 'phone-390x844', w: 382, h: 608 },
  ]) {
    const cells = [
      await cell(SRC, 8.65, 42, dev),
      await cell(family.buf, 6.8, 28, dev),
      await cell(rack.buf, 7.6, 36, dev),
    ]
    const metas = await Promise.all(cells.map((c) => sharp(c).metadata()))
    const W = metas.reduce((s, m) => s + m.width, 0)
    let left = 0
    const layers = []
    for (let i = 0; i < cells.length; i += 1) {
      layers.push({ input: cells[i], left, top: 0 })
      left += metas[i].width
    }
    const out = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0x1a, g: 0x13, b: 0x08, alpha: 1 } } })
      .composite(layers)
      .webp({ quality: 92 })
      .toBuffer()
    await writeFile(path.join(QA_DIR, `compare-${dev.name}.webp`), out)
  }
}

// ══════════════════════ 장면 검수판 — 「눈이 정본」 ══════════════════════
// 자동 검출을 믿지 않는 것이 이 프로젝트의 규율이다(feedback_gate_measures_wrong_thing).
// 그래서 **실제 렌더 규약 그대로** 방 한 장을 굽는다: 뮤럴 두 장(폭 맞춤 + 접지 고정) · 틀(세로
// 기준) · 사방탁자 두 벌 · 현판 4문 · 진열 신물. 왼쪽이 v1(현행), 오른쪽이 v2(후보)다.
// 기기는 둘 — 기준 방 520×620 과 390폰(방 382×608). 폰이 판정본이다.

const BANGA = path.join(ROOT, 'public', 'shrine', 'stage', 'banga')
const ITEMS = path.join(ROOT, 'public', 'shrine', 'items')
const AVATARS = ['wood', 'fire', 'water', 'earth', 'metal', 'wood'].map((e) =>
  path.join(ROOT, 'public', 'avatars', 'five', `${e}.webp`)
)
const DISPLAY_ITEMS = ['bell-yoryeong.webp', 'gong-kkwaenggwari.webp', 'candle-pair.webp', 'fan-museon.webp']

/** v1(현행 라이브) 기하 — 비교판 전용 리터럴. 도메인이 아니라 «어제의 화면»을 재현하는 값이다. */
const V1 = {
  unitX: [7, 16, 25, 34, 63.5, 72.5],
  unitW: 8.65,
  unitH: 42,
  ground: 82,
  sprite: 'shelf-sabang.webp',
  familyTier: 0.16,
  boards: [0.31, 0.55, 0.76],
  itemLift: 3.5,
  slotDx: [-2.2, 0, 2.2],
  hall: { x: 88.75, w: 8.65, h: 42, cy: [0.155, 0.425, 0.65, 0.865], wPct: 86, sprite: 'shelf-sabang.webp' },
}
/** v2(후보) — **도메인 소스에서 읽는다**. 손으로 옮겨 적으면 그 순간 QA 가 다른 방을 그린다. */
function readV2() {
  const shelf = readFileSync(path.join(ROOT, 'lib', 'domain', 'shrine', 'family-shelf.ts'), 'utf8')
  const hall = readFileSync(path.join(ROOT, 'components', 'shrine', 'scene', 'RitualHall.tsx'), 'utf8')
  const wall = readFileSync(path.join(ROOT, 'components', 'shrine', 'scene', 'FamilyShelfWall.tsx'), 'utf8')
  const geo = JSON.parse(readFileSync(path.join(ROOT, 'lib', 'domain', 'shrine', 'theme-stage-geometry.json'), 'utf8'))
  const num = (src, re, label) => {
    const m = src.match(re)
    if (!m) throw new Error(`정본 상수 추출 실패: ${label}`)
    return Number(m[1])
  }
  const list = (src, re, label) =>
    (src.match(re) ?? (() => { throw new Error(`정본 배열 추출 실패: ${label}`) })())[1]
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((v) => Number.isFinite(v))
  const floorLine = 100 - geo.bands.floor
  const drop = Math.round((geo.bands.floor / 3) * 100) / 100
  const wallGround = Math.round((floorLine + Math.round((drop / 3) * 100) / 100) * 100) / 100
  const unitH = num(shelf, /const FSHELF_H = ([\d.]+)/, 'FSHELF_H')
  const hallH = num(hall, /const RITUAL_HALL_H = ([\d.]+)/, 'RITUAL_HALL_H')
  return {
    unitX: list(shelf, /FSHELF_UNIT_X[^=]*=\s*Object\.freeze\(\[([^\]]*)\]\)/, 'FSHELF_UNIT_X'),
    unitW: num(shelf, /\bw:\s*([\d.]+),/, 'FSHELF_UNIT.w'),
    unitH,
    ground: wallGround,
    altarGround: Math.round((floorLine + drop) * 100) / 100,
    sprite: path.basename(/const SPRITE = '([^']+)'/.exec(wall)[1]),
    familyTier: num(shelf, /family:\s*([\d.]+)/, 'FSHELF_TIERS.family'),
    familyBay: list(shelf, /familyBay:\s*Object\.freeze\(\[([^\]]*)\]\)/, 'familyBay'),
    displayTop: num(shelf, /displayTop:\s*([\d.]+)/, 'displayTop'),
    boards: list(shelf, /boards:\s*Object\.freeze\(\[([^\]]*)\]\)/, 'boards'),
    itemLift: num(shelf, /export const FSHELF_ITEM_FOOT = ([\d.]+)/, 'FSHELF_ITEM_FOOT'),
    itemScale: num(shelf, /export const FSHELF_ITEM_SCALE = ([\d.]+)/, 'FSHELF_ITEM_SCALE'),
    slotDx: [0],
    hall: {
      x: num(hall, /x:\s*([\d.]+),/, 'RITUAL_HALL_UNIT.x'),
      w: num(hall, /w:\s*([\d.]+),/, 'RITUAL_HALL_UNIT.w'),
      h: hallH,
      cy: list(hall, /const PLAQUE_CY = \[([^\]]*)\]/, 'PLAQUE_CY'),
      wPct: num(hall, /const PLAQUE_W_PCT = ([\d.]+)/, 'PLAQUE_W_PCT'),
      sprite: path.basename(/const SHELF_SPRITE = '([^']+)'/.exec(hall)[1]),
    },
    geo,
  }
}

/** 접지 그림자 — `.shrine-fixture-contact` 의 QA 재현(폭 132% · 높이 7.5% · 아래로 46%). */
function contactShadow(w, h) {
  const cw = Math.max(6, Math.round(w * 1.32))
  const ch = Math.max(3, Math.round(h * 0.075))
  return {
    buf: Buffer.from(
      `<svg width="${cw}" height="${ch}" xmlns="http://www.w3.org/2000/svg"><defs>
        <radialGradient id="g"><stop offset="0" stop-color="#000" stop-opacity="0.55"/>
        <stop offset="0.38" stop-color="#000" stop-opacity="0.34"/>
        <stop offset="0.62" stop-color="#000" stop-opacity="0.12"/>
        <stop offset="0.78" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
       <ellipse cx="${cw / 2}" cy="${ch / 2}" rx="${cw / 2}" ry="${ch / 2}" fill="url(#g)"/></svg>`
    ),
    w: cw,
    h: ch,
  }
}

async function drawScene(spec, dev, k) {
  const W = Math.round(dev.w * 3.2 * k)
  const H = Math.round(dev.h * k)
  const px = (v) => Math.round((v / 100) * W)
  const py = (v) => Math.round((v / 100) * H)
  const g = spec.geo ?? JSON.parse(readFileSync(path.join(ROOT, 'lib', 'domain', 'shrine', 'theme-stage-geometry.json'), 'utf8'))
  const layers = []
  const clip = async (buf, left, top) => {
    const m = await sharp(buf).metadata()
    const l = Math.round(left)
    const t = Math.round(top)
    if (l + m.width <= 0 || t + m.height <= 0 || l >= W || t >= H) return null
    const sx = Math.max(0, -l)
    const sy = Math.max(0, -t)
    const cw = Math.min(m.width - sx, W - Math.max(0, l))
    const ch = Math.min(m.height - sy, H - Math.max(0, t))
    if (cw <= 0 || ch <= 0) return null
    const cut = await sharp(buf).extract({ left: sx, top: sy, width: cw, height: ch }).png().toBuffer()
    layers.push({ input: cut, left: Math.max(0, l), top: Math.max(0, t) })
    return true
  }
  // ① 벽 뮤럴 — 폭 맞춤 + object-bottom(수평선을 밴드 바닥에 붙인다)
  const wallH = py(g.bands.wall)
  const wallSrc = path.join(BANGA, 'room-wall-mural-v3.webp')
  const wm = await sharp(wallSrc).metadata()
  const wallImgH = Math.round((W * wm.height) / wm.width)
  await clip(await sharp(wallSrc).resize(W, wallImgH, { fit: 'fill' }).png().toBuffer(), 0, wallH - wallImgH)
  // ② 바닥 뮤럴 — object-top
  const floorH = py(g.bands.floor)
  const floorSrc = path.join(BANGA, 'room-floor-mural-v3.webp')
  const fm = await sharp(floorSrc).metadata()
  const floorImgH = Math.round((W * fm.height) / fm.width)
  await clip(await sharp(floorSrc).resize(W, floorImgH, { fit: 'fill' }).png().toBuffer(), 0, H - floorH)
  // ③ 틀(壇) — **세로 기준**(GRAND_ALTAR_BOX_H) · 가로는 종횡비. 접지선 82 는 v6 에서도 그대로다.
  const frame = g.grandAltar.structures[0]
  const boxH = Math.round(((spec.altarGround ?? 82) - frame.y) * 2 * 100) / 100 // = GRAND_ALTAR_BOX_H
  const frameSrc = path.join(BANGA, 'grand-altar-v2.webp')
  const gm = await sharp(frameSrc).metadata()
  const fh = py(boxH)
  const fw = Math.round((fh * gm.width) / gm.height)
  await clip(
    await sharp(frameSrc).resize(fw, fh, { fit: 'fill' }).png().toBuffer(),
    px(frame.x) - fw / 2,
    py(frame.y) - fh / 2
  )
  // ④ 사방탁자 — 유닛 상자 + 접지 그림자 + 아바타 + 진열 신물
  const uw = px(spec.unitW)
  const uh = py(spec.unitH)
  const utop = py(spec.ground - spec.unitH)
  const shelfSrc = path.join(BANGA, spec.sprite)
  for (let i = 0; i < spec.unitX.length; i += 1) {
    const cx = px(spec.unitX[i])
    if (spec.contact) {
      const cs = contactShadow(uw, uh)
      await clip(await sharp(cs.buf).png().toBuffer(), cx - cs.w / 2, utop + uh - cs.h / 2 + cs.h * 0.46)
    }
    await clip(await sharp(shelfSrc).resize(uw, uh, { fit: 'fill' }).png().toBuffer(), cx - uw / 2, utop)
    // 가족 자리 원반 — v1 은 유닛 «폭»의 46%, v2 는 «칸 높이»에서 파생
    const av = spec.familyBay
      ? Math.round((spec.familyBay[1] - spec.familyBay[0]) * 0.84 * uh)
      : Math.round(uw * 0.46)
    const avTop = spec.familyBay ? utop + spec.familyTier * uh - av / 2 : utop + spec.familyTier * uh - av * 0.58
    const face = existsSync(AVATARS[i])
      ? await sharp(AVATARS[i]).resize(av, av, { fit: 'cover', position: 'top' }).png().toBuffer()
      : null
    if (face) {
      const mask = Buffer.from(
        `<svg width="${av}" height="${av}" xmlns="http://www.w3.org/2000/svg"><circle cx="${av / 2}" cy="${av / 2}" r="${av / 2}" fill="#fff"/></svg>`
      )
      await clip(
        await sharp(face).composite([{ input: await sharp(mask).png().toBuffer(), blend: 'dest-in' }]).png().toBuffer(),
        cx - av / 2,
        avTop
      )
    }
    await clip(
      await sharp(
        Buffer.from(
          `<svg width="${av}" height="${av}" xmlns="http://www.w3.org/2000/svg"><circle cx="${av / 2}" cy="${av / 2}" r="${av / 2 - k}" fill="none" stroke="rgba(201,168,76,0.6)" stroke-width="${1.5 * k}"/></svg>`
        )
      )
        .png()
        .toBuffer(),
      cx - av / 2,
      avTop
    )
    // 진열 신물 — 널 상면에 발을 대고 선다. 그려진 밑변 = 앵커 y + 반높이(렌더 규약)
    const itemBox = 3.2 * 36.25 * k
    const drawn = Math.round(itemBox * 0.6)
    for (let s = 0; s < spec.slotDx.length; s += 1) {
      const file = path.join(ITEMS, DISPLAY_ITEMS[(i + s) % DISPLAY_ITEMS.length])
      if (!existsSync(file)) continue
      const boardY = utop + spec.boards[spec.boards.length - 1] * uh
      const ix = cx + px(spec.slotDx[s])
      await clip(await sharp(file).resize(drawn, drawn, { fit: 'inside' }).png().toBuffer(), ix - drawn / 2, boardY - drawn)
    }
  }
  // ⑤ 의식각 — 걸이 + 현판 4문 (글자는 굽지 않는다: 폰트 유무로 QA 가 흔들리지 않게)
  const hw = px(spec.hall.w)
  const hh = py(spec.hall.h)
  const htop = py(spec.ground - spec.hall.h)
  const hcx = px(spec.hall.x)
  if (spec.contact) {
    const cs = contactShadow(hw, hh)
    await clip(await sharp(cs.buf).png().toBuffer(), hcx - cs.w / 2, htop + hh - cs.h / 2 + cs.h * 0.46)
  }
  await clip(
    await sharp(path.join(BANGA, spec.hall.sprite)).resize(hw, hh, { fit: 'fill' }).png().toBuffer(),
    hcx - hw / 2,
    htop
  )
  const plaqueFile = path.join(ROOT, 'public', 'shrine', 'ritual', 'plaque.webp')
  if (existsSync(plaqueFile)) {
    const pw = Math.round((hw * spec.hall.wPct) / 100)
    const ph = Math.round((pw * 2) / 5)
    for (const cy of spec.hall.cy) {
      await clip(await sharp(plaqueFile).resize(pw, ph, { fit: 'fill' }).png().toBuffer(), hcx - pw / 2, htop + cy * hh - ph / 2)
    }
  }
  return sharp({ create: { width: W, height: H, channels: 4, background: DARK } }).composite(layers).png().toBuffer()
}

/** 한 화면 크롭 — 세계 x(무대 %) 중심 기준. 사람이 실제로 보는 한 장. */
async function screenAt(widePng, worldXPct, dev, k) {
  const W = Math.round(dev.w * 3.2 * k)
  const vw = Math.round(dev.w * k)
  const left = Math.min(W - vw, Math.max(0, Math.round((worldXPct / 100) * W - vw / 2)))
  return sharp(widePng).extract({ left, top: 0, width: vw, height: Math.round(dev.h * k) }).png().toBuffer()
}

async function label(buf, text, k) {
  const m = await sharp(buf).metadata()
  const bar = Math.round(26 * k)
  const svg = Buffer.from(
    `<svg width="${m.width}" height="${bar}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${m.width}" height="${bar}" fill="#0d0906"/>
      <text x="${8 * k}" y="${bar * 0.72}" font-family="sans-serif" font-size="${13 * k}" fill="#e8d8ae">${text}</text></svg>`
  )
  return sharp({ create: { width: m.width, height: m.height + bar, channels: 4, background: DARK } })
    .composite([{ input: await sharp(svg).png().toBuffer(), left: 0, top: 0 }, { input: buf, left: 0, top: bar }])
    .png()
    .toBuffer()
}

async function row(cells, gap = 10) {
  const metas = await Promise.all(cells.map((c) => sharp(c).metadata()))
  const W = metas.reduce((s, m) => s + m.width, 0) + gap * (cells.length - 1)
  const H = Math.max(...metas.map((m) => m.height))
  const layers = []
  let left = 0
  for (let i = 0; i < cells.length; i += 1) {
    layers.push({ input: cells[i], left, top: 0 })
    left += metas[i].width + gap
  }
  return sharp({ create: { width: W, height: H, channels: 4, background: DARK } }).composite(layers).png().toBuffer()
}

async function sceneQa() {
  const v2 = { ...readV2(), contact: true }
  const v1 = { ...V1, altarGround: v2.altarGround, geo: v2.geo, contact: false }
  await mkdir(QA_DIR, { recursive: true })
  const DEVS = [
    { name: 'phone-390x844', w: 382, h: 608, k: 2 },
    { name: 'desktop-520x620', w: 520, h: 620, k: 2 },
  ]
  // 왼벽(가족 4좌) · 가운데(틀 + 오른벽 2좌) · 오른쪽(의식각)
  const VIEWS = [
    ['left', 18.2],
    ['center', 50],
    ['right', 84.4],
  ]
  for (const dev of DEVS) {
    const [wideA, wideB] = await Promise.all([drawScene(v1, dev, dev.k), drawScene(v2, dev, dev.k)])
    for (const [vname, wx] of VIEWS) {
      const a = await label(await screenAt(wideA, wx, dev, dev.k), `v1 현행 · ${vname} · ${dev.name}`, dev.k)
      const b = await label(await screenAt(wideB, wx, dev, dev.k), `v2 후보 · ${vname} · ${dev.name}`, dev.k)
      await writeFile(
        path.join(QA_DIR, `scene-${dev.name}-${vname}.webp`),
        await sharp(await row([a, b])).webp({ quality: 88 }).toBuffer()
      )
    }
    await writeFile(
      path.join(QA_DIR, `scene-${dev.name}-wide.webp`),
      await sharp(
        await row([
          await label(await sharp(wideA).resize({ width: 1600 }).png().toBuffer(), `v1 현행 전폭 · ${dev.name}`, 1),
          await label(await sharp(wideB).resize({ width: 1600 }).png().toBuffer(), `v2 후보 전폭 · ${dev.name}`, 1),
        ])
      )
        .webp({ quality: 84 })
        .toBuffer()
    )
  }
  console.log(`장면 검수판: assets-src/shrine/shelf-v2/scene-*.webp (기기 2 × 뷰 4)`)
}

async function main() {
  if (process.argv.includes('--scene')) return sceneQa()
  if (!existsSync(SRC)) throw new Error(`원본 없음: ${SRC}`)
  await assertLandmarks()
  const family = await buildFamily()
  const rack = await buildRack()
  const verify = process.argv.includes('--verify')

  console.log(usage())
  console.log(
    `가족 v2  ${family.w}×${family.h} · 칸 안폭 ${(family.cols.openFrac * 100).toFixed(1)}% ` +
      `(원본 53.5%) · 기둥 ${family.cols.lw}/${family.cols.rw}px`
  )
  console.log(
    `  랜드마크(유닛 높이 비율): 가족칸 ${(family.marks.familyBayTop / family.h).toFixed(4)}~${(family.marks.familyBayBottom / family.h).toFixed(4)} · ` +
      `널1상면 ${(family.marks.board1Top / family.h).toFixed(4)} · 진열칸 ${(family.marks.displayTop / family.h).toFixed(4)}~${(family.marks.board2Top / family.h).toFixed(4)} · ` +
      `널2상면 ${(family.marks.board2Top / family.h).toFixed(4)} · 다리 ${(family.marks.legsTop / family.h).toFixed(4)}`
  )
  console.log(`걸이 v2  ${rack.w}×${rack.h} · 현판 4면 cy [${rack.faces.join(', ')}]`)
  if (verify) return

  await mkdir(QA_DIR, { recursive: true })
  await writeFile(path.join(OUT_DIR, 'shelf-sabang-v2.webp'), await sharp(family.buf).webp({ quality: 92 }).toBuffer())
  await writeFile(path.join(OUT_DIR, 'shelf-rack-v2.webp'), await sharp(rack.buf).webp({ quality: 92 }).toBuffer())
  await qaSheet(family, rack)
  console.log(`\n산출: public/shrine/stage/banga/{shelf-sabang-v2,shelf-rack-v2}.webp · QA: assets-src/shrine/shelf-v2/`)
}

main().catch((e) => {
  console.error(e.message)
  process.exitCode = 1
})
