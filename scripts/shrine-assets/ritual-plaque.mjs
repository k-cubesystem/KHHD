// 신당 창문 위 팻말(懸板) 에셋 — 의식 전용 페이지 진입점 (CEO 지시 2026-07-30)
//
// 굽는 것은 **한 장**이다 — 글자가 없는 빈 현판 널.
//   plaque.webp   가로로 긴 흑호두나무 널 + 네 변 테두리 몰딩 + 네 귀 놋쇠 못
//
// ⚠️ 글자는 굽지 않는다. 「오방기」·「백일기도」 두 팻말은 **같은 널 한 장**을 쓰고
//    글자만 DOM 텍스트로 얹는다. 이미지 모델에 한글·한자를 맡기면 자획이 뭉개져
//    두 팻말이 한 쌍으로 읽히지 않고(글자 외 문구를 같게 유지하는 규약이 무의미해진다),
//    글꼴 교체·문구 수정에도 매번 재생성이 필요해진다.
//
// 사용:
//   node scripts/shrine-assets/ritual-plaque.mjs           # 누락분만 (멱등)
//   node scripts/shrine-assets/ritual-plaque.mjs --regen    # 원본부터 재생성
//   node scripts/shrine-assets/ritual-plaque.mjs --rekey    # 원본 캐시로 키잉만 (API 0회)
//   node scripts/shrine-assets/ritual-plaque.mjs --check     # 검수 이미지만 (API 0회)
//
// 원칙 (ritual-obangki.mjs · ritual-talisman.mjs 와 동일)
//   - STYLE / LIGHT / CHROMA 를 **한 글자도 바꾸지 않고 복제**한다.
//   - 순녹색(#00FF00) 배경 생성 → 하드 크로마키 → 트림. 접지 그림자는 굽지 않는다(런타임 담당).
//   - 관찰 가능한 사실만 적는다. 지시문·강조어(CRITICAL / must NOT)를 넣으면 모델이
//     그림 대신 설명도(캐릭터 시트)를 그린다 — 2026-07-30 5연속 실패의 원인.
//
// 산출: public/shrine/ritual/plaque.webp
// 검수: assets-src/shrine/ritual-plaque-check.webp
//       ① 널 한 장  ② 기준 방(520×620) 화면  ③ 세로 긴 폰(380×607) 화면
//       ②③ 은 **실제 렌더 기하를 그대로 재현**한다 — 벽 무라를 object-cover 로 잘라
//       놓고 그 위에 팻말을 얹으므로, 팻말이 창 바로 위에 앉는지 눈으로 판정할 수 있다.
//       두 방의 종횡비가 달라 무라 크롭도 다르다: 같은 상수로 두 화면 모두 창을 맞히면
//       그것이 곧 「모든 기기에서 창 위」의 근거다.
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
const RAW_DIR = process.env.RITUAL_RAW_DIR || path.join(process.env.TEMP || '/tmp', 'shrine-ritual-plaque-raw')

/** 총 생성 상한(재시도 포함). 1장 × (1회 + 재시도 2회) = 3. */
const API_BUDGET = 3
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
 * 빈 현판 한 장. 벽에 밀착해 걸리는 널이라 **끈·고리는 그리지 않는다** —
 * 널 밖으로 부속이 튀어나오면 트림 경계가 널이 아니게 되고, 화면 배치 기하(창 위 110px 띠)가
 * 그만큼 어긋난다. 널 하나만 남기면 트림 사각형이 곧 널이다.
 */
const PLAQUE_PROMPT =
  'A Korean temple hanging plaque seen flat from the front. ' +
  'A wide rectangular board of dark walnut wood, two and a half times as wide as it is tall, ' +
  'its face smooth and empty. ' +
  'A narrow raised moulding of paler honey wood runs around all four edges of the board. ' +
  'A small round brass stud sits just inside each of the four corners. ' +
  'The wood grain runs horizontally across the face and a soft sheen falls along the upper moulding. ' +
  'The board is upright, level and centred, with an even margin on every side. ' +
  'Landscape proportion, five units wide and two units tall. ' +
  `${STYLE}, ${LIGHT}, ${CHROMA}`

/**
 * @typedef {object} RitualAsset
 * @property {string} key
 * @property {string} file
 * @property {number} outW
 * @property {number|null} outH
 * @property {string} prompt
 */

/** @type {RitualAsset[]} — 화면 팻말은 무라 좌표계에서 275×110(2.5:1). 같은 비로 구워 CSS 가 늘일 일이 없다. */
const ASSETS = [{ key: 'plaque', file: 'plaque.webp', outW: 512, outH: 205, prompt: PLAQUE_PROMPT }]

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

/** 트림된 내용물을 최종 규격으로. outH 가 있으면 그 비로 채운다(화면 비와 1:1). */
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
// 화면 그대로 본다 — 실제로 보게 될 것만 본다.
//
// 렌더 기하(components/shrine/scene/StageLayers.tsx · ShrineRoomClient.tsx 실측):
//   방          max-w 520px × min(72vh, 620px)
//   world 컨테이너 방 폭의 320% (반가 시드 논리 폭)  · camX 는 대청 정렬점(=중앙, 110)
//   벽 무라      .absolute.inset-x-0.top-0.h-[62%].w-full.object-cover  (4096×640)
// 팻말 좌표는 **무라 픽셀 좌표**로 정의되고 화면에서는 무라와 같은 cover 변환을 탄다 —
// 그래서 방 종횡비가 달라도 창 위를 벗어나지 않는다. 아래 두 셀이 그 증거다.
const DARK = { r: 0x1a, g: 0x13, b: 0x08, alpha: 1 }
const MURAL = path.join(ROOT, 'public', 'shrine', 'stage', 'banga', 'room-wall-mural.webp')
const MURAL_PX = { w: 4096, h: 640 }
/** 무대 기하 — lib/domain/shrine/plaque.ts 와 같은 값이어야 한다(드리프트 시 검수가 거짓말을 한다) */
const WORLD_WIDTH_PCT = 320
const BAND_HEIGHT_PCT = 62
const PLAQUE_BOX = { w: 175, h: 70, cy: 131 }
/** 창방(윗인방과 아랫인방 사이 밝은 띠) 경계 — 팻말이 이 안에 앉는다 */
const LINTEL_BAND = { top: 94, bottom: 168 }
const WINDOWS = [
  { key: 'obangki', cx: 1859, ko: '오방기', hanja: '五 方 旗' },
  { key: 'baekil', cx: 2166, ko: '백일기도', hanja: '百 日 祈 禱' },
]
/** 검수 셀 — 기준 방과 세로 긴 폰. 종횡비가 다르면 무라 크롭도 다르다. */
const ROOMS = [
  { label: '기준 방 520×620', w: 520, h: 620 },
  { label: '세로 긴 폰 380×607', w: 380, h: 607 },
]
const PAD = 24
const GAP = 18
const LABEL_H = 26

/** 무라 cover 변환 — 띠(band) 안에서 무라 1px 이 화면 몇 px 인가. StageLayers 의 object-cover 와 같다. */
function coverScale(bandW, bandH) {
  return Math.max(bandW / MURAL_PX.w, bandH / MURAL_PX.h)
}

/**
 * 한 방 크기에서의 화면 한 장. 방을 그대로 그리지 않고 **벽 띠만** 그린다 —
 * 판정 대상이 「팻말이 창 위에 앉는가」 하나뿐이라 제단·신위는 판단을 흐린다.
 */
async function renderRoomCell(room) {
  const bandW = Math.round((room.w * WORLD_WIDTH_PCT) / 100)
  const bandH = Math.round((room.h * BAND_HEIGHT_PCT) / 100)
  const s = coverScale(bandW, bandH)
  // world 컨테이너는 camX 만큼 왼쪽으로 밀린다. 대청 정렬점 = 중앙(방 하나가 world 110~210)
  const camX = (WORLD_WIDTH_PCT - 100) / 2
  const camPx = Math.round((camX / 100) * room.w)

  // fit:'cover' + position:'center' 가 곧 CSS object-fit:cover / object-position:50% 50% 다
  const band = await sharp(MURAL).resize(bandW, bandH, { fit: 'cover', position: 'center' }).png().toBuffer()

  // 팻말 — 무라 좌표를 띠 좌표로. 무라 중심이 띠 중심이므로 중심 기준 오프셋에 s 만 곱한다.
  const plaqueW = Math.max(1, Math.round(PLAQUE_BOX.w * s))
  const plaqueH = Math.max(1, Math.round(PLAQUE_BOX.h * s))
  const overlay = []
  const hasSprite = existsSync(path.join(OUT_DIR, 'plaque.webp'))
  for (const win of WINDOWS) {
    const cxPx = bandW / 2 + (win.cx - MURAL_PX.w / 2) * s
    const cyPx = bandH / 2 + (PLAQUE_BOX.cy - MURAL_PX.h / 2) * s
    const left = Math.round(cxPx - plaqueW / 2)
    const top = Math.round(cyPx - plaqueH / 2)
    if (hasSprite) {
      overlay.push({
        input: await sharp(path.join(OUT_DIR, 'plaque.webp'))
          .resize(plaqueW, plaqueH, { fit: 'fill' })
          .png()
          .toBuffer(),
        left,
        top,
      })
    }
    // 글자 — 화면(PlaqueSigns)과 같은 2단 구성. 널이 아직 없어도 글자는 얹어 위치를 본다.
    const svg = `<svg width="${plaqueW}" height="${plaqueH}" xmlns="http://www.w3.org/2000/svg">
      <text x="${plaqueW / 2}" y="${plaqueH * 0.42}" text-anchor="middle" font-family="Batang, serif"
        font-size="${((plaqueH * 14) / PLAQUE_BOX.h).toFixed(1)}" fill="#C9A84C" opacity="0.75">${win.hanja}</text>
      <text x="${plaqueW / 2}" y="${plaqueH * 0.82}" text-anchor="middle" font-family="Batang, serif"
        font-weight="bold" font-size="${((plaqueH * 25) / PLAQUE_BOX.h).toFixed(1)}" fill="#F2DEA8">${win.ko}</text>
    </svg>`
    overlay.push({ input: Buffer.from(svg), left, top })
  }
  // 창방 위·아래 인방 기준선 — 팻말이 두 인방 사이(창 바로 위 띠)에 앉는지 눈으로 재는 자
  for (const y of [LINTEL_BAND.top, LINTEL_BAND.bottom]) {
    const ruler = `<svg width="${bandW}" height="2" xmlns="http://www.w3.org/2000/svg">
      <rect width="${bandW}" height="2" fill="#00E5FF" opacity="0.7"/></svg>`
    overlay.push({ input: Buffer.from(ruler), left: 0, top: Math.round(bandH / 2 + (y - MURAL_PX.h / 2) * s) })
  }

  const composed = await sharp(band).composite(overlay).png().toBuffer()
  // 화면에 보이는 창(room.w) 으로 자른다 — camX 만큼 왼쪽으로 밀린 상태
  return sharp(composed)
    .extract({ left: camPx, top: 0, width: room.w, height: bandH })
    .png()
    .toBuffer()
}

function labelSvg(text, w) {
  return Buffer.from(
    `<svg width="${w}" height="${LABEL_H}" xmlns="http://www.w3.org/2000/svg">` +
      `<text x="0" y="18" font-family="Malgun Gothic, sans-serif" font-size="14" fill="#C9A84C">${text}</text></svg>`
  )
}

async function makeCheckSheet() {
  const spritePath = path.join(OUT_DIR, 'plaque.webp')
  const cells = []
  if (existsSync(spritePath)) {
    const sprite = await sharp(spritePath).resize(412, 165, { fit: 'fill' }).png().toBuffer()
    cells.push({ label: '① 널 한 장 (plaque.webp)', buf: sprite, w: 412, h: 165 })
  }
  for (const room of ROOMS) {
    const buf = await renderRoomCell(room)
    const meta = await sharp(buf).metadata()
    cells.push({ label: `${room.label} — 청록선 = 창방(창 바로 위 띠) 상·하단`, buf, w: meta.width, h: meta.height })
  }

  const W = PAD * 2 + Math.max(...cells.map((c) => c.w))
  const H = PAD * 2 + cells.reduce((a, c) => a + c.h + LABEL_H + GAP, 0) - GAP
  const composite = []
  let y = PAD
  for (const c of cells) {
    composite.push({ input: labelSvg(c.label, c.w), left: PAD, top: y })
    composite.push({ input: c.buf, left: PAD, top: y + LABEL_H })
    y += LABEL_H + c.h + GAP
  }

  const out = path.join(QA_DIR, 'ritual-plaque-check.webp')
  await mkdir(QA_DIR, { recursive: true })
  const info = await sharp({ create: { width: W, height: H, channels: 4, background: DARK } })
    .composite(composite)
    .webp({ quality: 92 })
    .toFile(out)
  return { out, bytes: info.size, W, H, count: cells.length }
}

// ──────────────────────────── main ────────────────────────────
const args = process.argv.slice(2)
const regen = args.includes('--regen')
const rekey = args.includes('--rekey')
const checkOnly = args.includes('--check')

console.log(`모델: ${MODEL}\n원본 캐시: ${RAW_DIR}\n산출: ${OUT_DIR}\n검수: ${QA_DIR}\n`)

const results = []
if (!checkOnly) {
  for (const asset of ASSETS) {
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
}

const sheet = await makeCheckSheet()
console.log(`\n✔ 검수 이미지 ${sheet.W}×${sheet.H} ${(sheet.bytes / 1024).toFixed(1)}KB`)
console.log(`  ${sheet.out}`)
console.log('  ① 널 한 장 · ②③ 두 종횡비의 실제 화면(팻말이 창 위에 앉는지)')

console.log(`\nAPI 호출 ${apiCalls}/${API_BUDGET}회`)
process.exit(results.some((r) => !r.ok) ? 1 : 0)
