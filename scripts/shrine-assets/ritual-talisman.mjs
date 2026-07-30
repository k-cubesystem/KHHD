// 신당 의식 R-1 「액막이 — 부적 태우기」 부적지·연소 에셋 (PRD-shrine-rituals-v1 §1)
//
// 굽는 것은 두 갈래다.
//
// ① AI 생성 (API 사용)
//   paper.webp  빈 부적지 — 연소 마스크가 걸리는 면. 위에 아무것도 쓰여 있지 않다.
//   sigil.webp  경면주사 **바탕 얼룩** — 한글 자모 획 아래에 깔리는 붉은 붓질. 글자가 아니다.
//
// ② 절차적 생성 (API 0회 · 이 파일이 픽셀을 직접 계산한다)
//   burn-mask.webp   연소 마스크 — 남은 종이의 알파. 경계가 **직선이 아니라** 프랙탈 잡음으로
//                    들쭉날쭉하고, 불길보다 앞서 뚫린 불티 구멍이 박혀 있다.
//   burn-front.webp  타는 선 — 백열심지 → 잉걸 → 검댕 → 갈변이 경계로부터의 거리로 칠해진다.
//   burn-glow.webp   투과광 — 종이 뒤에서 배어나오는 빛(screen 합성).
//
//   ⚠️ 세 장은 **같은 필드 함수 field(x,y) 하나**에서 나온다. 그래서 화면에서 겹칠 때
//      정합 오차가 0 이다. 예전엔 마스크는 CSS 그라디언트, 잉걸불은 translateY 로 따로 맞췄고
//      그 결과 잉걸불 띠가 실제 경계보다 높이의 14%(≈39px) 떠 있었다. 같은 함수를 쓰면
//      그 종류의 사고가 애초에 생기지 않는다.
//
// ⚠️ 왜 한글을 굽지 않는가: 두 가지 이유가 겹친다.
//    (1) 원문 보호 — 액운 원문은 서버로도, 이미지로도 나가지 않는다(기획의 핵심 가치).
//        부적 위의 "글씨"는 원문 해시에서 나온 자모 획이고 그건 **런타임 SVG** 가 그린다.
//    (2) 자획 재현 — 이미지 모델은 한글·한자 자획을 못 버틴다. 팻말(ritual-plaque.mjs)이
//        같은 이유로 글자를 굽지 않고, 이 파일의 구버전 sigil.webp 가 그 물증이다:
//        전서체 한자를 시켰는데 나온 것은 "ㅋ·저·뇌" 꼴로 뭉개진 자획이었다.
//    그래서 여기서 굽는 sigil 은 획이 앉을 **붉은 바탕**일 뿐이다.
//
// 사용:
//   node scripts/shrine-assets/ritual-talisman.mjs           # 누락분만 (멱등)
//   node scripts/shrine-assets/ritual-talisman.mjs paper      # 하나만
//   node scripts/shrine-assets/ritual-talisman.mjs --regen    # 원본부터 재생성
//   node scripts/shrine-assets/ritual-talisman.mjs --rekey    # 원본 캐시로 키잉만 (API 0회)
//   node scripts/shrine-assets/ritual-talisman.mjs --tex      # 연소 텍스처 + 검수만 (API 0회)
//
// 원칙 (stage-banga.mjs · stage-banga-altar.mjs 와 동일)
//   - STYLE / LIGHT 문구를 **한 글자도 바꾸지 않고 복제**한다. 부적지는 제단 위에서 기존 12품목과
//     한 화면에 서므로 붓·빛이 갈리면 "다른 그림에서 오려붙인 부적"이 된다.
//   - 순녹색(#00FF00) 배경 생성 → 하드 크로마키 → 트림.
//   - 접지 그림자를 굽지 않는다(런타임 담당).
//
// 산출: public/shrine/ritual/{paper,sigil,burn-mask,burn-front,burn-glow}.webp
// 검수: assets-src/shrine/ritual-talisman-check.webp  (부적지 / 한글 주문양 / 연소 4진행점)
import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from 'dotenv'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
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
const RAW_DIR = process.env.RITUAL_RAW_DIR || path.join(process.env.TEMP || '/tmp', 'shrine-ritual-talisman-raw')

/** 총 생성 상한(재시도 포함). 2장 × (1회 + 재시도 2회) = 6. */
const API_BUDGET = 6
let apiCalls = 0

// ────────────────────────────── 프롬프트 ──────────────────────────────
// STYLE·LIGHT 는 stage-banga.mjs 원문 그대로.
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
 * 문양 전용 크로마 — CHROMA 에서 "no text, no letters" 만 뺀 것.
 * 그 두 마디를 남기면 붓자국 자체가 사라져 빈 녹색 판이 나온다(주문 문양이 곧 글씨꼴이기 때문).
 * 나머지(배경·그림자·워터마크·테두리)는 그대로다.
 */
const CHROMA_MARKS =
  'the subject is fully isolated on a solid pure chroma green background (#00FF00) that fills the entire frame edge to edge, ' +
  'no ground plane, no floor, no table, no cast shadow on the background, no vignette, ' +
  'no watermark, no border, no frame'

/**
 * @typedef {object} RitualAsset
 * @property {string} key
 * @property {string} file
 * @property {number} outW  최종 스프라이트 폭(px)
 * @property {number|null} outH  고정 높이(px). null 이면 내용물 종횡비가 정한다.
 * @property {string} prompt
 */

/** @type {RitualAsset[]} */
const ASSETS = [
  {
    key: 'paper',
    file: 'paper.webp',
    // 화면 무대는 186×279px(2:3) — 에셋을 같은 비로 구워두면 CSS 가 늘일 일이 없다.
    // 연소 마스크가 이 면 위에서 움직이므로 여백 한 줄이 그대로 "타지 않는 띠"가 된다.
    outW: 512,
    outH: 768,
    prompt:
      'A single Korean paper talisman strip (부적), tall and narrow, seen flat from the front. ' +
      'Hand-made hanji paper in warm ivory-yellow with visible plant fibres and faint mottling, ' +
      'the top and bottom edges softly deckled and slightly uneven, the long sides straight. ' +
      'A thin cinnabar-red rule runs down the full length a little inside each long side. ' +
      'The paper between the two rules is bare hanji surface. ' +
      'Portrait proportion, two units wide and three units tall, filling the frame with a small even margin, ' +
      'the strip perfectly upright and centred. ' +
      `${STYLE}, ${LIGHT}, ${CHROMA}`,
  },
  {
    key: 'sigil',
    file: 'sigil.webp',
    outW: 384,
    outH: null,
    // 글자를 시키지 않는다 — 자모 획은 런타임 SVG 담당이고, 여기서는 그 획이 앉을 **바탕**만 굽는다.
    // 관찰 가능한 사실만 적는다(붓 폭·안료 두께·번짐 방향). 형태를 지시하면 다시 자획이 나온다.
    // ⚠️ 'washed onto hanji paper' 라고 쓰면 모델이 **종이부터 그린다** — 크로마 배경 대신
    //    상아색 판이 깔려 키잉이 통째로 실패한다(2026-07-30 1차 생성이 그 결과였다).
    //    바탕은 CHROMA_MARKS 가 정한다. 여기서는 안료와 붓만 말한다.
    prompt:
      'A vertical band of cinnabar-red pigment laid down with one pass of a wide flat brush. ' +
      'The band is narrow and upright, running from near the top of the frame to near the bottom, ' +
      'its colour deep and heavy along the middle and thinning towards both long edges. ' +
      'Dry-brush streaks run down the length of the band and the pigment has pooled into darker lines ' +
      'where the brush stopped. A few small droplets of the same red sit beside the band. ' +
      'The band has soft ragged edges. ' +
      'Narrow upright shape, taller than wide, centred with a generous margin on every side. ' +
      `${STYLE}, ${LIGHT}, ${CHROMA_MARKS}`,
  },
]

// ───────────────── 연소 텍스처 — 절차적 생성 (API 0회) ─────────────────
//
// 화면 무대(components/shrine/scene/AekmakSheet.tsx STAGE)와 CSS 의 mask-size 를 그대로 옮긴다.
// 두 값이 어긋나면 잡음 결이 세로로 늘어난다(정합은 안 깨지지만 결이 뭉개진다).
// 대조는 테스트(lib/domain/ritual/__tests__/aekmak.test.ts)가 한다.
const STAGE = { w: 186, h: 279 }
/** CSS `mask-size: 100% 220%` / `background-size: 100% 220%` 의 220% */
const MASK_SCALE = 2.2
/** 텍스처 규격 — 무대 폭의 약 2배(DPR2 기준 등배). 세로는 무대 높이 × MASK_SCALE 비율. */
const TEX = { w: 384, h: Math.round((384 * STAGE.h * MASK_SCALE) / STAGE.w) }
/** 텍스처 1px 이 화면에서 몇 요소-px 인가 (가로·세로 동일 = 등방) */
const TEX_PX = STAGE.w / TEX.w

/**
 * 경계 흔들림의 크기(필드 단위 = 세로 정규화 좌표 v).
 * 마스크가 창을 완전히 통과하려면 흔들림이 여유 ±(MASK_SCALE/2 − 1)/MASK_SCALE = ±0.0455 안에
 * 있어야 한다. 0.025 는 그 절반을 조금 넘는 값이고, 남는 여유(0.0205 ≈ 요소 높이의 4.5%)로
 * 불티 구멍이 앞서 나가는 거리를 감당한다. 화면에서는 요소 높이의 ±5.5%(279px 기준 ±15.3px).
 */
const FIELD_AMP = 0.025
/** 큰 결의 개수(이미지 폭당). 3 을 넘기면 "톱니"가 되고 1.5 아래면 "기울어진 직선"이 된다. */
const FIELD_FREQ = 1.9
/** 경계의 부드러움(요소 px). 한지 가장자리는 칼선이 아니다. */
const EDGE_FEATHER_PX = 1.2
/** 필드 1.0 이 화면에서 몇 요소-px 인가 (ds/dv = −1 이므로 v→y 배율과 같다) */
const FIELD_TO_PX = STAGE.h * MASK_SCALE

function hash2(ix, iy, seed) {
  let h = (Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263) ^ Math.imul(seed | 0, 2246822519)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

function smoothstep01(t) {
  return t * t * (3 - 2 * t)
}

function valueNoise(x, y, seed) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = smoothstep01(x - ix)
  const fy = smoothstep01(y - iy)
  const a = hash2(ix, iy, seed)
  const b = hash2(ix + 1, iy, seed)
  const c = hash2(ix, iy + 1, seed)
  const d = hash2(ix + 1, iy + 1, seed)
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy
}

/** 5옥타브 프랙탈 잡음 → [-1, 1]. 큰 혀 + 잔 이빨이 한 함수에서 같이 나온다. */
function fbm(x, y, seed) {
  let sum = 0
  let norm = 0
  let amp = 1
  let f = 1
  for (let o = 0; o < 5; o += 1) {
    sum += amp * (valueNoise(x * f, y * f, seed + o * 131) * 2 - 1)
    norm += amp
    amp *= 0.6
    f *= 2.1
  }
  return sum / norm
}

/**
 * 연소 필드. 0.5 를 기준으로 위(>0.5)는 남은 종이, 아래(<0.5)는 타 없어진 자리.
 * 세로 램프(1−v)에 잡음을 얹었을 뿐이라 **경계는 s=0.5 등고선 하나**다 —
 * 마스크·잉걸불·빛 세 장이 전부 이 한 등고선을 기준으로 칠해진다.
 */
function field(x, y) {
  const nx = (x / TEX.w) * FIELD_FREQ
  const ny = (y / TEX.w) * FIELD_FREQ
  return 1 - y / TEX.h + FIELD_AMP * fbm(nx, ny, 0x9e2b)
}

/** 열 x 에서 경계가 놓이는 텍스처 y — s=0.5 를 3회 대입해 수렴시킨다(잡음이 완만해 충분하다). */
function boundaryY(x) {
  let y = TEX.h * 0.5
  for (let i = 0; i < 3; i += 1) {
    y = TEX.h * (0.5 + FIELD_AMP * fbm((x / TEX.w) * FIELD_FREQ, (y / TEX.w) * FIELD_FREQ, 0x9e2b))
  }
  return y
}

/**
 * 불길보다 앞서 뚫리는 불티 구멍 — 실제로 종이는 불길 앞쪽에 바늘구멍이 먼저 뚫리고 그게 커진다.
 *
 * ⚠️ 구멍을 **마스크에서만** 파면 새까만 원이 뜬다(1차 검수가 그 꼴이었다 — 검은 방울 24개).
 *    그래서 구멍은 알파를 깎는 장치가 아니라 **또 하나의 탄 경계**로 다룬다:
 *    거리 d 를 「불길 경계까지의 거리」와 「구멍 가장자리까지의 거리」의 **최솟값**으로 놓으면
 *    잉걸·검댕·빛이 구멍 둘레에도 똑같이 칠해진다. 그래야 뚫린 자리로 읽힌다.
 * 경계 위 1~8 요소-px 안에만 둔다: 더 위로 올리면 멀쩡한 종이에 구멍이 미리 보인다.
 */
const HOLE_LEAD_PX = { min: 1, max: 8 }
const HOLE_R_PX = { min: 1.4, max: 4.6 }
/**
 * 구멍 둘레의 탄 자국을 몇 배로 조이는가.
 * ⚠️ 2차 검수의 실패: 구멍에도 불길과 **같은 폭(34px)** 의 탄 자국 램프를 먹였더니
 *    반지름 2px 짜리 구멍이 지름 26px 짜리 검은 얼룩이 됐다(검은 나비 30마리).
 *    실제로 바늘구멍의 탄 테두리는 구멍 크기에 비례한다 — 그래서 거리만 5배로 조인다.
 *    경계(거리 0)에서는 두 값이 같으므로 잉걸 심지는 여전히 구멍 가장자리에 정확히 앉는다.
 */
const HOLE_CHAR_TIGHTEN = 5

function makeHoles() {
  const holes = []
  let s = 0x51ed270b
  const rnd = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0x100000000
  }
  /**
   * 구멍이 넘어서면 안 되는 선(텍스처 px) — p=0 일 때 요소 아래끝이 놓이는 v=1/MASK_SCALE 위치.
   * 이 위로 올라간 구멍은 **불이 붙기도 전에 멀쩡한 종이에 뚫린 자국**으로 보인다.
   * 눈으로 못 잡는 종류라 상수로 못 박고 아래에서 강제로 눌러 앉힌다.
   */
  const ceil = (TEX.h / MASK_SCALE) + 4
  for (let i = 0; i < 20; i += 1) {
    const hx = rnd() * TEX.w
    const lead = HOLE_LEAD_PX.min + rnd() * (HOLE_LEAD_PX.max - HOLE_LEAD_PX.min)
    const r = HOLE_R_PX.min + rnd() * (HOLE_R_PX.max - HOLE_R_PX.min)
    holes.push({
      x: hx,
      // 경계보다 lead 만큼 위(= y 감소). 요소 px → 텍스처 px 는 TEX_PX 로 환산한다.
      y: Math.max(ceil + (r / TEX_PX) * 1.3, boundaryY(hx) - (lead + r) / TEX_PX),
      r: r / TEX_PX,
      // 완전한 원은 "펀치 구멍"이다 — 둘레를 살짝 흔들어 찢긴 자리로 만든다(과하면 별 모양이 된다)
      lobe: 0.1 + rnd() * 0.1,
      phase: rnd() * Math.PI * 2,
      phase2: rnd() * Math.PI * 2,
    })
  }
  return holes
}

const HOLES = makeHoles()

/** (x,y) 에서 가장 가까운 구멍 가장자리까지의 부호 거리(요소 px). 안쪽이 음수. 멀면 Infinity. */
function holeDistPx(x, y) {
  let best = Infinity
  for (const h of HOLES) {
    const dx = x - h.x
    const dy = y - h.y
    const d = Math.hypot(dx, dy)
    if (d > h.r * 2.2 + 30) continue
    const th = Math.atan2(dy, dx)
    const r = h.r * (1 + h.lobe * Math.sin(2 * th + h.phase) + h.lobe * 0.5 * Math.sin(3 * th + h.phase2))
    const signed = (d - r) * TEX_PX
    if (signed < best) best = signed
  }
  return best
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

/** 거리(요소 px) → [r,g,b,a] 정지점 보간. */
function rampAt(stops, d) {
  if (d <= stops[0][0]) return stops[0].slice(1)
  const last = stops[stops.length - 1]
  if (d >= last[0]) return last.slice(1)
  for (let i = 1; i < stops.length; i += 1) {
    if (d <= stops[i][0]) {
      const lo = stops[i - 1]
      const hi = stops[i]
      const t = (d - lo[0]) / (hi[0] - lo[0])
      return [lerp(lo[1], hi[1], t), lerp(lo[2], hi[2], t), lerp(lo[3], hi[3], t), lerp(lo[4], hi[4], t)]
    }
  }
  return last.slice(1)
}

/**
 * 타는 선의 색 — 경계에서 위로 멀어질수록 잉걸 → 숯 → 검댕 → 갈변 → 소멸. 요소 px 기준.
 *
 * ⚠️ 두 번의 실패에서 잡은 값이다.
 *   1차: 검댕(알파 0.8 · 두께 16px)을 넓게 깔았더니 "검은 띠가 지나간다"로 읽혔다.
 *   2차: 경계에 **흰빛(255,250,226)** 을 두었더니 상아색 한지 위에서 불이 아니라
 *        「흰 테두리 선」이 됐다. 잉걸불은 흰색이 아니라 **호박→주황→적**이다.
 * 그래서 지금은 심지가 주황이고, 검댕은 그 뒤 4~9px 에만 얇게 남는다.
 */
const FRONT_STOPS = [
  [-3.0, 255, 206, 116, 0.0],
  [-0.6, 255, 210, 122, 1.0],
  [1.0, 255, 148, 38, 1.0],
  [2.6, 190, 62, 12, 0.98],
  [4.6, 74, 32, 14, 0.95],
  [8.0, 26, 16, 10, 0.86],
  [13.0, 62, 42, 22, 0.46],
  [22.0, 122, 92, 50, 0.2],
  [36.0, 150, 118, 72, 0.0],
]

/** 세 텍스처를 한 번에 굽는다 — 픽셀 루프를 한 번만 돌기 위해 같은 함수 안에서 만든다. */
async function bakeBurnTextures() {
  const n = TEX.w * TEX.h
  const mask = Buffer.alloc(n * 4)
  const front = Buffer.alloc(n * 4)
  const glow = Buffer.alloc(n * 4)

  for (let y = 0; y < TEX.h; y += 1) {
    for (let x = 0; x < TEX.w; x += 1) {
      const i = (y * TEX.w + x) * 4
      const s = field(x, y)
      const dLine = (s - 0.5) * FIELD_TO_PX // 불길 경계에서의 부호 거리(요소 px, + = 남은 종이 쪽)
      // 구멍은 경계 바로 앞에만 있다 — 먼 픽셀은 아예 재지 않는다(픽셀 루프가 48만 회다)
      const dHole = dLine > 40 || dLine < -12 ? Infinity : holeDistPx(x, y)
      /** 마스크용 — 실제 구멍 크기 그대로 */
      const dMask = Math.min(dLine, dHole)
      /** 칠하기용 — 구멍 둘레의 탄 자국만 조인다(경계 0 에서는 dMask 와 같다) */
      const dPaint = Math.min(dLine, dHole * HOLE_CHAR_TIGHTEN)

      // ① 마스크 — 남은 종이. 불길이든 구멍이든 경계 아래는 사라진다.
      const a = smoothstep01(Math.min(1, Math.max(0, (dMask + EDGE_FEATHER_PX) / (EDGE_FEATHER_PX * 2))))
      mask[i] = 255
      mask[i + 1] = 255
      mask[i + 2] = 255
      mask[i + 3] = Math.round(255 * a)

      // ② 타는 선 — 띠 두께를 열마다 흔든다(잉걸이 고르게 번지는 종이는 없다).
      const wob = 1 + 0.45 * fbm((x / TEX.w) * 7.3, 11.3, 0x2b1a)
      const dj = dPaint / Math.max(0.35, wob)
      const [fr, fg, fb, fa] = rampAt(FRONT_STOPS, dj)
      // 검댕의 알갱이 — 균일한 띠는 인쇄물처럼 보인다
      const grain = 0.82 + 0.18 * valueNoise((x / TEX.w) * 52, (y / TEX.w) * 52, 0x77c1)
      front[i] = Math.round(fr)
      front[i + 1] = Math.round(fg)
      front[i + 2] = Math.round(fb)
      front[i + 3] = Math.round(255 * Math.min(1, fa * grain))

      // ③ 투과광 — 검댕 **너머**가 가장 밝다. 심지 자리에 겹쳐 두면 흰빛이 되어 불이 죽는다.
      // screen 합성이라 채도가 높아야 상아색 한지 위에서 흰색으로 날아가지 않는다.
      const core = Math.exp(-(((dj - 13) / 12) ** 2)) * 0.55
      const halo = Math.exp(-(((dj - 30) / 40) ** 2)) * 0.26
      const ga = dj < 1 ? 0 : Math.min(0.7, core + halo)
      const ct = Math.min(1, Math.max(0, (dj - 8) / 26))
      glow[i] = 255
      glow[i + 1] = Math.round(lerp(126, 74, ct))
      glow[i + 2] = Math.round(lerp(26, 10, ct))
      glow[i + 3] = Math.round(255 * ga)
    }
  }

  const raw = { width: TEX.w, height: TEX.h, channels: 4 }
  const out = []
  for (const [file, data] of [
    ['burn-mask.webp', mask],
    ['burn-front.webp', front],
    ['burn-glow.webp', glow],
  ]) {
    const buf = await sharp(data, { raw }).webp({ quality: 92, alphaQuality: 100 }).toBuffer()
    await writeFile(path.join(OUT_DIR, file), buf)
    out.push({ file, bytes: buf.length })
  }
  return out
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
// 화면(AekmakSheet)의 무대 그대로 여섯 칸을 만든다 — 실제로 보게 될 것만 본다.
//   ① 부적지 단독  ② 한글 부적(주묵 바탕 + 자모 주문양 + 인장 + 발원)  ③~⑥ 연소 4진행점
//
// ③~⑥ 은 **CSS 기하를 그대로 계산**한다: 세 텍스처를 요소 높이의 220% 로 늘리고
// 오프셋 p·(H − 2.2H) 만큼 밀어 창을 잘라낸다. 화면과 같은 식이므로 여기서 뜬 자리가
// 있으면 브라우저에서도 뜬다(반대도 같다).
const DARK = { r: 0x16, g: 0x14, b: 0x0f, alpha: 1 }
/** 무대 실측(AekmakSheet STAGE) 의 2배 — 검수는 육안 판정이라 레티나 배율로 본다 */
const CELL = { w: STAGE.w * 2, h: STAGE.h * 2 }
const PAD = 28
const GAP = 20
const LABEL_H = 26
/** 검수할 연소 진행점 — 붙는 순간 · 번지는 중 · 절반 · 잦아드는 끝 */
const BURN_STEPS = [0.14, 0.4, 0.66, 0.9]

/** 자모 획을 **도메인 파일에서 그대로 읽는다** — 검수본이 화면과 다른 글자를 그리는 사고 차단. */
function readJamoPaths() {
  const src = readFileSync(path.join(ROOT, 'lib', 'domain', 'ritual', 'aekmak.ts'), 'utf8')
  const block = /export const SIGIL_JAMO[^[]*\[([\s\S]*?)\n\]\)/.exec(src)
  if (!block) return []
  return [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
}

/**
 * 한글 주문양 한 벌 — 화면(AekmakSheet)의 SVG 와 같은 좌표계(100×150)·같은 구성.
 * 배치 난수는 검수 고정값이다(런타임은 원문 해시로 뽑는다).
 */
function sigilSvg(w, h) {
  const jamo = readJamoPaths()
  if (jamo.length === 0) return null
  // sigilPlan(자모 7~10 · 32~122 구간)이 내는 것과 같은 밀도의 고정 표본
  const pick = [0, 7, 12, 4, 9, 2, 13, 5] // ㄱ ㅇ ㅍ ㅁ ㅊ ㄷ ㅎ ㅂ
  const layout = [
    { x: 46.5, y: 38, size: 17, tilt: -9, weight: 2.3 },
    { x: 54.0, y: 49, size: 14, tilt: 6, weight: 1.6 },
    { x: 45.5, y: 60, size: 18, tilt: -3, weight: 2.6 },
    { x: 55.0, y: 71, size: 15, tilt: 12, weight: 1.95 },
    { x: 47.0, y: 82, size: 16, tilt: -14, weight: 2.3 },
    { x: 54.0, y: 93, size: 14, tilt: 4, weight: 1.6 },
    { x: 46.0, y: 104, size: 18, tilt: -6, weight: 2.6 },
    { x: 53.0, y: 115, size: 15, tilt: 10, weight: 1.95 },
  ]
  // 화면은 non-scaling-stroke 라 굵기가 px 로 고정된다. 검수는 2배 배율이므로 px×2 를 좌표 단위로.
  const unit = w / 100
  const strokeUnits = (px, size) => ((px * 2) / unit / (size / 10)).toFixed(3)
  const g = layout
    .map((L, i) => {
      const d = jamo[pick[i] % jamo.length]
      return (
        `<g transform="translate(${L.x} ${L.y}) rotate(${L.tilt}) scale(${(L.size / 10).toFixed(3)}) translate(-5 -5)">` +
        `<path d="${d}" fill="none" stroke="#8C1F1F" stroke-width="${strokeUnits(L.weight, L.size)}" ` +
        `stroke-linecap="round" stroke-linejoin="round"/></g>`
      )
    })
    .join('')
  const barLines = [
    { y: 55, x1: 34, x2: 64 },
    { y: 88, x1: 40, x2: 59 },
    { y: 112, x1: 34, x2: 64 },
  ]
    .map(
      (b) =>
        `<line x1="${b.x1}" y1="${b.y}" x2="${b.x2}" y2="${b.y}" stroke="#8C1F1F" ` +
        `stroke-width="${((1.4 * 2) / unit).toFixed(3)}" stroke-linecap="round" opacity="0.45"/>`
    )
    .join('')
  const dots = [
    { x: 33, y: 62, r: 1.1 },
    { x: 68, y: 96, r: 1.5 },
    { x: 66, y: 44, r: 0.7 },
  ]
    .map((d) => `<circle cx="${d.x}" cy="${d.y}" r="${d.r}" fill="#8C1F1F" opacity="0.55"/>`)
    .join('')
  return Buffer.from(
    `<svg width="${w}" height="${h}" viewBox="0 0 100 150" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">` +
      `<line x1="50" y1="32" x2="50" y2="122" stroke="#8C1F1F" stroke-width="${((1.1 * 2) / unit).toFixed(3)}" ` +
      `stroke-linecap="round" opacity="0.35"/>` +
      `${barLines}${g}${dots}</svg>`
  )
}

/** 머리 인장(한글 한 자) + 발치 발원 낱말 — 화면과 같은 2단 구성. */
function headSvg(w, h) {
  const box = Math.round(w * 0.19)
  const cx = Math.round(w / 2)
  const top = Math.round(h * 0.045)
  return Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="${cx - box / 2}" y="${top}" width="${box}" height="${box}" rx="3" fill="#9E2B2B" opacity="0.9"/>` +
      `<text x="${cx}" y="${top + box * 0.76}" text-anchor="middle" font-family="Batang, serif" font-weight="bold" ` +
      `font-size="${(box * 0.68).toFixed(1)}" fill="#F6E8D2">막</text>` +
      `<text x="${cx}" y="${Math.round(h * 0.935)}" text-anchor="middle" font-family="Batang, serif" ` +
      `font-size="${(w * 0.075).toFixed(1)}" letter-spacing="${(w * 0.03).toFixed(1)}" fill="#9E2B2B" opacity="0.8">막음</text>` +
      `</svg>`
  )
}

/** 텍스처 한 장을 진행도 p 에서의 창(CELL)으로 잘라낸다 — CSS 의 size 220% + position 0%→100% 그대로. */
async function texWindow(file, p) {
  const texH = Math.round(CELL.h * MASK_SCALE)
  const top = Math.round(p * (texH - CELL.h))
  return sharp(path.join(OUT_DIR, file))
    .resize(CELL.w, texH, { fit: 'fill' })
    .extract({ left: 0, top, width: CELL.w, height: CELL.h })
    .png()
    .toBuffer()
}

async function makeCheckSheet() {
  const paper = path.join(OUT_DIR, 'paper.webp')
  const sigil = path.join(OUT_DIR, 'sigil.webp')
  if (!existsSync(paper)) return null

  const paperCell = await sharp(paper).resize(CELL.w, CELL.h, { fit: 'fill' }).png().toBuffer()

  // ② 런타임 겹침 — 주묵 바탕(blur+opacity)에 자모 획과 인장·발원을 얹는다(.ritual-sigil 계약)
  const layers = []
  if (existsSync(sigil)) {
    const ww = Math.round(CELL.w * 0.32)
    const wh = Math.round(CELL.h * 0.71)
    // ⚠️ sharp 는 한 파이프라인에 composite() 를 두 번 부르면 앞의 것이 지워진다 — 끊어서 굽는다.
    const wash = await sharp(sigil)
      .resize(ww, wh, { fit: 'fill' })
      .blur(4)
      .ensureAlpha()
      .composite([
        {
          input: Buffer.from([255, 255, 255, Math.round(255 * 0.24)]),
          raw: { width: 1, height: 1, channels: 4 },
          tile: true,
          blend: 'dest-in',
        },
      ])
      .png()
      .toBuffer()
    // 화면(.ritual-sigil 의 mask-image linear-gradient)과 같은 위·아래 페이드
    const fade = Buffer.from(
      `<svg width="${ww}" height="${wh}" xmlns="http://www.w3.org/2000/svg"><defs>` +
        `<linearGradient id="f" x1="0" y1="0" x2="0" y2="1">` +
        `<stop offset="0%" stop-color="#fff" stop-opacity="0"/><stop offset="14%" stop-color="#fff" stop-opacity="1"/>` +
        `<stop offset="84%" stop-color="#fff" stop-opacity="1"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/>` +
        `</linearGradient></defs><rect width="100%" height="100%" fill="url(#f)"/></svg>`
    )
    const faded = await sharp(wash).composite([{ input: fade, blend: 'dest-in' }]).png().toBuffer()
    layers.push({ input: faded, left: Math.round(CELL.w * 0.34), top: Math.round(CELL.h * 0.16) })
  }
  const marks = sigilSvg(CELL.w, CELL.h)
  if (marks) layers.push({ input: marks, left: 0, top: 0 })
  layers.push({ input: headSvg(CELL.w, CELL.h), left: 0, top: 0 })
  const overlaid = await sharp(paperCell).composite(layers).png().toBuffer()

  // ③~⑥ 연소 — 런타임 층 순서 그대로: (부적 + 타는 선 + 투과광) 을 만든 뒤 마스크로 오린다.
  const hasTex = ['burn-mask.webp', 'burn-front.webp', 'burn-glow.webp'].every((f) =>
    existsSync(path.join(OUT_DIR, f))
  )
  const burning = []
  if (hasTex) {
    for (const p of BURN_STEPS) {
      const painted = await sharp(overlaid)
        .ensureAlpha()
        .composite([
          { input: await texWindow('burn-front.webp', p), blend: 'over' },
          { input: await texWindow('burn-glow.webp', p), blend: 'screen' },
        ])
        .png()
        .toBuffer()
      burning.push({
        p,
        buf: await sharp(painted)
          .composite([{ input: await texWindow('burn-mask.webp', p), blend: 'dest-in' }])
          .png()
          .toBuffer(),
      })
    }
  }

  const cells = [
    { label: '① 부적지', buf: paperCell },
    { label: '② 한글 부적', buf: overlaid },
    ...burning.map((b) => ({ label: `연소 ${Math.round(b.p * 100)}%`, buf: b.buf })),
  ]
  const W = PAD * 2 + CELL.w * cells.length + GAP * (cells.length - 1)
  const H = PAD * 2 + LABEL_H + CELL.h
  const composite = []
  cells.forEach((c, i) => {
    const left = PAD + (CELL.w + GAP) * i
    composite.push({
      input: Buffer.from(
        `<svg width="${CELL.w}" height="${LABEL_H}" xmlns="http://www.w3.org/2000/svg">` +
          `<text x="0" y="18" font-family="Malgun Gothic, sans-serif" font-size="14" fill="#C9A84C">${c.label}</text></svg>`
      ),
      left,
      top: PAD,
    })
    composite.push({ input: c.buf, left, top: PAD + LABEL_H })
  })

  const out = path.join(QA_DIR, 'ritual-talisman-check.webp')
  await mkdir(QA_DIR, { recursive: true })
  const info = await sharp({ create: { width: W, height: H, channels: 4, background: DARK } })
    .composite(composite)
    .webp({ quality: 92 })
    .toFile(out)
  return { out, bytes: info.size, W, H, cells: cells.length }
}

// ──────────────────────────── main ────────────────────────────
const args = process.argv.slice(2)
const regen = args.includes('--regen')
const rekey = args.includes('--rekey')
const texOnly = args.includes('--tex')
const only = args.find((a) => !a.startsWith('--'))
const targets = only && only !== 'all' ? ASSETS.filter((a) => a.key === only) : ASSETS
if (!targets.length) {
  console.error('unknown asset key:', only, '— 가능:', ASSETS.map((a) => a.key).join(', '), ', all')
  process.exit(1)
}

console.log(`모델: ${MODEL}\n원본 캐시: ${RAW_DIR}\n산출: ${OUT_DIR}\n검수: ${QA_DIR}\n`)

const results = []
if (!texOnly) {
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
}

// 연소 텍스처는 항상 다시 굽는다 — 절차적이라 API 0회이고, 필드 상수를 고치면 바로 반영돼야 한다
console.log('\n── 연소 텍스처 (절차적 · API 0회) ──')
await mkdir(OUT_DIR, { recursive: true })
const tex = await bakeBurnTextures()
for (const t of tex) console.log(`  ✔ ${t.file} ${TEX.w}×${TEX.h} ${(t.bytes / 1024).toFixed(1)}KB`)
console.log(
  `  경계 흔들림 ±${(FIELD_AMP * FIELD_TO_PX).toFixed(1)}요소px (높이의 ±${(FIELD_AMP * MASK_SCALE * 100).toFixed(1)}%) · 불티 구멍 ${HOLES.length}개`
)

const sheet = await makeCheckSheet()
if (sheet) {
  console.log(`\n✔ 검수 이미지 ${sheet.W}×${sheet.H} ${(sheet.bytes / 1024).toFixed(1)}KB (${sheet.cells}칸)`)
  console.log(`  ${sheet.out}`)
  console.log(`  ① 부적지  ② 한글 부적  ③~⑥ 연소 ${BURN_STEPS.map((p) => `${Math.round(p * 100)}%`).join(' · ')}`)
}

console.log(`\nAPI 호출 ${apiCalls}/${API_BUDGET}회`)
process.exit(results.some((r) => !r.ok) ? 1 : 0)
