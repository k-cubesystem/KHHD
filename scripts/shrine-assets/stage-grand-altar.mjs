// 신당 「웅장한 틀」 — 테마별 닫집 제단(grand altar) 한 장 굽기
//
// ── 왜 굽는가 (CEO 지시, 2026-08-10) ─────────────────────────────────────────
// "신당을 여기 디자인했을 때처럼 각각 멋있는 틀을 만들어주고, 액자 있는 부분에 신위를 배치해줘.
//  마루바닥 사이즈를 좀 줄여주고. 틀 즉 제단을 더 크고 웅장하게, 그 제단 상 위에 아이템들을
//  많이 배치할 수 있게."
// 지금 무대의 제단은 **두 장**이다 — 단상(platform, 세로 4.6%)과 상판(altar-top, 세로 5.7%).
// 둘을 합쳐도 방 높이의 10% 남짓이라 «가구 두 점»이지 «제단»으로 읽히지 않는다. 그래서 한 장으로
// 합치고 세로를 **58%** 로 키운다. 커지는 몫은 전부 위로 간다 — 닫집과 감실(액자)이 그 자리다.
//
// ── 레퍼런스: 구 원화의 제단 구역 ────────────────────────────────────────────
// public/shrine/themes/daljip/room.webp 의 왼쪽 1/3 이 정확히 그 양식이다(육안 실측):
//   ① 겹층 닫집  — 기와 얹은 작은 처마가 두 겹, 그 밑으로 초각(草刻) 아래턱이 드리운다
//   ② 감실(龕)   — 두 개의 굵은 기둥과 조각 윗틀이 만드는 «액자». 안쪽이 바깥보다 어둡다.
//   ③ 제단장     — 서랍·머름 조각이 있는 낮은 장. 그 앞에 **긴 상판**이 한 단 낮게 나온다.
//   ④ 접지       — 앞치마와 짧고 굵은 다리가 바닥까지 내려온다. 떠 있는 부분이 없다.
// 옮길 것은 «층의 위계»와 «액자»다. 기물(촛대·제기)은 굽지 않는다 — 그건 사용자가 올린다.
//
// ── 좌표 계약 (기하 v4.1 · 2026-08-10 밤) ────────────────────────────────────
// CEO 5차: "틀 사이즈를 더 크게 웅장하게 만들어주고 마루를 좀 줄여도 될 것 같아."
// 밴드가 벽 75 / 바닥 27(마루선 y73)이 되고 틀은 **w50 → w60**, 상자 높이 55.6 → **70**이 된다.
//
// 진짜 하드라인은 «상자»가 아니라 **두 생명선**이다:
//     감실 바닥(신위 발)  = 방 y45.3      · 제물 밑변(상판 앞턱) = 방 y60.98
// 시드(x50 · y38.5 · w60)가 고정이면 이 둘이 스프라이트 안 비율을 전부 정한다:
//     겉보기 세로 hPct = 50.32 · AR       ·  방 y ↔ 파일 비율 f: y = 38.5 + hPct·(f − 0.5)
//     (f₂ − f₁) · AR = 15.68 / 50.32 = 0.3117   ← 이 곱은 **세로 리패드로 못 바꾼다**
// 그래서 상자 높이는 «정하는» 값이 아니라 **재고 나서 적는** 값이다: hPct = 15.68 / (f₂ − f₁).
// r5 세 장이 (f₂−f₁) 0.221~0.225 로 나와 상자 70(y3.5~73.5)이 됐고, 접지가 마루선에 앉는다.
//
// 산출:
//   assets-src/shrine/grand-altar/{code}/base.webp   ← 키잉·리패드까지 끝난 **중간 산출**
//   assets-src/shrine/grand-altar/{code}/r{N}.png    ← 원본 캐시(라운드 격리 — 지우지 않는다)
//   assets-src/shrine/grand-altar/{code}/qa-r{N}.webp  ← 계약선 확인판(먼저 눈으로)
//
// ⚠️ 이 스크립트는 **public/ 에 쓰지 않는다**(2026-08-10 확산 회차에 바뀐 규약).
//    라이브에 나가는 파일은 접지 수복까지 끝난 `grand-altar-v2.webp` 한 장뿐이고, 그것을 굽는 것은
//    `stage-grand-altar-ground.mjs` 다. 중간 산출을 public 에 두면 «어느 장이 정본인가»가 흐려지고
//    (시범 3테마의 grand-altar.webp 가 지금 그 상태다 — 원복 레버로만 남긴다), 확산 13테마에서는
//    시드가 아직 안 나간 파일이 public 에 쌓인다.
//
// 사용:
//   node scripts/shrine-assets/stage-grand-altar.mjs --plan            # 프롬프트만 (API 0회)
//   node scripts/shrine-assets/stage-grand-altar.mjs banga             # 1라운드 (API 1회)
//   node scripts/shrine-assets/stage-grand-altar.mjs all --round 2     # 2라운드 전 테마
//   node scripts/shrine-assets/stage-grand-altar.mjs banga --rekey --round 1   # 키잉만 (API 0회)
//
// 규율 (stage-banga-altar.mjs · stage-theme-harmony.mjs 승계)
//   - STYLE / CHROMA 는 원문 복제. 붓이 갈리면 «다른 그림에서 오려붙인 제단»이 된다.
//   - 접지 그림자를 굽지 않는다(런타임 담당). 캔버스 = 내용물(레터박스 0).
//   - 프롬프트는 관찰 가능한 사실만. 메타 지시(CRITICAL/must NOT)를 넣으면 캐릭터 시트가 온다.
//   - warm despill 은 **자산별 opt-in**. 반가는 단청 녹색이 정상 색이라 절대 걸지 않는다.
import { config } from 'dotenv'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { warmDespill, measureWarmSpill } from './despill.mjs'

// ⚠️ .env.local 은 **메인 체크아웃만** 로드한다(워크트리에는 폐기된 구키가 잔존하고 dotenv 는
//    먼저 설정된 값을 덮지 않는다). 이 스크립트는 .env 내용을 읽어 출력하지 않는다.
config({ path: 'D:/anti/haehwadang/.env.local' })

const MODEL = process.env.SHRINE_IMAGE_MODEL || 'gemini-3.1-flash-image'
const KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const PUB = path.join(ROOT, 'public')
const PILOT_ROOT = path.join(ROOT, 'assets-src', 'shrine', 'harmony-pilot')
const SRC_ROOT = path.join(ROOT, 'assets-src', 'shrine', 'grand-altar')
/** 기하 v4.1 검수 세트 — 합성판·대비판·구본 백업이 여기 모인다(원본·확인판은 SRC_ROOT 그대로) */
const V41_ROOT = path.join(ROOT, 'assets-src', 'shrine', 'grand-altar-v41')

const API_BUDGET = Number(process.env.GRAND_ALTAR_BUDGET || 12)
let apiCalls = 0

// ════════════════════ 계약 — 정본에서 읽되 «죽지는» 않는다 ════════════════════
// 오퍼스 I 가 lib/·components/ 를 동시에 고치고 있다. 정본이 바뀌는 중일 수 있으므로 못 읽으면
// 계약 기본값으로 내려앉고 **로그에 남긴다**(조용히 다른 방을 그리는 것이 최악이다).
function pluckNum(rel, re, fallback) {
  try {
    const m = readFileSync(path.join(ROOT, rel), 'utf8').match(re)
    if (m) return Number(m[1])
  } catch {
    /* 정본 부재 — 아래 fallback */
  }
  console.log(`  · 정본 추출 실패(${rel}) → 계약 기본값 ${fallback} 사용`)
  return fallback
}
const ROOM_W = pluckNum('components/shrine/scene/ShrineRoomClient.tsx', /max-w-\[(\d+)px\]/, 520)
const ROOM_H = pluckNum('components/shrine/scene/ShrineRoomClient.tsx', /height:\s*'min\(\d+vh,\s*(\d+)px\)'/, 620)
const ROOM_VH = pluckNum('components/shrine/scene/ShrineRoomClient.tsx', /height:\s*'min\((\d+)vh,\s*\d+px\)'/, 72)

/**
 * ★ 기하 v4.1 (2026-08-10 밤 · CEO "틀 사이즈를 더 크게 웅장하게, 마루를 좀 줄여도 될 것 같아") ★
 *
 * 기하 JSON 이 **단일 출처**다. 이 스크립트가 숫자를 따로 들면 시드와 스프라이트가 조용히 갈린다
 * (v4 에서 anchorsX 확정안과 anchorsAlt 채택안이 한 파일에 같이 살던 자리가 바로 그 함정이었다).
 * 못 읽으면 죽는다 — 계약 없이 구운 스프라이트는 «다른 방의 제단»이고, 그건 조용한 사고다.
 */
const GEO = JSON.parse(readFileSync(path.join(ROOT, 'lib', 'domain', 'shrine', 'theme-stage-geometry.json'), 'utf8'))
const GRAND = GEO.grandAltar.structures[0]
/** 밴드 — 벽 75 / 바닥 27(겹침 2%p) → 마루선 y73. 합성판의 벽·바닥 슬라이스가 이 값으로 깔린다. */
const BANDS = GEO.bands
const FLOOR_LINE_Y = 100 - BANDS.floor

/** 하드라인 — 이 둘이 세로 배율을 정한다 */
const SURFACE_Y = 53.5
/**
 * 접지 — v4 y68 → **y73.5**. 마루선(73) 바로 그 줄이다.
 *
 * ⚠️ 이 값은 «정하는» 값이 아니라 **재고 나서 적는** 값이다. 시드가 고정이고 두 생명선
 * (감실 바닥 45.3 · 제물 밑변 60.98)을 지키면 상자 높이는 자유도가 없다:
 *     hPct = 15.68 / (f₂ − f₁)        ← 그림 안 두 랜드마크 사이가 전체의 몇 할인가
 * 설계 착수 시 어림한 y6~71(높이 65)은 (f₂−f₁)=0.241 을 가정한 값인데, r5 세 장이 실제로
 * 0.221~0.225 로 나왔다(닫집이 세 겹이 되며 전체가 길어진 몫). 그래서 상자는 **높이 70**이 되고
 * 접지가 마루선에 딱 내려앉는다 — v4(접지 68 · 마루선 70)가 벽 속에 2%p 박혀 있던 것보다 옳다.
 */
const GROUND_Y = 73.5
/**
 * 설계 목표(구울 때의 의도) — 실제 값은 재서 보고한다.
 *
 * 상자 **x50 · w60 · y3.5~73.5**(높이 70 · 중심 38.5) 기준 파일 안 비율:
 *   · 상판 접지선(방 y53.5) = (53.5 − 3.5) / 70 = **71.4%**
 *   · 감실 바닥(방 y45.3)   = (45.3 − 3.5) / 70 = **59.7%**
 *   · AR = (70/100 · 620) / (60/100 · 520) = **1.391**
 * 세로 70 은 v4(55.6)보다 26% 크고 폭 60 은 50 보다 20% 크다 — 그것이 「더 웅장」의 수치다.
 */
const DESIGN = {
  /** 상판 접지선이 파일 세로 몇 % 지점인가 */
  surfaceFrac: 0.714,
  /** 감실 윗턱 · 감실 바닥(신위 발끝) */
  nicheTopFrac: 0.31,
  nicheFloorFrac: 0.597,
  /** 파일 세로/가로 */
  ar: 1.391,
}
/** 기기 시뮬 — 겉보기 세로는 방 AR 에 딸려 오므로 «가장 좁은 방»도 같이 보고한다 */
const _DEVICES = [
  { name: 'ref 520x620', w: ROOM_W, h: null },
  { name: '360x800', w: 352, h: 800 },
  { name: '390x844', w: 382, h: 844 },
  { name: '430x932', w: 422, h: 932 },
]
const _deviceRoom = (d) => ({
  name: d.name,
  vw: Math.min(ROOM_W, d.w),
  vh: d.h === null ? ROOM_H : Math.min((ROOM_VH / 100) * d.h, ROOM_H),
})

// ══════════════════════════════ 프롬프트 ══════════════════════════════
/**
 * 화풍 — stage-banga.mjs → … → stage-theme-harmony.mjs 원문. **붓은 한 글자도 바꾸지 않는다.**
 *
 * ⚠️ 확산 회차(2026-08-10)에 한 곳만 갈라진다: 가운데의 **팔레트 절**이다. 원문은 «sepia and
 * dark-walnut … hanji ivory» 인데, 시범 셋이 모두 따뜻한 목재였기 때문에 그 말이 재질과 싸우지
 * 않았을 뿐이다. 무쇠·먹빛·주칠·옻칠에 같은 절을 붙이면 **재질 문장이 팔레트에 먹혀** 열세 장이
 * 다 갈색으로 나온다 — 그러면 「재질이 테마를 입는다」가 통째로 실패한다.
 * (전례: 씬 파노라마의 공통 척추에서 「warmth」·「the paper panels」를 테마가 갈아 끼운 것과 같은 처방.
 *  PLAN-stage-harmony-v1 추기 2 ⑥ — 「용궁에 한지 금지」)
 * 갈리는 것은 **색 이름뿐**이고 붓질·구성·격 어휘(watercolor / brush texture / calm and tidy /
 * key-art quality)는 전 테마 동일하다. palette 를 안 적은 테마는 원문 그대로 떨어진다.
 */
const PALETTE_DEFAULT = 'muted sepia and dark-walnut palette with hanji ivory, candlelit warmth'
const STYLE = (t) =>
  'warm painterly watercolor illustration, soft K-anime aesthetic, visible gentle brush texture, ' +
  `${t.palette ?? PALETTE_DEFAULT}, ` +
  'calm and tidy composition rather than busy detail, refined key-art quality'
/** stage-banga-altar.mjs 원문 그대로 */
const CHROMA =
  'the subject is fully isolated on a solid pure chroma green background (#00FF00) that fills the entire frame edge to edge, ' +
  'no ground plane, no floor, no table, no cast shadow on the background, no vignette, ' +
  'no text, no letters, no watermark, no border, no frame'
/**
 * 빛 — 뮤럴(harmonyLight)과 같은 «위에서 내려 곧장 떨어지는» 빛이다. 렌더의 drop-shadow 가
 * dy 만 갖기 때문이기도 하고(옆에서 오면 스티커로 읽힌다), 이 빛이라야 **상판 윗면이 밝고
 * 앞치마가 어두워** 상면 앞턱이 그림 안에서 읽힌다(아래 findSurfaceEdge 가 그 하강을 잰다).
 */
const LIGHT =
  'The light comes softly from above and settles downward, so the flat top board catches it and the apron ' +
  'below the board falls into shadow; what shadows there are fall straight down, short and soft'

/** 층의 위계 — 세 테마가 공유하는 «형태». 재질만 테마가 갈아 끼운다. */
const FORM = (t) =>
  'A Korean shrine altar built as one single standing piece, seen straight on from the front, its three parts ' +
  'stacked one above the other and each part wider or narrower than the one above it.\n' +
  // ⚠️ r5 처방 ①「더 웅장」(CEO 5차) — 겹처마를 **한 층 더**(2겹 → 3겹). 층수는 사진처럼 셀 수 있는
  //    관찰 사실이라 «웅장하게»류의 형용사보다 훨씬 잘 먹힌다. 세로 예산(맨 위 1/10)은 그대로 두고
  //    «얕게 겹친다»로 못박는다 — 안 그러면 닫집이 감실 몫을 먹어 액자가 눕는다(r3 재발).
  `At the very top a carved canopy (닫집) spreads out wider than everything below it: three shallow tiled eaves ` +
  `stacked one close above the other, each one reaching further out to the left and to the right than the one ` +
  `above it, their ends lifting, a row of carved brackets under each eave, and a pierced carved ` +
  `apron hanging down from the front edge of the lowest eave. ${t.canopy}\n` +
  'Under the canopy an alcove stands open toward the viewer, framed like a picture by two heavy corner posts ' +
  'and one slender carved head-rail across the top. The inside of the alcove is a plain recess with a flat back panel, ' +
  'and it is darker than every surface around it, so the frame reads bright against it. The alcove is empty: ' +
  `nothing stands in it, nothing hangs in it, and its floor is a plain flat board. ${t.niche}\n` +
  'The alcove sits on a deep chest that carries two rows of drawer faces one above the other, with carved ' +
  'panels between them. ' +
  `${t.body}\n` +
  // ⚠️ r5 처방 ②「좌우로 시원하게」 — 상판이 장(欌)보다 **양옆으로 더 나간다**. 제단 앵커 x 가
  //    이 폭에서 파생되므로(상판 실측 폭 → 2열 5점), 상판이 넓어지는 만큼 제물 자리가 넓어진다.
  'In front of that cabinet, one step lower, a long flat top board runs the whole width of the piece and is ' +
  'the widest surface of the whole thing, its two ends reaching out past the sides of the cabinet above it, ' +
  'deep from front to back, with a moulded lip along its front edge. ' +
  'The board is completely bare: nothing is placed on it, no candle, no bowl, no cup, no incense, no cloth, ' +
  'no vessel of any kind.\n' +
  // ⚠️ r5 처방 ③「더 육중한 하단」 — 다리를 굵게, 그리고 바닥에 낮은 지대석 한 줄. 발이 가늘면
  //    위가 커진 만큼 물건이 «위태로워» 보인다(무게는 아래에서 읽힌다).
  'Below the board a carved apron rail runs across, and short thick square legs, as heavy as the corner posts ' +
  'above them, carry the piece down to a low plain plinth that runs along the ground under them.\n' +
  // ⚠️ r2 처방 — r1 은 형태는 맞았는데 **비례가 계약을 못 지켰다**(실측: 감실이 세로의 0.32밖에
  //    안 되고 상판이 0.85 까지 내려앉아, 상판면 y53.5·접지 y68 로 역산하면 꼭대기가 화면 위로
  //    28% 나갔다). 서술을 늘리지 않고 **네 경계를 위에서부터 한 문장으로 못박는다** — 이 네 숫자가
  //    곧 스프라이트가 지켜야 할 계약이다(감실 0.10~0.61 · 상판면 0.75 · 접지 1.00).
  'Measured from the top of the canopy down to the ground: the canopy with its three eaves and their rows of ' +
  'brackets ends one tenth of the way down; the alcove opening runs from there all the way down to six ' +
  'tenths of the way down, where its plain floor board lies, so the opening is half the height of the whole ' +
  // ⚠️ r3 처방(사실 1개) — r2 는 비례를 거의 맞췄는데 **감실이 가로로 누웠다**(실측 400×320: 폭이
  //    세로보다 크다). 신위 스프라이트는 세로로 긴 물건이라 누운 액자에는 들어앉지 못한다.
  //    「반보다 크다」 같은 비율 어휘는 r2 에서 이미 절반만 먹혔으므로, 모델이 한 그림 안에서
  //    바로 견줄 수 있는 **자기 자신과의 비교**로 바꾼다.
  'piece; the alcove opening is taller than it is wide, standing upright like a doorway; ' +
  // ⚠️ r4 처방 — r1~r3 전수 실측에서 **감실 바닥과 상판 앞턱 사이가 계약보다 짧았다**(반가 r1
  //    12.8% vs 필요 15.7%). 그 사이를 메우는 것은 «장(欌)의 깊이»뿐이고, 패딩으로는 못 고친다
  //    (캔버스 패딩은 두 랜드마크를 **함께 옮길** 뿐 사이를 벌리지 못한다 — 실험으로 확인).
  //    그래서 서랍장 구간을 한 칸에서 **두 칸(6/10~8/10)**으로 늘려 그 거리를 형태로 만든다.
  'the deep chest of two drawer rows runs from there down to eight tenths of the way down; the flat top board ' +
  'and its front lip fill from eight tenths down to nine tenths; and the apron and the short legs fill the last ' +
  'tenth down to the ground. ' +
  'Seen from the front at a slight high angle, about 18 degrees above eye level, so the flat top board reads ' +
  'as a usable surface with visible depth while the alcove behind it still reads as an upright opening. ' +
  // ⚠️ r5 처방 ④ 전체 비례를 «셀 수 있는 사실»로 못박는다. v4 는 이 문장이 없어 AR 이 1.37~1.48 로
  //    흩어졌고(계약 1.383), 그 흩어짐이 곧 상단·접지 오차였다. v4.1 계약 AR 은 1.292 = 13:10 이다.
  'Measured across the widest part of the canopy and down from the top of the canopy to the ground, the whole ' +
  'piece stands about thirteen parts tall for every ten parts of its width. ' +
  'Perfectly symmetrical, broad upright composition, the whole piece fully inside the frame with a small even ' +
  'margin on all sides, and the bottom of the legs is the ground contact line at the bottom centre of the frame.'

/** 참조 주입 — 순서가 프롬프트의 first/second/third 와 맞물린다 */
const REFS =
  'The first attached picture is the wall of the room this piece will stand in; its timber, its colours and ' +
  'its light are the timber, the colours and the light of this piece. The second attached picture shows three ' +
  'pieces of furniture from that same room, painted with the brush that paints this one. The third attached ' +
  'picture shows an altar of this kind standing in a room — a tiered canopy above a framed alcove above a ' +
  'cabinet with a long table in front of it; that stacking is the shape of this piece, and its colours come ' +
  'from the first attached picture.'

/**
 * 라운드별 **육안 실측** 랜드마크(캔버스 비율). 자동 검출은 이 물건에서 세 번 헛짚었다
 * (서랍 띠 · 상판 밑 그림자 한 줄 · 감실은 «위만» 어둡다) — 그래서 사람이 자 눈금판(qa-r{N}.webp)을
 * 읽어 여기 적는 값이 정본이다. **라운드마다 다시 잰다** — 다른 그림이니 당연히 다른 값이다.
 * (라운드 키가 없으면 자동 검출로 떨어지고 리패드는 걸리지 않는다 — 첫 굽기의 정상 상태다.)
 */
function eyeOf(t, round) {
  return t.eye?.[round] ?? null
}

/**
 * 테마 표. 재질이 테마를 입는다 — 형태(FORM)는 셋이 공유하고, 여기 세 문장만 갈린다.
 * @type {Array<{code:string,name:string,mural:number,adopted:number,eye?:Record<number,{floor:number,top:number}>,canopy:string,niche:string,body:string,despill?:'warm'}>}
 */
const THEMES = [
  {
    code: 'banga',
    name: '반가 대청',
    // 승인 뮤럴 라운드 — 참조로 붙일 벽(같은 붓·같은 빛)의 출처
    mural: 2,
    // 채택 라운드 — r5(기하 v4.1 「더 웅장」). r4 는 v4 계약의 채택분이라 표에 남긴다.
    adopted: 5,
    eye: {
      4: { floor: 0.629, top: 0.315 },
      // r5(기하 v4.1) — 자 눈금판 0.5%% 눈금에서 육안. board 는 자동 검출과 일치해 그대로 둔다.
      5: { floor: 0.64, top: 0.335, board: 0.8626 },
    },
    // 옻칠 호두나무 + 단청 띠. ⚠️ 단청의 녹색은 **정상 색**이라 warm despill 을 걸지 않는다.
    canopy:
      'The canopy is dark walnut lacquered to a soft deep sheen, and one narrow painted band runs along the ' +
      'edge of each eave, its pattern picked out in dulled green and faded vermilion with a thin line of old ' +
      'gold between them, worn and quiet rather than bright.',
    niche:
      'The posts and the head-rail of the alcove are the same dark walnut, and small pale scrolling flowers of ' +
      'mother-of-pearl are inlaid into them, catching the light in fine points.',
    body:
      'The cabinet is dark walnut with black-lacquer panels, each panel carrying a small mother-of-pearl inlay ' +
      'of a scrolling vine, and small brass corner fittings and brass drop handles sit at the panel edges.',
  },
  {
    code: 'daljip',
    name: '달집 마당',
    mural: 3,
    adopted: 5,
    eye: {
      4: { floor: 0.649, top: 0.315 },
      5: { floor: 0.635, top: 0.315, board: 0.8418 },
    },
    despill: 'warm',
    canopy:
      'The canopy is built of pine gone pale grey-brown with age, the facets of the adze still on every member, ' +
      'and thick straw rope twisted into knots is bound around the head of each post and along the eave ends.',
    niche:
      'The posts of the alcove are heavy squared pine, bleached where the moonlight falls along them and dark ' +
      'earth-brown in the shade, and a plaited straw band runs across the head-rail.',
    body:
      'The cabinet is plain pine boarding with wide simple panels and hand-cut pegs showing at the joints, its ' +
      'surface dry and matt, with dark iron strap fittings at the corners.',
  },
  {
    code: 'seolbit',
    name: '설빛 서고',
    mural: 3,
    adopted: 5,
    eye: {
      4: { floor: 0.603, top: 0.282 },
      // ⚠️ 흰 목재라 자동 상판 검출이 **뒷턱**(75.2%)을 앞턱으로 잡았다 — 앞턱은 육안 81.5%.
      5: { floor: 0.59, top: 0.305, board: 0.815 },
    },
    despill: 'warm',
    canopy:
      'The canopy is cut from pale white wood left unpainted, its fine open grain showing along every member, ' +
      'and a fine frost sits on the upper edge of each eave so the carved outlines read as thin cold lines.',
    niche:
      'The posts and the head-rail of the alcove are the same pale white wood, and slender silver mounts with ' +
      'small silver nail-heads are set along their edges.',
    body:
      'The cabinet is pale white wood with plain recessed panels, a thin silver line runs along every moulding, ' +
      'and the drawer faces carry small round silver pulls.',
  },

  // ══════════════ 확산 13테마 (2026-08-10 · 오퍼스 P) ══════════════
  //
  // 형태(FORM)·빛(LIGHT)·크로마는 시범 3종과 **한 글자도 다르지 않다** — 갈리는 것은 아래 세 문장,
  // 즉 «재질»뿐이다. 그것이 「재질이 테마를 입는다」의 전부이고, 붓이 갈리지 않는 유일한 길이다.
  //
  // despill('warm')은 **초록이 정상 색이 아닌 테마에만** 건다. 당산(이끼)·샘굿(물때 이끼)·
  // 용궁(청동 녹·나전 청록)·도깨비(단청 녹)는 초록을 그림이 실제로 쓰므로 절대 걸지 않는다
  // (feedback: 일괄 적용이 청죽을 파괴했다 — 2026-08-10).
  {
    code: 'choga',
    name: '초가 신당',
    mural: 2,
    adopted: 1,
    despill: 'warm',
    canopy:
      'The canopy is roofed with layered rice straw instead of tiles, each eave a thick combed bundle of dry ' +
      'straw with its cut ends showing in a even fringe along the edge, and the rafters carrying it are old ' +
      'sun-greyed pine, split and checked along the grain.',
    niche:
      'The posts of the alcove are round pine logs with the adze facets still on them, pale grey where the ' +
      'weather has worn them and honey-brown in the shade, and twisted hemp cord is lashed around each joint.',
    body:
      'The cabinet is plain unpainted pine boarding, its wide panels dry and matt with knots showing through, ' +
      'the drawer faces carry small turned wooden pegs instead of metal pulls, and a band of plaited straw rope ' +
      'runs along its base.',
  },
  {
    code: 'yonggung',
    name: '용궁',
    palette: 'muted black-lacquer and deep teal palette with pearl sheen, lamplit warmth',
    mural: 1,
    adopted: 1,
    canopy:
      'The canopy is black-lacquered ebony polished to a wet gleam, each eave edged with a band of ' +
      'mother-of-pearl cut into rolling wave crests, and small branching pieces of pale coral rise from the ' +
      'lifted end of every eave.',
    niche:
      'The posts and the head-rail of the alcove are the same black lacquer, inlaid with broad mother-of-pearl ' +
      'scrolls that turn green and blue as the light moves, and the bronze fittings at their corners have gone ' +
      'soft green with age.',
    body:
      'The cabinet is black lacquer with panels of pearl shell laid in wave patterns, and heavy bronze mounts, ' +
      'green with verdigris, sit at every corner and around each drawer pull.',
  },
  {
    code: 'dokkaebi',
    name: '도깨비 불',
    palette: 'muted black-lacquer and deep vermilion palette with old iron grey, lamplit warmth',
    mural: 1,
    adopted: 2,
    // ⚠️ r1 처방 — 형태·재질은 좋았는데 **층의 순서가 뒤집혔다**: 상판이 장(欌) «위»에 얹히고
    //    서랍 두 줄이 그 아래로 갔다. 그러면 감실 바닥~상판 사이가 그림에서 12.9% 밖에 안 돼
    //    (계약 요구 24%) 접지 도구가 그 구간을 **2.01배** 늘려야 한다 — 열여섯 장 중 혼자만
    //    늘어난 서랍이 보인다. 순서를 «셀 수 있는 사실»로 다시 못박는다(FORM 의 비율 문장과
    //    같은 어법). 재생성만이 답인 종류다 — 리패드는 사이 거리를 못 바꾼다.
    fix:
      'The deep chest of two drawer rows stands directly under the alcove and directly above the long top ' +
      'board, so the chest is the middle of the three and fills a quarter of the whole height. The long top ' +
      'board is lower than the chest and one step in front of it, and under the board there is nothing but the ' +
      'apron rail and the short legs.',
    canopy:
      'The canopy is black lacquer, a band of dancheong pattern in vermilion and white runs along the edge of ' +
      'each eave, and at the centre of the lowest eave a carved goblin face with round eyes and bared teeth ' +
      'looks straight out.',
    niche:
      'The posts of the alcove are black lacquered timber studded with rows of round iron nail heads, and a ' +
      'smaller goblin mask is carved into each corner post where it meets the head-rail.',
    body:
      'The cabinet is black lacquer with deep vermilion panels, iron straps run across every drawer face and ' +
      'are fixed with large hammered iron studs, and heavy iron ring pulls hang from them.',
  },
  {
    code: 'hongsal',
    name: '홍살문 안뜰',
    palette: 'muted vermilion and dark-timber palette with old gold, candlelit warmth',
    mural: 2,
    adopted: 1,
    despill: 'warm',
    canopy:
      'The canopy is painted deep vermilion all over, and a band of dancheong in green, white and gold runs ' +
      'along the edge of each eave, the paint dry and a little chalky where it has weathered.',
    niche:
      'Between the lowest eave and the head-rail of the alcove stands a row of slender round vermilion staves, ' +
      'upright and evenly spaced like the palisade of a red gate, and the two corner posts are the same ' +
      'vermilion with a thin gold line along their edges.',
    body:
      'The cabinet is vermilion lacquer with narrow dancheong bands along every moulding, the drawer faces are ' +
      'a darker red-brown, and small gilt bronze pulls sit at their centres.',
  },
  {
    code: 'byeolbat',
    name: '별밭 천문각',
    palette: 'muted ink-blue and dark-timber palette with tarnished silver, candlelit warmth',
    mural: 2,
    adopted: 1,
    despill: 'warm',
    canopy:
      'The canopy is ink-dark timber with a faint blue cast, and fine silver wire is inlaid along the edge of ' +
      'each eave in small stars joined by thin straight lines, like a chart of constellations.',
    niche:
      'The posts and the head-rail of the alcove are the same ink-dark wood rubbed smooth, scattered silver ' +
      'star points are set into their faces, and a slender silver band runs across the top.',
    body:
      'The cabinet is ink-dark wood with plain deep indigo panels, each panel carrying one small ' +
      'silver-inlaid constellation, and the drawer pulls are little flat silver discs.',
  },
  {
    code: 'dangsan',
    name: '당산나무 그늘',
    palette: 'muted bark-brown and moss-green palette with straw ivory, candlelit warmth',
    mural: 1,
    adopted: 1,
    canopy:
      'The canopy is built of rough unsquared logs that still carry their bark at the cut ends, the eaves are ' +
      'covered with split shingles gone grey, and a thick twisted straw rope hung with folded white paper is ' +
      'bound along the front edge of the lowest eave.',
    niche:
      'The posts of the alcove are two whole tree trunks with the bark left on them, green moss growing in the ' +
      'hollows of that bark, and the head-rail is a single curved branch laid across their tops.',
    body:
      'The cabinet is thick unplaned slabs with dark grain and wide gaps between the boards, moss and pale ' +
      'lichen creep along its lower edges, and straw rope is knotted around each corner.',
  },
  {
    code: 'yeondeung',
    name: '연등 골짜기',
    palette: 'muted vermilion and dark-timber palette with worn gold leaf, candlelit warmth',
    mural: 1,
    adopted: 1,
    despill: 'warm',
    canopy:
      'The canopy is vermilion lacquer, a row of open lotus petals is carved along the edge of each eave, and ' +
      'the tip of every petal is touched with gold leaf that has worn thin in places.',
    niche:
      'The posts and the head-rail of the alcove are vermilion, a gilded lotus blossom is carved at the top of ' +
      'each post, and a thin gold line follows every moulding.',
    body:
      'The cabinet is vermilion lacquer with panels of carved lotus flowers and leaves standing proud of the ' +
      'ground, the carving gilded, and round gilt bronze pulls sit at the centre of each drawer face.',
  },
  {
    code: 'seonang',
    name: '서낭 고갯길',
    palette: 'muted weathered-grey and ochre palette with five-colour cloth accents, candlelit warmth',
    mural: 1,
    adopted: 1,
    despill: 'warm',
    canopy:
      'The canopy is weathered timber gone silver-grey, its surface split and fibrous from years of wind, and ' +
      'strips of cloth in red, blue, yellow, white and black are tied along the front edge of the lowest eave ' +
      'and hang down.',
    niche:
      'The posts of the alcove are rough weathered beams with more cloth strips knotted around their heads, ' +
      'and the head-rail is a plain grey plank with no carving on it.',
    body:
      'The cabinet is weathered grey board banded with dark iron straps, and the whole piece stands on a low ' +
      'base of round river stones stacked and fitted tight without mortar.',
  },
  {
    code: 'jangdok',
    name: '장독대 새벽',
    palette: 'muted pale-wood and onggi red-brown palette with glazed sheen, candlelit warmth',
    mural: 2,
    adopted: 1,
    despill: 'warm',
    canopy:
      'The canopy is pale seasoned wood, and each eave is roofed with small dark earthenware tiles whose glaze ' +
      'is uneven and glossy, the red-brown of a well-fired crock.',
    niche:
      'The posts and the head-rail of the alcove are plain pale wood, and the lower part of each post is ' +
      'sheathed in glazed earthenware of that same deep red-brown, its surface rippled where the glaze ran ' +
      'down and pooled.',
    body:
      'The cabinet is pale wood with panels of dark glazed earthenware set into the frames, each panel catching ' +
      'one soft wet-looking highlight, and the drawer pulls are small unglazed clay knobs.',
  },
  {
    code: 'daejanggan',
    name: '무쇠 대장간',
    palette: 'muted charcoal and iron-grey palette with ember orange, candlelit warmth',
    mural: 1,
    adopted: 2,
    despill: 'warm',
    // ⚠️ r1 처방 — 비례는 좋았는데 **재질이 목재로 읽혔다**(무쇠 장식을 두른 나무 제단). 공통 화풍의
    //    「dark-walnut」 계보와 벽 참조가 둘 다 나무 쪽으로 당긴다 — 팔레트 교체만으로는 부족했다.
    //    설명을 늘리지 않고 «없는 것»을 관찰 사실로 한 문장 넣는다(FORM 의 「The alcove is empty」 어법).
    fix:
      'Every part of this piece is iron and there is no wood anywhere on it: the eaves, the posts, the chest ' +
      'and the top board are all sheets of dark iron, each sheet covered in small overlapping hammer dents ' +
      'with rows of round rivets along its edges, and the whole surface is the cold grey of an anvil.',
    canopy:
      'The canopy is built of black iron plate instead of wood, each eave a hammered sheet whose whole surface ' +
      'is covered in overlapping hammer dents, and a line of round rivet heads runs along every edge.',
    niche:
      'The posts of the alcove are square iron pillars, their corners rounded by hammering, charcoal dark with ' +
      'a faint blue temper sheen, heavy rivets marching down each edge, and the head-rail is one forged bar.',
    body:
      'The cabinet is iron plate riveted panel to panel, the drawer faces are flat hammered sheets with forged ' +
      'iron ring pulls, and the metal is soot-black with lighter grey where the hammer has struck it.',
  },
  {
    code: 'jonggak',
    name: '새벽 종각',
    palette: 'muted dark-timber and green-bronze palette with cold morning silver, candlelit warmth',
    mural: 1,
    adopted: 1,
    despill: 'warm',
    canopy:
      'The canopy is heavy dark timber, and along the edge of each eave runs a cast bronze band raised with the ' +
      'lotus medallions and flying figures of a great temple bell, the bronze dull and softly greened.',
    niche:
      'The posts of the alcove are thick round pillars of dark wood as broad as a bell frame, each ringed near ' +
      'the top with a bronze collar, and the head-rail carries a row of small raised bronze bosses.',
    body:
      'The cabinet is dark heavy timber with a bronze plate set into the centre of each panel, every plate cast ' +
      'with a lotus medallion, and the drawer pulls are thick bronze rings.',
  },
  {
    code: 'saemgut',
    name: '옹달샘 굿터',
    palette: 'muted wet-stone grey and moss-green palette with hanji ivory, candlelit warmth',
    mural: 1,
    adopted: 1,
    canopy:
      'The canopy is timber darkened and swollen with damp, each eave roofed with flat grey slabs of stone, and ' +
      'fine green moss furs the wood where the eaves meet.',
    niche:
      'The posts of the alcove are damp grey stone pillars with pale water stains running down them in ' +
      'streaks, and the head-rail is a single wet-looking beam with moss along its underside.',
    body:
      'The cabinet is dark damp wood set into a frame of rounded river stones, moss fills the joints between ' +
      'those stones, and the drawer faces are plain boards with a wet sheen on them.',
  },
  {
    code: 'naru',
    name: '안개 나루터',
    palette: 'muted tarred-black and driftwood grey palette with brass gold, candlelit warmth',
    mural: 2,
    adopted: 1,
    despill: 'warm',
    canopy:
      'The canopy is built of thick boat planking, the wood painted black with tar that has cracked into a fine ' +
      'net, its seams packed with pale caulking, and the eave ends cut square like the stem of a boat.',
    niche:
      'The posts of the alcove are heavy tarred timbers with rope whipped tightly around them in even turns, ' +
      'and a thick hemp rope is coiled along the head-rail.',
    body:
      'The cabinet is planked like a hull with visible seams and square wooden pegs, brass rings hang from the ' +
      'drawer faces as pulls, and a brass cleat is fixed at each corner.',
  },
]

const themePrompt = (t) => `${FORM(t)}\n${t.fix ? `${t.fix}\n` : ''}${REFS}\n${STYLE(t)}. ${LIGHT}. ${CHROMA}`

// ═══════════════════ 참조 이미지 준비 (API 0회) ═══════════════════
const pilotDir = (code) => path.join(PILOT_ROOT, `${code}-v3`)
const srcDir = (code) => path.join(SRC_ROOT, code)
const rawPath = (code, round) => path.join(srcDir(code), `r${round}.png`)
const qaPath = (code, round) => path.join(srcDir(code), `qa-r${round}.webp`)
/** 중간 산출 — 접지 수복(stage-grand-altar-ground.mjs)의 **입력**이다. public/ 에 두지 않는다. */
const outPath = (code) => path.join(srcDir(code), 'base.webp')

/** 참조로 붙일 벽 조각 — 승인 뮤럴의 **가운데 한 화면**(제단이 설 자리)을 1280px 로 줄인 것 */
async function wallPatch(t) {
  const src = path.join(pilotDir(t.code), `r${t.mural}`, 'wall.webp')
  if (!existsSync(src)) throw new Error(`승인 뮤럴 없음: ${src}`)
  const out = path.join(srcDir(t.code), 'ref-wall.webp')
  const meta = await sharp(src).metadata()
  const w = Math.round(meta.width / 3.2)
  const buf = await sharp(src)
    .extract({ left: Math.round((meta.width - w) / 2), top: 0, width: w, height: meta.height })
    .resize({ width: 1280, kernel: 'lanczos3' })
    .webp({ quality: 88 })
    .toBuffer()
  await mkdir(path.dirname(out), { recursive: true })
  await writeFile(out, buf)
  return out
}

/**
 * 양식 참조 — 구 원화(달집)의 제단 구역. 세 테마가 같은 한 장을 본다. 이 한 장에만 «닫집 + 감실 +
 * 제단장» 삼단이 실제로 그려져 있기 때문이고(설빛 원화에는 닫집이 없다), 색은 첫 장이 잡는다.
 */
const FORM_REF_CROP = { left: 0.16, top: 0.03, width: 0.36, height: 0.9 }
async function formRef() {
  const src = path.join(PUB, 'shrine', 'themes', 'daljip', 'room.webp')
  if (!existsSync(src)) throw new Error(`양식 참조 원화 없음: ${src}`)
  const out = path.join(SRC_ROOT, 'ref-form.webp')
  if (existsSync(out)) return out
  const m = await sharp(src).metadata()
  const buf = await sharp(src)
    .extract({
      left: Math.round(m.width * FORM_REF_CROP.left),
      top: Math.round(m.height * FORM_REF_CROP.top),
      width: Math.round(m.width * FORM_REF_CROP.width),
      height: Math.round(m.height * FORM_REF_CROP.height),
    })
    .resize({ width: 720, kernel: 'lanczos3' })
    .webp({ quality: 92 })
    .toBuffer()
  await mkdir(path.dirname(out), { recursive: true })
  await writeFile(out, buf)
  return out
}

async function refsFor(t) {
  const card = path.join(pilotDir(t.code), 'style-card.webp')
  const refs = [await wallPatch(t)]
  if (existsSync(card)) refs.push(card)
  refs.push(await formRef())
  return refs
}

// ═══════════════════════════ 생성 (REST) ═══════════════════════════
const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' }
async function refParts(paths) {
  const parts = []
  for (const p of paths) {
    const mimeType = MIME[path.extname(p).toLowerCase()]
    if (!existsSync(p) || !mimeType) continue
    parts.push({ inlineData: { mimeType, data: (await readFile(p)).toString('base64') } })
  }
  return parts
}

/**
 * 종횡비 지정 생성 — SDK(@google/generative-ai 0.24.1)에 `generationConfig.imageConfig` 가 없어
 * REST 로 직접 친다(stage-theme-harmony.mjs 와 같은 이유·같은 파싱 규약).
 * 3:4 = 세로/가로 1.333. 목표 1.383 에 가장 가까운 허용값이고, 남는 오차는 트림 뒤 **재서** 시드로 갚는다.
 */
const ASPECT = '3:4'
const IMAGE_SIZE = '2K'
async function callModel(prompt, refPaths) {
  if (!KEY) throw new Error('GEMINI 키 없음 — 메인 체크아웃 .env.local 의 GOOGLE_GENERATIVE_AI_API_KEY 확인')
  if (apiCalls >= API_BUDGET) throw new Error(`API 예산(${API_BUDGET}회) 소진 — 생성 중단`)
  apiCalls += 1
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }, ...(await refParts(refPaths))] }],
      generationConfig: { imageConfig: { aspectRatio: ASPECT, imageSize: IMAGE_SIZE } },
    }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${text.slice(0, 300)}`)
  const img = JSON.parse(text)?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData
  if (!img) throw new Error('이미지 파트 없음 — 응답: ' + text.slice(0, 300))
  return Buffer.from(img.data, 'base64')
}

const isAuthError = (e) => /401|403|API_KEY_INVALID|API key not valid|PERMISSION_DENIED|UNAUTHENTICATED/i.test(String(e?.message || e))

// ═════════════ 크로마키 (stage-banga-altar.mjs 규약 복제) ═════════════
const KEY_PROFILES = [
  { hi: 62, lo: 22, spill: 3, shrink: 0.14, feather: 1 },
  { hi: 50, lo: 16, spill: 1, shrink: 0.22, feather: 1 },
  { hi: 40, lo: 10, spill: 0, shrink: 0.3, feather: 2 },
]
const VOID_RGB = [0x1a, 0x13, 0x08]
const GREEN_HARD = 20
const GREEN_EDGE = 12
const FRINGE_MAX = 0.004
const EDGE_FRINGE_MAX = 0.03
/** warm despill 은 이 비율을 넘을 때만 건다 — 잔량 0.3% 이하는 재인코딩 드리프트라 손대면 손해다 */
const WARM_SPILL_MIN = 0.005

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

// ═══════════════ 계약 계측 — 상판면·감실을 «재서» 보고한다 ═══════════════
/**
 * 상판 탐색 창(스프라이트 세로 비율).
 * ⚠️ r1 에서 «최대 휘도 하강» 하나로 잡았더니 설빛은 **감실 바닥 선반의 앞턱**을 상판으로 오인했다
 *    (그 자리도 밝은 면 아래 어두운 면이라 하강이 크다). 그래서 순서를 바꾼다:
 *    ① 폭이 가장 크게 «벌어지는» 행 = 상판 뒷턱(상판은 이 물건에서 가장 넓은 면이다)
 *    ② 그 아래 짧은 구간에서 최대 휘도 하강 = 상판 앞턱
 *    ③ 접지 계약선 = 두 턱의 가운데(상판 깊이 50% — stage-banga-altar.mjs 의 CONTACT_DEPTH_FRAC 승계)
 *    폭은 «무엇이 상판인가»를 형태로 답하므로 조명·재질이 바뀌어도 흔들리지 않는다.
 */
const SURFACE_SCAN = [0.6, 0.95]
/** 뒷턱에서 앞턱까지 볼 구간(세로 비율) — 상판 깊이의 상한 */
const BOARD_DEPTH_MAX = 0.14
/** 감실 바닥 탐색 창 — 어두운 감실이 끝나고 밝은 장 앞면이 시작되는 자리 */
const NICHE_SCAN = [0.12, 0.78]

function rowStats(data, w, h, ch) {
  const luma = new Float64Array(h)
  const opaque = new Int32Array(h)
  /** 가운데 절반만 본다 — 감실은 가운데에 있고, 바깥 기둥은 언제나 어둡다 */
  const x0 = Math.round(w * 0.25)
  const x1 = Math.round(w * 0.75)
  const coreLuma = new Float64Array(h)
  const coreN = new Int32Array(h)
  const core = []
  for (let y = 0; y < h; y += 1) {
    let s = 0
    let n = 0
    let cs = 0
    let cn = 0
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * ch
      if (data[i + 3] < 200) continue
      const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
      s += l
      n += 1
      if (x >= x0 && x < x1) {
        cs += l
        cn += 1
        core.push(l)
      }
    }
    opaque[y] = n
    coreN[y] = cn
    luma[y] = n ? s / n : 0
    coreLuma[y] = cn ? cs / cn : 0
  }
  /**
   * 행별 «어두운 픽셀 몫». 감실 안은 **넓게** 어둡고 그 아래 장 앞면은 밝다 — 평균 휘도보다
   * 이 몫이 두 영역을 훨씬 깨끗하게 가른다(평균은 기둥·그림자 한 줄에 끌려다닌다).
   */
  core.sort((a, b) => a - b)
  const darkThr = core.length ? core[Math.floor(core.length * 0.25)] : 0
  const darkFrac = new Float64Array(h)
  for (let y = 0; y < h; y += 1) {
    if (!coreN[y]) continue
    let d = 0
    for (let x = x0; x < x1; x += 1) {
      const i = (y * w + x) * ch
      if (data[i + 3] < 200) continue
      if (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2] <= darkThr) d += 1
    }
    darkFrac[y] = d / coreN[y]
  }
  return { luma, coreLuma, opaque, darkFrac }
}

/** 창 안에서 «행 평균 휘도의 최대 하강»을 찾는다 — 위에서 오는 빛이 만든 상판/앞치마 경계 */
function maxDrop(series, opaque, h, from, to) {
  let bestY = Math.round((from + to) / 2)
  let best = -Infinity
  for (let y = from; y < to; y += 1) {
    if (!opaque[y] || !opaque[y + 1]) continue
    const d = series[y] - series[y + 1]
    if (d > best) {
      best = d
      bestY = y
    }
  }
  return { y: bestY, drop: best }
}
/**
 * 감실(龕) 안팎을 «밝기 문턱»으로 가른다.
 * ⚠️ 종전엔 «최대 휘도 상승»으로 감실 바닥을 잡았는데, 달집에서 그 자리가 **서랍 띠**였다
 *    (서랍면이 감실 바닥보다 더 세게 밝아진다). 감실은 «가장 어두운 덩어리»라는 사실이 더 세므로
 *    그것을 먼저 찾고 그 덩어리의 위·아래 경계를 문턱으로 되짚는다.
 * 반환: {top, floor} = 감실 윗턱(윗틀 밑면)·감실 바닥(신위 발이 닿는 면) 행 번호.
 */
/**
 * 감실 = «가운데가 넓게 어두운 구간». 문턱은 그 구간의 최고치에서 상대적으로 잡는다
 * (절대 밝기는 테마마다 다르다 — 반가는 짙은 호두나무, 설빛은 흰 목재라 같은 숫자를 못 쓴다).
 * ⚠️ 이전 두 시도(최대 휘도 상승 / 최저 휘도 행)는 각각 **서랍 띠**와 **상판 밑 그림자 한 줄**을
 *    감실로 잡았다. 「한 줄이 아니라 덩어리」라는 사실을 신호 자체에 넣은 것이 이번 판이다.
 */
const NICHE_THRESH = 0.5
function findNiche(darkFrac, opaque, from, to) {
  let peak = 0
  for (let y = from; y <= to; y += 1) if (opaque[y] && darkFrac[y] > peak) peak = darkFrac[y]
  const thr = peak * NICHE_THRESH
  let bestLen = -1
  let best = { top: from, floor: to }
  let runStart = -1
  for (let y = from; y <= to; y += 1) {
    const inside = opaque[y] && darkFrac[y] >= thr
    if (inside && runStart < 0) runStart = y
    if ((!inside || y === to) && runStart >= 0) {
      const end = inside ? y : y - 1
      if (end - runStart > bestLen) {
        bestLen = end - runStart
        best = { top: runStart, floor: end }
      }
      runStart = -1
    }
  }
  return { ...best, thr, peak, len: bestLen }
}

function measureContract(data, w, h, ch) {
  const { luma, opaque, darkFrac } = rowStats(data, w, h, ch)
  let y0 = 0
  let y1 = h - 1
  while (y0 < h && opaque[y0] < w * 0.03) y0 += 1
  while (y1 > y0 && opaque[y1] < w * 0.03) y1 -= 1
  const span = Math.max(1, y1 - y0)
  const at = (f) => Math.max(0, Math.min(h - 1, y0 + Math.round(span * f)))

  const widthAt = (y) => {
    let n = 0
    for (let x = 0; x < w; x += 1) if (data[(y * w + x) * ch + 3] >= 200) n += 1
    return n
  }
  const wid = new Int32Array(h)
  for (let y = 0; y < h; y += 1) wid[y] = widthAt(y)

  // ① 상판 뒷턱 = 폭이 가장 크게 벌어지는 행 (「상판은 가장 넓은 면」의 형태적 정의)
  let backY = at(SURFACE_SCAN[0])
  let backJump = -Infinity
  for (let y = at(SURFACE_SCAN[0]); y < at(SURFACE_SCAN[1]); y += 1) {
    const jump = wid[y + 1] - wid[y]
    if (jump > backJump) {
      backJump = jump
      backY = y + 1
    }
  }
  // ② 앞턱 = 뒷턱 아래 상판 깊이 안에서의 최대 휘도 하강
  const front = maxDrop(luma, opaque, h, backY, Math.min(h - 1, backY + Math.round(span * BOARD_DEPTH_MAX)))
  // ③ 계약선 = 상판 깊이의 가운데
  const contactY = (backY + front.y) / 2
  const niche = findNiche(darkFrac, opaque, at(NICHE_SCAN[0]), Math.min(backY - 2, at(NICHE_SCAN[1])))

  return {
    contentTop: y0,
    contentBottom: y1,
    span,
    surfaceFrac: (contactY - y0) / span,
    boardBackFrac: (backY - y0) / span,
    boardFrontFrac: (front.y - y0) / span,
    surfaceDrop: front.drop,
    nicheTopFrac: (niche.top - y0) / span,
    nicheFloorFrac: (niche.floor - y0) / span,
    boardW: wid[Math.min(h - 1, backY + 2)],
    nicheW: wid[at(0.35)],
    canopyW: wid[at(0.03)],
    maxW: w,
  }
}

/** 계약 → 시드. 하드라인(상판면·접지)에서 세로 배율과 폭을 역산한다. */
function seedFrom(arHw, surfaceFrac) {
  const hPct = (GROUND_Y - SURFACE_Y) / (1 - surfaceFrac)
  const topY = SURFACE_Y - hPct * surfaceFrac
  const wPct = ((hPct / 100) * ROOM_H) / arHw / ROOM_W * 100
  return { hPct, topY, bottomY: topY + hPct, wPct }
}

// ═════════ 확정 기하 v4.1 — 시드가 고정이면 계약은 «파일 안 비율»로 옮겨 간다 ═════════
/**
 * 시드는 **x50 · y38.5 · w60 고정**이다(기하 JSON). 시드가 고정이면 스프라이트 AR 이 겉보기 세로를
 * 정하고, «신위 발이 감실 바닥에 닿는가»는 오로지 **파일 안 랜드마크 비율**이 정한다:
 *     겉보기 세로 hPct(a) = (w/100)·roomW·a / roomH · 100 = 50.32·a
 *     방 y  →  파일 비율 f(y, a) = 0.5 + (y − 38.5) / hPct(a)
 * 그래서 랜드마크 «목표 비율»은 상수가 아니라 **그 스프라이트의 AR 함수**다. 1.292 에서 재면
 * 감실 바닥 0.605 · 상판 접지선 0.731 이고, AR 이 갈리면 목표도 같이 갈린다.
 *
 * ⚠️ w 가 50 → 60 으로 커지면 **두 랜드마크 사이 거리 요구도 같이 줄어든다**(w 에 반비례):
 *    hPct·(f₂−f₁) = 15.68 이어야 하므로 (f₂−f₁)·AR = 15.68/50.32 = 0.3116 (v4 는 0.3739).
 *    이 값은 리패드로 못 고친다 — 파일 안 형태가 정한다(아래 planRepad 주석).
 */
const SEED = { x: GRAND.x, y: GRAND.y, w: GRAND.w }
const ASSET_EM = pluckNum('components/shrine/scene/ShrineRoomClient.tsx', /const ASSET_EM = ([\d.]+)/, 3.2)
const ITEM_MD_PX = pluckNum('components/shrine/scene/ShrineRoomClient.tsx', /md:\s*'(\d+(?:\.\d+)?)px'/, 29)
/**
 * 아이템 밑변이 실제로 닿는 방 y. 렌더는 `translate(-50%,-50%) scale(s)` + `transform-origin 50% 100%`
 * 라 **밑변이 y + base/2 에 고정**된다(앵커 y 그 자체가 아니다 — 이 반 칸이 「상판면 81%」와
 * 「신위 접지 60.9%」가 서로 안 맞아 보이던 이유다).
 */
const ITEM_BASE_Y = SURFACE_Y + (((ASSET_EM * ITEM_MD_PX) / 2 / ROOM_H) * 100) / 1
const hPctOf = (a) => ((SEED.w / 100) * ROOM_W * a * 100) / ROOM_H
const fOf = (roomY, a) => 0.5 + (roomY - SEED.y) / hPctOf(a)
const yOf = (f, a) => SEED.y + (f - 0.5) * hPctOf(a)
/** 랜드마크 계약 — 이름·목표 방 y. 판정은 «파일 비율» 로 하되 목표는 방 좌표에서 온다. */
const LANDMARKS = [
  { key: 'nicheFloor', label: '감실 바닥(신위 발)', roomY: 45.3, tol: 1.0 },
  { key: 'boardFront', label: '상판 앞턱(제물 밑변)', roomY: ITEM_BASE_Y, tol: 1.5 },
]
/**
 * (f₂ − f₁) · AR 이 반드시 가져야 하는 값. 시드가 고정이면 두 랜드마크 사이 «방 거리»는
 * hPct·(f₂−f₁) = 50.32·AR·(f₂−f₁) 이고, 계약이 15.68%p(45.3 → 60.98) 이므로 곱이 상수다.
 * w50(v4) 에서는 0.3739 였다 — 틀이 넓어지면 같은 그림도 «사이가 더 짧아야» 맞는다.
 */
const REQUIRED_SEPARATION = ((LANDMARKS[1].roomY - LANDMARKS[0].roomY) * ROOM_H) / ((SEED.w / 100) * ROOM_W * 100)
/** 겉보기 세로 = K·AR. w60·방 520×620 에서 K = 50.32 */
const K_HPCT = ((SEED.w / 100) * ROOM_W * 100) / ROOM_H
/** 두 랜드마크 사이의 방 거리(%p) — 계약 15.68 */
const LM_DIST = LANDMARKS[1].roomY - LANDMARKS[0].roomY
/** 계약 상자 높이(겉보기 세로 %) — 실측에서 온 값이다(위 GROUND_Y 주석) */
const BOX_H = 2 * (GROUND_Y - SEED.y)
/**
 * ★ 측면 리패드 계획 — 두 계약을 **동시에** 본다 ★
 *
 * 좌우 투명 여백을 붙여 캔버스 폭 W 를 키우면 두 가지가 함께 움직인다:
 *   · 랜드마크 사이 거리 = K·(f₂−f₁)·Hc / W        (W 가 크면 짧아진다)
 *   · 상자 높이         = K·H / W, H = Hc + |세로 패드|   (세로 패드도 W 에 딸려 온다)
 * 세로 패드를 «나중에» 계산하면 그 몫이 AR 을 다시 밀어 올려 상자가 계약을 벗어난다
 * (실제로 그렇게 나왔다 — 달집 상자 75.3). 그래서 세로 패드까지 넣고 한 번에 고른다.
 * 비용 = max(랜드마크 오차/1.0, 상자 오차/2.0) — 각자의 허용치로 나눠 «더 급한 쪽»을 본다.
 */
function planSidePad(Hc, W0, f1, sep) {
  const midY = (LANDMARKS[0].roomY + LANDMARKS[1].roomY) / 2
  const fm = f1 + sep / 2
  const at = (W) => {
    const dist = (K_HPCT * sep * Hc) / W
    const v = Hc * (1 - 2 * fm) + (2 * (midY - SEED.y) * W) / K_HPCT
    const hPct = (K_HPCT * (Hc + Math.abs(v))) / W
    const lmErr = Math.abs(dist - LM_DIST) / 2
    const boxErr = Math.abs(hPct - BOX_H) / 2
    return { W, dist, hPct, lmErr, boxErr, cost: Math.max(lmErr / LANDMARKS[0].tol, boxErr / 2) }
  }
  let best = at(W0)
  for (let W = W0 + 1; W <= Math.round(W0 * 1.2); W += 1) {
    const c = at(W)
    if (c.cost < best.cost) best = c
  }
  return best
}

/**
 * ★ 캔버스 리패드 = «평행이동» ★
 * 실험으로 확인한 성질: 위/아래 투명 패딩은 두 랜드마크를 **같은 양만큼 함께 옮길** 뿐,
 * 둘 사이 거리는 못 바꾼다(둘 다 y = 39 + 41.94·a·f − 20.97·a·(1+p) 로 떨어진다).
 *   · 아래 패딩 p  → 방 좌표에서 −20.97·a·p 만큼 **위로**
 *   · 위 패딩   p  → +20.97·a·p 만큼 **아래로**
 * 그래서 리패드는 «사이 거리가 이미 맞은» 스프라이트를 제자리에 앉히는 마지막 한 칸이고,
 * 거리가 어긋난 스프라이트는 리패드로 못 고친다 — 그건 재생성(장 깊이)이 답이다.
 */
const shiftPerPad = (_a) => ((SEED.w / 100) * ROOM_W * 100) / ROOM_H / 2 // = 25.16 (w60·520/620/2)
function planRepad(a, marks) {
  const yOfF = (f) => SEED.y + hPctOf(a) * (f - 0.5)
  const errs = LANDMARKS.map((L) => yOfF(marks[L.key]) - L.roomY)
  const shift = -(errs[0] + errs[1]) / 2
  const p = Math.abs(shift) / (shiftPerPad(a) * a)
  return { errs, shift, pad: shift > 0 ? { top: p } : { bottom: p } }
}

/** 그 시드를 실기기에 걸면 세로가 어떻게 보이는가 — 겉보기 세로는 방 AR 에 딸려 온다 */
function _apparentIn(room, wPct, arHw) {
  const pxW = (room.vw * wPct) / 100
  const pxH = pxW * arHw
  const hPct = (pxH / room.vh) * 100
  return { hPct, pxW, pxH }
}

// ═══════════════ 확인판 — 「먼저 눈으로」의 최소 장치 ═══════════════
async function writeQa(buf, m, file, marks) {
  const meta = await sharp(buf).metadata()
  const vw = 620
  const vh = Math.round((meta.height * vw) / meta.width)
  /** 확인판의 자·선은 전부 **캔버스 비율**이다(리패드 뒤에는 내용물 비율과 갈린다) */
  const y = (frac) => Math.round(frac * vh)
  const _yc = (frac) => Math.round(((m.contentTop + m.span * frac) * vh) / meta.height)
  const line = (frac, color, label, dash) =>
    `<line x1="0" y1="${y(frac)}" x2="${vw}" y2="${y(frac)}" stroke="${color}" stroke-width="2"` +
    `${dash ? ' stroke-dasharray="7 6"' : ''}/><text x="6" y="${y(frac) - 5}" fill="${color}" font-size="15">${label}</text>`
  /**
   * 자(ruler) — 2.5% 눈금. 자동 검출은 이 물건에서 세 번 헛짚었다(서랍 띠 · 상판 밑 그림자 한 줄 ·
   * 감실 «윗쪽만» 어두운 성질). 랜드마크는 **눈으로 읽어 THEMES.landmarks 에 적는 것**이 정본이고,
   * 이 자가 그 읽기의 도구다. 자동값은 옆에 같이 그려 «어디서 헛짚었나»가 남게 한다.
   */
  /**
   * ⚠️ 눈금 간격이 곧 읽기 정밀도다. 40칸(2.5%)으로는 «어느 칸 사이인가»까지밖에 못 읽어
   * 라운드마다 ±1% 가 남았다 — 그 1% 는 방 좌표로 0.7%p(≈4px)라 신위 발이 감실 바닥에서 뜬다.
   * 200칸(**0.5%**)으로 좁히고 큰 눈금은 5% 마다 숫자를 붙인다(PLAN 추기 6 「0.5% 확대판」).
   */
  const ticks = []
  for (let i = 1; i < 200; i += 1) {
    const f = i / 200
    const yy = y(f)
    const major = i % 10 === 0
    ticks.push(
      `<line x1="0" y1="${yy}" x2="${major ? 34 : 10}" y2="${yy}" stroke="#ffffff" stroke-opacity="${major ? 0.8 : 0.28}" stroke-width="1"/>` +
        (major ? `<text x="37" y="${yy + 4}" fill="#ffffff" fill-opacity="0.85" font-size="11">${(f * 100).toFixed(0)}</text>` : '')
    )
  }
  const svg = Buffer.from(
    `<svg width="${vw}" height="${vh}" xmlns="http://www.w3.org/2000/svg">` +
      ticks.join('') +
      // 감실 «윗턱» — deityHeadRoomY 의 출처다. 종전 확인판에는 이 줄이 없어 눈으로 못 고쳤다.
      line(marks.nicheTop, '#7db6ff', `감실 윗턱 ${(marks.nicheTop * 100).toFixed(1)}%`, true) +
      line(marks.nicheFloor, '#7dff8f', `감실 바닥 ${(marks.nicheFloor * 100).toFixed(1)}%`, false) +
      line(marks.boardFront, '#ff2d2d', `상판 앞턱 ${(marks.boardFront * 100).toFixed(1)}%`, false) +
      `</svg>`
  )
  const out = await sharp(await sharp(buf).flatten({ background: '#241a10' }).resize(vw, vh, { fit: 'fill' }).png().toBuffer())
    .composite([{ input: svg }])
    .webp({ quality: 88 })
    .toBuffer()
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, out)
  return file
}

// ═══════════════════════════ 빌드 ═══════════════════════════
const OUT_W = 1024
const QUALITY_LADDER = [90, 86, 82, 78, 74]
const BYTES_MAX = 260 * 1024

async function buildTheme(t, { round, rekey }) {
  const raw = rawPath(t.code, round)
  if (!existsSync(raw)) {
    if (rekey) throw new Error(`원본 없음(--rekey 불가): ${raw}`)
    console.log(`  · 생성 (${MODEL} · ${ASPECT} · ${IMAGE_SIZE}) — API ${apiCalls + 1}/${API_BUDGET}`)
    const buf = await callModel(themePrompt(t), await refsFor(t))
    await mkdir(path.dirname(raw), { recursive: true })
    await writeFile(raw, buf)
  } else {
    console.log(`  · 원본 재사용 (API 0회) ${path.relative(ROOT, raw).replace(/\\/g, '/')}`)
  }
  const rawMeta = await sharp(raw).metadata()

  let best = null
  for (let p = 0; p < KEY_PROFILES.length; p += 1) {
    const keyed = await chromaKey(await sharp(raw).toBuffer(), KEY_PROFILES[p])
    const before = measureWarmSpill(keyed.data, keyed.channels)
    let despilled = null
    if (t.despill === 'warm' && before.ratio >= WARM_SPILL_MIN) despilled = warmDespill(keyed.data, keyed.channels)
    const after = measureWarmSpill(keyed.data, keyed.channels)
    const png = await sharp(keyed.data, {
      raw: { width: keyed.width, height: keyed.height, channels: keyed.channels },
    })
      .png()
      .toBuffer()
    // 캔버스 = 내용물 (레터박스 0). 폭만 맞추고 세로는 내용물이 정한다.
    const trimmed = await sharp(png).trim({ threshold: 10 }).png().toBuffer()
    let chosen = null
    for (const quality of QUALITY_LADDER) {
      const b = await sharp(trimmed).resize({ width: OUT_W, fit: 'inside' }).webp({ quality, alphaQuality: 100 }).toBuffer()
      chosen = { quality, buf: b }
      if (b.length <= BYTES_MAX) break
    }
    const { data, info } = await sharp(chosen.buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const fringe = measureFringe(data, info.channels)
    const m = measureContract(data, info.width, info.height, info.channels)
    const arHw = m.span / m.maxW
    const pass = fringe.ratio <= FRINGE_MAX && fringe.edgeRatio <= EDGE_FRINGE_MAX
    console.log(
      `  · 키잉 P${p + 1} ${info.width}×${info.height} ${(chosen.buf.length / 1024).toFixed(0)}KB q${chosen.quality} ` +
        `fringe=${(fringe.ratio * 100).toFixed(3)}% edge=${(fringe.edgeRatio * 100).toFixed(2)}% ` +
        `황록=${(before.ratio * 100).toFixed(2)}%${despilled ? `→${(after.ratio * 100).toFixed(2)}%(${despilled.changed}px)` : ''} ` +
        `${pass ? 'PASS' : 'retry'}`
    )
    const cand = { ...chosen, fringe, m, arHw, info, profile: p + 1, spill: { before, after, applied: !!despilled } }
    if (!best || fringe.ratio < best.fringe.ratio) best = cand
    if (pass) {
      best = cand
      break
    }
  }

  /**
   * 랜드마크 정렬(리패드). 측정 비율은 **내용물 기준**이고 렌더는 **캔버스 기준**이라 먼저 환산한다
   * (트림 직후엔 둘이 같지만, 리패드를 한 번 하면 갈린다 — 이 환산을 빼먹으면 두 번째 실행에서
   *  조용히 어긋난다).
   */
  const toCanvas = (f, m, h) => (m.contentTop + f * m.span) / h
  const eye = eyeOf(t, round)
  const marks0 = {
    nicheFloor: eye?.floor ?? toCanvas(best.m.nicheFloorFrac, best.m, best.info.height),
    boardFront: eye?.board ?? toCanvas(best.m.boardFrontFrac, best.m, best.info.height),
  }

  /**
   * ★ 측면 리패드 = «AR 조정» ★ (기하 v4.1 신설)
   *
   * 세로 리패드는 두 랜드마크를 **함께** 옮길 뿐 사이 거리는 못 바꾼다. 그런데 시드가 고정이면
   * 사이 거리를 정하는 것은 (f₂−f₁)·AR 하나뿐이고, **AR = 캔버스 세로/가로**다 —
   * 즉 좌우에 투명 여백을 붙이면 AR 이 내려가 사이 거리가 줄어든다. 세로로는 못 하던 일을
   * 가로가 한다(세로 패딩은 f 도 같이 바꿔 상쇄되지만, 가로 패딩은 f 를 건드리지 않는다).
   *
   * 폭을 얼마나 붙일지는 planSidePad 가 **세로 리패드까지 넣고** 고른다(그 주석 참조).
   * 반대 방향(AR 을 올려야 하는 경우)은 **가로를 잘라야** 하므로 여기서 하지 않는다 —
   * 닫집 끝을 자르는 순간 그림이 망가진다. 그건 재생성 신호다(사이 거리가 짧다 = 장이 얕다).
   */
  const SIDE_PAD_MAX = 0.09
  let _sidePad = null
  /**
   * ⚠️ 확산 회차(2026-08-10)부터 **기본 꺼짐**이다. 이유는 «주인이 바뀌었다» 하나다.
   *
   * 이 리패드는 v4.1 계약(상판면 53.5 · 접지 73.5)에 맞춰 좌우 여백을 고르는데, 그 계약의
   * 랜드마크 거리는 `ITEM_BASE_Y` = 앵커 + **현행** 아이템 반높이에서 온다. 룸이 아이템을 키운
   * 뒤로(md 29 → 36.25) 그 목표는 15.68 이 아니라 17.55 를 가리키고 있다 — 접지 도구가 리터럴로
   * 동결해 둔 값(BAKED_ITEM_MD_PX 29)과 **다른 자를 들고 있다**.
   * 게다가 최종 종횡비·여백은 이제 `stage-grand-altar-ground.mjs` 가 고정 AR(기하 정본)에 맞춰
   * 한 번에 정한다. 여기서 미리 여백을 붙이면 그만큼 **그려진 틀만 좁아진다**(도깨비 r1 에서
   * 실제로 88% 까지 줄었다 — 옆 테마와 나란히 놓으면 혼자 작다).
   * 코드는 남긴다: 「세로 패딩은 사이 거리를 못 바꾸고 가로가 그 유일한 레버」라는 계산이
   * 접지 도구의 근거와 같은 것이고, 자를 되돌릴 때 여기가 그 자리다. (`--repad` 로 되켠다)
   */
  if (repadPlan) {
    const sep = marks0.boardFront - marks0.nicheFloor
    const plan = planSidePad(best.info.height, best.info.width, marks0.nicheFloor, sep)
    const px = Math.round((plan.W - best.info.width) / 2)
    const frac = px / best.info.width
    const arNow = best.info.height / best.info.width
    const needAR = best.info.height / plan.W
    if (px >= 1 && frac <= SIDE_PAD_MAX) {
      const padded = await sharp(best.buf)
        .extend({ top: 0, bottom: 0, left: px, right: px, background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: best.quality, alphaQuality: 100 })
        .toBuffer()
      const { data, info } = await sharp(padded).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      const m = measureContract(data, info.width, info.height, info.channels)
      _sidePad = { px, frac, arNow, needAR, sep }
      best = { ...best, buf: padded, info, m }
      // 세로 비율(f)은 가로 패딩에 불변이라 marks0 는 그대로 산다 — 다시 재지 않는다(자동 검출 재실패 방지)
      console.log(
        `  · 측면 리패드 ±${px}px (${(frac * 100).toFixed(1)}%) — AR ${arNow.toFixed(3)} → ${(info.height / info.width).toFixed(3)} ` +
          `(사이 거리 ${(sep * 100).toFixed(2)}% · 예상 랜드마크 오차 ±${plan.lmErr.toFixed(2)} · 상자 ${plan.hPct.toFixed(1)})`
      )
    } else if (px >= 1) {
      console.log(
        `  · ⚠️ 측면 리패드 필요치 ${(frac * 100).toFixed(1)}% > 상한 ${(SIDE_PAD_MAX * 100).toFixed(0)}% — 건너뜀(재생성 신호)`
      )
    } else {
      console.log(
        `  · 측면 리패드 없음(현 폭이 최선) — AR ${arNow.toFixed(3)} · 사이 거리 ${(sep * 100).toFixed(2)}% ` +
          `(이 AR 의 계약 ${((REQUIRED_SEPARATION / arNow) * 100).toFixed(2)}%) → 예상 랜드마크 오차 ±${plan.lmErr.toFixed(2)} · 상자 ${plan.hPct.toFixed(1)}`
      )
    }
  }

  let repad = null
  if (repadPlan && eye && round === t.adopted) {
    const plan = planRepad(best.info.height / best.info.width, marks0)
    const px = Math.round(plan.pad.top ? plan.pad.top * best.info.height : plan.pad.bottom * best.info.height)
    if (px >= 1) {
      const padded = await sharp(best.buf)
        .extend({
          top: plan.pad.top ? px : 0,
          bottom: plan.pad.bottom ? px : 0,
          left: 0,
          right: 0,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .webp({ quality: best.quality, alphaQuality: 100 })
        .toBuffer()
      const { data, info } = await sharp(padded).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      const m = measureContract(data, info.width, info.height, info.channels)
      repad = { ...plan, px, side: plan.pad.top ? 'top' : 'bottom', before: { ...marks0 } }
      best = { ...best, buf: padded, info, m }
      console.log(
        `  · 리패드 ${repad.side} ${px}px — 랜드마크 오차 ` +
          `${plan.errs.map((e) => `${e >= 0 ? '+' : ''}${e.toFixed(2)}`).join(' / ')} → 평행이동 ${plan.shift.toFixed(2)}%p`
      )
    }
  }
  /** 최종 캔버스 기준 랜드마크 — 보고·판정은 전부 이 두 숫자로 한다 */
  const H = best.info.height
  const H0 = repad ? H - repad.px : H
  const shifted = (f0) => (repad ? (repad.side === 'top' ? (repad.px + f0 * H0) / H : (f0 * H0) / H) : f0)
  const marks = {
    nicheFloor: shifted(marks0.nicheFloor),
    nicheTop: shifted(eye?.top ?? toCanvas(best.m.nicheTopFrac, best.m, H0)),
    // ⚠️ 여기서 자동값을 다시 읽으면 **육안 실측이 조용히 버려진다**(설빛 r5 에서 실제로 그랬다 —
    //    보고서에만 −4.5%p 오차가 뜨고 리패드는 육안값으로 이미 맞아 있었다). 리패드 전 값에 같은
    //    평행이동을 걸어 두 랜드마크가 **같은 출처**를 갖게 한다.
    boardFront: shifted(marks0.boardFront),
  }

  const out = outPath(t.code)
  await mkdir(path.dirname(out), { recursive: true })
  await writeFile(out, best.buf)
  const qa = await writeQa(best.buf, best.m, qaPath(t.code, round), marks)
  return { theme: t, round, raw, rawMeta, out, qa, repad, marks0, marks, ...best }
}

// ═══════════════ 합성판 — 「판정 단위」 (API 0회) ═══════════════
// stage-theme-harmony.mjs 의 buildWideComposite 규약을 그대로 옮긴 것이되, 제단 두 장(platform·
// altar-top) 자리에 **틀 한 장**을 놓고 오퍼스 I 의 기하 v4 확정치로 굽는다.
// 숫자는 전부 I 확정본이다 — 여기서 새로 발명하지 않는다.
/**
 * 합성판 기하 — **기하 JSON 이 정본**이다(v4 에서 확정안·채택안이 한 파일에 같이 살던 자리).
 * 살림(선반장·의식각·광원)은 렌더 상수라 여기 그대로 적는다 — 그 값들은 시드에 없다.
 */
const V41 = {
  label: 'v4.1',
  worldScreens: 3.2,
  bandWall: BANDS.wall / 100,
  bandFloor: BANDS.floor / 100,
  /** 마루선 — 선반장·의식각이 서야 할 자리 (= 100 − 바닥 밴드) */
  floorY: FLOOR_LINE_Y,
  /** 뮤럴 라운드 폴더 — `--band 75/27 --horizon 70` 로 재슬라이스한 장 */
  mural: 'r75',
  /** 틀 시드 — 기하 JSON 그대로 */
  seed: { x: GRAND.x, y: GRAND.y, w: GRAND.w },
  /** 제단 앵커 2열 5점 — 기하 JSON 그대로(상판 실측 폭에서 파생된 값) */
  anchors: GRAND.anchors.map((a) => ({ x: a.x, y: a.y })),
  /** 제단층 아이템 배율 — 기하 JSON 그대로 */
  altScale: GEO.grandAltar.altarItemScale,
  /** 가족 선반장 — **y62 동결**(I). 마루선(73)보다 11%p 높아 떠 보인다(설계 결정 · 사용자 조절이 덮는다). */
  shelfX: [7, 16, 25],
  shelfW: 8.65,
  shelfTop: 20,
  shelfBottom: 62,
  hall: { x: 88.75, w: 8.65, top: 20, bottom: 62 },
  glow: { top: 77, w: 64, h: 16 },
}
/**
 * 대비판 전용 — **v4 그대로의 기하**(밴드 72/30 · 마루선 70 · 틀 w50 · 배율 0.49 · 뮤럴 r72).
 * 「얼마나 커졌는가」는 두 장을 나란히 놓아야만 눈으로 답할 수 있고, 그러려면 옛 기하가
 * 코드 안에 살아 있어야 한다. 스프라이트도 옛 것을 쓴다(backup/{code}-v4-grand-altar.webp).
 */
const V4_LEGACY = {
  ...V41,
  label: 'v4',
  bandWall: 0.72,
  bandFloor: 0.3,
  floorY: 70,
  mural: 'r72',
  seed: { x: 50, y: 39, w: 50 },
  anchors: [
    { x: 46.25, y: 52.4 },
    { x: 50, y: 52.4 },
    { x: 53.75, y: 52.4 },
    { x: 48.1, y: 55.0 },
    { x: 51.9, y: 55.0 },
  ],
  altScale: 0.49,
}
const LIGHT_BY_CODE = {
  banga: { color: '#C9A84C', intensity: 0.5, origin: { x: 50, y: 52 }, glow: 'rgba(201,168,76,0.2)' },
  daljip: { color: '#d4a017', intensity: 0.5, origin: { x: 50, y: 52 }, glow: 'rgba(230,195,122,0.17)' },
  seolbit: { color: '#c9a84c', intensity: 0.5, origin: { x: 50, y: 52 }, glow: 'rgba(200,212,220,0.16)' },
}
/** 제물 5점 — 앵커 순서대로. 뒤(바깥)가 먼저 깔리고 가운데가 마지막에 얹히는 순서다. */
const OFFERINGS = [
  'candle-pair.webp',
  'offering-rice.webp',
  'incense-burner.webp',
  'offering-jujube.webp',
  'jar-water.webp',
]
const AVATARS = ['/avatars/five/wood.webp', '/avatars/five/fire.webp', '/avatars/five/water.webp']
const DARK = { r: 0x1a, g: 0x13, b: 0x08, alpha: 1 }

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
/** CSS drop-shadow 재현 — «떠 보이는가»는 그림자가 만드는 판정이다 */
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

/**
 * 합성판 한 장. `G` 가 기하 프로파일이다(V41 정본 / V4_LEGACY 대비판) — 밴드·마루선·시드·앵커·
 * 배율·뮤럴 라운드가 전부 거기서 온다. 두 세대를 **같은 코드 경로**로 구워야 대비판이 정직하다.
 * `sprite` 를 주면 그 파일을 틀로 쓴다(대비판은 backup 의 v4 스프라이트를 쓴다).
 */
async function buildWide(r, { viewW, viewH, k = 1, seats = 3, G = V41, sprite = null, nicheTop = null }) {
  const t = r.theme
  const light = LIGHT_BY_CODE[t.code]
  const W = Math.round(viewW * G.worldScreens)
  const H = Math.round(viewH)
  const pxX = (worldPct) => (W * worldPct) / 100
  const pxY = (roomPct) => (H * roomPct) / 100
  const pxVW = (viewPct) => (viewW * viewPct) / 100
  const layers = []

  // ① 벽·바닥 밴드 (StageLayers 규약: cover + bottom/top)
  const mural = path.join(PILOT_ROOT, `${t.code}-v3`, G.mural)
  const wallH = Math.round(H * G.bandWall)
  const floorH = Math.round(H * G.bandFloor)
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

  // ② 하단 암전
  const vigH = Math.round(H * 0.38)
  layers.push({
    input: await sharp(
      Buffer.from(
        `<svg width="${W}" height="${vigH}" xmlns="http://www.w3.org/2000/svg"><defs>
          <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.32"/>
          </linearGradient></defs><rect width="${W}" height="${vigH}" fill="url(#g)"/></svg>`
      )
    )
      .png()
      .toBuffer(),
    left: 0,
    top: H - vigH,
  })

  // ③ 제단 광원
  const gw = Math.round(pxVW(G.glow.w))
  const gh = Math.round(pxY(G.glow.h))
  const gpad = Math.round(24 * k)
  const glow = await sharp(
    Buffer.from(
      `<svg width="${gw + gpad * 2}" height="${gh + gpad * 2}" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="${gw / 2 + gpad}" cy="${gh / 2 + gpad}" rx="${gw / 2}" ry="${gh / 2}" fill="${light.glow}"/></svg>`
    )
  )
    .blur(Math.max(0.3, 3.5 * k))
    .png()
    .toBuffer()
  layers.push({ input: glow, left: Math.round(W / 2 - gw / 2 - gpad), top: Math.round(pxY(G.glow.top) - gpad), blend: 'over' })

  // ④ 가족 선반장 — ⚠️ y62 동결(I). 마루선(v4.1 은 73)보다 11%p 높아 «떠 보인다» — 설계 결정이라 그대로 굽는다.
  const shelfFile = path.join(PUB, 'shrine', 'stage', 'banga', 'shelf-sabang.webp')
  const unitW = Math.round(pxX(G.shelfW))
  const unitH = Math.round(pxY(G.shelfBottom - G.shelfTop))
  for (let i = 0; i < seats; i += 1) {
    const cx = pxX(G.shelfX[i])
    const buf = await sharp(shelfFile).resize(unitW, unitH, { fit: 'fill' }).png().toBuffer()
    await pushSprite(layers, buf, cx - unitW / 2, pxY(G.shelfTop), W, H, { dy: 5 * k, blur: 6 * k, alpha: 0.45 })
    const av = Math.round(unitW * 0.46)
    const avTop = pxY(G.shelfTop) + 0.16 * unitH - av * 0.58
    const avFile = path.join(PUB, AVATARS[i % AVATARS.length].replace(/^\//, ''))
    if (existsSync(avFile)) {
      const mask = Buffer.from(
        `<svg width="${av}" height="${av}" xmlns="http://www.w3.org/2000/svg"><circle cx="${av / 2}" cy="${av / 2}" r="${av / 2}" fill="#fff"/></svg>`
      )
      const round = await sharp(await sharp(avFile).resize(av, av, { fit: 'cover', position: 'top' }).png().toBuffer())
        .composite([{ input: await sharp(mask).png().toBuffer(), blend: 'dest-in' }])
        .png()
        .toBuffer()
      const l = await clipLayer(round, cx - av / 2, avTop, W, H)
      if (l) layers.push(l)
    }
  }

  // ⑤ 의식각
  const hallW = Math.round(pxX(G.hall.w))
  const hallH = Math.round(pxY(G.hall.bottom - G.hall.top))
  const hallBody = await sharp(shelfFile).resize(hallW, hallH, { fit: 'fill' }).png().toBuffer()
  await pushSprite(layers, hallBody, pxX(G.hall.x) - hallW / 2, pxY(G.hall.top), W, H, { dy: 5 * k, blur: 6 * k, alpha: 0.45 })
  const plaqueFile = path.join(PUB, 'shrine', 'ritual', 'plaque.webp')
  if (existsSync(plaqueFile)) {
    const pw = Math.round((hallW * 86) / 100)
    const ph = Math.round((pw * 2) / 5)
    for (const cy of [0.155, 0.425, 0.65, 0.865]) {
      const buf = await sharp(plaqueFile).resize(pw, ph, { fit: 'fill' }).png().toBuffer()
      await pushSprite(layers, buf, pxX(G.hall.x) - pw / 2, pxY(G.hall.top) + cy * hallH - ph / 2, W, H, {
        dy: 3 * k,
        blur: 4 * k,
        alpha: 0.5,
      })
    }
  }

  // ⑥ ★ 웅장한 틀 ★ — 시드 x50·y38.5·w60(v4.1). 폭으로 크기가 정해지고 세로는 파일 AR 이 정한다.
  const altarW = Math.round(pxVW(G.seed.w))
  const altar = await sharp(sprite ?? r.out).resize({ width: altarW, fit: 'inside' }).png().toBuffer()
  const altarMeta = await sharp(altar).metadata()
  const altarTop = pxY(G.seed.y) - altarMeta.height / 2
  await pushSprite(layers, altar, W / 2 - altarMeta.width / 2, altarTop, W, H, { dy: 5 * k, blur: 9 * k, alpha: 0.45 })

  // ⑦ 신위 — **감실 안**에 선다. 발끝 y45.3(계약), 머리는 감실 윗틀 밑.
  const deityFile = path.join(PUB, 'shrine', 'deities', 'sansin', 'base.webp')
  const arSprite = altarMeta.height / altarMeta.width
  const hPctSprite = ((G.seed.w / 100) * ROOM_W * arSprite * 100) / ROOM_H
  const nicheTopY = G.seed.y + hPctSprite * ((nicheTop ?? r.marks.nicheTop) - 0.5)
  const standH = Math.round(pxY(45.3 - (nicheTopY + 1.5)))
  if (existsSync(deityFile) && standH > 8) {
    const buf = await sharp(deityFile).resize({ height: standH, fit: 'inside' }).png().toBuffer()
    const meta = await sharp(buf).metadata()
    await pushSprite(layers, buf, W / 2 - meta.width / 2, pxY(45.3) - meta.height, W, H, { dy: 5 * k, blur: 9 * k, alpha: 0.5 })
  }

  /**
   * ⑧ 제물 5점 — 앵커 2열(뒷줄 3 → 앞줄 2). 밑변은 y + base/2 에 고정(렌더 규약).
   * 배열 순서대로 깔리므로 **앞줄이 뒷줄 위에** 온다 — stage.depthZ 의 y 파생 z 와 같은 순서다.
   */
  const base = ASSET_EM * ITEM_MD_PX * k
  const anchors = G.anchors
  const scaled = base * G.altScale
  for (let i = 0; i < anchors.length; i += 1) {
    const file = path.join(PUB, 'shrine', 'items', OFFERINGS[i])
    if (!existsSync(file)) continue
    const buf = await sharp(file).resize(Math.round(scaled), Math.round(scaled), { fit: 'inside' }).png().toBuffer()
    const meta = await sharp(buf).metadata()
    await pushSprite(layers, buf, pxX(anchors[i].x) - meta.width / 2, pxY(anchors[i].y) + base / 2 - meta.height, W, H, {
      dy: 3 * k,
      blur: 3 * k,
      alpha: 0.55,
    })
  }

  const png = await sharp({ create: { width: W, height: H, channels: 4, background: DARK } }).composite(layers).png().toBuffer()
  return { png, W, H, altarMeta, nicheTopY, standH }
}

/** 1화면 크롭 + 조명 오버레이(soft-light) — 사람이 실제로 보는 한 장 */
async function viewCrop(widePng, leftPx, code, w, h) {
  const light = LIGHT_BY_CODE[code]
  const cropped = await sharp(widePng).extract({ left: Math.round(leftPx), top: 0, width: Math.round(w), height: Math.round(h) }).png().toBuffer()
  const cx = (w * light.origin.x) / 100
  const cy = (h * light.origin.y) / 100
  const rx = 1.2 * w
  const ry = 0.9 * h
  const overlay = await sharp(
    Buffer.from(
      `<svg width="${Math.round(w)}" height="${Math.round(h)}" xmlns="http://www.w3.org/2000/svg"><defs>
        <radialGradient id="g" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${rx}"
          gradientTransform="translate(0 ${cy}) scale(1 ${(ry / rx).toFixed(6)}) translate(0 ${-cy})">
          <stop offset="0" stop-color="${light.color}" stop-opacity="1"/>
          <stop offset="0.72" stop-color="${light.color}" stop-opacity="0"/>
        </radialGradient></defs>
        <rect width="${Math.round(w)}" height="${Math.round(h)}" fill="url(#g)" opacity="${light.intensity}"/></svg>`
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
      { input: { create: { width: 2, height: H, channels: 4, background: { r: 0xc9, g: 0xa8, b: 0x4c, alpha: 0.9 } } }, left: a.width + Math.floor(gap / 2) - 1, top: 0 },
    ])
    .webp({ quality: 90 })
    .toBuffer()
}

/** 레퍼런스 대비 — 구 원화의 제단 구역 vs 새 틀. 「격(格)이 그 자리에 왔는가」 */
async function referenceCompare(r, outFile) {
  const legacy = path.join(PUB, 'shrine', 'themes', 'daljip', 'room.webp')
  const m = await sharp(legacy).metadata()
  const left = await sharp(legacy)
    .extract({
      left: Math.round(m.width * FORM_REF_CROP.left),
      top: Math.round(m.height * FORM_REF_CROP.top),
      width: Math.round(m.width * FORM_REF_CROP.width),
      height: Math.round(m.height * FORM_REF_CROP.height),
    })
    .resize({ height: 900, kernel: 'lanczos3' })
    .flatten({ background: '#241a10' })
    .png()
    .toBuffer()
  const right = await sharp(r.out).resize({ height: 900, fit: 'inside' }).flatten({ background: '#241a10' }).png().toBuffer()
  await writeFile(outFile, await sideBySide(left, right))
  return outFile
}

/** v4 대비판 재료 — 그 세대의 스프라이트(백업)와 감실 윗턱 비율. 없으면 대비판을 건너뛴다. */
const V4_BACKUP = (code) => path.join(V41_ROOT, 'backup', `${code}-v4-grand-altar.webp`)
const V4_NICHE_TOP = { banga: 0.327, daljip: 0.331, seolbit: 0.282 }

async function compose(r) {
  const dir = path.join(V41_ROOT, r.theme.code)
  await mkdir(dir, { recursive: true })
  const out = {}
  const wide = await buildWide(r, { viewW: ROOM_W, viewH: ROOM_H })
  out.wide = path.join(dir, 'stage-wide.webp')
  await sharp(wide.png).webp({ quality: 90 }).toFile(out.wide)
  for (const [name, left] of Object.entries({
    center: Math.round((wide.W - ROOM_W) / 2),
    left: 0,
    right: wide.W - ROOM_W,
  })) {
    const buf = await viewCrop(wide.png, left, r.theme.code, ROOM_W, ROOM_H)
    const f = path.join(dir, `stage-view-${name}.webp`)
    await sharp(buf).webp({ quality: 92 }).toFile(f)
    out[`view_${name}`] = f
  }
  /**
   * 기기 시뮬 · DPR3 — «실기기 픽셀 그대로». **세 뷰포트**를 굽는다:
   * 벽 밴드 비율이 가장 빡빡한 360×800(밴드 AR 2.61 — 뮤럴 2.48 이 여기서도 남아야 가로 크롭 0),
   * 기준 폰 390×844, 그리고 방 높이가 상한(620)에 걸리는 430×932.
   */
  for (const [w, h] of [
    [360, 800],
    [390, 844],
    [430, 932],
  ]) {
    const vw = Math.min(ROOM_W, w - 8)
    const vh = Math.min((ROOM_VH / 100) * h, ROOM_H)
    const dev = await buildWide(r, { viewW: vw * 3, viewH: vh * 3, k: 3 })
    const f = path.join(dir, `stage-device-${w}x${h}.webp`)
    await sharp(await viewCrop(dev.png, Math.round((dev.W - vw * 3) / 2), r.theme.code, vw * 3, vh * 3))
      .webp({ quality: 90 })
      .toFile(f)
    out[`device_${w}`] = f
    if (w === 390) out.device = f
  }
  /**
   * ★ 세대 대비판 ★ — 같은 중앙 뷰를 **v4 기하 + v4 스프라이트** / **v4.1 기하 + v4.1 스프라이트** 로
   * 한 번씩 구워 좌우로 붙인다. 「얼마나 커졌는가」·「마루가 얼마나 줄었는가」는 숫자가 아니라
   * 이 한 장이 답한다(판정 단위 = 합성판).
   */
  const legacySprite = V4_BACKUP(r.theme.code)
  if (existsSync(legacySprite)) {
    const oldWide = await buildWide(r, {
      viewW: ROOM_W,
      viewH: ROOM_H,
      G: V4_LEGACY,
      sprite: legacySprite,
      nicheTop: V4_NICHE_TOP[r.theme.code],
    })
    const oldCenter = await viewCrop(oldWide.png, Math.round((oldWide.W - ROOM_W) / 2), r.theme.code, ROOM_W, ROOM_H)
    out.view_v4 = path.join(dir, 'stage-view-center-v4.webp')
    await sharp(oldCenter).webp({ quality: 92 }).toFile(out.view_v4)
    out.compare = path.join(dir, 'compare-v4-vs-v41.webp')
    await writeFile(out.compare, await sideBySide(oldCenter, await sharp(out.view_center).png().toBuffer()))
  }
  out.reference = await referenceCompare(r, path.join(dir, 'reference-compare.webp'))
  return { ...out, wideInfo: wide }
}

// ──────────────────────────── main ────────────────────────────
const args = process.argv.slice(2)
const VALUE_FLAGS = ['--round']
const BOOL_FLAGS = ['--plan', '--rekey', '--compose', '--repad']
const unknown = args.filter((a) => a.startsWith('--') && !VALUE_FLAGS.includes(a) && !BOOL_FLAGS.includes(a))
if (unknown.length) {
  console.error('unknown flag:', unknown.join(' '), '— 가능:', [...VALUE_FLAGS, ...BOOL_FLAGS].join(', '))
  process.exit(1)
}
const flagValue = (name, fb) => {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fb
}
/**
 * 라운드. 기본값은 **테마별 채택분**(ADOPTED) — 인자 없이 다시 돌리면 승인된 그림이 그대로 나온다.
 * `--round N` 은 새 라운드를 굽거나 과거 라운드를 되살릴 때만 쓴다.
 */
const roundArg = flagValue('--round', null)
const planOnly = args.includes('--plan')
const rekey = args.includes('--rekey')
/** 리패드(측면·세로) — 기본 꺼짐. 종횡비의 주인은 접지 도구다(buildTheme 안 주석 참조). */
const repadPlan = args.includes('--repad')
const positional = args.filter((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(args[i - 1]))
const only = positional[0] || 'all'
const wanted = only === 'all' ? THEMES.map((t) => t.code) : only.split(',').map((s) => s.trim())
const targets = THEMES.filter((t) => wanted.includes(t.code))
if (targets.length !== wanted.length) {
  console.error('unknown theme code:', wanted.filter((w) => !THEMES.some((t) => t.code === w)).join(','))
  process.exit(1)
}

const design = seedFrom(DESIGN.ar, DESIGN.surfaceFrac)
console.log(
  `모델: ${MODEL} · ${ASPECT} ${IMAGE_SIZE} · 라운드 ` +
    `${roundArg === null ? `채택분(${THEMES.map((t) => `${t.code} r${t.adopted}`).join(' · ')})` : `r${roundArg}`}\n` +
    `계약: 상판면 y${SURFACE_Y} · 접지 y${GROUND_Y} · 방 ${ROOM_W}×${ROOM_H}(${ROOM_VH}vh)\n` +
    `설계: 상판면 ${(DESIGN.surfaceFrac * 100).toFixed(0)}% · AR ${DESIGN.ar} → 세로 ${design.hPct.toFixed(1)}% ` +
    `(y${design.topY.toFixed(1)}~${design.bottomY.toFixed(1)}) · w ${design.wPct.toFixed(1)}\n` +
    `산출: assets-src/shrine/grand-altar/{code}/{base.webp · r{N}.png · qa-r{N}.webp}\n` +
    `      → 라이브 파일(grand-altar-v2.webp)은 stage-grand-altar-ground.mjs 가 굽는다(public 무접촉)\n`
)

if (planOnly) {
  for (const t of targets) {
    console.log(`\n══ ${t.code} · ${t.name} (뮤럴 r${t.mural}${t.despill ? ` · despill ${t.despill}` : ''}) ══`)
    console.log(themePrompt(t))
  }
  process.exit(0)
}

const results = []
for (const t of targets) {
  console.log(`\n══ ${t.code} · ${t.name} ══`)
  try {
    results.push(await buildTheme(t, { round: roundArg === null ? t.adopted : Number(roundArg), rekey }))
  } catch (e) {
    if (isAuthError(e)) {
      console.error('\n✖✖ API 키 인증 실패 — 즉시 중단. 재시도하지 않음.')
      console.error('   ', String(e?.message || e).slice(0, 400))
      process.exit(2)
    }
    console.error('  ✖', t.code, String(e?.message || e).slice(0, 300))
    results.push({ theme: t, error: String(e?.message || e).slice(0, 300) })
  }
}

console.log('\n── 요약 ──')
for (const r of results) {
  if (r.error) {
    console.log(`  ✖ ${r.theme.code}: ${r.error}`)
    continue
  }
  console.log(
    `  ✔ ${r.theme.code} ${r.info.width}×${r.info.height} ${(r.buf.length / 1024).toFixed(0)}KB q${r.quality} ` +
      `(P${r.profile} · fringe ${(r.fringe.ratio * 100).toFixed(3)}% · 황록 ${(r.spill.after.ratio * 100).toFixed(2)}%` +
      `${r.spill.applied ? ' despill 적용' : ''}) → ${path.relative(ROOT, r.out).replace(/\\/g, '/')}`
  )
}

console.log(
  `\n── 랜드마크 검증 (확정 시드 x${SEED.x}·y${SEED.y}·w${SEED.w} · 밴드 ${BANDS.wall}/${BANDS.floor} · 마루선 y${FLOOR_LINE_Y}) ──\n` +
    `   아이템 밑변 = 앵커 y${SURFACE_Y} + base/2 = **방 y${ITEM_BASE_Y.toFixed(2)}** (ASSET_EM ${ASSET_EM} × md ${ITEM_MD_PX}px)\n` +
    `   랜드마크 간 거리 요구: (f₂−f₁)·AR = ${REQUIRED_SEPARATION.toFixed(4)} (세로 리패드로는 못 고친다 — 측면 리패드/재생성)`
)
for (const r of results) {
  if (r.error) continue
  const a = r.info.height / r.info.width
  const hPct = hPctOf(a)
  const top = yOf(0, a)
  const seed = seedFrom(r.arHw, r.m.surfaceFrac)
  const rows = LANDMARKS.map((L) => {
    const want = fOf(L.roomY, a)
    const got = r.marks[L.key]
    const gotY = yOf(got, a)
    const dY = gotY - L.roomY
    return (
      `      ${L.label}: 실측 ${(got * 100).toFixed(2)}% → 방 y${gotY.toFixed(1)} / 목표 ${(want * 100).toFixed(2)}% ` +
      `= y${L.roomY.toFixed(1)} → 오차 ${dY >= 0 ? '+' : ''}${dY.toFixed(1)}%p ` +
      `(${Math.round((Math.abs(dY) / 100) * ROOM_H)}px) ${Math.abs(dY) <= L.tol ? '✓' : '⚠️'}`
    )
  })
  console.log(
    `  ${r.theme.code} r${r.round}: 파일 ${r.info.width}×${r.info.height} (AR ${a.toFixed(3)}) → ` +
      `겉보기 세로 ${hPct.toFixed(1)}% · y${top.toFixed(1)}~${yOf(1, a).toFixed(1)}\n` +
      rows.join('\n') +
      `\n      감실 윗턱 ${(r.m.nicheTopFrac * 100).toFixed(1)}% → 방 y${yOf(r.m.nicheTopFrac, a).toFixed(1)} ` +
      `· 신위 자리 세로 ${(yOf(r.m.nicheFloorFrac, a) - yOf(r.m.nicheTopFrac, a)).toFixed(1)}%\n` +
      `      폭 프로파일: 상판 ${((r.m.boardW / r.m.maxW) * 100).toFixed(0)}% ` +
      `· 감실대 ${((r.m.nicheW / r.m.maxW) * 100).toFixed(0)}% · 닫집 ${((r.m.canopyW / r.m.maxW) * 100).toFixed(0)}%\n` +
      `      (참고 · 하드라인 역산 시드: x50 y${(seed.topY + seed.hPct / 2).toFixed(1)} w${seed.wPct.toFixed(1)})`
  )
}

/**
 * ── 앵커·배율 파생 (기하 JSON 에 적을 값을 «재서» 낸다) ──
 *
 * 앵커는 **세 테마가 한 벌을 공유한다**(기하 JSON 의 구조물이 하나다) → 상판 실측 폭의 **최솟값**에서
 * 파생해야 세 테마 모두에서 상판 안에 앉는다. 배율은 **가장 좁은 기기**가 정한다 — 아이템은 CSS px
 * 절대값(3.2em × 29px)이고 틀은 뷰포트 % 라, 방이 좁을수록 아이템이 «틀 대비» 커진다.
 */
const okResults = results.filter((r) => !r.error)
if (okResults.length) {
  const boardFrac = Math.min(...okResults.map((r) => r.m.boardW / r.m.maxW))
  const worst = okResults.find((r) => r.m.boardW / r.m.maxW === boardFrac)
  /** 상판의 세계 폭(%) — 틀 폭(뷰포트 %)이 세계에서는 SEED.w/worldScreens 이다 */
  const boardWorld = (boardFrac * SEED.w) / V41.worldScreens
  const x0 = 50 - boardWorld / 2
  const x1 = 50 + boardWorld / 2
  const phones = [
    { name: '360x800', vw: Math.min(ROOM_W, 360 - 8) },
    { name: '390x844', vw: Math.min(ROOM_W, 390 - 8) },
    { name: 'ref 520', vw: ROOM_W },
  ]
  const base = ASSET_EM * ITEM_MD_PX
  const lines = phones.map((p) => {
    const boardPx = boardFrac * (SEED.w / 100) * p.vw
    return `      ${p.name}: 상판 ${boardPx.toFixed(0)}px → 뒷줄 3점 한계 배율 ${(boardPx / 3 / base).toFixed(3)}`
  })
  /** 채택 배율에서의 아이템 폭(세계 %) — 앵커 간격은 이보다 넓어야 한다 */
  const itemWorldAt = (vw) => (base * V41.altScale) / (vw * V41.worldScreens) * 100
  console.log(
    `\n── 앵커·배율 파생 (상판 실측 최솟값 ${(boardFrac * 100).toFixed(0)}% = ${worst.theme.code}) ──\n` +
      `   상판 세계 폭 ${boardWorld.toFixed(2)}% → x ${x0.toFixed(2)}~${x1.toFixed(2)}\n` +
      lines.join('\n') +
      `\n   채택 배율 ${V41.altScale} → 아이템 세계 폭 360폰 ${itemWorldAt(352).toFixed(2)}% · 390폰 ${itemWorldAt(382).toFixed(2)}%\n` +
      `   채택 앵커 ${V41.anchors.map((a) => `${a.x}@${a.y}`).join(' · ')}\n` +
      V41.anchors
        .map((a, i) => {
          const half = itemWorldAt(382) / 2
          const inside = a.x - half >= x0 - 1e-9 && a.x + half <= x1 + 1e-9
          const gap = i > 0 && V41.anchors[i - 1].y === a.y ? a.x - V41.anchors[i - 1].x : null
          return (
            `      ${a.x}@${a.y}: 좌우 끝 ${(a.x - half).toFixed(2)}~${(a.x + half).toFixed(2)} ${inside ? '✓ 상판 안' : '⚠️ 상판 밖'}` +
            (gap !== null ? ` · 앞 점과 간격 ${gap.toFixed(2)}%(아이템 ${itemWorldAt(382).toFixed(2)}%) ${gap >= itemWorldAt(382) ? '✓' : '⚠️ 겹침'}` : '')
          )
        })
        .join('\n')
  )
}

if (args.includes('--compose')) {
  console.log('\n── 합성판 (API 0회 · 판정 단위) ──')
  for (const r of results) {
    if (r.error) continue
    const c = await compose(r)
    console.log(
      `  ✔ ${r.theme.code}: ${['wide', 'view_center', 'view_left', 'view_right', 'device', 'compare', 'reference']
        .filter((k) => c[k])
        .map((k) => path.basename(c[k]))
        .join(' · ')}\n` +
        `      틀 겉보기 ${c.wideInfo.altarMeta.width}×${c.wideInfo.altarMeta.height}px @방 ${ROOM_W}×${ROOM_H} ` +
        `· 신위 세로 ${c.wideInfo.standH}px (감실 윗턱 y${c.wideInfo.nicheTopY.toFixed(1)} ~ 발끝 y45.3)\n` +
        `      → ${path.relative(ROOT, path.join(V41_ROOT, r.theme.code)).replace(/\\/g, '/')}/`
    )
  }
}

console.log(`\nAPI 호출 ${apiCalls}/${API_BUDGET}회`)
console.log('⚠️ 숫자는 접지·용량만 본다. **격(格)은 확인판·합성판을 눈으로 봐서** 판정할 것.')
process.exit(results.some((r) => r.error) ? 1 : 0)
