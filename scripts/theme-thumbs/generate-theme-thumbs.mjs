// 인기테마운세 썸네일 — 실사(포토리얼) 16:9 생성 파이프라인
//
// ── 왜 실사인가 ────────────────────────────────────────────────────────────────
// CEO 지시(2026-08-13): "인기테마운세 섹션 썸네일이 너무 허전해. 실제 느낌이 나게 전체적인
// 이미지와 (실사) 제목을 잘 기획해줘, 유튜브처럼."
// 기획서(PLAN-theme-{career-wealth,love,face,fengshui}-v1.md)의 §썸네일 컨셉은 **일러스트 전제**로
// 쓰여 있었다. 소재·구도·방향은 그대로 승계하고 **스타일만 실사로 번안**한다.
//
// ── v2 · 왜 현대(컨템포러리)인가 ──────────────────────────────────────────────
// v1 은 12장 중 11장이 한옥 정서(놋대야·창호문·병풍)로 나왔고 「나갈까 말까」 한 장만 현대
// 사무실이었다 — 한 피드에 세우면 그 한 장만 밝아 결이 갈렸다. CEO 지시(2026-08-13 밤):
// "**현대 썸네일로 만들어주고.**" → 12장 전체를 **지금 한국인의 생활 장면**으로 통일한다.
// 테마가 다루는 고민 자체가 현대적이라(퇴사·카드값·이사·소개팅) 소재를 현대로 옮기면
// «내 얘기» 공감이 커진다. **의미·감정은 v1 그대로 두고 소재만 옮긴다** — 놋대야 물 새기 →
// 식탁 위 영수증 더미, 사계절 병풍 → 창턱의 화분 넷, 창살 그림자 → 창 격자 그림자.
// 색결(호박빛 저녁·저조도)은 v1 것을 그대로 승계한다 — 바뀐 것은 **장소**뿐이다.
//
// ── 이 파일이 지키는 세 가지 계약 ──────────────────────────────────────────────
// ① 🔴 이미지에 글자를 굽지 않는다. 제목은 UI 가 HTML 로 얹는다(마스터 §10-1: 한글 렌더 불안정 ·
//    법적 정정 시 재생성 · i18n 전량 재생성). 그래서 프롬프트에서 **글자 유발 소재를 뺀다** —
//    달력의 날짜, 간판 문구, 서류의 글씨, 병풍의 서예. 「이사, 언제」의 달력이 창살 그림자로,
//    「다섯 얼굴」의 얼굴이 손거울로 바뀐 이유가 그것이다.
// ② 🔴 사람 정면 얼굴을 넣지 않는다. 실사 인물 정면은 AI기본법 §31③ «실제와 구분 어려운»
//    리스크에 더해 실존 인물 오인 소지가 있다(docs/REPORTS/RESEARCH-20260812-ai-basic-act.md).
//    감정은 **뒷모습 · 역광 실루엣 · 손 · 소지품**으로만 옮긴다.
// ③ 🔴 효과를 단정하는 연출을 넣지 않는다(표시광고법). 돈다발·행운 세례가 아니라 **질문의 장면**.
//
// ── 이미지 프롬프트 4대 규율 (MEMORY feedback_image_prompt_rules) ──────────────
//   ① 안 먹히면 설명을 늘리지 말고 **관찰 가능한 사실 1개**를 더한다
//   ② 메타 지시문(CRITICAL / must NOT / IMPORTANT) 금지 — 넣으면 지시서·캐릭터 시트가 나온다
//   ③ **방향을 반드시 명시**한다(left of center / facing right / from behind)
//   ④ 육안 검수가 정본. 수치로 안 잡힌다 → `--sheet` 콘택트시트를 실렌더 크기에서 본다
//
// ── 사용 ───────────────────────────────────────────────────────────────────────
//   node scripts/theme-thumbs/generate-theme-thumbs.mjs --plan            # 프롬프트만 (API 0회)
//   node scripts/theme-thumbs/generate-theme-thumbs.mjs leave-or-stay     # 1종 (API 1회)
//   node scripts/theme-thumbs/generate-theme-thumbs.mjs all               # 12종 (누락분만)
//   node scripts/theme-thumbs/generate-theme-thumbs.mjs when-love --regen # 원본 폐기 후 재생성
//   node scripts/theme-thumbs/generate-theme-thumbs.mjs all --export-only # 조립만 (API 0회)
//   node scripts/theme-thumbs/generate-theme-thumbs.mjs --sheet           # 콘택트시트만
//
// ── 산출 ───────────────────────────────────────────────────────────────────────
//   원본  assets-src/theme-thumbs/raw/{id}-v2.png          (미추적 — 재실행 시 과금 0)
//   최종  public/images/theme-thumbs/{id}-v2.webp          🔴 경로 규약은 themes.ts 의
//                                                             themeThumbnailPath() 하나뿐이다
//   검수  assets-src/theme-thumbs/qa/contact-sheet-v2.webp (+ .png — 뷰어 호환)
//
// 🔴 raw 캐시 키에 버전이 들어간다 — v1 원본({id}.png)과 섞이면 «재생성했는데 옛 그림»이 된다.
//
// 🔴 자산 교체 시 **파일명 버전업**(-v2). 같은 이름 덮어쓰기는 폰 캐시가 옛 그림을 계속 쓴다.
// 🔴 Windows sharp 는 같은 경로 입출력이 write 실패한다 — 이 스크립트는 항상 다른 경로로 쓴다.
import { config } from 'dotenv'
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

// ⚠️ .env.local 은 **메인 체크아웃만** 로드한다. 워크트리(.claude/worktrees/*)의 .env.local 에는
//    폐기된 구 Gemini 키가 잔존하고, dotenv 는 먼저 설정된 값을 덮지 않는다(구키가 이긴다).
config({ path: 'D:/anti/haehwadang/.env.local' })

const MODEL = process.env.SHRINE_IMAGE_MODEL || 'gemini-3.1-flash-image'
const KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const SRC_ROOT = path.join(ROOT, 'assets-src', 'theme-thumbs')
const RAW_DIR = path.join(SRC_ROOT, 'raw')
const QA_DIR = path.join(SRC_ROOT, 'qa')
/** 🔴 UI 기와 공유하는 계약 경로. 한 글자도 바꾸지 않는다. */
const PUB_DIR = path.join(ROOT, 'public', 'images', 'theme-thumbs')
/** 🔴 파일명 버전. 올릴 때는 raw 캐시 키·콘택트시트 이름이 함께 따라간다(아래 rawPath·contactSheet). */
const VERSION = 'v2'

/** 최종 폭 — 허브 와이드 실렌더(448px)의 2배 조금 넘게. DPR2 폰에서 뭉개지지 않는 최소치. */
const OUT_W = 960
/** 장당 목표 용량. 초과하면 q 를 내려 다시 굽는다. */
const MAX_BYTES = 100 * 1024

// ════════════════════════════ 스타일 — 12장을 한 피드에 세우는 끈 ════════════════════════════
/**
 * 🔴 12장은 **한 화면에 나란히 선다.** 그래서 개별 완성도보다 **결의 일치**가 먼저다.
 * 아래 넷을 전 장에서 고정한다 — 색온도(호박빛) · 광질(단일 저각 광원 + 깊은 그림자) ·
 * 렌즈(35mm 얕은 심도) · 팔레트(놋쇠 / 호두나무 / 한지 크림 / 먹빛 그림자).
 * 개별 장면에서 광원의 «방향»만 달라진다.
 */
const STYLE =
  'photorealistic cinematic film still, shot on a 35mm prime lens at wide aperture, shallow depth of field, ' +
  'a single warm amber light source with deep soft shadows falling away from it, low-key exposure, ' +
  'muted contemporary palette of warm grey concrete, pale oak, brushed steel and cream linen, ' +
  'warm evening white balance, fine natural film grain'

/** 드라마 포스터 쪽 — 유튜브의 «싸구려 어그로»가 아니라 한 컷의 정황. */
const LEAD = 'Cinematic film still from a present-day Korean drama set in contemporary Seoul, 16:9 wide framing'
/**
 * 기존 파이프라인(generate-icons.mjs · 마스터 §10-2)이 쓰는 꼬리에 **숫자·간판**을 더했다.
 * 현대 생활 장면은 한옥보다 글자 유발이 세다 — 영수증의 숫자, 문의 호수, 거리의 간판.
 */
const TAIL = 'no text, no letters, no numbers, no signage, no watermark'

/**
 * 테마 12종 — 1차 출하분(themes.ts `shipped: true`).
 *
 * `scene` 은 **관찰 가능한 사실만** 적는다. 「지쳐 보이는」(해석) ✗ / 「팔을 괴고 응시하는」(관찰) ○
 * `origin` 은 그 컨셉이 어느 기획서 몇 줄에서 왔는지 — 반려·재생성 때 원안으로 돌아가는 길이다.
 */
const THUMBS = {
  // ── 직장 (PLAN-theme-career-wealth-v1 §5 C-1·C-2) ───────────────────────────
  'leave-or-stay': {
    origin: '직장·재물 C-1 — 떠남의 물건과 머무름의 물건이 한 화면에',
    // 기획 원안의 «옆얼굴»을 뒷모습으로 바꿨다(계약 ②). 창밖을 보는 등은 옆얼굴보다 더 «망설임»이다.
    // v1 에서 유일하게 현대였던 컷 — v2 에서는 이쪽이 기준이고 나머지 11장이 여기로 온다.
    // 1차 반려: 「already going dark(이미 어두워지는)」가 **한밤의 파란 야경**을 불러 12장 중 가장
    // 푸르렀다. 시각을 해 지기 직전으로 당긴다 — 창밖이 주광원이라 이 한 마디가 화면 전체를 정한다.
    scene:
      'a person standing at the left of the frame in front of a floor-to-ceiling office window, seen from ' +
      'behind, both shoulders squared toward the glass, the last orange sunset light on the city towers ' +
      'outside, a long ' +
      'wool coat hanging over the back of a mesh office chair in the right foreground, a closed laptop and a ' +
      'paper cup of cold coffee on the desk beside the chair, low evening sun entering from the right and ' +
      'laying the window mullion shadows across the carpet',
  },
  'what-next': {
    origin: '직장·재물 C-2 — 세 갈래 = R14(취업/멈춤/재창업) 세 갈래',
    // 한옥 세 갈래 복도 → **심야 지하철 환승 통로**. 현대 한국인이 실제로 «갈림길»을 서 있는 자리다.
    // 1차 반려: 갈래 셋은 읽혔지만 **12장 중 가장 차가운 회색**으로 와 결이 갈렸다. 지하철 형광등은
    // 실물이 백색이라 모델이 그리로 간다. 광원 자체를 호박빛으로 못박아 나머지 11장 쪽으로 당긴다.
    scene:
      'a person standing at the left of the frame inside an empty late-night subway transfer concourse, seen ' +
      'from behind with a backpack over one shoulder, three tunnel passages opening ahead of them, each ' +
      'passage lit by its own strip of warm amber ceiling light, the tiled walls plain and bare, a folded ' +
      'jacket under their arm, the warm light pooling on the floor between the passages',
  },

  // ── 재물 (PLAN-theme-career-wealth-v1 §5 W-1·W-2) ───────────────────────────
  'nothing-left': {
    origin: '직장·재물 W-1 — 사람이 없는 유일한 컷. 「새는 자리」는 물건으로 그리는 게 정확하다',
    // 놋대야 물 새기 → **식탁 위 영수증 더미와 얇아진 지갑**(CEO 예시). 영수증은 숫자를 부르는
    // 소재라 관찰 사실로 잠근다.
    // 1차 반려: 「blank and faded(비어 있고 바랜)」로는 안 잠겼다 — 종이마다 **흐린 인쇄 글줄**이
    // 깔려 나왔다(계약 ①). «바랜»은 글자가 있어도 참이 되는 말이라 소용이 없었다.
    // 관찰 사실 1개 교체: 「종이 면이 민백지이고 인쇄가 없다」 — 글자의 부재 자체를 사실로 박는다.
    scene:
      'a heap of pale curled receipt slips spilling across a pale oak dining table, seen from slightly above, ' +
      'the paper surfaces plain white and unprinted, a slim leather card wallet lying open and flat beside the heap, ' +
      'a few coins scattered at the right edge of the table, warm evening light entering from a window on ' +
      'the upper left',
  },
  'money-self': {
    origin: '직장·재물 W-2 — 손만 보인다. 밀린 쪽과 남은 한 닢',
    // 1차 반려: 동전 면에 **100·500 액면 숫자**가 또렷하게 찍혀 나왔다(계약 ①). 꼬리의 no numbers
    // 로는 안 막힌다 — «동전에는 숫자가 있다»가 소재에 붙어 있기 때문이다.
    // 관찰 사실 1개 추가: 「동전 면이 닳아 매끈하고 비어 있다」. 닳은 동전은 테마와도 맞는다.
    // 2차 반려: 숫자는 사라졌으나 **손이 네 개**로 왔다(위아래 한 쌍씩) — 마주 앉은 두 사람으로
    // 읽혀 테마가 «거래·상담»으로 틀어진다. 「two hands」만으로는 사람 수가 안 정해진다.
    // 규율 ③(방향 명시)로 잠근다: 팔뚝 둘이 **화면 앞쪽 가장자리에서** 들어온다 = 한 사람이다.
    scene:
      'the two hands of one person resting on a pale oak table seen from directly above, both forearms ' +
      'entering the frame from the near edge of the table, a pile of coins with faces worn smooth ' +
      'and blank pushed to the left half of the table beside a torn-open empty envelope, one single coin left ' +
      'resting on the right edge of the table, a smartphone lying face down between the hands, ' +
      'warm lamp light from the upper left',
  },

  // ── 연애 (PLAN-theme-love-v1 §5 L1~L3) ──────────────────────────────────────
  'attracts-me': {
    origin: '연애 L1 — 맞은편 자리가 비어 있고 빛이 그 위로 번진다',
    // 방석 두 장의 다과상 → **카페 2인석**. 비어 있는 쪽이 맞은편이라는 사실은 그대로.
    scene:
      'a small two-seat café table beside a window, two paper cups placed on it, a knitted scarf folded over ' +
      'the chair on the near side, the chair on the far side empty, warm late afternoon sun spreading across ' +
      'the seat of the empty chair, seen slightly from above',
  },
  'same-type': {
    origin: '연애 L2 — 같은 문 셋 중 늘 열리는 그 문',
    // 한지 문짝 셋 → **아파트 현관문 셋**. 호수 표기가 글자를 부르므로 「면이 평평하고 민짜」를 박는다.
    // 1차 반려: 글자는 0 이었으나 문·벽이 다 회색 어둠이라 **128px 에서 검은 덩어리**가 됐다
    // (콘택트시트 하단 띠가 정본 — 320px 에서는 멀쩡해 보였다). 문 자체를 따뜻한 회색으로 올린다.
    scene:
      'three identical warm grey apartment front doors standing in a row along a concrete corridor wall, the ' +
      'wall flat and parallel to the camera, the door surfaces flat and plain and evenly washed by a warm ' +
      "ceiling light, the middle door open a hand's width " +
      'with warm light falling through the gap onto the corridor floor, one pair of white sneakers placed ' +
      'neatly in front of the open door, seen straight on',
  },
  'when-love': {
    origin: '연애 L3 — 사계절 4폭(원안 병풍), 세 번째 앞의 표식(= 때를 짚는다)',
    // 병풍 → **창턱의 화분 넷**. 계절 넷이 한 줄로 늘어서는 구조와 «세 번째를 짚는다»가 그대로 산다.
    scene:
      'four small potted plants standing in a row on a wide apartment windowsill, seen straight on, the first ' +
      'in pale blossom, the second in full green leaf, the third with red leaves, the fourth a bare twig, a ' +
      'smartphone lying face down on the sill in front of the third pot, warm evening light entering from the left',
  },

  // ── 관상 (PLAN-theme-face-v1 §6 테마 1·2·6) ─────────────────────────────────
  // 기획 원안은 «수묵 옆얼굴 + 금색 성좌선»이었다. 실사에서 얼굴을 그리면 계약 ② 에 걸리므로
  // **역광 실루엣 · 뒷모습 · 사물**로 옮긴다. 금색 성좌선은 실사에서 «금빛 광점»이 된다.
  'first-impression': {
    origin: '관상 테마1 — 얼굴 앞 금색 점 셋(3초)',
    // v1 1차 반려: 「the face entirely in shadow」가 안 먹혀 **이목구비가 다 읽히는 옆얼굴**이 왔다
    // (실존 인물 오인 소지 = 계약 ②). v2 1차도 **같은 실패** — 「납작한 검은 덩어리」를 붙여도
    // 역광이 부드러우면 코·입·턱선이 그대로 살아난다. 두 번 같은 자리에서 미끄러졌으니
    // 형용사가 아니라 **카메라를 옮긴다**: 옆얼굴이 아니라 «뒤통수». 얼굴이 화면에 없으면
    // 조명이 어떻든 이목구비가 나올 자리가 없다. 금빛 점 셋은 머리 오른쪽으로 비킨다.
    scene:
      'the back of the head and shoulders of a person at the left of the frame, seen from directly behind and ' +
      'facing away toward a bright glass office lobby, the head and shoulders reading as one flat dark shape, ' +
      'three small round points of golden light hanging in the air in a level row close beside the head, ' +
      'warm backlight flaring around the shoulder',
  },
  'easy-to-ask': {
    origin: '관상 테마2 — 반쯤 열린 문짝, 문틈으로 새는 금빛',
    scene:
      "an apartment front door standing open a hand's width at the center of the frame with warm golden light " +
      'spilling through the gap onto a grey concrete corridor floor, a person seen from behind at the left ' +
      'edge of the frame with their shoulders turned toward the door, the rest of the corridor resting in ' +
      'deep shadow',
  },
  'five-faces': {
    origin: '관상 테마6 — 옆얼굴 다섯이 부채꼴, 가운데 하나만 금색',
    // 얼굴 다섯을 실사로 그리면 정면 얼굴이 다섯 장 나온다 → 「얼굴을 비추는 물건」인 거울로 옮긴다.
    scene:
      'five oval mirrors with thin brushed steel frames standing upright in a fan arrangement on a pale oak ' +
      'table, seen straight on, the center mirror catching warm golden lamplight while the four beside it ' +
      'stay in shadow, the mirror glass reflecting the dark empty room behind the camera',
  },

  // ── 풍수 (PLAN-theme-fengshui-v1 §4 테마1·2) ────────────────────────────────
  'moving-day': {
    origin: '풍수 테마1 — 원안의 «달력 + 놋쇠 나경». 달력의 날짜가 글자를 부른다',
    // 그래서 달력을 **창 격자 그림자**로 바꿨다 — 달력 그리드와 같은 것을 글자 없이 그린다.
    // v2 에서는 그 격자가 한옥 창살이 아니라 아파트 창틀에서 떨어진다.
    // 1차 반려: 「morning(아침)」이 흰 대낮빛을 불러 12장 중 둘째로 차가웠다 → 저녁빛으로 옮긴다.
    // 격자는 해가 낮을수록 바닥에 길게 눕는다(테마에도 더 맞는다).
    scene:
      'low orange evening sunlight passing through a wide window frame and casting a grid of bright rectangles ' +
      'across a pale oak apartment floor, a round brass compass with concentric engraved rings resting on the ' +
      'floor inside one of the lit rectangles, a folded steel tape measure placed at the right edge of the ' +
      'light, the light entering from the left',
  },
  'house-or-timing': {
    origin: '풍수 테마2 — 현관에서 본 해질녘 빈 거실, 아직 안 푼 이사 상자',
    // v1 1차 반려: 상자 옆면에 **깨진 한글**이 손글씨로 적혀 나왔다(계약 ①). 상자는 이 프로젝트에서
    // 가장 강한 글자 유발 소재다 — «이삿짐 상자에는 내용물을 적는다»가 학습돼 있다.
    // 관찰 사실 1개 추가: 「옆면이 맨 크라프트지이고 넓은 갈색 테이프로 봉해져 있다」.
    scene:
      'an empty apartment living room seen from the entrance hall at dusk, plain brown cardboard moving boxes ' +
      'still stacked against the wall on the right, the box sides showing bare kraft cardboard sealed with ' +
      'wide brown packing tape, a single key ring lying on the bare floor in the foreground, one floor lamp ' +
      'lit in the far left corner, low orange sunset light entering through a wide window on the left and ' +
      'stretching across the floor',
  },
}

const IDS = Object.keys(THUMBS)

export const buildPrompt = (id) => `${LEAD}: ${THUMBS[id].scene}. ${STYLE}, ${TAIL}`

// ════════════════════════════ 출하 목록 대조 — 표가 두 벌이 되는 것을 막는다 ════════════════════════════
/**
 * `themes.ts` 의 `shipped: true` 집합과 이 표가 어긋나면 경고한다.
 * (UI 기가 테마를 켜고 끄는 중이므로 **막지는 않는다** — 알려만 준다.)
 */
function crossCheckShipped() {
  const file = path.join(ROOT, 'lib', 'domain', 'theme-fortune', 'themes.ts')
  if (!existsSync(file)) return
  const src = readFileSync(file, 'utf8')
  const shipped = [...src.matchAll(/id: '([a-z0-9-]+)',[\s\S]*?shipped: (true|false),/g)]
    .filter((m) => m[2] === 'true')
    .map((m) => m[1])
  const missing = shipped.filter((id) => !IDS.includes(id))
  const extra = IDS.filter((id) => !shipped.includes(id))
  if (missing.length) console.warn('⚠️ themes.ts 에는 출하인데 이 표에 없음:', missing.join(', '))
  if (extra.length) console.warn('⚠️ 이 표에는 있는데 themes.ts 는 미출하:', extra.join(', '))
  if (!missing.length && !extra.length) console.log(`✔ 출하 목록 일치 — ${shipped.length}종`)
}

// ════════════════════════════ 생성 ════════════════════════════
let apiCalls = 0

/**
 * 16:9 생성 — **REST 직접 호출**.
 * 설치된 SDK(@google/generative-ai 0.24.1)에는 `generationConfig.imageConfig` 가 없어 aspectRatio 가
 * 조용히 누락된다(정사각이 온다). 그래서 이 경로만 fetch 로 직접 친다.
 * 실측 허용값: aspectRatio ∈ 1:1·2:3·3:2·3:4·4:3·4:5·5:4·9:16·16:9·21:9 / imageSize ∈ 512·1K·2K·4K
 * 16:9 @1K = 1344×768 → 최종 960 폭으로 내려 굽는다(다운스케일이라 뭉개지지 않는다).
 */
async function generate(prompt) {
  if (!KEY) throw new Error('GEMINI 키 없음 — 메인 체크아웃 .env.local 의 GOOGLE_GENERATIVE_AI_API_KEY 확인')
  apiCalls += 1
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { imageConfig: { aspectRatio: '16:9', imageSize: '1K' } },
    }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${text.slice(0, 300)}`)
  const img = JSON.parse(text)?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData
  if (!img) throw new Error('이미지 파트 없음 — 응답: ' + text.slice(0, 300))
  return Buffer.from(img.data, 'base64')
}

/** 🔴 버전이 캐시 키에 들어간다 — v1 원본과 섞이면 재생성이 조용히 옛 그림을 재사용한다. */
const rawPath = (id) => path.join(RAW_DIR, `${id}-${VERSION}.png`)
const pubPath = (id) => path.join(PUB_DIR, `${id}-${VERSION}.webp`)

/** 원본 → 960 폭 webp. 용량 상한에 닿을 때까지 q 를 내린다(85 → 45). */
async function exportOne(id) {
  const src = rawPath(id)
  if (!existsSync(src)) return null
  const buf = await readFile(src) // 🔴 경로 입출력을 겹치지 않게 버퍼로 받는다(Windows sharp)
  const base = sharp(buf).resize({ width: OUT_W, withoutEnlargement: true })
  for (const quality of [85, 78, 72, 66, 60, 54, 48]) {
    const out = await base.clone().webp({ quality, effort: 6 }).toBuffer()
    if (out.length <= MAX_BYTES || quality === 48) {
      await mkdir(PUB_DIR, { recursive: true })
      await writeFile(pubPath(id), out)
      const meta = await sharp(out).metadata()
      console.log(`  ✔ ${id}-${VERSION}.webp  ${meta.width}×${meta.height}  ${(out.length / 1024).toFixed(1)}KB (q${quality})`)
      return { id, bytes: out.length, quality, width: meta.width, height: meta.height }
    }
  }
  return null
}

// ════════════════════════════ 콘택트시트 — 육안이 정본 ════════════════════════════
/**
 * 위: 4열×3행 320px 타일(무엇이 그려졌는지 판정) / 아래: 12장을 128px 로 늘어놓은 띠
 * (실렌더에 가까운 크기에서 «한 피드에 서는가»를 본다 — 원본 1344 에서 보면 전부 좋아 보인다).
 */
async function contactSheet() {
  const items = IDS.filter((id) => existsSync(pubPath(id)))
  if (!items.length) return console.log('콘택트시트: 최종본이 없다')

  const TILE_W = 320, TILE_H = 180, GAP = 10, COLS = 4, LABEL = 18
  const rows = Math.ceil(items.length / COLS)
  const gridW = COLS * TILE_W + (COLS + 1) * GAP
  const gridH = rows * (TILE_H + LABEL) + (rows + 1) * GAP

  const SM_W = 128, SM_H = 72, SM_GAP = 6
  const stripH = SM_H + SM_GAP * 2
  const stripW = items.length * (SM_W + SM_GAP) + SM_GAP
  const W = Math.max(gridW, stripW)
  const H = gridH + stripH + GAP

  const layers = []
  const labels = []
  for (const [i, id] of items.entries()) {
    const col = i % COLS, row = Math.floor(i / COLS)
    const left = GAP + col * (TILE_W + GAP)
    const top = GAP + row * (TILE_H + LABEL + GAP)
    layers.push({
      input: await sharp(await readFile(pubPath(id))).resize(TILE_W, TILE_H, { fit: 'cover' }).png().toBuffer(),
      left, top,
    })
    labels.push(`<text x="${left}" y="${top + TILE_H + 13}" font-family="monospace" font-size="12" fill="#C9A84C">${id}</text>`)
    // 하단 띠 — 실렌더 근사
    layers.push({
      input: await sharp(await readFile(pubPath(id))).resize(SM_W, SM_H, { fit: 'cover' }).png().toBuffer(),
      left: SM_GAP + i * (SM_W + SM_GAP),
      top: gridH + GAP + SM_GAP,
    })
  }
  layers.push({ input: Buffer.from(`<svg width="${W}" height="${H}">${labels.join('')}</svg>`), left: 0, top: 0 })

  await mkdir(QA_DIR, { recursive: true })
  const sheet = sharp({ create: { width: W, height: H, channels: 3, background: '#14100C' } }).composite(layers)
  const name = `contact-sheet-${VERSION}`
  await writeFile(path.join(QA_DIR, `${name}.webp`), await sheet.clone().webp({ quality: 88 }).toBuffer())
  // .png 동반 산출 — webp 를 못 여는 뷰어·툴에서도 육안 검수가 되게
  await writeFile(path.join(QA_DIR, `${name}.png`), await sheet.clone().png().toBuffer())
  console.log(`✔ 콘택트시트 ${W}×${H} — ${items.length}장  →  ${path.join(QA_DIR, `${name}.webp`)}`)
}

// ════════════════════════════ 진입 ════════════════════════════
const args = process.argv.slice(2)
const flags = new Set(args.filter((a) => a.startsWith('--')))
const positional = args.filter((a) => !a.startsWith('--'))
const targets = positional.length && positional[0] !== 'all' ? positional : IDS

for (const id of targets) {
  if (!THUMBS[id]) {
    console.error(`알 수 없는 테마 id: ${id}\n가능한 값: ${IDS.join(' ')}`)
    process.exit(1)
  }
}

if (flags.has('--plan')) {
  crossCheckShipped()
  for (const id of targets) {
    console.log(`\n── ${id} ──\n[근거] ${THUMBS[id].origin}\n${buildPrompt(id)}`)
  }
  console.log(`\n대상 ${targets.length}종 · API 0회(계획 모드)`)
} else if (flags.has('--sheet')) {
  await contactSheet()
} else {
  crossCheckShipped()
  await mkdir(RAW_DIR, { recursive: true })
  for (const id of targets) {
    if (flags.has('--regen') && existsSync(rawPath(id))) await rm(rawPath(id))
    if (!flags.has('--export-only') && !existsSync(rawPath(id))) {
      console.log(`gen ${id}`)
      try {
        await writeFile(rawPath(id), await generate(buildPrompt(id)))
      } catch (e) {
        console.error('  ✖', id, String(e?.message || e).slice(0, 220))
        continue
      }
    }
    await exportOne(id)
  }
  console.log(`\nAPI 호출 ${apiCalls}회`)
  await contactSheet()
}
