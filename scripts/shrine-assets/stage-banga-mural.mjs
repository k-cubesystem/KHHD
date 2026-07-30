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
// ── 안2.3 부록 C ① : 세로줄의 **진짜** 원인과 처방 ─────────────────────────────
// 미러 타일링으로 이음새는 수학적으로 0 이 되었는데도 CEO 화면에는 세로선이 남았다.
// 픽셀 실측(오케스트레이터)이 원인을 확정했다 — **이음새가 아니라 그림 안의 경계**다.
//   원본 벽 타일 안에 열 평균 휘도 Δ104(x=260) 하드 세로 경계가 박혀 있고(기둥 좌측:
//   한지 169 → 1px 밝은 림 186 → 1px 먹선 25 → 기둥 몸통 73), 미러 반복이 이 경계를
//   x=260·1787·2308·3835 에 복제한다. 렌더 스케일(≈0.445)로 축소되면 1px 먹선·1px 림이
//   리샘플링되며 **얇은 세로줄**로 뭉친다. 반복 경계(0.2대)와는 아예 다른 문제였다.
// 처방: 무라 굽기 앞단에 **하드 에지 검출·페더링**(아래 EDGE_* 상수)을 넣어 계단식 점프만
//   완만하게 눌렀다. 기둥·먹선의 구조는 남기고 절벽만 없앤다 — 톤은 CEO 승인분이라 재생성 금지.
// ⚠️ 교훈: 이음새(tiling)와 그림 안의 경계(hard edge)는 **다른 지표**다. 항상 둘 다 본다.
//
// ⚠️ **API 호출 0회** — 입력은 검수 통과한 기존 타일 2장 재사용이다. 톤을 다시 굽지 않는다.
//    (문간 스프라이트만 예외적으로 생성한다. 아래 API_BUDGET 참조.)
//
// 산출: public/shrine/stage/banga/
//   room-wall-mural.webp   4096×640 불투명 — 벽 무라 (타일 1024 × 4, 미러 교대, 하드 에지 페더링)
//   room-floor-mural.webp  4096×420 불투명 — 마루 무라 (최대 Δ5.1 = 절벽 아님 → 페더링 0열)
//   room-door.webp          512×768 투명   — 분합문(들어열개) 문간 랜드마크
// 검수(assets-src/shrine/ — public 에 QA 산출물을 남기지 않는다):
//   room-mural-check.webp    — 무라 전체 축소 + 제단·단상·문간·신위 조립 (CEO 판단용 1장)
//   room-mural-edgefix.webp  — 페더링 전/후 같은 위치 3배 확대 2행 (세로줄 판정용)
//
// 사용:
//   node scripts/shrine-assets/stage-banga-mural.mjs           # 누락분만 (멱등)
//   node scripts/shrine-assets/stage-banga-mural.mjs --regen    # 무라 재굽기 (API 0회 — 문간은 유지)
//   node scripts/shrine-assets/stage-banga-mural.mjs mural      # 무라 2장만 (API 0회)
//   node scripts/shrine-assets/stage-banga-mural.mjs door --regen  # 문간만 재생성 (API 1~3회)
//   ⚠️ `--regen` 은 문간을 다시 굽지 **않는다**. 검수 통과한 문간(fringe 0.000%)을 재추첨으로
//      잃지 않게 하려는 의도적 비대칭이다 — 문간 재생성은 `door --regen` 으로만 명시 호출한다.
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

// ─────────────── 하드 에지 검출·페더링 (부록 C ①) ───────────────
// **상수 단일 출처.** 값을 고칠 일이 생기면 여기만 고친다 — 아래 함수엔 리터럴을 두지 않는다.

/** 검출: 인접 열 휘도차가 `max(중앙값 × REL, ABS)` 를 넘으면 하드 에지.
 *  ⚠️ 두 항의 결합은 **max** 다(OR 가 아니다). ABS 는 "절벽의 하한" —
 *     마루 무라의 최대 Δ는 5.1 이고 그건 육안 무해로 이미 판정났다(부록 C ① 표).
 *     ABS 를 밑도는 값까지 건드리면 승인된 톤을 이유 없이 흐리는 것이다.
 *     REL 항은 그림이 거친 경우(중앙값이 큰 경우) 임계를 **올려** 텍스처를 절벽으로 오검출하지 않게 한다. */
const EDGE_DETECT_REL = 20
const EDGE_DETECT_ABS = 20
/** 페더 후 목표 "열당 단계". 반경을 Δ/이 값 으로 잡는다(단계가 클수록 넓게 편다).
 *  합격 기준(EDGE_ACCEPT_MAX=20)보다 낮게 두는 이유는 webp 양자화가 경계에 ±1~2 를 되돌리기 때문. */
const EDGE_SPREAD_TARGET = 16
/** 반경 상한 — 이보다 넓게 펴면 기둥이 초점 밖으로 보인다(구조를 잃는다) */
const EDGE_RADIUS_MAX = 14
/** 테이퍼 여유: 창 절반폭 = 반경 + 이 값. 창 끝에서 강도가 0 이라 새 경계가 생기지 않는다. */
const EDGE_TAPER_PAD = 2
/** 재검출 반복 상한 — 페더가 만든 잔여 단계까지 정리한다(보통 1패스에서 끝난다) */
const EDGE_PASS_MAX = 3
/** 합격: 무라 최종본(webp 디코드)의 인접 열 휘도차 최대값이 이 값 이하 */
const EDGE_ACCEPT_MAX = 20
/** 톤 허용 오차 — 열 휘도 평균 기준(±%). 표준편차는 절벽을 램프로 펴는 순간 반드시 줄어든다(후술). */
const EDGE_TONE_TOL = 0.02
/** CEO 화면의 실제 렌더 스케일 — 이 배율로 축소했을 때의 열 차이가 "눈에 보이는가"의 지표다 */
const RENDER_SCALE = 0.445

/** 인접 열 휘도차 배열 */
function columnDiffs(col) {
  const out = new Float64Array(col.length - 1)
  for (let x = 0; x < col.length - 1; x += 1) out[x] = Math.abs(col[x + 1] - col[x])
  return out
}

/** 열 휘도 프로파일 요약 — 상위 5개·중앙값·평균·표준편차 */
function lumaProfile(col) {
  const diffs = columnDiffs(col)
  const idx = Array.from(diffs.keys())
  idx.sort((a, b) => diffs[b] - diffs[a])
  const sorted = Array.from(diffs).sort((a, b) => a - b)
  let mean = 0
  for (const v of col) mean += v
  mean /= col.length
  let sq = 0
  for (const v of col) sq += (v - mean) ** 2
  return {
    diffs,
    top: idx.slice(0, 5).map((x) => ({ x, v: diffs[x] })),
    max: sorted[sorted.length - 1],
    median: sorted[Math.floor(sorted.length / 2)],
    mean,
    stdev: Math.sqrt(sq / col.length),
  }
}

/**
 * 경계 하나를 코사인 테이퍼 가중 **가로 방향** 블러로 완화한다.
 *   out[x] = src[x]·(1−s) + blurₕ(src,radius)[x]·s ,  s = ½(1+cos(π·|x−중심|/half))
 * 가로 블러만 쓰는 이유: 경계가 세로선이므로 **경계 방향(세로) 디테일은 한 픽셀도 건드리지 않는다**.
 * 결과 프로파일은 두 평지 값을 유지한 채 그 사이가 2·radius 폭 램프로 바뀐다 → 열당 단계 ≈ Δ/(2·radius+1).
 * @param {Buffer} data 3채널 raw (제자리 수정)
 */
function featherColumnEdge(data, w, h, ch, edge, radius, half) {
  const win = radius * 2 + 1
  const x0 = Math.max(0, edge - half + 1)
  const x1 = Math.min(w - 1, edge + half)
  const src = Buffer.from(data) // 이 경계를 처리하는 동안의 읽기 원본(자기 출력을 되먹지 않게)
  let touched = 0
  for (let x = x0; x <= x1; x += 1) {
    const s = 0.5 * (1 + Math.cos(Math.PI * Math.min(1, Math.abs(x - (edge + 0.5)) / half)))
    if (s <= 0.001) continue
    touched += 1
    for (let y = 0; y < h; y += 1) {
      for (let c = 0; c < 3; c += 1) {
        let sum = 0
        for (let k = -radius; k <= radius; k += 1) {
          sum += src[(y * w + Math.min(w - 1, Math.max(0, x + k))) * ch + c]
        }
        const i = (y * w + x) * ch + c
        data[i] = Math.round(src[i] * (1 - s) + (sum / win) * s)
      }
    }
  }
  return touched
}

/**
 * 타일 raw 를 제자리에서 페더링한다. **타일 파일은 건드리지 않는다** —
 * 원본 2장은 §3(b) 원복 경로이자 재굽기 입력이고, 톤은 CEO 승인분이다.
 * 미러 항등성도 영향받지 않는다: flop(feather(T)) = feather(T) 를 뒤집은 것이므로
 * 경계에서 공유되는 열(T[W−1], T[0])은 값이 무엇이든 양쪽이 같다.
 */
function featherHardEdges(data, w, h, ch) {
  const before = lumaProfile(columnLuma(data, w, h, ch))
  const tonePre = pixelTone(data, w, h, ch)
  const touchedCols = new Set()
  const edges = []
  let passes = 0
  for (let pass = 0; pass < EDGE_PASS_MAX; pass += 1) {
    const p = lumaProfile(columnLuma(data, w, h, ch))
    const threshold = Math.max(p.median * EDGE_DETECT_REL, EDGE_DETECT_ABS)
    const hits = []
    for (let x = 0; x < p.diffs.length; x += 1) if (p.diffs[x] > threshold) hits.push({ x, v: p.diffs[x] })
    if (!hits.length) break
    passes += 1
    for (const hit of hits) {
      const radius = Math.min(EDGE_RADIUS_MAX, Math.max(1, Math.ceil(hit.v / EDGE_SPREAD_TARGET)))
      const half = radius + EDGE_TAPER_PAD
      featherColumnEdge(data, w, h, ch, hit.x, radius, half)
      for (let x = hit.x - half + 1; x <= hit.x + half; x += 1) touchedCols.add(x)
      edges.push({ pass: passes, x: hit.x, delta: hit.v, radius })
    }
  }
  const after = lumaProfile(columnLuma(data, w, h, ch))
  return {
    before,
    after,
    tonePre,
    tonePost: pixelTone(data, w, h, ch),
    edges,
    passes,
    touched: touchedCols.size,
    width: w,
  }
}

/**
 * 픽셀 영역 톤 — 전 픽셀 휘도의 평균·표준편차.
 * 열 휘도 표준편차는 절벽을 램프로 펴면 **정의상** 줄어든다(극단 열이 중간값으로 이동).
 * 반면 그림 전체의 명암 대비(픽셀 분포)는 유지돼야 한다 — 톤 보존의 정직한 지표는 이쪽이다.
 */
function pixelTone(data, w, h, ch) {
  let sum = 0
  let sq = 0
  const n = w * h
  for (let p = 0; p < n; p += 1) {
    const i = p * ch
    const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
    sum += l
    sq += l * l
  }
  const mean = sum / n
  return { mean, stdev: Math.sqrt(Math.max(0, sq / n - mean * mean)) }
}

/** 렌더 스케일로 축소했을 때 남는 열 차이 — "CEO 눈에 보이는가"의 직접 지표 */
async function renderScaleProfile(webpBuf) {
  const meta = await sharp(webpBuf).metadata()
  const dec = await sharp(webpBuf)
    .resize(Math.max(2, Math.round(meta.width * RENDER_SCALE)), null, { kernel: 'lanczos3' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return lumaProfile(columnLuma(dec.data, dec.info.width, dec.info.height, dec.info.channels))
}

// ───────────────────────── 무라 굽기 ─────────────────────────
const DARK = { r: 0x1a, g: 0x13, b: 0x08, alpha: 1 }

/**
 * 미러 교대 이어붙이기 → webp. 리사이즈를 **한 번도 하지 않는다** —
 * 스케일이 끼면 경계 픽셀 공유가 깨져(재샘플링) 미러의 항등성이 무너진다.
 * @param {{data:Buffer,width:number,height:number,channels:number}} tile 페더링을 마친 타일 raw
 */
async function composeMural(tile, repeats) {
  const rawIn = { raw: { width: tile.width, height: tile.height, channels: tile.channels } }
  const normal = await sharp(tile.data, rawIn).png().toBuffer()
  const flopped = await sharp(tile.data, rawIn).flop().png().toBuffer()
  const W = tile.width * repeats
  const layers = []
  for (let i = 0; i < repeats; i += 1) {
    layers.push({ input: i % 2 === 0 ? normal : flopped, left: i * tile.width, top: 0 })
  }
  const raw = await sharp({ create: { width: W, height: tile.height, channels: 3, background: DARK } })
    .composite(layers)
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { raw, W }
}

async function buildMural(spec) {
  const tilePath = path.join(OUT_DIR, spec.tile)
  if (!existsSync(tilePath)) throw new Error(`입력 타일이 없다: ${tilePath} — stage-banga-room.mjs 를 먼저 실행할 것`)

  // 원본 타일 raw. **파일은 수정하지 않는다** — 페더링은 이 메모리 버퍼에서만 일어난다.
  const tileRaw = await sharp(tilePath).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const tileW = tileRaw.info.width
  const tileH = tileRaw.info.height
  const tileCh = tileRaw.info.channels
  const rawTile = { data: tileRaw.data, width: tileW, height: tileH, channels: tileCh }
  const plainTile = { ...rawTile, data: Buffer.from(tileRaw.data) } // 페더링 전 사본(비교 이미지용)

  // 하드 에지 페더링 — 세로줄의 진짜 원인 제거(부록 C ①)
  const feather = featherHardEdges(rawTile.data, tileW, tileH, tileCh)

  // 원본 타일의 열 휘도 산포 — 무라가 이보다 나빠지면(=밝기 물결 악화) 미러 조립이 잘못된 것이다.
  const tileStd = stdev(columnLuma(rawTile.data, tileW, tileH, tileCh))

  let repeats = spec.repeats
  let chosen = null

  // 용량 사다리: q 를 낮춰 보고, 그래도 넘으면 반복 수를 하나 줄여(4→3) 폭을 깎는다.
  for (; repeats >= 3 && !chosen; repeats -= 1) {
    const { raw, W } = await composeMural(rawTile, repeats)
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
      // ③ 하드 에지 검증 — 무라 최종본의 열 휘도 프로파일(부록 C ① 과 같은 지표)
      const muralEdge = lumaProfile(columnLuma(dec.data, W, tileH, dec.info.channels))
      chosen = {
        webp,
        quality,
        W,
        repeats,
        preBoundary,
        postBoundary,
        interior,
        tileStd,
        muralStd,
        tileW,
        tileH,
        muralEdge,
      }
      break
    }
  }

  const outPath = path.join(OUT_DIR, spec.file)
  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(outPath, chosen.webp)

  // 페더링 전 무라 — 같은 조립·같은 q 로 굽는다(비교의 유일한 변수가 페더링이 되게)
  const plainMural = await composeMural(plainTile, chosen.repeats)
  const plainWebp = await sharp(plainMural.raw.data, {
    raw: { width: plainMural.W, height: tileH, channels: plainMural.raw.info.channels },
  })
    .webp({ quality: chosen.quality })
    .toBuffer()
  const plainDec = await sharp(plainWebp).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const plainEdge = lumaProfile(columnLuma(plainDec.data, plainMural.W, tileH, plainDec.info.channels))
  const renderBefore = await renderScaleProfile(plainWebp)
  const renderAfter = await renderScaleProfile(chosen.webp)

  const worstPre = Math.max(...chosen.preBoundary.map((b) => b.diff))
  const worstPost = Math.max(...chosen.postBoundary.map((b) => b.diff))
  /** 미러 **축**(내부 경계)만 — 랩은 반복 렌더 전용 지표라 분리한다 */
  const worstAxis = Math.max(...chosen.postBoundary.filter((b) => !b.wrap).map((b) => b.diff))
  const wrapPost = chosen.postBoundary.find((b) => b.wrap)?.diff ?? 0
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
    // 페더링 계측 (부록 C ①)
    feather,
    plainEdge,
    muralEdge: chosen.muralEdge,
    renderBefore,
    renderAfter,
    plainWebp,
    webpBuf: chosen.webp,
    // 합격 조건 ① 미러 항등(인코딩 전 정확히 0) ② 인코딩 후도 내부 이웃 열 분포 안 ③ 밝기 산포 무악화
    passMirror: worstPre === 0,
    passEncoded: worstPost <= Math.max(chosen.interior.p95, chosen.interior.median * 2 + 0.5),
    passRipple: chosen.muralStd <= chosen.tileStd * 1.02 + 0.01,
    withinBudget: chosen.webp.length <= MURA_MAX_BYTES,
    // ④ 하드 에지 합격 — 무라 최종본 최대 인접 열 차이가 EDGE_ACCEPT_MAX 이하
    passEdge: chosen.muralEdge.max <= EDGE_ACCEPT_MAX,
    // ⑤ 톤 — 열 휘도 **평균**은 ±EDGE_TONE_TOL 안. (표준편차는 절벽을 램프로 펴면 반드시 줄어든다:
    //    극단값 열이 중간값으로 이동하기 때문. 그게 곧 처방의 정의라 합격 조건에 넣지 않고 수치만 보고한다.)
    passTone:
      Math.abs(feather.after.mean - feather.before.mean) <= feather.before.mean * EDGE_TONE_TOL,
    worstPre,
    worstPost,
    worstAxis,
    wrapPost,
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

// ──────────────────── 페더링 전/후 비교 이미지 ────────────────────
/** 확대 배율·크롭 규격 — 세로줄은 원본 스케일에서 1~2px 이라 확대 없이는 판정할 수 없다 */
const FIX_ZOOM = 3
const FIX_CROP_W = 84
const FIX_CROP_H = 150
const FIX_PATCHES = 3
const FIX_GAP = 10

/**
 * 같은 위치 확대 2행 — **위=페더링 전 · 아래=페더링 후**.
 * 크롭 위치는 페더링 전 무라에서 가장 큰 인접 열 차이 상위 3곳(≥64px 떨어진 것끼리).
 * 두 무라는 같은 조립·같은 webp q 라 비교의 유일한 변수가 페더링이다.
 */
async function makeEdgeFixImage(results) {
  const target = results.find((r) => r.ok && r.plainWebp && r.feather?.edges.length)
  if (!target) return null

  const picks = []
  for (const e of target.plainEdge.top) {
    if (picks.every((p) => Math.abs(p - e.x) >= FIX_CROP_W - 20)) picks.push(e.x)
    if (picks.length >= FIX_PATCHES) break
  }
  const meta = await sharp(target.webpBuf).metadata()
  const top = Math.max(0, Math.round(meta.height * 0.22))
  const cropH = Math.min(FIX_CROP_H, meta.height - top)

  async function row(buf) {
    const patches = []
    for (const x of picks) {
      const left = Math.min(meta.width - FIX_CROP_W, Math.max(0, x - Math.round(FIX_CROP_W / 2)))
      patches.push(
        await sharp(buf)
          .extract({ left, top, width: FIX_CROP_W, height: cropH })
          .resize(FIX_CROP_W * FIX_ZOOM, cropH * FIX_ZOOM, { kernel: 'nearest' })
          .png()
          .toBuffer()
      )
    }
    const rowW = patches.length * FIX_CROP_W * FIX_ZOOM + (patches.length - 1) * FIX_GAP
    const rowH = cropH * FIX_ZOOM
    const composite = patches.map((input, i) => ({ input, left: i * (FIX_CROP_W * FIX_ZOOM + FIX_GAP), top: 0 }))
    return {
      buf: await sharp({ create: { width: rowW, height: rowH, channels: 4, background: DARK } })
        .composite(composite)
        .png()
        .toBuffer(),
      w: rowW,
      h: rowH,
    }
  }

  const before = await row(target.plainWebp)
  const after = await row(target.webpBuf)
  const out = path.join(QA_DIR, 'room-mural-edgefix.webp')
  await mkdir(QA_DIR, { recursive: true })
  const info = await sharp({
    create: { width: before.w, height: before.h * 2 + FIX_GAP, channels: 4, background: DARK },
  })
    .composite([
      { input: before.buf, left: 0, top: 0 },
      { input: after.buf, left: 0, top: before.h + FIX_GAP },
    ])
    .webp({ quality: 92 })
    .toFile(out)
  return { out, bytes: info.size, picks, zoom: FIX_ZOOM, width: before.w, height: before.h * 2 + FIX_GAP }
}

// ──────────────────────── 검사 이미지 1장 ────────────────────────
/**
 * 시드 구조물 좌표 — 검사 이미지는 시드와 **같은 숫자**로 조립해야 판단 근거가 된다.
 * ⚠️ 단일 출처는 supabase/migrations/20260730_shrine_banga_altar_platform.sql 이다.
 *    저 시드를 고치면 여기도 같이 고칠 것(이 배열은 시드의 거울일 뿐이다).
 */
const SEED_WORLD_WIDTH = 320
/** 렌더 기준 방 — ShrineRoomClient 실측: 컨테이너 `max-w-[520px]`, 높이 `min(72vh, 620px)` */
const ROOM_REF_W = 520
const ROOM_REF_H = 620
const SEED_STRUCTURES = [
  // 겉보기 w(%): 렌더가 w × 100/320 을 구역 폭(=3.2화면)에 적용하므로 결과는 "뷰포트 폭의 w%" 다.
  // 배열 순서 = 그리는 순서 = 뒤→앞. 단상이 먼저(뒤), 제단 상판이 나중(앞)이라 단상 밑동을 가린다.
  { file: 'platform.webp', x: 50, y: 51, w: 44 },
  { file: 'altar-top.webp', x: 50, y: 58, w: 58 },
  { file: DOOR.file, x: 10, y: 37, w: 36 },
]
/**
 * 신위 접지 계약 — 단상 상면. stage-banga-altar.mjs 가 낸 두 기준 방(폭 520·380) 상면 밴드
 * **교집합 44.70~45.87% 의 가운데**다. `lib/domain/shrine/stage.ts` 의 PODIUM_TOP_Y 는 이 밴드
 * 안이면 계약 충족이다(정확히 같은 값일 필요는 없다) — 시드 [계약 3] 참조.
 */
const DEITY_CONTACT_Y = 45.3
/** 신위 스탠드 높이 — ShrineRoomClient 실측 `height:'38%'` */
const DEITY_HEIGHT_PCT = 38
/** 접지 검증용 신위 1종(시범 턴어라운드 대상) */
const DEITY_PROOF = 'seonnyeo'

/**
 * CEO 가 이 한 장으로 판단한다.
 *   ①·② 무라 전폭 축소 — **미러 대칭이 거슬리는지**만 본다(이음선은 수치로 이미 0).
 *   ③ 320% 방 전체 조립 — StageLayers 실측 규약(벽 top0 h62% · 바닥 bottom h40% · object-cover,
 *     구조물 x/y = 스프라이트 중심 %, w = 구역폭 대비 % × zoneWidthScale)을 그대로 재현한다.
 *     제단 상판·단상·문간의 위계가 성립하는지, **신위 발이 단상 상면에 접지하는지**를 여기서 본다.
 *     기준 방은 실측 520×620 (컨테이너 max-w-[520px] · 높이 min(72vh,620px)).
 *     ⚠️ y(%)는 방 높이 기준, w(%)는 뷰포트 폭 기준이라 겉보기 세로 비율은 방의 종횡비에 딸린다.
 *        그래서 이 그림 하나가 "데스크톱 기준"이고, 모바일(좁고 낮은 방)에서는 구조물이 상대적으로
 *        더 낮게 보인다 — 그 편차는 좌표계의 성질이지 시드의 오류가 아니다.
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

  // ③ 방 전체 조립 — 기준 방 520×620 의 320% 방을 SHOW_W 폭으로 축소한 것
  const viewPx = Math.round(SHOW_W / (SEED_WORLD_WIDTH / 100)) // 이 그림에서 화면 1장 = 500px
  const roomH = Math.round((viewPx * ROOM_REF_H) / ROOM_REF_W)
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
  const geom = []
  for (const s of SEED_STRUCTURES) {
    const file = path.join(OUT_DIR, s.file)
    if (!existsSync(file)) continue
    const sw = Math.max(4, Math.round((viewPx * s.w) / 100))
    const buf = await sharp(file).resize({ width: sw, fit: 'inside' }).png().toBuffer()
    const meta = await sharp(buf).metadata()
    const topPx = Math.round((roomH * s.y) / 100 - meta.height / 2)
    layers.push({ input: buf, left: Math.round((SHOW_W * s.x) / 100 - meta.width / 2), top: topPx })
    geom.push({
      file: s.file,
      wPct: s.w,
      yPct: s.y,
      // 기준 방(520×620) 환산: 폭 = w% × 520, 세로 범위 = y% ± 절반높이
      pxW: Math.round((ROOM_REF_W * s.w) / 100),
      pxH: Math.round(((ROOM_REF_W * s.w) / 100 / meta.width) * meta.height),
      topPct: (s.y - ((((ROOM_REF_W * s.w) / 100 / meta.width) * meta.height) / ROOM_REF_H) * 50).toFixed(1),
      botPct: (s.y + ((((ROOM_REF_W * s.w) / 100 / meta.width) * meta.height) / ROOM_REF_H) * 50).toFixed(1),
    })
  }
  // 신위 접지 증명 — 실제 스탠딩 스프라이트를 계약 좌표(발끝 = DEITY_CONTACT_Y)에 세워본다.
  const deity = path.join(ROOT, 'public', 'shrine', 'deities', DEITY_PROOF, 'base.webp')
  if (existsSync(deity)) {
    const dh = Math.round((roomH * DEITY_HEIGHT_PCT) / 100)
    const buf = await sharp(deity).resize({ height: dh, fit: 'inside' }).png().toBuffer()
    const meta = await sharp(buf).metadata()
    layers.push({
      input: buf,
      left: Math.round(SHOW_W / 2 - meta.width / 2),
      top: Math.round((roomH * DEITY_CONTACT_Y) / 100) - meta.height,
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
  return { out, bytes: info.size, width: SHOW_W, height: totalH, rows: rows.length, geom }
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
  // ⚠️ 문간은 `--regen` 으로 다시 굽지 않는다 — 명시 타깃(`door`)일 때만. 헤더 「사용」 절 참조.
  if (existsSync(outPath) && only !== 'door') {
    console.log('skip', DOOR.file, '(이미 존재 — 재생성은 `door --regen` 으로 명시 호출)')
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
  if (check.geom.length) {
    console.log(`  기준 방 ${ROOM_REF_W}×${ROOM_REF_H}px 환산 겉보기(구조물 세로 범위 = 방 높이 %)`)
    for (const g of check.geom) {
      console.log(`    · ${g.file.padEnd(18)} w${g.wPct} y${g.yPct} → ${g.pxW}×${g.pxH}px  y ${g.topPct}%~${g.botPct}%`)
    }
    console.log(
      `    · 신위 접지 계약 y=${DEITY_CONTACT_Y}% (발끝) · 스탠드 높이 ${DEITY_HEIGHT_PCT}% → 머리 y=${(DEITY_CONTACT_Y - DEITY_HEIGHT_PCT).toFixed(1)}%` +
        ` → 배선: 신위 래퍼 bottom = ${(100 - DEITY_CONTACT_Y).toFixed(0)}%`
    )
  }
}

const edgefix = await makeEdgeFixImage(results)
if (edgefix) {
  console.log(
    `✔ room-mural-edgefix.webp ${(edgefix.bytes / 1024).toFixed(1)}KB — ${edgefix.width}×${edgefix.height}` +
      ` (2행 ${edgefix.zoom}배 확대: 위=페더링 전 · 아래=후, 크롭 중심 x=${edgefix.picks.join('·')})`
  )
}

console.log('\n── 하드 에지 페더링 (부록 C ①) ──')
for (const r of results) {
  if (!r.ok || !r.feather) continue
  const f = r.feather
  const t5 = (p) => p.top.map((o) => `x${o.x}=${o.v.toFixed(1)}`).join(' ')
  const dMean = ((f.after.mean - f.before.mean) / f.before.mean) * 100
  const dStd = ((f.after.stdev - f.before.stdev) / f.before.stdev) * 100
  const dPixMean = ((f.tonePost.mean - f.tonePre.mean) / f.tonePre.mean) * 100
  const dPixStd = ((f.tonePost.stdev - f.tonePre.stdev) / f.tonePre.stdev) * 100
  console.log(
    `  ${r.passEdge ? '✔' : '⚠️'} ${r.key} — 검출 ${f.edges.length}곳 / 페더 열 ${f.touched}/${f.width} (패스 ${f.passes})\n` +
      `      ① 상위 5 (무라 최종본)  전 ${t5(r.plainEdge)}\n` +
      `                              후 ${t5(r.muralEdge)}  → 최대 ${r.muralEdge.max.toFixed(1)} / 목표 ≤${EDGE_ACCEPT_MAX} ${r.passEdge ? 'PASS' : 'FAIL'}\n` +
      `      ② 중앙값 전 ${fmt(r.plainEdge.median)} → 후 ${fmt(r.muralEdge.median)}\n` +
      `      ④ 톤(열 휘도) 평균 ${f.before.mean.toFixed(2)} → ${f.after.mean.toFixed(2)} (${dMean >= 0 ? '+' : ''}${dMean.toFixed(2)}%) ${r.passTone ? 'OK' : '⚠️ 초과'}` +
      ` · 표준편차 ${f.before.stdev.toFixed(2)} → ${f.after.stdev.toFixed(2)} (${dStd >= 0 ? '+' : ''}${dStd.toFixed(2)}%)\n` +
      `        톤(픽셀 전체) 평균 ${f.tonePre.mean.toFixed(2)} → ${f.tonePost.mean.toFixed(2)} (${dPixMean >= 0 ? '+' : ''}${dPixMean.toFixed(2)}%)` +
      ` · 표준편차 ${f.tonePre.stdev.toFixed(2)} → ${f.tonePost.stdev.toFixed(2)} (${dPixStd >= 0 ? '+' : ''}${dPixStd.toFixed(2)}%)` +
      ` → 명암 대비 보존 ${Math.abs(dPixStd) <= EDGE_TONE_TOL * 100 ? 'OK' : '⚠️ 초과'}\n` +
      `      ⑤ 렌더 스케일 ${RENDER_SCALE} 축소 후 최대 열 차이 전 ${r.renderBefore.max.toFixed(1)} → 후 ${r.renderAfter.max.toFixed(1)}` +
      ` (CEO 화면에서 선으로 보이는 크기)\n` +
      `      · 반경 분포 ${
        f.edges.length
          ? Object.entries(
              f.edges.reduce((acc, e) => ({ ...acc, [e.radius]: (acc[e.radius] ?? 0) + 1 }), {})
            )
              .map(([rad, n]) => `r${rad}×${n}`)
              .join(' ')
          : '없음(절벽 미검출)'
      }`
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
      `      ③ 용량 ${(r.bytes / 1024).toFixed(1)}KB / 목표 ${(MURA_MAX_BYTES / 1024).toFixed(0)}KB ${r.withinBudget ? 'OK' : '⚠️ 초과'}\n` +
      // 미러 **축**(내부 3곳)만 대칭성 지표다. 랩(끝↔처음)은 무라를 반복할 때만 의미가 있고
      // 현 렌더는 단일 stretch 라 화면에 나타나지 않는다 — 그래서 따로 적는다.
      `      ③ 미러 축 대칭성 ${fmt(r.worstAxis)} (webp 후, 내부 ${r.preBoundary.length - 1}곳) → 목표 ≤1 ${r.worstAxis <= 1 ? 'OK' : '⚠️ 초과'}` +
      ` · 랩 경계 ${fmt(r.wrapPost)} (반복 렌더 미사용 → 화면 미노출)`
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
