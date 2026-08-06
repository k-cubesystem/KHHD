// 신당 안2.1 「큰 방 하나」 — 반가(班家) 실내 **가로 타일** 에셋 (PRD-shrine-gamefeel-v1 부록 A)
//
// CEO 검수에서 구역 3개(실내/실외 단절)가 반려됐다. 확정안은 **같은 벽지·마루가 끝까지 이어지는
// 큰 실내 방 하나** — 구역 경계 자체를 없애고 벽·바닥을 `repeat-x` 로 임의 폭까지 늘린다.
// 그래서 이 스크립트의 산출물은 "한 장짜리 배경판"이 아니라 **이음새 없는 1타일**이다.
//
// 산출: public/shrine/stage/banga/
//   room-wall-tile.webp   1024×640 불투명 — 반가 실내 벽 1타일 (기둥+창호 리듬, 좌우 반복 가능)
//   room-floor-tile.webp  1024×420 불투명 — 대청마루 1타일 (수평 널 — 소실점 없음)
// 검수(assets-src/shrine/ — public 에 QA 산출물을 남기지 않는다):
//   room-preview.webp                 — 2.4화면 폭 「큰 방 하나」 조립 목업 (CEO 판단용 1장)
//   room-wall-tile-seamcheck.webp     — [타일|타일] 2장 이어붙인 검사 이미지
//   room-wall-tile-seamzoom.webp      — 이음새 확대 비교 (위=후처리 전 / 아래=후처리 후)
//   room-floor-tile-seamcheck.webp    · room-floor-tile-seamzoom.webp
//
// 사용:
//   node scripts/shrine-assets/stage-banga-room.mjs                  # 누락분만 생성 (멱등)
//   node scripts/shrine-assets/stage-banga-room.mjs room-wall-tile   # 특정 키만
//   node scripts/shrine-assets/stage-banga-room.mjs all --regen      # 원본부터 재생성
//   node scripts/shrine-assets/stage-banga-room.mjs --reblend        # 원본 캐시로 후처리만 (API 호출 0)
//
// ── 이음새를 만드는 법 (이 파일의 핵심) ────────────────────────────────────────
// 생성 모델은 "seamless" 를 지시해도 좌우가 맞지 않는다. 그래서 **자체 후처리로 강제한다.**
//   ① 가로 조명 평탄화 — 이음새보다 먼저 눈에 띄는 건 **주기적 밝기 물결**이다. 실측한 마루 원본은
//      좌우 조명 편차가 3.3배(왼쪽에 촛불 웅덩이)였고, 그대로 깔면 타일마다 같은 자리에 스포트라이트가
//      반복된다. 열 평균 휘도를 저차 다항으로 적합해 **감마(지수) 보정**으로 눌러 편차를 1.0배로 만든다.
//      감마를 쓰는 이유는 0·255 가 고정점이라 아무리 세게 걸어도 하이라이트가 타지 않기 때문.
//   ② 팔레트 앵커 — 기존 wallpaper.webp / flooring.webp 의 채널 평균에 부분 정렬(70%, ±12% 클램프).
//      같은 방 안에서 기존 대청 톤과 갈리지 않게 하는 보험.
//   ③ 랩 크로스페이드 — 폭 (W+B) 로 만든 뒤 **오른쪽 꼬리 B 열을 왼쪽 머리 B 열에 녹여** 폭 W 로 줄인다.
//      결과의 첫 열 = 원본의 W번째 열, 마지막 열 = 원본의 (W-1)번째 열 → 원본에서 **서로 붙어 있던 두 열**이
//      타일 경계에서 만난다. 즉 경계 불연속이 "원본의 평범한 이웃 열 차이"로 내려앉는다.
//      B 는 후보 8종을 전부 조립해 **유령 비용**(겹침 구간의 두 원본 차이)이 가장 낮은 값을 자동 채택.
//   ④ 검증 — 경계 열 차이(seam)를 **내부 이웃 열 차이의 중앙값·p95** 와 비교한다.
//      절대값이 아니라 이 비(ratio)가 기준인 이유: 나뭇결이 거친 마루는 내부 차이 자체가 크고,
//      매끈한 한지 벽은 작다. "경계가 보통 자리보다 튀지 않는다"가 이음새 소거의 정의다.
//
// 원칙 (stage-banga.mjs · stage-banga-wide.mjs 와 동일 — 한 화면에서 만나므로 규율이 갈리면 안 된다)
//   - STYLE / LIGHT 문구는 **한 글자도 바꾸지 않고 복제**한다. 기존 wallpaper.webp 와 같은 붓·같은 빛.
//   - 접지 그림자를 굽지 않는다(런타임 담당).
//   - 이 두 장은 불투명 배경판이라 크로마키가 없다 — 초록 배경도 쓰지 않는다.
//   - API 예산 **총 6회**(재시도 포함). 전역 카운터가 강제한다.
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
if (!KEY) {
  console.error('✖ GEMINI 키 없음 — .env.local의 GEMINI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY 확인')
  process.exit(1)
}

const ROOT = path.resolve(import.meta.dirname, '../..')
const OUT_DIR = path.join(ROOT, 'public', 'shrine', 'stage', 'banga')
/** 검수 산출물 — 제품 번들(public)에 QA 이미지를 흘리지 않는다 */
const QA_DIR = path.join(ROOT, 'assets-src', 'shrine')
const RAW_DIR = process.env.STAGE_ROOM_RAW_DIR || path.join(process.env.TEMP || '/tmp', 'shrine-stage-banga-room-raw')

/** 재시도 포함 전역 상한. 초과 시 생성 대신 예외 — 조용한 과금 폭주를 막는다. */
const API_BUDGET = 6
let apiCalls = 0

const genAI = new GoogleGenerativeAI(KEY)
const model = genAI.getGenerativeModel({ model: MODEL })

// ────────────────────────────── 프롬프트 ──────────────────────────────
// STYLE·LIGHT 는 stage-banga.mjs 원문 그대로. 기존 wallpaper.webp 와 붓·빛이 갈리면
// 「큰 방 하나」가 아니라 "다른 방 두 개"가 된다.
const STYLE =
  'warm painterly watercolor illustration, soft K-anime aesthetic, visible gentle brush texture, ' +
  'muted sepia and dark-walnut palette with hanji ivory, candlelit warmth, ' +
  'calm and tidy composition rather than busy detail, refined key-art quality'
const LIGHT =
  'a single warm candlelight source from the UPPER LEFT, soft shadows falling toward the lower right, ' +
  'consistent light direction, no rim light from other directions'
/**
 * 타일 규율. LIGHT 와 충돌하는 것처럼 보이지만 층위가 다르다 —
 * 빛의 **방향**(몰딩 음영)은 좌상단 그대로 두되, 화면 전체의 **총 밝기**만 좌우 균일하게 요구한다.
 * 이 문구가 없으면 좌→우 밝기 낙차가 그대로 타일 주기의 줄무늬가 된다(후처리 ①로도 다 못 지운다).
 */
const TILE_RULE =
  'the overall brightness must be PERFECTLY EVEN from the left edge to the right edge — ' +
  'keep the upper-left modelling on the timber, but no vignette, no corner darkening, ' +
  'no side-to-side brightness falloff; the left edge and the right edge are equally bright, ' +
  'and the composition is an even repeating rhythm with no single dominant focal point'

/**
 * flatten: 가로 조명 평탄화 강도. **degree(적합 차수)가 곧 "무엇을 조명으로 볼 것인가" 다.**
 *   벽 degree 3 — 기둥/한지/창호의 명암 교대가 크다. 차수를 올리면 적합이 그 구조를 따라가
 *                 "일부러 밝은 창호"까지 눌러 그림이 밋밋해진다. 낮게 잡아 큰 낙차만 걷어낸다.
 *   마루 degree 5 — 가로 널만 있어 오인할 구조가 없다. 차수 2 로는 좌측 웅덩이가 1.6배 남았고,
 *                 5 로 올려 1.01배까지 평탄해졌다(실측). 마루는 세게 걸어도 잃을 게 없다.
 *
 * @type {Array<{key:string,file:string,w:number,h:number,ref:string,flatten:{degree:number,pMin:number,pMax:number},prompt:string}>}
 */
const ASSETS = [
  {
    key: 'room-wall-tile',
    file: 'room-wall-tile.webp',
    w: 1024,
    h: 640,
    // 팔레트 앵커 기준 — 현 대청 실내 벽. 이 톤에서 벗어나면 같은 방으로 안 읽힌다.
    ref: 'wallpaper.webp',
    flatten: { degree: 3, pMin: 0.78, pMax: 1.4 },
    prompt:
      'Interior wall of a Korean noble house (반가 班家) sarangbang study room, flat frontal elevation view, ' +
      'composed as ONE HORIZONTALLY REPEATING WALL SECTION of a long continuous wall. ' +
      'An even rhythm of dark walnut wooden posts standing at regular intervals with warm ivory hanji paper ' +
      'panels between them; a heavy continuous lintel beam runs straight across the top and a low dark wooden ' +
      'base rail runs straight across the bottom, both meeting the left and right edges at exactly the same height. ' +
      // 창호 없음(2026-08-06) — 벽 전체가 가족 선반장 자리가 되도록 창을 걷었다. 재생성 시 유지할 것.
      'Every bay is a plain warm ivory hanji paper panel — no window, no door, no opening anywhere on the wall. ' +
      'The LEFT EDGE and the RIGHT EDGE must both cut through the middle of a plain hanji panel of identical width ' +
      'and identical tone — no post, no window, no ornament touching either edge. ' +
      'The wall is COMPLETELY EMPTY — no furniture, no shelves, no scrolls, no objects, nothing hanging on it. ' +
      'No floor and no ceiling visible, only the wall plane filling the entire frame. ' +
      `${STYLE}, ${LIGHT}, ${TILE_RULE}, full-bleed background plate, no text, no watermark, no border`,
  },
  {
    key: 'room-floor-tile',
    file: 'room-floor-tile.webp',
    w: 1024,
    h: 420,
    ref: 'flooring.webp',
    flatten: { degree: 5, pMin: 0.45, pMax: 2.2 },
    prompt:
      'Dark polished daecheong-maru (대청마루) wooden floor of a Korean hanok, seen from slightly above at a low angle, ' +
      'composed as ONE HORIZONTALLY REPEATING FLOOR SECTION of a long continuous floor. ' +
      'The floorboards run STRICTLY LEFT TO RIGHT, parallel to the bottom edge: every board joint is a straight ' +
      'horizontal line spanning the full width of the frame. There is NO perspective convergence and NO vanishing ' +
      'point — no diagonal line anywhere, nothing narrows toward a point. ' +
      'Depth is expressed ONLY by the boards being thinner and dimmer near the TOP of the frame and wider and ' +
      'warmer near the BOTTOM. ' +
      'Deep walnut brown with a warm amber sheen, fine wood grain and worn patina, faint candlelight reflection on the polish. ' +
      'The LEFT EDGE and the RIGHT EDGE must both be plain continuous board wood of identical tone — ' +
      'no knot, no plank end, no feature touching either edge. ' +
      'The floor is COMPLETELY EMPTY — no furniture, no rugs, no cushions, no objects at all. ' +
      'No walls, no horizon line, no ceiling — only the floor plane filling the entire frame. ' +
      `${STYLE}, ${LIGHT}, ${TILE_RULE}, full-bleed background plate, no text, no watermark, no border`,
  },
]

// ───────────────────────── 후처리 ①: 가로 광량 평탄화 ─────────────────────────
/** 열 평균 휘도 프로파일 */
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

/**
 * 최소제곱 다항 적합 (x 를 [-1,1] 로 정규화해 조건수를 잡는다).
 * 이동평균 대신 저차 다항을 쓰는 이유: 벽 타일은 기둥/한지의 명암 교대가 커서 이동평균이
 * 그 구조까지 "조명"으로 오인한다. 저차 다항은 구조를 무시하고 **조명 포락선**만 잡는다.
 */
function polyFit(col, degree) {
  const w = col.length
  const n = degree + 1
  const A = Array.from({ length: n }, () => new Float64Array(n + 1))
  const xs = new Float64Array(w)
  for (let x = 0; x < w; x += 1) xs[x] = (2 * x) / (w - 1) - 1
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      let s = 0
      for (let x = 0; x < w; x += 1) s += xs[x] ** (r + c)
      A[r][c] = s
    }
    let s = 0
    for (let x = 0; x < w; x += 1) s += col[x] * xs[x] ** r
    A[r][n] = s
  }
  // 가우스 소거
  for (let i = 0; i < n; i += 1) {
    let piv = i
    for (let r = i + 1; r < n; r += 1) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r
    ;[A[i], A[piv]] = [A[piv], A[i]]
    if (Math.abs(A[i][i]) < 1e-9) continue
    for (let r = 0; r < n; r += 1) {
      if (r === i) continue
      const f = A[r][i] / A[i][i]
      for (let c = i; c <= n; c += 1) A[r][c] -= f * A[i][c]
    }
  }
  const coef = new Float64Array(n)
  for (let i = 0; i < n; i += 1) coef[i] = Math.abs(A[i][i]) < 1e-9 ? 0 : A[i][n] / A[i][i]
  const fit = new Float64Array(w)
  for (let x = 0; x < w; x += 1) {
    let v = 0
    for (let i = 0; i < n; i += 1) v += coef[i] * xs[x] ** i
    fit[x] = v
  }
  return fit
}

/** 조명 포락선의 최대/최소 비 = 타일을 반복했을 때 눈에 띄는 **주기적 밝기 물결**의 세기 */
function rippleOf(col, degree = 3) {
  const fit = polyFit(col, degree)
  let lo = Infinity
  let hi = -Infinity
  for (const v of fit) {
    if (v < lo) lo = v
    if (v > hi) hi = v
  }
  return lo > 1 ? hi / lo : Infinity
}

/**
 * 가로 조명 평탄화 — **감마(지수) 보정**으로 한다.
 *
 * 단순 곱셈 게인은 어두운 쪽을 1.9배로 끌어올릴 때 밝은 결이 255 에 눌어붙는다(하이라이트 소실).
 * 감마는 0 과 255 를 고정점으로 두므로 아무리 세게 걸어도 클리핑이 없다:
 *   v' = 255 · (v/255)^p,  p = ln(target/255) / ln(fit(x)/255)  → 열 평균이 정확히 target 으로 간다.
 *
 * 이게 「큰 방 하나」의 성패를 가른다 — 타일마다 같은 자리에 같은 밝기 웅덩이가 반복되면
 * 이음새를 아무리 지워도 "같은 그림이 계속 나온다"가 먼저 읽힌다.
 */
function flattenIllumination(data, w, h, ch, { degree, pMin, pMax, passes = 3 }) {
  const before = rippleOf(columnLuma(data, w, h, ch))
  // 감마를 열 평균에 맞춰도 **분포 전체의 평균**은 정확히 목표에 안 간다(Jensen 부등식).
  // 그래서 재적합-재보정을 반복해 수렴시킨다. 누적 지수를 [pMin,pMax] 안에 가두므로
  // 반복해도 허용 범위를 넘겨 과보정되지 않는다.
  const accum = new Float64Array(w).fill(1)

  for (let pass = 0; pass < passes; pass += 1) {
    const col = columnLuma(data, w, h, ch)
    const fit = polyFit(col, degree)
    let target = 0
    for (const v of col) target += v
    target /= w
    const lnT = Math.log(Math.min(254, Math.max(1, target)) / 255)
    let touched = false

    for (let x = 0; x < w; x += 1) {
      const f = Math.min(254, Math.max(1, fit[x])) / 255
      const want = lnT / Math.log(f)
      const next = Math.min(pMax, Math.max(pMin, accum[x] * want))
      const step = next / accum[x]
      accum[x] = next
      if (Math.abs(step - 1) < 2e-3) continue
      touched = true
      const lut = new Uint8Array(256)
      for (let v = 0; v < 256; v += 1) lut[v] = Math.round(255 * (v / 255) ** step)
      for (let y = 0; y < h; y += 1) {
        const i = (y * w + x) * ch
        data[i] = lut[data[i]]
        data[i + 1] = lut[data[i + 1]]
        data[i + 2] = lut[data[i + 2]]
      }
    }
    if (!touched) break
  }
  return {
    rippleBefore: before,
    rippleAfter: rippleOf(columnLuma(data, w, h, ch)),
    pLo: Math.min(...accum),
    pHi: Math.max(...accum),
  }
}

// ───────────────────────── 후처리 ②: 팔레트 앵커 ─────────────────────────
/**
 * 기존 대청 에셋(ref)의 채널 평균으로 **부분** 정렬. 완전 정렬(100%)은 원화의 의도를 지우므로
 * 70% 만 따라가고 ±12% 안에서만 움직인다. 전역 게인이라 이음새에는 영향이 없다.
 */
function anchorPalette(data, ch, refMean, srcMean, strength = 0.7, maxGain = 1.12) {
  const gains = [0, 1, 2].map((c) => {
    if (!(srcMean[c] > 1)) return 1
    const raw = refMean[c] / srcMean[c]
    const partial = 1 + (raw - 1) * strength
    return Math.min(maxGain, Math.max(1 / maxGain, partial))
  })
  if (gains.every((g) => g === 1)) return gains
  for (let i = 0; i < data.length; i += ch) {
    data[i] = Math.min(255, Math.round(data[i] * gains[0]))
    data[i + 1] = Math.min(255, Math.round(data[i + 1] * gains[1]))
    data[i + 2] = Math.min(255, Math.round(data[i + 2] * gains[2]))
  }
  return gains
}

// ───────────────────────── 후처리 ③: 랩 크로스페이드 ─────────────────────────
const smoothstep = (u) => u * u * (3 - 2 * u)

/**
 * 폭 srcW 이미지를 폭 (srcW - B) 로 줄이면서 **오른쪽 꼬리 B 열을 왼쪽 머리 B 열에 녹인다.**
 *
 *   out[x] = x < B ? lerp(src[x], src[x + outW], t(x)) : src[x],  t(0)=1 · t(B)=0 (smoothstep)
 *
 * 이때 out[0] = src[outW] · out[outW-1] = src[outW-1] 이라 **원본에서 인접했던 두 열**이
 * 타일 경계에서 만난다 → 경계 불연속이 원본의 평범한 이웃 차이 수준으로 내려앉는다.
 * (좌우를 단순히 평균내는 방식은 경계가 흐려질 뿐 값이 어긋난 채 남는다.)
 */
function wrapCrossfade(src, srcW, h, ch, B) {
  const outW = srcW - B
  const out = Buffer.alloc(outW * h * ch)
  for (let y = 0; y < h; y += 1) {
    const rowSrc = y * srcW
    const rowOut = y * outW
    for (let x = 0; x < outW; x += 1) {
      const si = (rowSrc + x) * ch
      const oi = (rowOut + x) * ch
      if (x >= B) {
        for (let c = 0; c < ch; c += 1) out[oi + c] = src[si + c]
        continue
      }
      const t = 1 - smoothstep(x / B)
      const ti = (rowSrc + x + outW) * ch
      for (let c = 0; c < ch; c += 1) out[oi + c] = Math.round(src[si + c] * (1 - t) + src[ti + c] * t)
    }
  }
  return out
}

/** 겹침 구간에서 두 원본이 얼마나 다른가 = 유령(ghost) 비용. 낮을수록 블렌드 자국이 안 보인다. */
function ghostCost(src, srcW, h, ch, B) {
  const outW = srcW - B
  let sum = 0
  let wsum = 0
  for (let x = 0; x < B; x += 1) {
    const t = 1 - smoothstep(x / B)
    const wgt = 4 * t * (1 - t) // 양쪽이 반씩 섞이는 지점에서 최대
    if (wgt <= 0) continue
    for (let y = 0; y < h; y += 1) {
      const si = (y * srcW + x) * ch
      const ti = (y * srcW + x + outW) * ch
      sum +=
        wgt * (Math.abs(src[si] - src[ti]) + Math.abs(src[si + 1] - src[ti + 1]) + Math.abs(src[si + 2] - src[ti + 2]))
      wsum += wgt * 3
    }
  }
  return wsum ? sum / wsum : 0
}

// ───────────────────────── 검증: 이음새 수치 ─────────────────────────
/**
 * 경계 열 차이를 **내부 이웃 열 차이 분포**와 견준다.
 *   seam   = |마지막 열 − 첫 열| 평균  (타일을 이어붙였을 때 실제로 만나는 두 열)
 *   median · p95 = 내부의 이웃 열 차이 분포
 * 절대 임계값을 쓰지 않는 이유는 파일 상단 주석 ④ 참조.
 */
function seamMetrics(data, w, h, ch) {
  const colDiff = (x1, x2) => {
    let s = 0
    for (let y = 0; y < h; y += 1) {
      const i = (y * w + x1) * ch
      const j = (y * w + x2) * ch
      s += Math.abs(data[i] - data[j]) + Math.abs(data[i + 1] - data[j + 1]) + Math.abs(data[i + 2] - data[j + 2])
    }
    return s / (h * 3)
  }
  const interior = []
  for (let x = 0; x < w - 1; x += 1) interior.push(colDiff(x, x + 1))
  interior.sort((p, q) => p - q)
  const at = (r) => interior[Math.min(interior.length - 1, Math.max(0, Math.round(r * (interior.length - 1))))]
  const seam = colDiff(w - 1, 0)
  const median = at(0.5)
  return {
    seam,
    median,
    p95: at(0.95),
    max: interior[interior.length - 1],
    ratio: median > 0.01 ? seam / median : seam,
  }
}

/** 합격: 경계가 "보통 이웃 열"보다 튀지 않는다. 평탄한 그림에서 0 나눗셈이 나지 않게 여유항을 둔다. */
function seamPass(m) {
  return m.seam <= Math.max(m.p95, m.median * 2 + 0.5)
}

const fmt = (v) => v.toFixed(2)

// ───────────────────────────── 생성 ─────────────────────────────
async function callModel(prompt) {
  if (apiCalls >= API_BUDGET) throw new Error(`API 예산(${API_BUDGET}회) 소진 — 생성 중단`)
  apiCalls += 1
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

async function rawToObj(buf, w, h) {
  return sharp(buf)
    .resize(w, h, { fit: 'cover', position: 'centre' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
}

/** 기존 대청 에셋의 채널 평균 (없으면 앵커 생략) */
async function refChannelMean(file) {
  const p = path.join(OUT_DIR, file)
  if (!existsSync(p)) return null
  const st = await sharp(p).removeAlpha().stats()
  return st.channels.slice(0, 3).map((c) => c.mean)
}

function channelMean(data, ch) {
  const sums = [0, 0, 0]
  const n = data.length / ch
  for (let i = 0; i < data.length; i += ch) {
    sums[0] += data[i]
    sums[1] += data[i + 1]
    sums[2] += data[i + 2]
  }
  return sums.map((s) => s / n)
}

/** 블렌드 폭 후보 — 넓을수록 이음새는 부드럽지만 유령이 넓게 퍼진다. 국소 최적을 자동 선택. */
const BLEND_WIDTHS = [96, 128, 160, 192, 224, 256, 288, 320]

async function buildTile(asset, { regen, reblend }) {
  const rawPng = path.join(RAW_DIR, `${asset.key}.png`)
  const outWebp = path.join(OUT_DIR, asset.file)

  if (regen || !existsSync(rawPng)) {
    if (reblend) throw new Error('--reblend 인데 원본 캐시가 없다: ' + rawPng)
    console.log(`  · 생성 (${MODEL}) — API ${apiCalls + 1}/${API_BUDGET}`)
    const buf = await callModel(asset.prompt)
    await mkdir(path.dirname(rawPng), { recursive: true })
    await writeFile(rawPng, buf)
  }
  await mkdir(OUT_DIR, { recursive: true })
  await mkdir(QA_DIR, { recursive: true })

  const rawBuf = await sharp(rawPng).toBuffer()
  const refMean = await refChannelMean(asset.ref)

  // ── 후처리 전(plain): 순진하게 리사이즈만 한 타일. "개선 전" 수치·검사 이미지의 기준선.
  const plain = await rawToObj(rawBuf, asset.w, asset.h)
  const plainMetrics = seamMetrics(plain.data, asset.w, asset.h, plain.info.channels)

  let best = null
  for (const B of BLEND_WIDTHS) {
    const srcW = asset.w + B
    const { data, info } = await rawToObj(rawBuf, srcW, asset.h)
    const ch = info.channels
    const trend = flattenIllumination(data, srcW, asset.h, ch, asset.flatten)
    const gains = refMean ? anchorPalette(data, ch, refMean, channelMean(data, ch)) : [1, 1, 1]
    const ghost = ghostCost(data, srcW, asset.h, ch, B)
    const blended = wrapCrossfade(data, srcW, asset.h, ch, B)
    const webp = await sharp(blended, { raw: { width: asset.w, height: asset.h, channels: ch } })
      .webp({ quality: 88 })
      .toBuffer()
    // 검증은 **인코딩된 최종본**을 다시 디코드해서 잰다 — webp 손실이 경계에 남기는 것까지 포함해야 정직하다.
    const dec = await sharp(webp).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const metrics = seamMetrics(dec.data, asset.w, asset.h, dec.info.channels)
    const pass = seamPass(metrics)
    console.log(
      `  · B=${B} seam=${fmt(metrics.seam)} (내부 중앙값 ${fmt(metrics.median)} · p95 ${fmt(metrics.p95)}) ` +
        `ratio=${fmt(metrics.ratio)} ghost=${fmt(ghost)} ${pass ? 'PASS' : 'retry'}`
    )
    const score = (pass ? 0 : 1000) + ghost + metrics.ratio
    if (!best || score < best.score)
      best = { B, webp, metrics, ghost, pass, score, trend, gains, blendedRaw: blended, ch }
  }

  await writeFile(outWebp, best.webp)
  await writeSeamCheck(asset, best, plain)
  return {
    key: asset.key,
    ok: true,
    outWebp,
    bytes: best.webp.length,
    B: best.B,
    metrics: best.metrics,
    plainMetrics,
    ghost: best.ghost,
    pass: best.pass,
    trend: best.trend,
    gains: best.gains,
  }
}

// ──────────────────────── 검사 이미지 ────────────────────────
const DARK = { r: 0x1a, g: 0x13, b: 0x08, alpha: 1 }

/** [타일|타일] 전폭 + 경계 확대 비교(위=후처리 전 / 아래=후처리 후) */
async function writeSeamCheck(asset, best, plain) {
  const { w, h } = asset
  const tile = sharp(best.blendedRaw, { raw: { width: w, height: h, channels: best.ch } })
  const tilePng = await tile.png().toBuffer()

  // ① 2장 이어붙이기 — 육안 검사의 본체. 경계는 정확히 x = w.
  const check = path.join(QA_DIR, `${asset.key}-seamcheck.webp`)
  await sharp({ create: { width: w * 2, height: h, channels: 3, background: DARK } })
    .composite([
      { input: tilePng, left: 0, top: 0 },
      { input: tilePng, left: w, top: 0 },
    ])
    .webp({ quality: 90 })
    .toFile(check)

  // ② 경계 확대 비교 — 같은 자리를 후처리 전/후로 겹쳐 본다.
  const plainPng = await sharp(plain.data, { raw: { width: w, height: h, channels: plain.info.channels } })
    .png()
    .toBuffer()
  const CW = 384
  const CH = Math.min(h, 384)
  const cropTop = Math.round((h - CH) / 2)
  const cut = async (png) => {
    const doubled = await sharp({ create: { width: w * 2, height: h, channels: 3, background: DARK } })
      .composite([
        { input: png, left: 0, top: 0 },
        { input: png, left: w, top: 0 },
      ])
      .png()
      .toBuffer()
    return sharp(doubled)
      .extract({ left: w - CW / 2, top: cropTop, width: CW, height: CH })
      .resize(CW * 2, CH * 2, { kernel: 'nearest' })
      .png()
      .toBuffer()
  }
  const beforeCrop = await cut(plainPng)
  const afterCrop = await cut(tilePng)
  const GAP = 14
  const zoom = path.join(QA_DIR, `${asset.key}-seamzoom.webp`)
  await sharp({ create: { width: CW * 2, height: CH * 4 + GAP, channels: 3, background: DARK } })
    .composite([
      { input: beforeCrop, left: 0, top: 0 },
      { input: afterCrop, left: 0, top: CH * 2 + GAP },
    ])
    .webp({ quality: 92 })
    .toFile(zoom)

  return { check, zoom }
}

// ──────────────────────── 「큰 방 하나」 조립 목업 ────────────────────────
/**
 * CEO 가 이 한 장으로 판단한다. 시드(20260729_shrine_banga_one_room.sql)와 같은 세계 폭(240)으로,
 * 타일을 **비율 유지 repeat-x** 로 깔아 벽·마루가 끝까지 이어지는지 본다.
 *
 * ⚠️ 제단·소품은 **겉보기 크기 보존** 배율로 얹는다.
 *    시드는 최상위 stage.structures 를 그대로 승계하므로 w=62 가 "전폭(=2.4화면)의 62%" 로 재해석돼
 *    제단이 1.5화면짜리가 된다. 그건 배선 단계에서 고칠 좌표 문제(w × 100/240)이지 스타일 문제가 아니라서,
 *    스타일 판단을 흐리지 않도록 여기서는 지금 화면과 같은 겉보기 크기로 그린다.
 */
async function makeRoomPreview() {
  const VIEW_W = 640
  const H = 800
  const WORLD = 240
  const W = Math.round((VIEW_W * WORLD) / 100) // 1536 = 2.4화면
  const wall = path.join(OUT_DIR, 'room-wall-tile.webp')
  const floor = path.join(OUT_DIR, 'room-floor-tile.webp')
  if (!existsSync(wall) || !existsSync(floor)) return null

  const layers = []
  const repeats = {}

  // 벽·바닥 — StageLayers 규약(벽 top 0 h62% · 바닥 bottom 0 h40%)에 repeat-x 를 얹은 형태.
  for (const [file, bandH, top, name] of [
    [wall, Math.round(H * 0.62), 0, 'wall'],
    [floor, Math.round(H * 0.4), H - Math.round(H * 0.4), 'floor'],
  ]) {
    const meta = await sharp(file).metadata()
    const tileW = Math.round((bandH * meta.width) / meta.height) // 비율 유지 = CSS `background-size: auto 100%`
    const buf = await sharp(file).resize(tileW, bandH, { fit: 'fill' }).toBuffer()
    const n = Math.ceil(W / tileW)
    repeats[name] = { tileW, bandH, count: Math.round((W / tileW) * 100) / 100 }
    for (let i = 0; i < n; i += 1) layers.push({ input: buf, left: i * tileW, top })
  }

  // 겉보기 크기 보존 배율: 구조물 w 는 "1화면 기준 %" 였다 → 전폭 기준으로는 × VIEW_W
  const altar = path.join(OUT_DIR, 'altar.webp')
  if (existsSync(altar)) {
    const aw = Math.round(VIEW_W * 0.62)
    const buf = await sharp(altar).resize({ width: aw, fit: 'inside' }).toBuffer()
    const meta = await sharp(buf).metadata()
    layers.push({
      input: buf,
      left: Math.round(W * 0.5 - meta.width / 2),
      top: Math.round(H * 0.47 - meta.height / 2),
    })
  }
  // 제단 위 앵커(촛대·향로) + 방 좌우로 흩어놓은 소품 — "전폭이 다 꾸밀 수 있는 한 방"임을 보인다.
  const candle = path.join(OUT_DIR, 'prop-candle.webp')
  const incense = path.join(OUT_DIR, 'prop-incense.webp')
  for (const [file, cx, size, groundY] of [
    [candle, 0.5 - (0.16 * VIEW_W) / W, 0.15 * VIEW_W, 0.46],
    [incense, 0.5 + (0.16 * VIEW_W) / W, 0.15 * VIEW_W, 0.46],
    [candle, 0.16, 0.1 * VIEW_W, 0.8],
    [incense, 0.84, 0.1 * VIEW_W, 0.8],
  ]) {
    if (!existsSync(file)) continue
    const s = Math.round(size)
    const buf = await sharp(file)
      .resize(s, s, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer()
    layers.push({ input: buf, left: Math.round(W * cx - s / 2), top: Math.round(H * groundY) - s })
  }

  const out = path.join(QA_DIR, 'room-preview.webp')
  const info = await sharp({ create: { width: W, height: H, channels: 4, background: DARK } })
    .composite(layers)
    .webp({ quality: 86 })
    .toFile(out)
  return { out, bytes: info.size, repeats, W, H }
}

// ──────────────────────────── main ────────────────────────────
const args = process.argv.slice(2)
const regen = args.includes('--regen')
const reblend = args.includes('--reblend')
const only = args.find((a) => !a.startsWith('--'))
const targets = only && only !== 'all' ? ASSETS.filter((a) => a.key === only) : ASSETS
if (!targets.length) {
  console.error('unknown asset key:', only, '— 가능:', ASSETS.map((a) => a.key).join(', '))
  process.exit(1)
}

console.log(`모델: ${MODEL}\n원본 캐시: ${RAW_DIR}\n산출: ${OUT_DIR}\n검수: ${QA_DIR}\n`)
const results = []
for (const asset of targets) {
  const outWebp = path.join(OUT_DIR, asset.file)
  if (!regen && !reblend && existsSync(outWebp)) {
    console.log('skip', asset.file, '(이미 존재)')
    continue
  }
  console.log(`── ${asset.key} (${asset.w}×${asset.h}) ──`)
  try {
    const r = await buildTile(asset, { regen, reblend })
    console.log(`  ✔ ${asset.file} ${(r.bytes / 1024).toFixed(1)}KB (B=${r.B})`)
    results.push(r)
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

const pv = await makeRoomPreview()
if (pv) {
  console.log(
    `\n✔ room-preview.webp ${(pv.bytes / 1024).toFixed(1)}KB — ${pv.W}×${pv.H} (2.4화면), ` +
      `벽 ${pv.repeats.wall.count}회 반복(타일 ${pv.repeats.wall.tileW}px) · 바닥 ${pv.repeats.floor.count}회(${pv.repeats.floor.tileW}px)`
  )
}

console.log('\n── 이음새 요약 ──')
for (const r of results) {
  if (!r.ok) {
    console.log(`  ✖ ${r.key}: ${r.error}`)
    continue
  }
  console.log(
    `  ${r.pass ? '✔' : '⚠️'} ${r.key} ${(r.bytes / 1024).toFixed(1)}KB  블렌드폭 ${r.B}px\n` +
      `      후처리 전 seam=${fmt(r.plainMetrics.seam)} (내부중앙값 ${fmt(r.plainMetrics.median)}) ratio=${fmt(r.plainMetrics.ratio)}\n` +
      `      후처리 후 seam=${fmt(r.metrics.seam)} (내부중앙값 ${fmt(r.metrics.median)} · p95 ${fmt(r.metrics.p95)}) ratio=${fmt(r.metrics.ratio)}` +
      `${r.pass ? ' — 경계가 내부 이웃 열 분포 안' : ' — ⚠️ 임계 초과(최선값 채택)'}\n` +
      `      주기 밝기물결 ${fmt(r.trend.rippleBefore)}배 → ${fmt(r.trend.rippleAfter)}배 (감마 ${r.trend.pLo.toFixed(2)}~${r.trend.pHi.toFixed(2)})\n` +
      `      유령비용 ${fmt(r.ghost)} · 팔레트게인 ${r.gains.map((g) => g.toFixed(3)).join('/')}`
  )
}
console.log(`\nAPI 호출 ${apiCalls}/${API_BUDGET}회`)
process.exit(results.some((r) => !r.ok) ? 1 : 0)
