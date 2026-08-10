// 신당 「조립식 무대」 P2 시범 에셋 — 반가(班家) 테마 1종 (PLAN-shrine-miniroom-v2.md §3-A·B, §5)
//
// 산출: public/shrine/stage/banga/
//   wallpaper.webp   1024×640 불투명  — 한지 벽 + 창호 (L0)
//   flooring.webp    1024×420 불투명  — 대청마루 (L1)
//   altar.webp        800×400 투명    — 빈 제단 (L2 구조물)
//   prop-candle.webp   512²   투명    — 놋촛대 + 불 꺼진 초 (L4 소품)
//   prop-incense.webp  512²   투명    — 놋향로 (L4 소품)
//   preview-composite.webp — 투명 3종을 #1a1308 위에 합성 (크로마키 fringe 검수용)
//   preview-stage.webp     — 전 레이어 조립 목업 (앵커 좌표 검증용)
//
// 사용:
//   node scripts/shrine-assets/stage-banga.mjs            # 누락분만 생성 (멱등)
//   node scripts/shrine-assets/stage-banga.mjs altar      # 특정 키만
//   node scripts/shrine-assets/stage-banga.mjs all --regen  # 원본부터 재생성
//   node scripts/shrine-assets/stage-banga.mjs --rekey     # 원본 캐시로 키잉만 재실행 (API 호출 0)
//
// 원칙
//   - 광원 좌상단 고정: 모든 에셋 동일 (그림자 일치의 전제, PLAN §3-B).
//   - 접지 그림자는 굽지 않는다 — §3-C 코드가 런타임에 타원 그림자를 붙임.
//     (배경에 그림자를 구우면 크로마키 시 초록에 물든 반투명 얼룩이 남는다.)
//   - Gemini는 알파 미지원 → 순녹색(#00FF00) 배경 생성 후 소프트 크로마키.
//   - 생성 비용: 장당 1회 원칙, 키잉 3회 실패 시에만 재생성(장당 최대 2회).
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
// 원본 PNG 캐시. 세션 임시 디렉터리 기본 — STAGE_RAW_DIR 로 고정 경로 지정 가능.
const RAW_DIR = process.env.STAGE_RAW_DIR || path.join(process.env.TEMP || '/tmp', 'shrine-stage-banga-raw')

const genAI = new GoogleGenerativeAI(KEY)
const model = genAI.getGenerativeModel({ model: MODEL })

// ────────────────────────────── 프롬프트 ──────────────────────────────
// 「설빛온기」 계승: generate-icons.mjs STYLE + banga/room.webp 팔레트(짙은 호두나무·한지 아이보리).
const STYLE =
  'warm painterly watercolor illustration, soft K-anime aesthetic, visible gentle brush texture, ' +
  'muted sepia and dark-walnut palette with hanji ivory, candlelit warmth, ' +
  'calm and tidy composition rather than busy detail, refined key-art quality'
// 광원 좌상단 고정 — 전 에셋 공통. 이 문구가 어긋나면 조합 시 그림자가 따로 논다.
const LIGHT =
  'a single warm candlelight source from the UPPER LEFT, soft shadows falling toward the lower right, ' +
  'consistent light direction, no rim light from other directions'
const CHROMA =
  'the subject is fully isolated on a solid pure chroma green background (#00FF00) that fills the entire frame edge to edge, ' +
  'no ground plane, no floor, no table, no cast shadow on the background, no vignette, ' +
  'no text, no letters, no watermark, no border, no frame'

/** @type {Array<{key:string,file:string,alpha:boolean,w:number,h:number,fit:'cover'|'contain',prompt:string}>} */
const ASSETS = [
  {
    key: 'wallpaper',
    file: 'wallpaper.webp',
    alpha: false,
    w: 1024,
    h: 640,
    fit: 'cover',
    prompt:
      'Interior wall of a Korean noble house (반가 班家) sarangbang study room, flat frontal elevation view. ' +
      'Warm ivory hanji paper panels framed by dark walnut wooden posts and a heavy lintel beam, ' +
      'a softly glowing latticed changho window (창호) set into the wall diffusing gentle light through the paper, ' +
      'subtle minhwa-inspired restraint, quiet dignity. ' +
      'The wall is COMPLETELY EMPTY — no furniture, no shelves, no scrolls, no objects, nothing standing against it or hanging on it. ' +
      'No floor and no ceiling visible, only the wall plane filling the entire frame. ' +
      `${STYLE}, ${LIGHT}, full-bleed background plate, no text, no watermark, no border`,
  },
  {
    key: 'flooring',
    file: 'flooring.webp',
    alpha: false,
    w: 1024,
    h: 420,
    fit: 'cover',
    prompt:
      'Dark polished daecheong-maru (대청마루) wooden floor of a Korean hanok, seen from slightly above at a low angle. ' +
      'Long wide floorboards running away from the viewer with a gentle one-point perspective — ' +
      'the boards converge slightly toward the top of the frame so the floor visually widens toward the bottom. ' +
      'Deep walnut brown with a warm amber sheen, fine wood grain and worn patina, faint candlelight reflection on the polish. ' +
      'The floor is COMPLETELY EMPTY — no furniture, no rugs, no cushions, no objects at all. ' +
      'No walls, no horizon line, no ceiling — only the floor plane filling the entire frame. ' +
      `${STYLE}, ${LIGHT}, full-bleed background plate, no text, no watermark, no border`,
  },
  {
    key: 'altar',
    file: 'altar.webp',
    alpha: true,
    w: 800,
    h: 400,
    fit: 'contain',
    prompt:
      'A Korean traditional wooden shrine altar (제단): a wide flat lacquered top board resting on a low soban-style base ' +
      'with short carved legs and a simple apron rail. Dark walnut wood with warm amber highlights, ' +
      'small brass corner fittings, dignified restrained craftsmanship, no decoration on the surface. ' +
      'The top surface is COMPLETELY BARE — absolutely nothing placed on it: no candles, no bowls, no incense, no cloth, no offerings, no flowers. ' +
      'Seen from the front at a slight high angle (about 15 degrees above eye level) so the top board reads as a surface, ' +
      'symmetrical, the whole altar fully inside the frame with generous margin on all sides, wide horizontal composition. ' +
      `${STYLE}, ${LIGHT}, ${CHROMA}`,
  },
  {
    key: 'prop-candle',
    file: 'prop-candle.webp',
    alpha: true,
    despill: 'warm', // 황록 스필 이력(0f637df 수술) — 재생성 시 재발 방지
    w: 512,
    h: 512,
    fit: 'contain',
    prompt:
      'A Korean traditional brass candlestick (놋촛대): a slender polished brass candle stand with a wide round foot, ' +
      'a fluted stem and a small drip tray, holding ONE single plain white candle standing upright. ' +
      'The candle is UNLIT — the wick is dark and blackened, there is NO flame, NO fire, NO glow, NO smoke, NO light coming from the candle. ' +
      'Aged brass with warm golden highlights and soft green-free patina, engraved simple key-fret band on the foot. ' +
      'Single object centered upright, whole object inside the frame with generous margin, ' +
      'the bottom of the brass foot is the ground contact line at the bottom center of the frame. ' +
      `${STYLE}, ${LIGHT}, ${CHROMA}`,
  },
  {
    key: 'prop-incense',
    file: 'prop-incense.webp',
    alpha: true,
    despill: 'warm', // 황록 스필 이력(0f637df 수술)
    w: 512,
    h: 512,
    fit: 'contain',
    prompt:
      'A Korean traditional brass incense burner (놋향로): a round three-legged brass censer with two upright side handles ' +
      'and a domed pierced lid, engraved with a restrained cloud-and-key-fret pattern. ' +
      'Aged brass with warm golden highlights and soft dark patina in the recesses. ' +
      'It is NOT burning — NO smoke, NO wisp, NO incense sticks, NO embers, NO glow; just the quiet empty vessel. ' +
      'Single object centered upright, whole object inside the frame with generous margin, ' +
      'the three feet touch the ground contact line at the bottom center of the frame. ' +
      `${STYLE}, ${LIGHT}, ${CHROMA}`,
  },
]

// ───────────────────────── 크로마키 (소프트 매트 + 디스필) ─────────────────────────
// gd = g - max(r,b) 를 "초록 우세도"로 삼아 알파를 선형 램프로 만든다(하드 임계값 → 계단 fringe 방지).
//   gd >= hi   → 완전 투명       gd <= lo → 완전 불투명       그 사이 → 부분 알파
//   despill    : 초록이 우세한 픽셀의 g를 max(r,b)+spill 로 눌러 색 번짐 제거
//   shrink     : 낮은 부분알파를 0으로 밀어 매트를 안쪽으로 수축 (테두리 잔광 제거)
//   feather    : 알파 채널 박스 블러 1~2px (수축 후 가장자리 부드럽게)
// spill 은 작게 유지할 것. 초기값 12 로 키잉했을 때 3배 확대 검수에서 향로 다리·제단 다리 둘레에
// 초록 halo 가 육안 확인됨(gd 10~20 구간이 부분알파 픽셀에 남아 어두운 배경 위에서 테를 만든다).
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
// 그래서 두 축으로 잰다: 전체는 gd>20(총체적 스필), 가장자리는 gd>12(halo).
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
      if (asset.despill === 'warm') warmDespill(keyed.data, keyed.channels)
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

// ──────────────────────── 검수용 합성 ────────────────────────
const DARK = { r: 0x1a, g: 0x13, b: 0x08, alpha: 1 }

async function makePreviewComposite() {
  const W = 1920
  const H = 560
  const canvas = sharp({ create: { width: W, height: H, channels: 4, background: DARK } })
  const layers = []
  const altar = path.join(OUT_DIR, 'altar.webp')
  const candle = path.join(OUT_DIR, 'prop-candle.webp')
  const incense = path.join(OUT_DIR, 'prop-incense.webp')
  if (existsSync(altar)) layers.push({ input: altar, left: 24, top: 120 })
  if (existsSync(candle)) layers.push({ input: candle, left: 860, top: 24 })
  if (existsSync(incense)) layers.push({ input: incense, left: 1390, top: 24 })
  if (!layers.length) return null
  const out = path.join(OUT_DIR, 'preview-composite.webp')
  const info = await canvas.composite(layers).webp({ quality: 88 }).toFile(out)
  return { out, bytes: info.size }
}

/** 시드가 제안하는 좌표(x50/y47/w62 + 앵커 x34·50·66, y46)로 무대를 실제 조립해본다 */
async function makePreviewStage() {
  const W = 1024
  const H = 1024
  const wallpaper = path.join(OUT_DIR, 'wallpaper.webp')
  const flooring = path.join(OUT_DIR, 'flooring.webp')
  const altar = path.join(OUT_DIR, 'altar.webp')
  const candle = path.join(OUT_DIR, 'prop-candle.webp')
  const incense = path.join(OUT_DIR, 'prop-incense.webp')
  if (!existsSync(wallpaper) || !existsSync(flooring)) return null

  const layers = []
  layers.push({ input: await sharp(wallpaper).resize(W, 660, { fit: 'cover' }).toBuffer(), left: 0, top: 0 })
  layers.push({ input: await sharp(flooring).resize(W, 424, { fit: 'cover' }).toBuffer(), left: 0, top: 600 })

  if (existsSync(altar)) {
    const aw = Math.round(W * 0.62) // structures[0].w = 62
    const ah = Math.round((aw * 400) / 800)
    const buf = await sharp(altar).resize(aw, ah, { fit: 'inside' }).toBuffer()
    const meta = await sharp(buf).metadata()
    layers.push({
      input: buf,
      left: Math.round(W * 0.5 - meta.width / 2), // x = 50
      top: Math.round(H * 0.47 - meta.height / 2), // y = 47
    })
  }
  const anchorY = Math.round(H * 0.46) // 앵커 y = 46 (제단 상판)
  for (const [file, ax] of [
    [candle, 0.34],
    [incense, 0.66],
  ]) {
    if (!existsSync(file)) continue
    const size = Math.round(W * 0.15)
    const buf = await sharp(file).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer()
    layers.push({ input: buf, left: Math.round(W * ax - size / 2), top: anchorY - size })
  }

  const out = path.join(OUT_DIR, 'preview-stage.webp')
  const info = await sharp({ create: { width: W, height: H, channels: 4, background: DARK } })
    .composite(layers)
    .webp({ quality: 86 })
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

const pc = await makePreviewComposite()
if (pc) console.log(`\n✔ preview-composite.webp ${(pc.bytes / 1024).toFixed(1)}KB`)
const ps = await makePreviewStage()
if (ps) console.log(`✔ preview-stage.webp ${(ps.bytes / 1024).toFixed(1)}KB`)

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
