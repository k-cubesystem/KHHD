// 인기테마운세 썸네일 — 실사(포토리얼) 16:9 생성 파이프라인
//
// ── 왜 실사인가 ────────────────────────────────────────────────────────────────
// CEO 지시(2026-08-13): "인기테마운세 섹션 썸네일이 너무 허전해. 실제 느낌이 나게 전체적인
// 이미지와 (실사) 제목을 잘 기획해줘, 유튜브처럼."
// 기획서(PLAN-theme-{career-wealth,love,face,fengshui}-v1.md)의 §썸네일 컨셉은 **일러스트 전제**로
// 쓰여 있었다. 소재·구도·방향은 그대로 승계하고 **스타일만 실사로 번안**한다.
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
//   원본  assets-src/theme-thumbs/raw/{id}.png          (미추적 — 재실행 시 과금 0)
//   최종  public/images/theme-thumbs/{id}-v1.webp       🔴 UI 기가 이 경로를 상수로 쥐고 있다
//   검수  assets-src/theme-thumbs/qa/contact-sheet.webp (+ .png — 뷰어 호환)
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
const VERSION = 'v1'

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
  'a single warm amber light source with deep soft shadows falling away from it, ' +
  'muted earthy Korean palette of aged brass, dark walnut wood and cream hanji paper, fine natural film grain'

/** 드라마 포스터 쪽 — 유튜브의 «싸구려 어그로»가 아니라 한 컷의 정황. */
const LEAD = 'Cinematic film still from a Korean drama, 16:9 wide framing'
/** 기존 파이프라인(generate-icons.mjs · 마스터 §10-2)이 쓰는 꼬리를 그대로 승계한다. */
const TAIL = 'no text, no letters, no watermark'

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
    scene:
      'a person standing beside a tall office window at the left of the frame, seen from behind, ' +
      'both shoulders squared toward the glass, a long wool coat hanging over the back of a desk chair ' +
      'in the right foreground, an open laptop with a dark screen and a half-full mug of cold coffee ' +
      'on the desk beside the chair, late afternoon sun entering from the right and laying the window ' +
      "frame's shadow across the floor",
  },
  'what-next': {
    origin: '직장·재물 C-2 — 세 갈래 = R14(취업/멈춤/재창업) 세 갈래',
    scene:
      'a person seated at a desk at the left of the frame at night, seen from behind, an open doorway ' +
      'ahead of them leading to a corridor that branches into three passages, each passage lit by its own ' +
      'small ceiling lamp, an uncapped fountain pen and a blank sheet of paper on the desk, ' +
      'one desk lamp lighting the paper from the upper left',
  },

  // ── 재물 (PLAN-theme-career-wealth-v1 §5 W-1·W-2) ───────────────────────────
  'nothing-left': {
    origin: '직장·재물 W-1 — 사람이 없는 유일한 컷. 「새는 자리」는 물건으로 그리는 게 정확하다',
    scene:
      'a brass basin filled to the brim with water resting on a low walnut table, seen from slightly above, ' +
      'a thin stream of water running out through a seam on the right side of the basin and falling to the ' +
      'dark floor below, a folded dry cotton cloth on the table to the right of the basin, ' +
      'warm lamp light entering from the upper left',
  },
  'money-self': {
    origin: '직장·재물 W-2 — 손만 보인다. 밀린 쪽과 남은 한 닢',
    scene:
      'two hands resting on a low walnut table seen from directly above, a pile of old brass coins pushed ' +
      'to the left half of the table, an open cloth pouch lying beside the pushed pile, one single coin left ' +
      'resting on the right edge of the table, warm lamp light from the upper left',
  },

  // ── 연애 (PLAN-theme-love-v1 §5 L1~L3) ──────────────────────────────────────
  'attracts-me': {
    origin: '연애 L1 — 맞은편 방석이 비어 있고 빛이 그 위로 번진다',
    scene:
      'a low walnut tea table lit by one oil lamp, two celadon tea cups placed on it, a floor cushion on the ' +
      'near side holding a folded ivory shawl, the cushion on the far side empty, warm lamplight spreading ' +
      'across the empty cushion, seen slightly from above',
  },
  'same-type': {
    origin: '연애 L2 — 같은 문 셋 중 늘 열리는 그 문',
    scene:
      'three identical dark wooden doors standing in a row along a hanji-papered wall, the middle door open ' +
      "a hand's width with warm light falling through the gap onto the wooden floor, one pair of white cotton " +
      'shoes placed neatly in front of the open door, seen straight on',
  },
  'when-love': {
    origin: '연애 L3 — 사계절 4폭 병풍, 세 번째 폭 앞의 요령(= 달을 짚는다)',
    // 병풍의 서예가 글자를 부른다 → 「가지와 꽃만 그려진」으로 소재를 옮겨 잠근다(계약 ①).
    scene:
      'a four-panel folding screen standing against a hanji wall, each panel painted only with branches of a ' +
      'different season — plum blossom, green leaves, red maple, a bare winter branch — a small brass hand bell ' +
      'resting on the wooden floor in front of the third panel, warm lamp light entering from the left, seen straight on',
  },

  // ── 관상 (PLAN-theme-face-v1 §6 테마 1·2·6) ─────────────────────────────────
  // 기획 원안은 «수묵 옆얼굴 + 금색 성좌선»이었다. 실사에서 얼굴을 그리면 계약 ② 에 걸리므로
  // **역광 실루엣 · 뒷모습 · 사물**로 옮긴다. 금색 성좌선은 실사에서 «금빛 광점»이 된다.
  'first-impression': {
    origin: '관상 테마1 — 얼굴 앞 금색 점 셋(3초)',
    // 1차 반려: 「the face entirely in shadow」가 안 먹혀 **이목구비가 다 읽히는 옆얼굴**이 왔다
    // (실존 인물 오인 소지 = 계약 ②). 규율대로 설명을 늘리지 않고 **관찰 사실 1개**만 더한다 —
    // 「머리와 어깨가 하나의 납작한 검은 덩어리로 보인다」. 해석이 아니라 눈에 보이는 상태다.
    scene:
      'the head and shoulders of a person at the left of the frame seen as a rim-lit silhouette against a ' +
      'bright window, the body facing right, the face entirely in shadow, the head and shoulders reading as ' +
      'one flat dark shape, three small round points of golden light floating in the air in a level row in ' +
      'front of the silhouette, warm backlight flaring around the shoulder',
  },
  'easy-to-ask': {
    origin: '관상 테마2 — 얼굴 뒤 반쯤 열린 한지 문짝, 문틈으로 새는 금빛',
    scene:
      "a hanji sliding door standing open a hand's width at the center of the frame with warm golden light " +
      'spilling through the gap onto a dark wooden floor, a person seen from behind at the left edge of the ' +
      'frame with their shoulders turned toward the door, the rest of the room resting in deep shadow',
  },
  'five-faces': {
    origin: '관상 테마6 — 옆얼굴 다섯이 부채꼴, 가운데 하나만 금색',
    // 얼굴 다섯을 실사로 그리면 정면 얼굴이 다섯 장 나온다 → 「얼굴을 비추는 물건」인 손거울로 옮긴다.
    scene:
      'five oval brass-framed hand mirrors standing upright in a fan arrangement on a walnut table, seen ' +
      'straight on, the center mirror catching warm golden lamplight while the four beside it stay in shadow, ' +
      'the mirror glass reflecting the dark empty room behind the camera',
  },

  // ── 풍수 (PLAN-theme-fengshui-v1 §4 테마1·2) ────────────────────────────────
  'moving-day': {
    origin: '풍수 테마1 — 원안의 «달력 + 놋쇠 나경». 달력의 날짜가 글자를 부른다',
    // 그래서 달력을 **창살 그림자의 격자**로 바꿨다 — 달력 그리드와 같은 것을 글자 없이 그린다.
    scene:
      'warm morning sunlight passing through a latticed hanji door and casting a grid of bright rectangles ' +
      'across a dark wooden floor, a round brass compass with concentric engraved rings resting on the floor ' +
      'inside one of the lit rectangles, a folded cotton bundle placed at the right edge of the light, ' +
      'the light entering from the left',
  },
  'house-or-timing': {
    origin: '풍수 테마2 — 현관에서 본 해질녘 빈 거실, 아직 안 푼 이사 상자',
    // 1차 반려: 상자 옆면에 **깨진 한글**이 손글씨로 적혀 나왔다(계약 ①). 상자는 이 프로젝트에서
    // 가장 강한 글자 유발 소재다 — «이삿짐 상자에는 내용물을 적는다»가 학습돼 있다.
    // 관찰 사실 1개 추가: 「옆면이 맨 크라프트지이고 넓은 갈색 테이프로 봉해져 있다」.
    scene:
      'an empty living room seen from the entrance hall at dusk, plain brown cardboard moving boxes still ' +
      'stacked against the wall on the right, the box sides showing bare kraft cardboard sealed with wide ' +
      'brown packing tape, one floor lamp lit in the far left corner, low orange sunset light entering ' +
      'through a wide window on the left and stretching across a bare wooden floor',
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

const rawPath = (id) => path.join(RAW_DIR, `${id}.png`)
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
  await writeFile(path.join(QA_DIR, 'contact-sheet.webp'), await sheet.clone().webp({ quality: 88 }).toBuffer())
  // .png 동반 산출 — webp 를 못 여는 뷰어·툴에서도 육안 검수가 되게
  await writeFile(path.join(QA_DIR, 'contact-sheet.png'), await sheet.clone().png().toBuffer())
  console.log(`✔ 콘택트시트 ${W}×${H} — ${items.length}장  →  ${path.join(QA_DIR, 'contact-sheet.webp')}`)
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
