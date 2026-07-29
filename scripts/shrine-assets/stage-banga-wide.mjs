// 신당 「두루마리 신당」 3파 — 반가(班家) 와이드 구역 시범 에셋 (ARCH-shrine-gamefeel-v1 §1, PRD 안2)
//
// 2파가 연 가로 2.4화면 세계(마당 0~70 · 대청 70~170 · 후원 170~240)에서
// **대청 밖 두 구역**의 무대 세트를 만든다. 대청은 기존 v2 에셋(wallpaper/flooring/altar)이 그대로 산다.
//
// 산출: public/shrine/stage/banga/  (기존 v2 에셋과 같은 디렉터리 — 테마 단위로 한 곳에 모은다)
//   madang-wall.webp   1024×640 불투명 — 담장 + 하늘   (구역 벽지 규격 = 기존 wallpaper.webp 와 동일)
//   madang-floor.webp  1024×420 불투명 — 마당 흙·박석  (구역 바닥 규격 = 기존 flooring.webp 와 동일)
//   gate.webp           768²    투명   — 솟을대문 (마당 구조물)
//   seokdeung.webp     512×768  투명   — 석등     (마당 구조물)
//   huwon-wall.webp    1024×640 불투명 — 뒤뜰 담 + 나무
//   huwon-floor.webp   1024×420 불투명 — 토방·장독 마당 (대청마루와 이어지는 흙바닥)
//   preview-world.webp — 세 구역을 시드 좌표 그대로 조립한 두루마리 목업 (API 호출 0, 좌표 검수용)
//
// 사용:
//   node scripts/shrine-assets/stage-banga-wide.mjs              # 누락분만 생성 (멱등)
//   node scripts/shrine-assets/stage-banga-wide.mjs gate         # 특정 키만
//   node scripts/shrine-assets/stage-banga-wide.mjs all --regen  # 원본부터 재생성
//   node scripts/shrine-assets/stage-banga-wide.mjs --rekey      # 원본 캐시로 키잉만 재실행 (API 호출 0)
//
// 원칙 (stage-banga.mjs 와 동일 — 두 스크립트의 산출물이 한 화면에서 만나므로 규율이 갈리면 안 된다)
//   - 광원 좌상단 고정 · 「설빛온기」 화풍 · 기존 반가 벽지/마루와 같은 팔레트.
//   - 접지 그림자를 굽지 않는다(런타임 drop-shadow 담당). 배경에 구우면 크로마키 시 초록 얼룩이 남는다.
//   - Gemini 는 알파 미지원 → 순녹색(#00FF00) 배경 생성 후 소프트 크로마키.
//   - 생성 비용: 장당 1회 원칙, 키잉 3프로파일 모두 실패 시에만 재생성(장당 최대 2회).
//
// ⚠️ 벽지 플레이트에 구조물을 굽지 않는다 — 대문·석등은 별도 투명 스프라이트로 얹는다.
//    구워버리면 시드의 x/y/w 로 위치를 못 잡고, 구역 폭이 달라질 때 같이 늘어난다.
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
const KEY =
  process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
if (!KEY) {
  console.error('✖ GEMINI 키 없음 — .env.local의 GEMINI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY 확인')
  process.exit(1)
}

const PUB = path.resolve(import.meta.dirname, '../../public')
const OUT_DIR = path.join(PUB, 'shrine', 'stage', 'banga')
// 원본 PNG 캐시. stage-banga.mjs 와 **다른 디렉터리** — 키 이름이 겹치지 않아도 캐시를 섞으면
// --regen 이 남의 원본을 날린다. STAGE_WIDE_RAW_DIR 로 고정 경로 지정 가능.
const RAW_DIR =
  process.env.STAGE_WIDE_RAW_DIR || path.join(process.env.TEMP || '/tmp', 'shrine-stage-banga-wide-raw')

const genAI = new GoogleGenerativeAI(KEY)
const model = genAI.getGenerativeModel({ model: MODEL })

// ────────────────────────────── 프롬프트 ──────────────────────────────
// STYLE·LIGHT·CHROMA 는 stage-banga.mjs 와 **한 글자도 다르지 않아야 한다** — 같은 화면에서 이어 붙는다.
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
// 옆 구역이 대청과 이어져 보이게 하는 팔레트 고정 문구. 대청(wallpaper/flooring)의 색을 명시로 붙든다.
const TONE =
  'the palette must match the interior of the same house: dark walnut timber, warm ivory hanji, ' +
  'aged ochre earth, dark slate-grey roof tiles, desaturated and dim like late dusk — ' +
  'no bright saturated greens, no vivid blue sky, no daylight glare'

/** @type {Array<{key:string,file:string,alpha:boolean,w:number,h:number,fit:'cover'|'contain',prompt:string}>} */
const ASSETS = [
  // ── 마당(madang) 0~70 ───────────────────────────────────────
  {
    key: 'madang-wall',
    file: 'madang-wall.webp',
    alpha: false,
    w: 1024,
    h: 640,
    fit: 'cover',
    prompt:
      'The outer courtyard boundary of a Korean noble house (반가 班家), flat frontal elevation view. ' +
      'A long low perimeter wall (담장) runs straight across the frame: a base course of rough stacked stone, ' +
      'an ochre earthen plaster body with a faint lattice of embedded tile, capped by dark slate-grey giwa roof tiles. ' +
      'Above and behind the wall, only a calm dim dusk sky with a few soft clouds and the faint silhouette of distant hills. ' +
      'There is NO GATE and NO DOOR anywhere — the wall is unbroken. ' +
      'Nothing stands in front of the wall: no lanterns, no trees, no jars, no people, no signs. ' +
      'No ground and no floor visible, only the wall and the sky filling the entire frame. ' +
      `${STYLE}, ${TONE}, ${LIGHT}, full-bleed background plate, no text, no watermark, no border`,
  },
  {
    key: 'madang-floor',
    file: 'madang-floor.webp',
    alpha: false,
    w: 1024,
    h: 420,
    fit: 'cover',
    prompt:
      'The bare earth courtyard ground (마당) of a Korean hanok, seen from slightly above at a low angle. ' +
      'Packed sandy-ochre soil, finely raked, with irregular flat granite flagstones (박석) set into it ' +
      'forming a loose path that runs away from the viewer with a gentle one-point perspective — ' +
      'the ground visually widens toward the bottom of the frame. Faint pale dust, a few small pebbles, ' +
      'shallow worn hollows, dry and quiet. ' +
      'The courtyard is COMPLETELY EMPTY — no walls, no fence, no plants, no jars, no furniture, no objects at all. ' +
      'No horizon line, no sky, no buildings — only the ground plane filling the entire frame. ' +
      `${STYLE}, ${TONE}, ${LIGHT}, full-bleed background plate, no text, no watermark, no border`,
  },
  {
    key: 'gate',
    file: 'gate.webp',
    alpha: true,
    w: 768,
    h: 768,
    fit: 'contain',
    prompt:
      'A Korean traditional raised-center main gate (솟을대문) of a noble house, seen straight on from the front. ' +
      'A tall central bay whose tiled roof rises higher than the two short flanking wall sections, ' +
      'dark walnut timber posts and a heavy lintel, two closed wooden gate doors with round brass ring handles ' +
      'and iron studs, dark slate-grey giwa tiles with a gently upturned ridge, a raised stone threshold at the bottom. ' +
      'The gate is CLOSED and nothing passes through it — no view of what is behind, no people, no lanterns hanging. ' +
      'Symmetrical, the whole gate fully inside the frame with generous margin on all sides, ' +
      'the stone threshold is the ground contact line at the bottom center of the frame. ' +
      `${STYLE}, ${TONE}, ${LIGHT}, ${CHROMA}`,
  },
  {
    key: 'seokdeung',
    file: 'seokdeung.webp',
    alpha: true,
    w: 512,
    h: 768,
    fit: 'contain',
    prompt:
      'A Korean traditional stone lantern (석등) standing alone, seen from the front at eye level. ' +
      'A square stepped base, a slender octagonal stone shaft, a lantern house with arched openings on each face, ' +
      'and a wide octagonal stone roof cap with softly upturned corners and a small finial on top. ' +
      'Weathered pale grey granite with warm ochre lichen stains and chipped edges, quiet and old. ' +
      'The lantern is UNLIT — the openings are dark and empty, there is NO flame, NO fire, NO glow, NO smoke inside. ' +
      'Single object centered upright, whole object inside the frame with generous margin, ' +
      'the bottom of the stone base is the ground contact line at the bottom center of the frame. ' +
      `${STYLE}, ${TONE}, ${LIGHT}, ${CHROMA}`,
  },
  // ── 후원(huwon) 170~240 ─────────────────────────────────────
  {
    key: 'huwon-wall',
    file: 'huwon-wall.webp',
    alpha: false,
    w: 1024,
    h: 640,
    fit: 'cover',
    prompt:
      'The back-garden boundary of a Korean noble house (후원 後園), flat frontal elevation view. ' +
      'A low perimeter wall of stacked stone and ochre earthen plaster capped with dark slate-grey giwa tiles ' +
      'runs across the lower part of the frame. Rising behind it, the quiet dark silhouettes of an old pine ' +
      'and a bare-branched persimmon tree with a few muted leaves, leaning gently over the wall, ' +
      'and beyond them a dim dusk sky. ' +
      'The foliage is DESATURATED and dark — deep olive and sepia, never bright green. ' +
      'Nothing stands in front of the wall: no jars, no lanterns, no furniture, no people, no gate. ' +
      'No ground and no floor visible, only the wall, the trees and the sky filling the entire frame. ' +
      `${STYLE}, ${TONE}, ${LIGHT}, full-bleed background plate, no text, no watermark, no border`,
  },
  {
    key: 'huwon-floor',
    file: 'huwon-floor.webp',
    alpha: false,
    w: 1024,
    h: 420,
    fit: 'cover',
    prompt:
      'The earthen back terrace (토방) and jar yard (장독대) behind a Korean hanok, seen from slightly above at a low angle. ' +
      'The front edge of the frame is the worn stone step course where the dark wooden daecheong veranda ends ' +
      'and the ground begins, so the two read as continuous. Beyond it, packed ochre earth with flat granite ' +
      'flagstones, receding with a gentle one-point perspective so the ground widens toward the bottom. ' +
      'Along the FAR TOP EDGE only, a low stone platform holds a small tidy row of dark brown onggi jars, ' +
      'small in the distance and partly cropped by the top of the frame. ' +
      'The rest of the ground is COMPLETELY EMPTY — no walls, no trees, no plants, no furniture, no loose objects. ' +
      'No horizon line, no sky, no buildings — only the ground plane filling the entire frame. ' +
      `${STYLE}, ${TONE}, ${LIGHT}, full-bleed background plate, no text, no watermark, no border`,
  },
]

// ───────────────────────── 크로마키 (소프트 매트 + 디스필) ─────────────────────────
// stage-banga.mjs 와 동일 규약 — 두 스크립트 산출물이 한 화면에서 만나므로 fringe 기준이 갈리면 안 된다.
// gd = g - max(r,b) 를 "초록 우세도"로 삼아 알파를 선형 램프로 만든다(하드 임계값 → 계단 fringe 방지).
const KEY_PROFILES = [
  { hi: 62, lo: 22, spill: 3, shrink: 0.14, feather: 1 },
  { hi: 50, lo: 16, spill: 1, shrink: 0.22, feather: 1 },
  { hi: 40, lo: 10, spill: 0, shrink: 0.3, feather: 2 },
]

// 완전 투명 픽셀의 RGB. 리사이즈·webp 인코딩 시 투명 영역 색이 가장자리로 번지므로
// 순녹색을 남겨두면 안 된다. 신당 배경색(#1a1308)으로 채워 번져도 보이지 않게 한다.
const VOID_RGB = [0x1a, 0x13, 0x08]

function boxBlurAlpha(data, width, height, channels, radius) {
  if (radius < 1) return
  const n = width * height
  const src = new Uint8Array(n)
  for (let p = 0; p < n; p++) src[p] = data[p * channels + 3]
  const tmp = new Uint8Array(n)
  const win = radius * 2 + 1
  for (let y = 0; y < height; y++) {
    const row = y * width
    for (let x = 0; x < width; x++) {
      let sum = 0
      for (let k = -radius; k <= radius; k++) {
        const xx = Math.min(width - 1, Math.max(0, x + k))
        sum += src[row + xx]
      }
      tmp[row + x] = Math.round(sum / win)
    }
  }
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let sum = 0
      for (let k = -radius; k <= radius; k++) {
        const yy = Math.min(height - 1, Math.max(0, y + k))
        sum += tmp[yy * width + x]
      }
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
    if (gd > 0) data[i + 1] = Math.min(g, base + spill) // despill
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

// 실제 halo 는 부분알파(가장자리) 픽셀의 약한 초록(gd 10~20)에서 생긴다 — 전체 평균으로는 잡히지 않는다.
const GREEN_HARD = 20
const GREEN_EDGE = 12
const FRINGE_MAX = 0.004 // 보이는 픽셀 중 gd>20 이 0.4% 초과 → 재키잉
const EDGE_FRINGE_MAX = 0.03 // 부분알파 픽셀 중 gd>12 가 3% 초과 → 재키잉

/** 남은 초록 번짐 측정 — 보이는 픽셀 전체 + 가장자리(부분알파) 구간 */
function measureFringe(data, channels) {
  let visible = 0
  let green = 0
  let edge = 0
  let edgeGreen = 0
  for (let i = 0; i < data.length; i += channels) {
    const a = data[i + 3]
    if (a < 16) continue
    const gd = data[i + 1] - Math.max(data[i], data[i + 2])
    visible++
    if (gd > GREEN_HARD) green++
    if (a < 240) {
      edge++
      if (gd > GREEN_EDGE) edgeGreen++
    }
  }
  return {
    visible,
    ratio: visible ? green / visible : 0,
    edgeRatio: edge ? edgeGreen / edge : 0,
    edge,
  }
}

// ───────────────────────────── 생성 ─────────────────────────────
async function callModel(prompt) {
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

async function buildAsset(asset, { regen }) {
  const rawPng = path.join(RAW_DIR, `${asset.key}.png`)
  const outWebp = path.join(OUT_DIR, asset.file)
  let genCount = 0

  async function ensureRaw(force) {
    if (!force && existsSync(rawPng)) return
    if (genCount >= 2) throw new Error('생성 상한(2회) 도달')
    genCount++
    console.log(`  · 생성 #${genCount} (${MODEL})`)
    const buf = await callModel(asset.prompt)
    await mkdir(path.dirname(rawPng), { recursive: true })
    await writeFile(rawPng, buf)
  }

  await ensureRaw(regen)
  await mkdir(OUT_DIR, { recursive: true })

  // 불투명 에셋: 리사이즈만
  if (!asset.alpha) {
    const info = await sharp(rawPng)
      .resize(asset.w, asset.h, { fit: asset.fit, position: 'centre' })
      .webp({ quality: 84 })
      .toFile(outWebp)
    return { ok: true, outWebp, bytes: info.size, fringe: null, profile: null }
  }

  // 투명 에셋: 키잉 3프로파일 → 실패 시 1회 재생성 → 다시 3프로파일
  for (let round = 0; round < 2; round++) {
    let best = null
    for (let p = 0; p < KEY_PROFILES.length; p++) {
      const keyed = await chromaKey(await sharp(rawPng).toBuffer(), KEY_PROFILES[p])
      const png = await sharp(keyed.data, {
        raw: { width: keyed.width, height: keyed.height, channels: keyed.channels },
      })
        .png()
        .toBuffer()
      const trimmed = await sharp(png).trim({ threshold: 10 }).toBuffer()
      const finalBuf = await sharp(trimmed)
        .resize(asset.w, asset.h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
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
        return { ok: true, outWebp, bytes: finalBuf.length, fringe, profile: p + 1 }
      }
    }
    if (round === 0 && genCount < 2) {
      console.log('  · 3프로파일 모두 fringe 초과 → 원본 재생성')
      try {
        await ensureRaw(true)
        continue
      } catch (e) {
        console.log('  · 재생성 불가:', String(e).slice(0, 120))
      }
    }
    await writeFile(outWebp, best.buf)
    return { ok: true, outWebp, bytes: best.buf.length, fringe: best.fringe, profile: best.profile, warn: true }
  }
}

// ──────────────────────── 두루마리 조립 목업 ────────────────────────
// 시드(20260729_shrine_banga_wide_zones.sql)와 **같은 숫자**로 조립한다 — 여기서 어긋나 보이면 시드가 틀린 것이다.
// 렌더 규약은 StageLayers.tsx 그대로: 벽지 top 0 h62% · 바닥 bottom 0 h40% · 구조물 x/y=중심%, w=구역폭%.
const DARK = { r: 0x1a, g: 0x13, b: 0x08, alpha: 1 }
const WORLD_WIDTH = 240
const ZONES = [
  { code: 'madang', x0: 0, x1: 70, wall: 'madang-wall.webp', floor: 'madang-floor.webp' },
  { code: 'daecheong', x0: 70, x1: 170, wall: 'wallpaper.webp', floor: 'flooring.webp' },
  { code: 'huwon', x0: 170, x1: 240, wall: 'huwon-wall.webp', floor: 'huwon-floor.webp' },
]
const ZONE_STRUCTURES = {
  madang: [
    { file: 'gate.webp', x: 22, y: 58, w: 34 },
    { file: 'seokdeung.webp', x: 72, y: 66, w: 14 },
  ],
  daecheong: [{ file: 'altar.webp', x: 50, y: 47, w: 62 }],
}

async function makePreviewWorld() {
  const VIEW_W = 640 // 뷰포트 폭 상당
  const H = 800
  const W = Math.round((VIEW_W * WORLD_WIDTH) / 100)
  const layers = []

  for (const zone of ZONES) {
    const left = Math.round((zone.x0 / WORLD_WIDTH) * W)
    const zw = Math.round(((zone.x1 - zone.x0) / WORLD_WIDTH) * W)
    const wall = path.join(OUT_DIR, zone.wall)
    const floor = path.join(OUT_DIR, zone.floor)
    if (existsSync(wall)) {
      const h = Math.round(H * 0.62)
      layers.push({ input: await sharp(wall).resize(zw, h, { fit: 'cover' }).toBuffer(), left, top: 0 })
    }
    if (existsSync(floor)) {
      const h = Math.round(H * 0.4)
      layers.push({ input: await sharp(floor).resize(zw, h, { fit: 'cover' }).toBuffer(), left, top: H - h })
    }
    for (const s of ZONE_STRUCTURES[zone.code] ?? []) {
      const file = path.join(OUT_DIR, s.file)
      if (!existsSync(file)) continue
      const sw = Math.round((zw * s.w) / 100)
      const buf = await sharp(file).resize({ width: sw, fit: 'inside' }).toBuffer()
      const meta = await sharp(buf).metadata()
      layers.push({
        input: buf,
        left: left + Math.round((zw * s.x) / 100 - meta.width / 2),
        top: Math.round((H * s.y) / 100 - meta.height / 2),
      })
    }
  }
  if (!layers.length) return null

  const out = path.join(OUT_DIR, 'preview-world.webp')
  const info = await sharp({ create: { width: W, height: H, channels: 4, background: DARK } })
    .composite(layers)
    .webp({ quality: 84 })
    .toFile(out)
  return { out, bytes: info.size }
}

// ──────────────────────────── main ────────────────────────────
const args = process.argv.slice(2)
const regen = args.includes('--regen')
const rekeyOnly = args.includes('--rekey')
const only = args.find((a) => !a.startsWith('--'))
const targets = only && only !== 'all' ? ASSETS.filter((a) => a.key === only) : ASSETS
if (!targets.length) {
  console.error('unknown asset key:', only, '— 가능:', ASSETS.map((a) => a.key).join(', '))
  process.exit(1)
}

console.log(`모델: ${MODEL}\n원본 캐시: ${RAW_DIR}\n산출: ${OUT_DIR}\n`)
const results = []
for (const asset of targets) {
  const outWebp = path.join(OUT_DIR, asset.file)
  if (!regen && !rekeyOnly && existsSync(outWebp)) {
    console.log('skip', asset.file, '(이미 존재)')
    continue
  }
  console.log(`── ${asset.key} ──`)
  try {
    const r = await buildAsset(asset, { regen: regen && !rekeyOnly })
    console.log(`  ✔ ${asset.file} ${(r.bytes / 1024).toFixed(1)}KB`)
    results.push({ key: asset.key, ...r })
  } catch (e) {
    if (isAuthError(e)) {
      console.error('\n✖✖ API 키 인증 실패 — 즉시 중단합니다. 재시도하지 않음.')
      console.error('   ', String(e?.message || e).slice(0, 400))
      process.exit(2)
    }
    console.error('  ✖', asset.key, String(e?.message || e).slice(0, 300))
    results.push({ key: asset.key, ok: false, error: String(e?.message || e).slice(0, 300) })
  }
}

const pw = await makePreviewWorld()
if (pw) console.log(`\n✔ preview-world.webp ${(pw.bytes / 1024).toFixed(1)}KB`)

console.log('\n── 요약 ──')
for (const r of results) {
  if (!r.ok) {
    console.log(`  ✖ ${r.key}: ${r.error}`)
    continue
  }
  const f = r.fringe
    ? ` fringe=${(r.fringe.ratio * 100).toFixed(3)}% edge=${(r.fringe.edgeRatio * 100).toFixed(2)}% (P${r.profile})${r.warn ? ' ⚠️임계 초과(최선값 채택)' : ''}`
    : ' (불투명)'
  console.log(`  ✔ ${r.key} ${(r.bytes / 1024).toFixed(1)}KB${f}`)
}
process.exit(results.some((r) => !r.ok) ? 1 : 0)
