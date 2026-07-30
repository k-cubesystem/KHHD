// 신당 안2.3 「신위 탭 → 한 바퀴 회전」 시범 프레임 (PRD-shrine-gamefeel-v1 부록 C ④)
//
// ── 왜 프레임을 굽는가 ────────────────────────────────────────────────────────
// 회전의 자연스러움은 rotateY 하나로는 나오지 않는다. 180° 에서 **좌우 반전된 정면**이 보여
// "종이 뒤집기"가 된다. 중간 자세는 그림을 **갈아 끼워야** 한다.
//
// ── 45° 아홉 국면 (4차 검수) ───────────────────────────────────────────────
// 90° 씩 다섯 국면은 자세가 훅 건너뛰어 "그림 교체"로 읽혔다. 45° 씩 여덟 걸음이면 건너뛰는 각이
// 절반이라 눈이 중간 자세를 보충한다. 그런데 **굽는 장수는 넷뿐**이다 — 180° 를 넘는 절반
// (225·270·315°)은 그 대칭각(135·90·45°)을 좌우 반전해 쓰기 때문이다.
//   q45 → 45°  ·  side → 90°  ·  q135 → 135°  ·  back → 180°   (정면은 DB sprite_url)
// ⚠️ 네 장의 **회전 방향이 같아야** 반전 재사용이 성립한다. 전부 "관람자의 오른쪽으로 도는" 기준이며
//    side.webp 가 이미 그 기준으로 구워져 있으므로 q45·q135 도 반드시 같은 방향이어야 한다.
//
// ── 경로 규약 (배선 계약 — DB 갱신 없음) ────────────────────────────────────
//   /shrine/deities/{code}/{q45,side,q135,back}.webp
// 키 목록의 정본은 lib/domain/shrine/deity-turn.ts 의 BAKED_FRAME_KEYS 이고,
// 아래 VIEWS 와의 일치는 lib/domain/shrine/__tests__/deity-turn.test.ts 가 대조한다.
// 배선은 **파일 존재 여부**로 판단한다(DB 컬럼 추가 없음, shrine_deities 무수정).
//   · 넷 다 있으면       : 9국면 프레임 교체 경로
//   · side·back 만 있으면 : 5국면 프레임 교체 경로 (하위 등급 — 회귀 없이 버틴다)
//   · 없으면             : rotateY + 90° 근처 모션블러·아우라 증폭 폴백 (부록 C ④)
// 따라서 이 스크립트는 **에셋만** 만든다. 17신위 확산 전까지 15신위는 폴백으로 돈다.
//
// ── 동일 인물성이 관건 ──────────────────────────────────────────────────────
// 기존 base.webp 를 참조 이미지로 첨부하고 "같은 인물·같은 복장·같은 색"을 지시한다.
// ⚠️ 세션12 교훈: base 를 **화풍 앵커**로 넣으면 오염되는 전례가 있다(다른 인물이 나온다).
//    그래서 ① 결과를 반드시 육안 확인하고 ② 인물이 달라지면 `--noref` 로 참조 없이 재시도한다.
//    (프롬프트만으로도 appearance 문구가 manifest.mjs 단일 출처라 인물 서술은 유지된다.)
//
// ── 발 접지선 정렬 ──────────────────────────────────────────────────────────
// 턴 중 키가 변하면 회전이 튄다. base 와 **같은 캔버스 높이**(480)로 굽고, 트림으로 내용물을
// 캔버스에 딱 맞춘다 → 발끝이 항상 캔버스 바닥이므로 렌더(`object-contain`, 높이 고정)에서
// 접지선이 어긋나지 않는다. 어깨선(=몸통이 시작되는 행)까지 계측해 프레임 간 차이를 보고한다.
//
// 산출: public/shrine/deities/{code}/{q45,side,q135,back}.webp   (투명, 높이 480)
// 검수: assets-src/shrine/deity-turnaround-check.webp  (신위별 base|q45|side|q135|back — 인물·각도 판정용)
//
// 사용:
//   node scripts/shrine-assets/deity-turnaround.mjs               # 누락분만 (멱등 — 이미 있는 side/back 은 건너뛴다)
//   node scripts/shrine-assets/deity-turnaround.mjs seonnyeo      # 한 신위만
//   node scripts/shrine-assets/deity-turnaround.mjs --only=q45,q135 # 특정 각만 (중간각 추가 굽기)
//   node scripts/shrine-assets/deity-turnaround.mjs --regen       # 원본부터 재생성
//   node scripts/shrine-assets/deity-turnaround.mjs --rekey       # 원본 캐시로 키잉만 (API 0회)
//   node scripts/shrine-assets/deity-turnaround.mjs --noref       # 참조 이미지 없이 생성(오염 대응)
import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from 'dotenv'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { DEITIES, STYLE_PREFIX } from './manifest.mjs'

// ⚠️ .env.local 은 **메인 체크아웃만** 로드한다.
//    워크트리(.claude/worktrees/*)의 .env.local 에는 폐기된 구키(AIzaSy…)가 잔존하며,
//    dotenv 는 먼저 설정된 값을 덮지 않으므로 워크트리를 같이 로드하면 구키가 우선권을 가진다.
//    키 우선순위도 GOOGLE_GENERATIVE_AI_API_KEY 를 앞에 둔다(앱 런타임과 동일 변수).
config({ path: 'D:/anti/haehwadang/.env.local' })

const MODEL = process.env.SHRINE_IMAGE_MODEL || 'gemini-3.1-flash-image'
const KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

const ROOT = path.resolve(import.meta.dirname, '../..')
const DEITY_DIR = path.join(ROOT, 'public', 'shrine', 'deities')
const QA_DIR = path.join(ROOT, 'assets-src', 'shrine')
const RAW_DIR = process.env.TURNAROUND_RAW_DIR || path.join(process.env.TEMP || '/tmp', 'shrine-turnaround-raw')

/** 시범 2신위. code 는 DB `shrine_deities` 실값(2026-07-30 SELECT code,name 확인) —
 *  선녀신은 `seonnyeo`(sunyeo 아님) · 용왕신은 `yongwang`. 검수 통과 후 17신위로 확산한다. */
const PILOT_CODES = ['seonnyeo', 'yongwang']

/** 총 생성 상한(재시도 포함). 시범 2신위 × 4각 = 8장 + 재시도 8회. */
const API_BUDGET = 16
let apiCalls = 0

/** base 와 같은 캔버스 높이 — 접지선 정렬의 전제(실측: 전 신위 base.webp 가 480) */
const FRAME_H = 480

// ────────────────────────────── 프롬프트 ──────────────────────────────
// 인물 서술(appearance)은 manifest.mjs 단일 출처를 그대로 쓴다 — 여기서 다시 쓰면 두 곳이 갈린다.
// STYLE_PREFIX 도 manifest 원문. 「설빛 온기」가 갈리면 회전 중 화풍이 튄다.

/** 정면 base 와 공유해야 하는 조건 — 프레임 간 키·거리·배경이 흔들리면 회전이 튄다 */
const FRAME_COMMON =
  'full body standing pose, upright, head to feet fully inside the frame with generous margin, ' +
  'feet visible and touching the bottom contact line, ' +
  'the figure occupies the SAME height in frame and the SAME distance from the camera as the reference, ' +
  'identical body proportions and identical scale, ' +
  'solid chroma green background #00FF00 filling the entire frame, ' +
  'no text, no watermark, no border, high detail'

/** 같은 인물임을 못 박는 문구 — 참조 이미지가 없을 때(`--noref`)도 이 서술만으로 버틴다 */
const SAME_CHARACTER =
  'EXACTLY the same character as described: same face, same hairstyle, same hair ornament, ' +
  'same costume with the same colors, same fabric patterns, same accessories, same props in the same hands, ' +
  'same art style and same line weight. This is the SAME individual turned in place — not a different person, ' +
  'not a redesign, not a costume change'

/** 회전 방향 — 네 각이 같은 방향이라야 대칭각(225·270·315°) 반전 재사용이 성립한다.
 *  side.webp 가 이미 이 방향으로 구워져 있으므로 바꾸면 기존 에셋과 어긋난다. */
const TURN_DIRECTION =
  'the figure rotates in place toward the viewer' +
  "'" +
  's RIGHT (counter-clockwise seen from above), ' +
  'the same rotation direction for every frame of this turnaround'

/** 각도 순서대로. key 는 파일명 겸 도메인 프레임 키(lib/domain/shrine/deity-turn.ts BAKED_FRAME_KEYS). */
/** @type {Array<{key:string,file:string,deg:number,refFile?:string,view:string}>} */
const VIEWS = [
  {
    key: 'q45',
    file: 'q45.webp',
    deg: 45,
    refFile: 'side.webp',
    // ⚠️ 방향을 반드시 명시한다. 1차 생성 때 "45 degrees away from the camera" 만 주고 방향을 비웠더니
    //    모델이 **정면과 구분되지 않는 그림**으로 수렴했다(base 와 육안 차이 거의 없음 → 회전 앞
    //    3분의 1이 정지처럼 보이고 side 로 넘어갈 때 튄다). side 와 **같은 쪽**으로 돌아야
    //    0°→45°→90° 가 한 방향 회전으로 읽히고, 225·270·315° 반전 재사용도 성립한다.
    // ⚠️ 기준을 **정면이 아니라 참조로 주는 측면(side.webp)** 으로 잡는다.
    //    "정면에서 45도 돌려라"로 두 번 구웠지만 모델이 매번 정면으로 수렴했다(base 와 육안 차이
    //    거의 없음 → 회전 앞 3분의 1이 정지처럼 보인다). 참조 이미지가 측면이므로 "그 측면을
    //    카메라 쪽으로 절반 되돌려라"가 모델에게 훨씬 강한 신호다. 방향은 side 와 같은 쪽이어야
    //    0°→45°→90° 가 한 방향 회전으로 읽히고 225·270·315° 반전 재사용도 성립한다.
    // ⚠️ 이 각은 두 번 실패했다. 실패 방식이 서로 달라서 둘 다 교훈이다.
    //    (1) "정면에서 45도" — 방향을 안 주니 모델이 **정면으로 수렴**했다.
    //    (2) 실루엣 단서를 길게 덧붙이고 "CRITICAL / must NOT be mistaken" 같은 **메타 지시문**을
    //        섞었더니, 모델이 그림이 아니라 **캐릭터 시트**(얼굴 습작 여러 장)를 냈다(폭 346→544).
    //    → 잘 나온 side 와 **같은 짧은 서술체**를 유지하되, 방향과 옷깃 치우침만 얹는다.
    //       설명을 늘리는 것이 아니라 관찰 가능한 사실 하나를 더하는 것이 먹힌다.
    view:
      'seen from a FRONT THREE-QUARTER angle — the body turned halfway between facing the viewer and ' +
      'facing the viewer' +
      "'" +
      's right, the collar line and the garment center sitting off to the near shoulder instead of down the middle, ' +
      // ⚠️ **머리는 몸과 같은 각도로 돈다.** 이 문장이 없으면 모델이 얼굴을 카메라에 유지해
      //    몸만 돌아간 그림이 나오고, 연속 재생하면 "머리와 몸이 따로 돈다"로 읽힌다(5차 검수 지적).
      //    시선을 카메라 밖으로 보내는 것이 핵심 — 얼굴을 보여주려는 모델의 기본 편향을 이긴다.
      'the head turned by the same angle as the torso and the gaze going off to the side, not at the viewer, ' +
      'the nose breaking the line of the far cheek, the far ear hidden behind the head, ' +
      'the far shoulder receding behind the torso so the figure reads narrower than the front view, ' +
      'the sleeves and skirt hem trailing slightly behind the turn as if the figure just started rotating',
  },
  {
    key: 'side',
    file: 'side.webp',
    deg: 90,
    view:
      'seen from the SIDE — an exact 90-degree profile view, the body turned so it faces the viewer' +
      "'" +
      's right, ' +
      'only one eye and the profile line of the nose visible, one shoulder in front of the other, ' +
      'the sleeves and skirt hem trailing slightly behind the turn as if the figure just rotated',
  },
  {
    key: 'q135',
    file: 'q135.webp',
    deg: 135,
    refFile: 'side.webp',
    view:
      'seen from a REAR THREE-QUARTER angle — the body rotated exactly 135 degrees away from the camera, ' +
      'mostly the back, with only a sliver of the cheek and jaw visible past the near shoulder and the far eye hidden, ' +
      'the back of the head and the hair down the back dominating the silhouette, ' +
      'the sleeves and skirt hem swinging wide with the turn',
  },
  {
    key: 'back',
    file: 'back.webp',
    deg: 180,
    view:
      'seen from DIRECTLY BEHIND — a back view, the face completely hidden, ' +
      'showing the back of the head, the full length of the hair down the back, ' +
      'the back of the collar and the back of the robe with its sleeves flaring outward',
  },
]

/** 검수·정렬 계측이 훑을 파일 순서 — 정면부터 각도 순. VIEWS 가 정본이라 각을 늘려도 따라온다. */
const CHECK_FILES = ['base.webp', ...VIEWS.map((v) => v.file)]

function framePrompt(deity, view) {
  return (
    `${STYLE_PREFIX}, "${deity.code}" deity, ${deity.appearance}, neutral gentle expression, ` +
    `${view.view}. ${TURN_DIRECTION}. ${SAME_CHARACTER}. ${FRAME_COMMON}`
  )
}

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

// ───────────────────────── 정렬 계측 ─────────────────────────
/** "몸통"으로 인정할 행 폭 비율 — 이보다 얇은 행(날리는 옷자락·머리끝)은 실루엣 끝으로 세지 않는다 */
const BODY_ROW_MIN = 0.08

/**
 * 프레임의 실루엣 계측. 트림 후이므로 내용물 bbox 는 캔버스와 같아야 한다(그 자체가 검증 항목).
 *   bodyTop    : 행 폭이 BODY_ROW_MIN 을 넘는 첫 행 = 머리통이 시작되는 높이
 *   bodyBottom : 마지막 그런 행 = 발이 놓인 높이
 * 프레임끼리 이 두 값이 흔들리면 회전 중 키가 변한다 → 튄다.
 */
async function silhouette(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h, channels: ch } = info
  let minX = w
  let maxX = -1
  let minY = h
  let maxY = -1
  let bodyTop = -1
  let bodyBottom = -1
  let widest = 0
  let widestY = 0
  for (let y = 0; y < h; y += 1) {
    let rowMin = w
    let rowMax = -1
    for (let x = 0; x < w; x += 1) {
      if (data[(y * w + x) * ch + 3] <= 24) continue
      if (x < rowMin) rowMin = x
      if (x > rowMax) rowMax = x
    }
    if (rowMax < 0) continue
    if (y < minY) minY = y
    maxY = y
    if (rowMin < minX) minX = rowMin
    if (rowMax > maxX) maxX = rowMax
    const rowW = rowMax - rowMin + 1
    if (rowW > widest) {
      widest = rowW
      widestY = y
    }
    if (rowW >= w * BODY_ROW_MIN) {
      if (bodyTop < 0) bodyTop = y
      bodyBottom = y
    }
  }
  return {
    canvas: { w, h },
    bbox: { minX, maxX, minY, maxY },
    flush: minX === 0 && minY === 0 && maxX === w - 1 && maxY === h - 1,
    bodyTop,
    bodyBottom,
    widest,
    widestY,
  }
}

// ───────────────────────────── 생성 ─────────────────────────────
async function callModel(prompt, refPaths) {
  if (!KEY) throw new Error('GEMINI 키 없음 — 메인 체크아웃 .env.local 의 GOOGLE_GENERATIVE_AI_API_KEY 확인')
  if (apiCalls >= API_BUDGET) throw new Error(`API 예산(${API_BUDGET}회) 소진 — 생성 중단`)
  apiCalls += 1
  const genAI = new GoogleGenerativeAI(KEY)
  const model = genAI.getGenerativeModel({ model: MODEL })
  const parts = [{ text: prompt }]
  for (const rp of refPaths) {
    if (!existsSync(rp)) continue
    const buf = await readFile(rp)
    parts.push({
      inlineData: { mimeType: rp.endsWith('.webp') ? 'image/webp' : 'image/png', data: buf.toString('base64') },
    })
  }
  const res = await model.generateContent(parts)
  const cand = res.response.candidates?.[0]
  const img = cand?.content?.parts?.find((p) => p.inlineData)?.inlineData
  if (!img) throw new Error('이미지 파트 없음 — 응답: ' + JSON.stringify(cand)?.slice(0, 300))
  return Buffer.from(img.data, 'base64')
}

function isAuthError(e) {
  const s = String(e?.message || e)
  return /401|403|API_KEY_INVALID|API key not valid|PERMISSION_DENIED|UNAUTHENTICATED/i.test(s)
}

async function buildFrame(deity, view, { regen, rekey, noref }) {
  const rawPng = path.join(RAW_DIR, `${deity.code}-${view.key}.png`)
  const outWebp = path.join(DEITY_DIR, deity.code, view.file)
  const basePath = path.join(DEITY_DIR, deity.code, 'base.webp')

  // 중간각(q45·q135)은 side 를 **함께** 참조한다 — 정면만 주면 모델이 반대 방향으로 돌린 그림을
  // 내놓는 일이 있고, 그러면 반전 재사용이 성립하지 않는다(180° 를 넘는 절반이 통째로 뒤집힌다).
  // 참조가 인물을 오염시키면(세션12 교훈) `--noref` 로 프롬프트만 남겨 재시도한다.
  const refPaths = [basePath]
  if (view.refFile) refPaths.push(path.join(DEITY_DIR, deity.code, view.refFile))

  async function ensureRaw(force) {
    if (!force && existsSync(rawPng)) return
    const refs = noref ? [] : refPaths.filter((p) => existsSync(p))
    console.log(
      `  · 생성 (${MODEL}${refs.length ? `, 참조 ${refs.map((p) => path.basename(p)).join('+')}` : ', 참조 없음'})` +
        ` — API ${apiCalls + 1}/${API_BUDGET}`
    )
    const buf = await callModel(framePrompt(deity, view), refs)
    await mkdir(path.dirname(rawPng), { recursive: true })
    await writeFile(rawPng, buf)
  }

  await ensureRaw(regen && !rekey)
  await mkdir(path.dirname(outWebp), { recursive: true })

  for (let round = 0; round < 2; round += 1) {
    let best = null
    for (let p = 0; p < KEY_PROFILES.length; p += 1) {
      const keyed = await chromaKey(await sharp(rawPng).toBuffer(), KEY_PROFILES[p])
      const png = await sharp(keyed.data, {
        raw: { width: keyed.width, height: keyed.height, channels: keyed.channels },
      })
        .png()
        .toBuffer()
      // 트림 → **높이만** base(480)에 맞춘다. 폭은 실루엣이 정한다(측면은 좁고 뒷면은 넓다).
      // 이렇게 하면 발끝이 항상 캔버스 바닥 = object-contain 렌더에서 접지선이 프레임 간 동일하다.
      const finalBuf = await sharp(await sharp(png).trim({ threshold: 10 }).toBuffer())
        .resize({ height: FRAME_H, fit: 'inside' })
        .webp({ quality: 90, alphaQuality: 100 })
        .toBuffer()
      const { data, info } = await sharp(finalBuf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      const fringe = measureFringe(data, info.channels)
      const pass = fringe.ratio <= FRINGE_MAX && fringe.edgeRatio <= EDGE_FRINGE_MAX
      console.log(
        `  · 키잉 P${p + 1} ${info.width}×${info.height} fringe=${(fringe.ratio * 100).toFixed(3)}% edge=${(fringe.edgeRatio * 100).toFixed(2)}% ${pass ? 'PASS' : 'retry'}`
      )
      const candidate = { buf: finalBuf, fringe, profile: p + 1, width: info.width, height: info.height }
      if (!best || fringe.ratio < best.fringe.ratio) best = candidate
      if (pass) {
        await writeFile(outWebp, finalBuf)
        return { ok: true, file: outWebp, bytes: finalBuf.length, ...candidate }
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
    return { ok: true, file: outWebp, bytes: best.buf.length, ...best, warn: true }
  }
}

// ──────────────────────── 검수 이미지 ────────────────────────
const DARK = { r: 0x1a, g: 0x13, b: 0x08, alpha: 1 }
const CHECK_GAP = 16

/**
 * 신위별 base | q45 | side | q135 | back 을 **같은 높이·같은 바닥선**으로 각도 순으로 붙인다.
 * 인물이 같은지(얼굴·복장·색), 키가 흔들리지 않는지, **회전 방향이 한쪽으로 일관되는지**를
 * 이 한 장으로 판정한다 — 중간각이 반대로 돌아 있으면 반전 재사용이 통째로 어긋난다.
 */
async function makeCheckImage(codes) {
  const rows = []
  for (const code of codes) {
    const cells = []
    for (const f of CHECK_FILES) {
      const file = path.join(DEITY_DIR, code, f)
      if (!existsSync(file)) continue
      cells.push(await sharp(file).resize({ height: FRAME_H, fit: 'inside' }).png().toBuffer())
    }
    if (!cells.length) continue
    const metas = await Promise.all(cells.map((b) => sharp(b).metadata()))
    const rowW = metas.reduce((s, m) => s + m.width, 0) + CHECK_GAP * (cells.length - 1)
    let left = 0
    const composite = []
    for (let i = 0; i < cells.length; i += 1) {
      // 바닥선 정렬 — 셀 높이가 480 미만이어도 바닥에 붙인다(회전 중 접지선 판정용)
      composite.push({ input: cells[i], left, top: FRAME_H - metas[i].height })
      left += metas[i].width + CHECK_GAP
    }
    rows.push({
      buf: await sharp({ create: { width: rowW, height: FRAME_H, channels: 4, background: DARK } })
        .composite(composite)
        .png()
        .toBuffer(),
      w: rowW,
    })
  }
  if (!rows.length) return null
  const W = Math.max(...rows.map((r) => r.w))
  const H = rows.length * FRAME_H + CHECK_GAP * (rows.length - 1)
  const out = path.join(QA_DIR, 'deity-turnaround-check.webp')
  await mkdir(QA_DIR, { recursive: true })
  const info = await sharp({ create: { width: W, height: H, channels: 4, background: DARK } })
    .composite(rows.map((r, i) => ({ input: r.buf, left: 0, top: i * (FRAME_H + CHECK_GAP) })))
    .webp({ quality: 90 })
    .toFile(out)
  return { out, bytes: info.size, width: W, height: H, rows: rows.length }
}

// ──────────────────────────── main ────────────────────────────
const args = process.argv.slice(2)
const regen = args.includes('--regen')
const rekey = args.includes('--rekey')
const noref = args.includes('--noref')
const only = args.find((a) => !a.startsWith('--'))
const codes = only ? [only] : PILOT_CODES
const targets = DEITIES.filter((d) => codes.includes(d.code))
if (!targets.length) {
  console.error('unknown deity code:', only, '— 시범 대상:', PILOT_CODES.join(', '))
  process.exit(1)
}

// `--only=q45,q135` — 각 단위로 좁힌다(이미 side·back 이 있는 신위에 중간각만 얹을 때 과금이 반으로 준다).
// 등호 형태만 받는다 — 공백 형태는 값이 신위 코드 위치와 겹쳐 조용히 오작동한다.
const onlyKeysArg = args.find((a) => a.startsWith('--only='))
const onlyKeys = onlyKeysArg
  ? onlyKeysArg
      .slice('--only='.length)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : null
const views = onlyKeys ? VIEWS.filter((v) => onlyKeys.includes(v.key)) : VIEWS
if (!views.length) {
  console.error('unknown view key:', onlyKeys?.join(','), '— 가능한 각:', VIEWS.map((v) => v.key).join(', '))
  process.exit(1)
}

console.log(
  `모델: ${MODEL}\n원본 캐시: ${RAW_DIR}\n` +
    `산출: ${DEITY_DIR}\\{code}\\{${views.map((v) => v.key).join(',')}}.webp\n검수: ${QA_DIR}\n`
)

const results = []
for (const deity of targets) {
  const basePath = path.join(DEITY_DIR, deity.code, 'base.webp')
  if (!existsSync(basePath)) {
    console.error(`✖ ${deity.code}: base.webp 가 없다 — 참조·정렬 기준이 없어 건너뛴다`)
    continue
  }
  for (const view of views) {
    const outWebp = path.join(DEITY_DIR, deity.code, view.file)
    if (!regen && !rekey && existsSync(outWebp)) {
      console.log('skip', `${deity.code}/${view.file}`, '(이미 존재 — 재생성은 --regen)')
      continue
    }
    console.log(`── ${deity.code} / ${view.key} ──`)
    try {
      const r = await buildFrame(deity, view, { regen, rekey, noref })
      console.log(`  ✔ ${deity.code}/${view.file} ${r.width}×${r.height} ${(r.bytes / 1024).toFixed(1)}KB`)
      results.push({ code: deity.code, view: view.key, ...r })
    } catch (e) {
      if (isAuthError(e)) {
        console.error('\n✖✖ API 키 인증 실패 — 즉시 중단합니다. 재시도하지 않음.')
        console.error('   ', String(e?.message || e).slice(0, 400))
        process.exit(2)
      }
      console.error('  ✖', `${deity.code}/${view.key}`, String(e?.message || e).slice(0, 300))
      results.push({ code: deity.code, view: view.key, ok: false, error: String(e?.message || e).slice(0, 300) })
    }
  }
}

const check = await makeCheckImage(codes)
if (check) {
  console.log(
    `\n✔ deity-turnaround-check.webp ${(check.bytes / 1024).toFixed(1)}KB — ${check.width}×${check.height} ` +
      `(${check.rows}행 × ${CHECK_FILES.map((f) => f.replace('.webp', '')).join('|')}, 바닥선 정렬)`
  )
}

console.log('\n── 정렬 계측 (트림 후 · 캔버스 높이 480 고정) ──')
for (const code of codes) {
  const frames = []
  for (const f of CHECK_FILES) {
    const file = path.join(DEITY_DIR, code, f)
    if (!existsSync(file)) continue
    frames.push({ name: f.replace('.webp', ''), s: await silhouette(file) })
  }
  if (!frames.length) continue
  const base = frames.find((f) => f.name === 'base')
  console.log(`  ${code}`)
  for (const f of frames) {
    const s = f.s
    const dTop = base && f !== base ? s.bodyTop - base.s.bodyTop : 0
    const dBot = base && f !== base ? s.bodyBottom - base.s.bodyBottom : 0
    console.log(
      `    ${f.name.padEnd(5)} ${s.canvas.w}×${s.canvas.h} · 몸통 행 ${s.bodyTop}~${s.bodyBottom}` +
        ` (최대폭 ${s.widest}px @y${s.widestY}) · 트림 밀착 ${s.flush ? 'OK' : '⚠️ 여백 남음'}` +
        (f === base ? '  ← 기준' : `  Δ머리 ${dTop >= 0 ? '+' : ''}${dTop}px · Δ발 ${dBot >= 0 ? '+' : ''}${dBot}px`)
    )
  }
}

console.log('\n── 요약 ──')
for (const r of results) {
  console.log(
    r.ok
      ? `  ${r.warn ? '⚠️' : '✔'} ${r.code}/${r.view} ${r.width}×${r.height} ${(r.bytes / 1024).toFixed(1)}KB ` +
          `fringe=${(r.fringe.ratio * 100).toFixed(3)}% edge=${(r.fringe.edgeRatio * 100).toFixed(2)}% (P${r.profile})` +
          `${r.warn ? ' ⚠️임계 초과(최선값 채택)' : ''}`
      : `  ✖ ${r.code}/${r.view}: ${r.error}`
  )
}
console.log(
  `\nAPI 호출 ${apiCalls}/${API_BUDGET}회` +
    '\n⚠️ 인물 일관성·회전 방향은 수치로 잡히지 않는다 — deity-turnaround-check.webp 를 **육안 확인**하고,' +
    '\n   인물이 달라졌으면 `--regen --noref` 로 참조 없이 다시 굽는다(세션12 오염 교훈).' +
    '\n   중간각이 반대로 돌아 있으면 그 각만 `--only=q45 --regen` 으로 다시 굽는다(반전 재사용이 어긋난다).' +
    '\n   프레임이 모자라도 앱은 등급을 낮춰 동작한다(넷=9국면 · side·back=5국면 · 없음=rotateY) — DB 갱신은 하지 않는다.'
)
process.exit(results.some((r) => !r.ok) ? 1 : 0)
