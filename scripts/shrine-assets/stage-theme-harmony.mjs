// 테마 무대 「한 붓의 무대」 — 배경·살림 조화 재설계 파이프라인 (PLAN-stage-harmony-v1)
//
// ── 왜 또 만드는가 ─────────────────────────────────────────────────────────────
// 현 정본(stage-theme-scene.mjs)은 **뮤럴 단독**으로 검수해 통과했다. 그런데 사용자가 보는 화면은
// 뮤럴 위에 단상·제단·선반장·현판·신위가 얹힌 **합성 화면**이고, 그 화면으로 검수한 적이 없다.
// CEO 실기기 반려(2026-08-09): "배경이미지와 선반·제단·간판이 어우러지지 않는다 … 서로 설계를
// 합쳐서 배경을 다시 설계하라."
//
// 진단 3가지(PLAN §0)와 이 스크립트의 처방:
//   ① 그림 속 가구의 경쟁  → 중앙 샷에서도 **가구·기물을 전부 뺀다**. scene.mjs 는 중앙에서
//      원화의 제단·기물을 «그대로 둔다»고 못박았는데(그 파일 centerPrompt 주석), 그 한 줄이
//      "방 안에 방을 또 차리는" 그림의 근원이었다. 이 파이프라인의 유일한 본질적 차이다.
//   ② 화풍·광원 계보 분리  → 참조 이미지에 **실제 살림 스프라이트**(단상·제단 상판·사방탁자)를
//      한 장의 「살림 화풍 카드」로 묶어 주입한다. 원화는 색·세계 앵커, 살림은 붓·빛 앵커다.
//   ③ 좌우 벽 밀도 공백    → "비었지만 다 그린 벽"을 관찰 가능한 사실로 서술한다(패널 리듬·재질·
//      상부 보 띠). 「no furniture」만 적으면 모델은 허연 벽을 준다.
//
// ── stage-theme-scene.mjs 와의 관계 ──────────────────────────────────────────
// 그 파일은 **원복 레버로 존치**한다(한 글자도 건드리지 않았다). 조립·슬라이스·크로스페이드·
// 이음새 게이트·용량 사다리·팔레트 앵커는 그 파일의 규약을 그대로 승계했다 — 검증된 수학을
// 다시 쓰는 것이 목적이지 새로 짜는 것이 목적이 아니다.
//
// ── 이 파이프라인의 두 번째 몫: 판정 단위를 바꾼다 ────────────────────────────
// 뮤럴만 보고 판정하지 않는다. 후보 뮤럴 위에 **기하 정본의 실좌표·실스케일**로 살림을 얹은
// 합성판을 굽는다. 좌표는 한 벌도 새로 적지 않고 **소스에서 뽑아 온다**(readContracts) —
// 손으로 옮겨 적는 순간 QA판이 라이브와 다른 방을 그리게 되고, 그때부터 검수는 거짓말이 된다.
//
// 산출(전부 assets-src — public 라이브 자산은 이 스크립트가 **쓰지 않는다**):
//   assets-src/shrine/harmony-pilot/{code}/r{N}/{center,left,right}.png   원본 3샷(캐시 = 라운드 격리)
//   assets-src/shrine/harmony-pilot/{code}/r{N}/{wall,floor}.webp         후보 뮤럴
//   assets-src/shrine/harmony-pilot/{code}/style-card.webp                살림 화풍 카드(참조 주입분)
//   assets-src/shrine/harmony-pilot/{code}/qa/r{N}-wide.webp              전폭 합성판(3.2화면)
//   assets-src/shrine/harmony-pilot/{code}/qa/r{N}-view-{center,left,right}.webp  1화면 합성판
//   assets-src/shrine/harmony-pilot/{code}/qa/live-*.webp                 현행 라이브 뮤럴 합성판
//   assets-src/shrine/harmony-pilot/{code}/qa/r{N}-compare-{center,right}.webp  현행 vs 후보
//
// 사용:
//   node scripts/shrine-assets/stage-theme-harmony.mjs banga --plan       # 프롬프트만 (API 0회)
//   node scripts/shrine-assets/stage-theme-harmony.mjs banga              # 1라운드 풀코스 (API 3회)
//   node scripts/shrine-assets/stage-theme-harmony.mjs banga --round 2 --from 1 --regen left,right
//        ↳ 2라운드: center 는 1라운드 것을 물려받고 left·right 만 다시 그린다 (API 2회)
//   node scripts/shrine-assets/stage-theme-harmony.mjs banga --round 1 --assemble-only  # 조립·QA만
//   node scripts/shrine-assets/stage-theme-harmony.mjs banga --live       # 현행 라이브 합성판만 (API 0회)
//
// 규율
//   - STYLE 문구는 stage-banga.mjs → … → stage-theme-scene.mjs 로 이어온 원문을 **한 글자도**
//     바꾸지 않고 복제한다(살림 스프라이트가 그 문구로 구워졌다 — 붓이 갈리면 안 된다).
//   - 프롬프트는 **관찰 가능한 사실**만 적는다. 메타 지시(CRITICAL/must NOT)를 넣으면 캐릭터
//     시트가 나온다(feedback_image_prompt_rules). 반려는 «설명 늘리기»가 아니라 «사실 1개 추가»로 갚는다.
//   - 접지 그림자를 굽지 않는다(런타임 담당). 라운드 원본은 지우지 않는다(라운드 폴더 격리).
//   - API 예산 = 그릴 샷 수. 재시도 루프가 없으므로 이 상한을 넘으면 곧 버그다.
import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from 'dotenv'
import { mkdir, writeFile, readFile, rm, copyFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

// ⚠️ .env.local 은 **메인 체크아웃만** 로드한다(scene.mjs 와 같은 이유 — 워크트리에는 폐기된 구키가 잔존하고
//    dotenv 는 먼저 설정된 값을 덮지 않는다). 이 스크립트는 .env 내용을 읽어 출력하지 않는다.
config({ path: 'D:/anti/haehwadang/.env.local' })

const MODEL = process.env.SHRINE_IMAGE_MODEL || 'gemini-3.1-flash-image'
const KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const PUB = path.join(ROOT, 'public')
const STAGE_ROOT = path.join(PUB, 'shrine', 'stage')
const THEME_ART = path.join(PUB, 'shrine', 'themes')
/** 공용 살림 스프라이트 — 테마가 바뀌어도 이 세 장은 그대로다(그래서 화풍 앵커가 될 수 있다) */
const COMMON_DIR = path.join(STAGE_ROOT, 'banga')
/** 시범 산출 루트 — **public 무접촉**이 이 파이프라인의 계약이다 */
const PILOT_ROOT = path.join(ROOT, 'assets-src', 'shrine', 'harmony-pilot')

let apiCalls = 0
let apiBudget = 0

// ════════════════════ 기하·좌표 — 전부 «소스에서» 읽는다 ════════════════════
// 숫자를 여기 다시 적지 않는다. 확산 사고의 대부분이 "같은 숫자 두 벌"에서 난다.
// 라이브 렌더가 바뀌면 이 스크립트는 **소리 내며 죽어야 한다** — 조용히 다른 방을 그리면 안 된다.

const GEO = JSON.parse(readFileSync(path.join(ROOT, 'lib', 'domain', 'shrine', 'theme-stage-geometry.json'), 'utf8'))

function srcOf(rel) {
  const p = path.join(ROOT, rel)
  if (!existsSync(p)) throw new Error(`정본 소스 없음: ${rel}`)
  return readFileSync(p, 'utf8')
}

/** 소스에서 상수 하나를 뽑는다. 못 찾으면 던진다 — 무증상 드리프트를 만들지 않는 것이 요점이다. */
function pluck(src, re, label) {
  const m = src.match(re)
  if (!m) throw new Error(`정본 상수 추출 실패: ${label} — 렌더 소스가 바뀌었다면 이 정규식도 함께 고칠 것`)
  return m
}
function pluckNum(src, re, label) {
  const v = Number(pluck(src, re, label)[1])
  if (!Number.isFinite(v)) throw new Error(`정본 상수가 숫자가 아님: ${label}`)
  return v
}
function pluckList(src, re, label) {
  const arr = pluck(src, re, label)[1]
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((v) => Number.isFinite(v))
  if (!arr.length) throw new Error(`정본 배열 추출 실패: ${label}`)
  return arr
}

function readContracts() {
  const room = srcOf('components/shrine/scene/ShrineRoomClient.tsx')
  const shelf = srcOf('lib/domain/shrine/family-shelf.ts')
  const hall = srcOf('components/shrine/scene/RitualHall.tsx')
  const stage = srcOf('lib/domain/shrine/stage.ts')

  const unitBlock = pluck(shelf, /FSHELF_UNIT\s*=\s*Object\.freeze\(\{([\s\S]*?)\}\)/, 'FSHELF_UNIT')[1]
  const tiersBlock = pluck(shelf, /FSHELF_TIERS\s*=\s*Object\.freeze\(\{([\s\S]*?)\n\}\)/, 'FSHELF_TIERS')[1]
  const sizeBlock = pluck(room, /const SIZE_PX[^=]*=\s*\{([^}]*)\}/, 'SIZE_PX')[1]
  // 의식각 좌표는 3fc2f4d(고정 살림 드래그 조절)에서 개별 const → 동결 객체로 모였다. 값은 그대로다
  // (x 88.75 · w 8.65 · top 20 · bottom 62) — 이 스크립트가 소리 내며 죽어 준 덕에 드리프트 없이 따라간다.
  const hallBlock = pluck(hall, /RITUAL_HALL_UNIT\s*=\s*Object\.freeze\(\{([^}]*)\}\)/, 'RITUAL_HALL_UNIT')[1]

  return {
    /** 방 컨테이너 실측 — 이 두 값이 렌더 스케일의 분모다 */
    roomW: pluckNum(room, /max-w-\[(\d+)px\]/, 'room max-w'),
    roomH: pluckNum(room, /height:\s*'min\(\d+vh,\s*(\d+)px\)'/, 'room height'),
    /** 아이템 표시 크기(md) · v2 스프라이트 em */
    itemMdPx: Number(pluck(sizeBlock, /md:\s*'(\d+(?:\.\d+)?)px'/, 'SIZE_PX.md')[1]),
    assetEm: pluckNum(room, /const ASSET_EM = ([\d.]+)/, 'ASSET_EM'),
    /** 제단 광원 — top 77% · 폭 64%(뷰포트 기준) · 높이 16% */
    glowTopPct: pluckNum(room, /top: '(\d+)%', width: scaleW\(\d+\)/, 'altar glow top'),
    glowWPct: pluckNum(room, /top: '\d+%', width: scaleW\((\d+)\)/, 'altar glow width'),
    glowHPct: pluckNum(room, /width: scaleW\(\d+\), height: '(\d+)%'/, 'altar glow height'),
    /** 신위 접지 계약 */
    podiumTopY: pluckNum(stage, /export const PODIUM_TOP_Y = ([\d.]+)/, 'PODIUM_TOP_Y'),
    deityHeadRoomY: pluckNum(stage, /export const DEITY_HEAD_ROOM_Y = ([\d.]+)/, 'DEITY_HEAD_ROOM_Y'),
    altarScale: pluckNum(stage, /const ALTAR_SCALE = ([\d.]+)/, 'ALTAR_SCALE'),
    /** 가족 선반장 */
    fshelfX: pluckList(shelf, /FSHELF_UNIT_X[^=]*=\s*Object\.freeze\(\[([^\]]*)\]\)/, 'FSHELF_UNIT_X'),
    fshelfW: Number(pluck(unitBlock, /w:\s*([\d.]+)/, 'FSHELF_UNIT.w')[1]),
    fshelfTop: Number(pluck(unitBlock, /top:\s*([\d.]+)/, 'FSHELF_UNIT.top')[1]),
    fshelfBottom: Number(pluck(unitBlock, /bottom:\s*([\d.]+)/, 'FSHELF_UNIT.bottom')[1]),
    fshelfFamilyTier: Number(pluck(tiersBlock, /family:\s*([\d.]+)/, 'FSHELF_TIERS.family')[1]),
    /** 의식각 */
    hallX: pluckNum(hallBlock, /x:\s*([\d.]+)/, 'RITUAL_HALL_UNIT.x'),
    hallW: pluckNum(hallBlock, /w:\s*([\d.]+)/, 'RITUAL_HALL_UNIT.w'),
    hallTop: pluckNum(hallBlock, /top:\s*([\d.]+)/, 'RITUAL_HALL_UNIT.top'),
    hallBottom: pluckNum(hallBlock, /bottom:\s*([\d.]+)/, 'RITUAL_HALL_UNIT.bottom'),
    plaqueCy: pluckList(hall, /const PLAQUE_CY = \[([^\]]*)\]/, 'PLAQUE_CY'),
    plaqueWPct: pluckNum(hall, /const PLAQUE_W_PCT = ([\d.]+)/, 'PLAQUE_W_PCT'),
    shelfSprite: pluck(hall, /const SHELF_SPRITE = '([^']+)'/, 'SHELF_SPRITE')[1],
  }
}

const C = readContracts()

/** 세계 폭(%) · 몇 화면인가 — 기하 정본에서 온다(320 → 3.2화면) */
const WORLD_WIDTH_PCT = GEO.worldWidth
const WORLD_SCREENS = WORLD_WIDTH_PCT / 100

/** 밴드 분할 — StageLayers.tsx 의 거울(62+40=102 → 2% 겹침이 렌더 규약) */
const BAND_WALL = 0.62
const BAND_FLOOR = 0.4

const PANO_H = 1280
const PANO_W = Math.round((PANO_H * WORLD_SCREENS * C.roomW) / C.roomH)
const OVERLAP_FRAC = 0.12
/**
 * 원샷 종횡비 — API 가 허용하는 값 중 목표(2.684:1)에 **세로가 남는 쪽**으로 가장 가까운 것.
 * 남는 세로는 잘라내면 되지만(무손실) 모자란 가로는 늘리거나 이어 붙여야 한다(왜곡·이음매).
 * 4:1 은 목표보다 넓어 가로를 33% 버려야 하므로 해상도 손해가 크다.
 */
const WIDE_ASPECT = process.env.SHRINE_WIDE_ASPECT || '21:9'
/** 원판 해상도 — 통짜는 한 장이 세계 전체를 감당하므로 4K 가 사실상 필수다(위 callModelAspect 주석). */
const WIDE_SIZE = process.env.SHRINE_WIDE_SIZE || '4K'
const SHOT_KEYS = ['left', 'center', 'right']
/** 생성 순서 — center 가 먼저여야 L·R 이 그것을 참조 이미지로 붙일 수 있다(계약) */
const GEN_ORDER = ['center', 'left', 'right']

function shotGeometry() {
  let w = Math.ceil(PANO_W / (3 - 2 * OVERLAP_FRAC))
  for (;;) {
    const ov = Math.round(w * OVERLAP_FRAC)
    const composed = 3 * w - 2 * ov
    if (composed >= PANO_W) return { shotW: w, ov, composed, crop: Math.floor((composed - PANO_W) / 2) }
    w += 1
  }
}
const SHOT = shotGeometry()

const WALL_H = Math.round(PANO_H * BAND_WALL)
const FLOOR_H = Math.round(PANO_H * BAND_FLOOR)
const FLOOR_TOP = PANO_H - FLOOR_H
const RENDER_SCALE = (C.roomH * BAND_WALL) / WALL_H

const MURAL_BUDGET_BYTES = 1.5 * 1024 * 1024
const MURAL_TARGET_BYTES = Math.round(MURAL_BUDGET_BYTES * 0.9)
const QUALITY_LADDER = [90, 86, 82, 78, 74, 70, 66, 62, 58, 54, 50]

const DARK = { r: 0x1a, g: 0x13, b: 0x08, alpha: 1 }

// ══════════════════════════════ 프롬프트 ══════════════════════════════
/** stage-theme-scene.mjs 원문 그대로. 한 글자도 바꾸지 않는다. */
const STYLE =
  'warm painterly watercolor illustration, soft K-anime aesthetic, visible gentle brush texture, ' +
  'muted sepia and dark-walnut palette with hanji ivory, candlelit warmth, ' +
  'calm and tidy composition rather than busy detail, refined key-art quality'

/**
 * ★ 이 파이프라인의 척추 ★ — 「살림이 스타일 정본」(PLAN §1-2).
 * 참조로 붙는 마지막 한 장은 실제 살림 스프라이트 3종을 나란히 깐 카드다. 그 붓·그 빛으로
 * 방을 그리되, **방 안에는 그 가구가 없다**. 복제 방지 문장을 «관찰 사실»로 적는 자리이기도 하다.
 */
const FURNITURE_REF =
  'The last attached picture shows three pieces of furniture on a plain ground: a low wooden platform, ' +
  'a long offering table and a tall four-shelf stand. They are painted with the brush, the colours and the ' +
  'light of this world, and they will be set into this room later. They are not in the picture you paint — ' +
  'the room stands empty and none of those three pieces appears anywhere in it.'

/**
 * 「배경 = 건축과 공기만」(PLAN §1-1). 중앙 샷에도 그대로 걸린다 — 그것이 scene.mjs 와의 차이다.
 * 목록을 길게 늘어놓는 대신 «무엇이 남는가»를 함께 적는다(빼기만 시키면 허연 벽이 온다).
 */
const EMPTY_ROOM =
  'There is no furniture anywhere in this room: no altar, no table, no chest, no shelf, no cabinet, no stool, ' +
  'no cushion, no jar, no bowl and no standing lamp. What fills the frame is the building itself — ' +
  'the wall and its panelling, the timber posts and beams, and the floor'

/**
 * 광원 — 살림 스프라이트의 drop-shadow 는 전부 **바로 아래로** 떨어진다(0 4px 8px / 0 5px 6px).
 * 배경의 빛이 옆에서 오면 그림자 방향이 어긋나 스티커로 읽힌다. 그래서 위에서 내리는 빛으로 못박는다.
 */
// ⚠️ R2 반려 처방: 종전 문구는 «방 한가운데 바닥에 온기가 고인다» 였다. 그림에서 «방 한가운데
//    바닥»은 벽에서 먼 앞바닥이라, 이 한 절이 아래 floorEven 과 정면으로 싸워 벽 밑동을 어둡게
//    만들었다(실측 발밑 37 vs 앞바닥 62). 온기가 고이는 자리를 **벽 밑동**으로 옮긴다.
// ⚠️ 확산 처방(2026-08-10, 달집·설빛·용궁): 반가 원문의 «warmth» 는 난색 테마의 관찰 사실이다.
//    한색 테마(설야·심해)에 그대로 걸면 «따뜻함이 고인다»가 팔레트와 정면으로 싸운다(모순 문장은
//    먼저 지운다는 규율). **문장 구조는 그대로 두고 빛의 «이름»만** 테마가 바꾼다 — 기본값은
//    반가 원문 그대로라 반가 프롬프트는 한 글자도 달라지지 않는다.
const harmonyLight = (t) =>
  `The light comes softly from above and settles downward; the ${t?.pooled ?? 'warmth'} gathers on the floor ` +
  'along the foot of the wall, and what shadows there are fall straight down, short and soft'

/**
 * ★ R1 반려 처방(2026-08-09, 사실 1개 추가) ★
 * R1 은 수평선(60%)을 지켰는데도 살림이 떠 보였다. 원인은 위치가 아니라 **밝기**였다 —
 * 화가는 벽에 가까운 바닥(원경)을 관습적으로 어둡게 깐다(실측 휘도 30 vs 앞바닥 73). 그런데
 * 단상 y51·제단 y58·선반장 밑동 y62 는 전부 그 «어두운 원경 바닥»에 서므로, 발밑이 검은
 * 구멍이 되어 가구가 바닥을 딛지 못한다. 설명을 늘리지 않고 관찰 사실 한 문장만 더한다.
 */
// ⚠️ R2 재반려 처방: 부정문(«어두운 띠가 없다»)은 먹히지 않았다 — 원근 실내의 «뒤는 어둡다»는
//    회화 관성이 더 세다. 그래서 **긍정 관찰문**으로 바꿔 밝은 자리를 지정한다. 이것은 재발명이
//    아니라 원화 복원이기도 하다: 원화(room.webp)의 마루도 창호 앞이 가장 밝고 앞쪽 구석이 어둡다.
// ⚠️ 확산 처방(2026-08-10): «한지 창호에서 오는 빛»은 반가·설빛·달집의 사실이지만 용궁에는 한지가
//    없다 — 그대로 걸면 심해 궁궐 벽에 창호지를 끼워 넣는다(원화를 텍스트가 덮는 1차 반려의 재발).
//    빛이 «어디서 오는가»만 테마가 갈아 끼우고, 기본값은 반가 원문이다.
const floorEven = (t) =>
  'The strip of floor closest to the wall is the brightest part of the floor, catching the light straight from ' +
  `${t?.lightFrom ?? 'the paper panels'}, and the boards grow a little darker toward the bottom of the frame`

/**
 * ★ R1 반려 처방(사실 1개 추가) ★ — 옆칸이 «또 하나의 방 상자»로 나와 파노라마가 방 세 개로 읽혔다.
 * 좌·우는 같은 벽의 연장이어야 하므로 «모서리가 화면에 없다»를 관찰 사실로 못박는다.
 */
const SIDE_FLAT =
  'The wall runs flat straight across the whole frame and both of its ends pass out of the frame; ' +
  'no corner of the room is in view and the wall never turns away from the viewer'

/** 세 샷이 한 홀로 읽히게 묶는 절(빛의 «성격»은 원화가 정하고, 세 샷은 같은 값을 쓴다) */
const CONTINUITY =
  'the same timber, the same plaster, the same paper, the same age and wear, the same brushwork and the same ' +
  'palette as the reference painting'

/** 벽·바닥 경계 높이 계약 — 세 샷이 같은 말을 공유해야 62/40 슬라이스가 한 줄로 이어진다 */
const HORIZON =
  'The line where the wall meets the floor runs straight across the frame at three-fifths of the frame height, ' +
  'level and unbroken from the left edge to the right edge; above it is the wall, below it is the floor'

const FRAMING =
  'Seen straight on at standing eye level, the camera level and not tilted, ' +
  'an upright rectangular view a little taller than it is wide, the scene filling the whole frame'

/**
 * 원샷(통짜) 프레이밍 — CEO 반려(2026-08-09 2차): "이미지를 3장으로 나누지 말고 와이드로 통으로
 * 만들어줘, 자연스럽게 이어지게." 3샷 크로스페이드는 이음매 수치가 통과해도 **톤 계단**과
 * «세 개의 방» 인상을 남긴다(R2 왼쪽 경계, R3 전면 파탄). 캡처를 한 장으로 바꾸면 이을 것이 없다.
 */
const WIDE_FRAMING =
  'Seen straight on at standing eye level, the camera level and not tilted, one single very wide horizontal ' +
  'view about two and a half times as wide as it is tall, the scene filling the whole frame'

const TAIL = 'full-bleed background plate, no text, no watermark, no border'

/**
 * 「자리를 아는 벽」(PLAN §1-3)의 유일한 실행 가능한 형태. 좌표를 AI 에 맡기지 않는다 —
 * 대신 «위는 이야기하고 가운데는 조용한» 층 구조를 준다. 선반장(y 20~62)이 서는 구간이
 * 가운데이므로, 그 구간이 조용해야 가구가 벽과 싸우지 않는다.
 */
const WALL_BAND =
  'Across the top of the wall one straight beam runs level from edge to edge, and the strip above it carries ' +
  'the finer carpentry. Below the beam the wall is quiet and even all the way down to the floor'

/**
 * 테마 표.
 *   hall      세 프롬프트가 공유하는 장소 명사구
 *   identity  원화에서 «눈으로 추출한» 관찰 사실 — 색 세계를 못박는 보강재
 *   wall/floor  좌·우 연장부의 재질 문장(완성된 빈 벽의 재료)
 *   pooled    발밑에 «무엇이» 고이는가 — 난색 테마는 warmth(기본), 한색 테마는 그 세계의 빛 이름
 *   lightFrom 그 빛이 «어디서» 오는가 — 기본은 한지 창호. 창호가 없는 세계(용궁)는 갈아 끼운다
 *   fix       라운드별 처방 어휘 누적 자리. 반려 때 «사실 1개»만 여기 늘린다.
 * @type {Array<{code:string,name:string,el:string,hall:string,identity:string,wall:string,floor:string,
 *               pooled?:string,lightFrom?:string,fix?:string}>}
 */
const THEMES = [
  {
    code: 'banga',
    name: '반가 대청',
    el: '木',
    hall: 'the daecheong hall of a Korean noble house (반가 班家)',
    // 원화(public/shrine/themes/banga/room.webp) 실측: 짙은 호두나무 골조 + 뒤에서 빛나는 한지 창호 +
    // 넓은 짙은 갈색 마루널 + 노출 서까래. 팔레트를 이 문장이 붙든다.
    identity:
      'Dark walnut timber frames every surface of this hall. The hanji paper panels between the posts glow a ' +
      'warm ivory from behind, and the wide plank floor is deep brown with a soft amber sheen lying along it. ' +
      'The air is dim and quiet, warmer near the paper and darker toward the corners.',
    wall:
      'A long wall of dark walnut posts standing at even intervals with a warm ivory hanji panel filling the ' +
      'space between every pair of posts. Each panel carries a slender lattice of thin wooden ribs and glows ' +
      'faintly from behind. A low dark wainscot board runs level along the bottom of the whole wall, and a ' +
      'band of fine open latticework runs level along the top under the beam.',
    floor:
      'Wide dark walnut floorboards running away from the viewer, their long grain and the thin dark seams ' +
      'between the boards showing, worn smooth and holding a soft amber sheen.',
  },
  {
    code: 'daljip',
    name: '달집 마당',
    el: '土',
    // 원화(themes/daljip/room.webp)는 «마당»이 아니라 **마당을 내다보는 실내**다 — 보름달·등불이 안에서
    // 읽힌다. 그래서 harmony 에서는 실내로 통일한다(구 씬 파노라마는 중앙=실내·좌우=흙담이라
    // 세계가 둘로 갈려 있었다). 마당의 정체성(황토·짚·달빛)은 재료로 들여온다.
    hall: 'the moonlit inner hall of a Korean village house (달집 마당)',
    // ⚠️ 씬 파노라마 1차 반려 처방 승계: 연장부가 «낮처럼» 밝아지면 세계가 갈린다 → 밤을 관찰 사실로 못박는다.
    // ⚠️ r1 재반려(2026-08-10): «밤이다»·«달빛이 은빛으로 빛난다»를 적었는데도 **한낮의 방**이 왔다.
    //    밤은 «시각»이지 «밝기»가 아니라서 모델이 실내를 환하게 켠다. glow/silver 같은 밝기 어휘를
    //    먼저 걷고(모순 제거), 값(value) 자체를 관찰 사실로 적는다 → fix 절.
    identity:
      'It is night in every part of this scene and it stays night: the only light is the full moon outside ' +
      'and one low lantern within, and no daylight reaches anything here. The clay plaster is a dim earth ' +
      'ochre, the paper panels are a dull blue-grey only a little lighter than the timber around them, and ' +
      'the deep blue of the night sits in every shadow.',
    wall:
      'A long wall of dim ochre clay plaster held between dark earth-brown timber posts standing at even ' +
      'intervals, the plaster hand-smoothed in broad strokes and slightly uneven, with a paper panel filling ' +
      'the upper part of every bay, dull blue-grey with the night pressing behind it. A low dark wainscot ' +
      'board runs level along the bottom of the whole wall, and a band of plain slatted carpentry runs level ' +
      'along the top under the beam.',
    floor:
      'Wide boards the colour of dark earth running away from the viewer, their grain and the thin seams ' +
      'between them showing, with coarse straw matting laid over them from edge to edge so its weave reads ' +
      'as one fine even texture, its gold dulled almost to grey-brown in the dark.',
    lightFrom: 'the moonlit paper panels',
    // r2 처방(사실 2개): 값이 어둡다 · 달빛은 차갑고 등불빛은 좁다
    fix:
      'The whole picture is dark, the way a room looks by moonlight: most of the wall lies in deep shadow and ' +
      'no surface anywhere is brighter than a dim amber. Where the moon reaches the clay it lies pale and ' +
      'cool on it, and the lantern warmth stays low and narrow near the floor.',
  },
  {
    code: 'seolbit',
    name: '설빛 서고',
    el: '金',
    // ⚠️ 로어의 「두루마리 선반」은 벽에 **그리지 않는다**(그 자리가 가족 선반장이다) — 서고의 정체성은
    //    한지·서리·한기로 낸다(씬 파노라마 교훈 승계). 그래서 hall 도 library 가 아니라 hall 로 적는다:
    //    「library」라고 쓰는 순간 모델이 책장을 그려 무가구 계약과 싸운다.
    // ⚠️ 구 처방 「격자는 창가에만」의 정신만 가져온다 — 창이 없는 harmony 벽에서는 격자 자체를 걷고
    //    (반가 창호를 복붙하지 않는다) 밀도를 백목·서리·한지 이음매로 낸다.
    hall: "a snow-lit scholar's hall (설빛 서고)",
    // ⚠️ r1 재반려(2026-08-10): 「어디에도 난색이 없다 · 백목 · 바랜 흰 마루」를 그대로 적었더니
    //    **흰 상자 방**이 왔다 — 살림(호두나무)이 흰 벽에 붙인 스티커로 읽히고 서고의 격도 사라졌다.
    //    그 세 마디는 원화에도 없다(원화의 기둥·마루는 따뜻한 갈색이고 한색은 창·한지 쪽이다).
    //    재발명을 걷고 원화로 되돌린다: 한색은 종이와 빛, 난색은 나무.
    identity:
      'The cold light of snow fills this room. The paper panels stand a flat cool grey-white, the timber ' +
      'posts and rails are pale aged brown, dry and lightly frosted along their edges, and the floor is pale ' +
      'pine washed cool by the light off the snow. The air is still and very cold.',
    wall:
      'A long wall of plain pale hanji paper set in slender pale brown timber frames standing at even ' +
      'intervals, frost bloomed along every timber edge, the paper laid in overlapping sheets so that the ' +
      'seams and the fibre in it catch the light. A low brown wainscot board runs level along the ' +
      'bottom of the whole wall, and a band of plain flat planking runs level along the top under the beam.',
    floor:
      'Pale pine boards running away from the viewer, fine straight grain and thin seams between them, dry ' +
      'and matte, cool grey where the light off the snow crosses them and a little warmer in their shadows.',
    pooled: 'cold brightness',
    // r2 처방은 값의 폭만 좁혔을 뿐 «회색 상자»가 그대로였다 — 설빛이라 부를 근거가 화면에 하나도
    // 없었다(서리도 눈빛도 한지도 안 보임). r3 처방은 **설빛에만 있는 것 두 가지**를 관찰 사실로 넣는다:
    // 서리가 앉은 자리 · 한 칸 안에서 종이가 상아→푸름으로 넘어가는 그늘. 밀도는 이 둘이 만든다.
    fix:
      'A fine white frost has settled in the corners of every panel and along the lower edge of every rail. ' +
      'The paper is warm ivory where the snow light crosses it and pale blue in shadow, so each bay shades ' +
      'from one side to the other, and the wall darkens toward the top of the frame.',
    // ⚠️ r4 반려 기록(원복하지 말 것): 여기에 「마루만은 따뜻한 꿀빛」 한 문장을 더 붙였더니 바닥은
    //    그대로 회백색인 채 **벽의 한지 결이 사라지고** 칸이 다시 민짜가 됐다. 게다가 바닥선을 프레임
    //    80% 까지 내려 크롭이 ×1.74 확대로 붙어야 했다(수퍼샘플 0.94 — 여유가 거의 없다).
    //    정본은 r3. 난색을 원하면 배경이 아니라 살림·조명 쪽에서 볼 것.
  },
  {
    code: 'yonggung',
    name: '용궁',
    el: '水',
    // ⚠️ 1차 반려(2026-08-07): 텍스트 서술(밝은 진주모 궁궐)이 원화를 덮어 **지상 궁궐**이 나왔다.
    //    그래서 여기서는 서술을 늘리지 않고 원화의 두 사실 — 짙은 청록 심해 · 수면에서 꽂히는 빛기둥 —
    //    만 못박는다. 씬 파노라마에서 이 문장으로 합격했으므로 어휘를 그대로 승계한다.
    hall: 'an undersea dragon palace (용궁)',
    identity:
      'The whole hall stands deep under the sea: everything is steeped in dark teal-green water light, pale ' +
      'shafts of light fall slowly from the surface far above, fine bubbles drift upward through them, and ' +
      'the depth behind everything fades into a black-green haze.',
    wall:
      'A long palace wall of dark jade and teal panels held between weathered timber posts standing at even ' +
      'intervals, pale coral shapes painted low across the panels, and the dancheong band above muted by the ' +
      'water light to soft jade and old gold. A low stone wainscot runs level along the bottom of the whole ' +
      'wall, and fine bubbles rise slowly along the posts.',
    floor:
      'Deep green-black polished boards running away from the viewer, wet-sheened and holding the pale ' +
      'reflections of the light shafts, with slow caustic ripples travelling across them.',
    pooled: 'pale green light',
    lightFrom: 'the shafts falling from the surface',
  },
]

/** 중앙 — 원화의 건축·구도·팔레트·빛은 유지하되 **가구·기물은 전부 뺀다**(scene.mjs 와의 본질적 차이). */
function centerPrompt(t) {
  return (
    `The interior of ${t.hall}, painted again from the first attached reference at a larger size and with finer ` +
    'detail. Keep what the reference builds: the same architecture in the same places, the same depth, ' +
    'the same palette and the same light. ' +
    `${t.identity} ` +
    `${EMPTY_ROOM}. ${WALL_BAND}. ` +
    `${FURNITURE_REF} ` +
    `${harmonyLight(t)}. ${HORIZON}. ${floorEven(t)}. ${FRAMING}. ` +
    (t.fix ? `${t.fix} ` : '') +
    `${STYLE}, ${CONTINUITY}, ${TAIL}`
  )
}

/**
 * L·R — 같은 홀의 옆칸. **완성된 빈 벽**이 계약이다(왼쪽=가족 선반장, 오른쪽=의식각 자리).
 * 「비었다」만 적으면 덜 그린 허연 벽이 온다 — 그래서 재질·리듬을 먼저 적고 «비었다»는 뒤에 붙인다.
 */
function sidePrompt(t, side) {
  const dir = side === 'left' ? 'to the left' : 'to the right'
  return (
    `The interior of ${t.hall}, the same hall as the first attached reference, with the camera moved one screen ` +
    `width ${dir} along it. The building continues without a break: the same bays at the same spacing, the same ` +
    'materials, the same age and wear, the same light. ' +
    `${t.identity} ` +
    `${t.wall} ${t.floor} ` +
    `${WALL_BAND}. ` +
    'This wall is closed all the way across: nothing opens through it, there is no doorway and no window, ' +
    'and nothing hangs on it. ' +
    `${SIDE_FLAT}. ` +
    `${EMPTY_ROOM}. ` +
    `${FURNITURE_REF} ` +
    `${harmonyLight(t)}. ${HORIZON}. ${floorEven(t)}. ${FRAMING}. ` +
    (t.fix ? `${t.fix} ` : '') +
    `${STYLE}, ${CONTINUITY}, ${TAIL}`
  )
}

/**
 * ★ 원샷 — 홀 전체를 한 프레임에 ★ (CEO 2차 반려 처방)
 * R2 에서 합격한 레시피(무가구·완성된 빈 벽·평평한 벽·발밑 긍정문·살림 화풍 카드)는 **그대로** 쓰고
 * 프레이밍만 통짜로 바꾼다. 새로 넣는 관찰 사실은 둘뿐이다(한 라운드 2개 상한 — R2 교훈):
 *   ① 홀이 화면 왼끝에서 오른끝까지 한 방으로 이어진다
 *   ② 보 위에 여백이 조금 있다  ← 세로 크롭(아래 fitToPanorama)이 먹을 몫을 미리 마련해 둔다
 */
function fullRoomPrompt(t) {
  return (
    `The interior of ${t.hall}, painted from the first attached reference as one single very wide view of the ` +
    'whole hall at once. ' +
    `${t.identity} ` +
    'The hall runs from the left edge of the frame to the right edge as one room: the same wall continues ' +
    'without a break across the whole width, with the bays repeating at even intervals. ' +
    `${t.wall} ${t.floor} ` +
    `${WALL_BAND}, and there is a little open space above that beam at the top of the frame. ` +
    'This wall is closed all the way across: nothing opens through it, there is no doorway and no window, ' +
    'and nothing hangs on it. ' +
    `${SIDE_FLAT}. ` +
    `${EMPTY_ROOM}. ` +
    `${FURNITURE_REF} ` +
    `${harmonyLight(t)}. ${HORIZON}. ${floorEven(t)}. ${WIDE_FRAMING}. ` +
    (t.fix ? `${t.fix} ` : '') +
    `${STYLE}, ${CONTINUITY}, ${TAIL}`
  )
}

function shotPrompt(theme, key) {
  return key === 'center' ? centerPrompt(theme) : sidePrompt(theme, key)
}

// ══════════════════════════════ 살림 화풍 카드 ══════════════════════════════
/**
 * 단상·제단 상판·사방탁자 세 장을 **평평한 바탕**에 나란히 깐 한 장. 세 장을 따로 붙이지 않고
 * 한 장으로 묶는 이유는 참조 개수를 줄여 원화(색 앵커)의 힘이 희석되지 않게 하려는 것이다.
 * 바탕을 무늬 없는 단색으로 두는 이유는 «이건 방이 아니라 견본»이라는 신호다 — 바닥·그림자를
 * 깔면 모델이 그 배치를 방으로 읽고 가구를 그대로 복제한다.
 */
const STYLE_CARD_PARTS = ['platform.webp', 'altar-top.webp', 'shelf-sabang.webp']
const STYLE_CARD_W = 1024
const STYLE_CARD_H = 640

async function buildStyleCard(outFile) {
  const files = STYLE_CARD_PARTS.map((f) => path.join(COMMON_DIR, f))
  const missing = files.filter((f) => !existsSync(f))
  if (missing.length) throw new Error(`살림 스프라이트 없음: ${missing.map((f) => path.basename(f)).join(', ')}`)

  const cell = Math.floor(STYLE_CARD_W / files.length)
  const layers = []
  for (let i = 0; i < files.length; i += 1) {
    const box = { w: Math.round(cell * 0.82), h: Math.round(STYLE_CARD_H * 0.82) }
    const buf = await sharp(files[i]).resize(box.w, box.h, { fit: 'inside' }).png().toBuffer()
    const meta = await sharp(buf).metadata()
    layers.push({
      input: buf,
      left: Math.round(i * cell + (cell - meta.width) / 2),
      top: Math.round((STYLE_CARD_H - meta.height) / 2),
    })
  }
  const buf = await sharp({
    create: {
      width: STYLE_CARD_W,
      height: STYLE_CARD_H,
      channels: 4,
      background: { r: 0x24, g: 0x1c, b: 0x12, alpha: 1 },
    },
  })
    .composite(layers)
    .webp({ quality: 92 })
    .toBuffer()
  await mkdir(path.dirname(outFile), { recursive: true })
  await writeFile(outFile, buf)
  return { out: outFile, bytes: buf.length }
}

// ══════════════════════════════ 생성 ══════════════════════════════

const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' }

async function refParts(paths) {
  const parts = []
  for (const p of paths) {
    if (!existsSync(p)) continue
    const mimeType = MIME[path.extname(p).toLowerCase()]
    if (!mimeType) continue
    const buf = await readFile(p)
    parts.push({ inlineData: { mimeType, data: buf.toString('base64') } })
  }
  return parts
}

async function callModel(prompt, refPaths) {
  if (!KEY) throw new Error('GEMINI 키 없음 — 메인 체크아웃 .env.local 의 GOOGLE_GENERATIVE_AI_API_KEY 확인')
  if (apiCalls >= apiBudget) throw new Error(`API 예산(${apiBudget}회) 소진 — 생성 중단`)
  apiCalls += 1
  const genAI = new GoogleGenerativeAI(KEY)
  const model = genAI.getGenerativeModel({ model: MODEL })
  const res = await model.generateContent([{ text: prompt }, ...(await refParts(refPaths))])
  const cand = res.response.candidates?.[0]
  const img = cand?.content?.parts?.find((p) => p.inlineData)?.inlineData
  if (!img) throw new Error('이미지 파트 없음 — 응답: ' + JSON.stringify(cand)?.slice(0, 300))
  return Buffer.from(img.data, 'base64')
}

/**
 * 종횡비를 지정한 생성 — **REST 직접 호출**.
 * 설치된 SDK(@google/generative-ai 0.24.1)에는 `generationConfig.imageConfig` 가 없어서
 * aspectRatio 를 실어 보낼 방법이 없다(조용히 누락되어 세로 그림이 온다). 그래서 이 한 경로만
 * fetch 로 직접 친다 — 응답 파싱 규약은 위 callModel 과 같다.
 *
 * 실측(2026-08-09, 잘못된 값으로 400 을 받아 목록을 확인 — 생성 0회):
 *   허용 aspect_ratio = 1:1 · 1:4 · 1:8 · 2:3 · 3:2 · 3:4 · 4:1 · 4:3 · 4:5 · 5:4 · 8:1 · 9:16 · 16:9 · 21:9
 *   허용 image_size   = 512 · 512P · 512PX · 1K · 2K · 4K   (기본 1K → 21:9 에서 1584×672)
 * ⚠️ 해상도는 «렌더 스케일에서 판정» 원칙의 예외가 아니다 — 다만 사용자는 DPR 2~3 폰으로 본다.
 *    세계 폭이 3.2화면이라 DPR3 폰에서 뮤럴은 3700px 급으로 확대된다. 1K 원판(1584)이면 ×2.4 로
 *    뭉개진다. 그래서 통짜 캡처에서는 4K 가 사실상 필수다(3샷은 합쳐서 3735px 라 문제가 없었다).
 * 우리 원판은 3435×1280 = **2.684:1**. 21:9(2.333:1)가 목표보다 세로가 길고, 가로로 늘리는 대신
 * **세로를 잘라** 맞춘다(fitToPanorama) — 늘리면 창호 격자가 눌린다.
 */
async function callModelAspect(prompt, refPaths, aspectRatio, imageSize) {
  if (!KEY) throw new Error('GEMINI 키 없음 — 메인 체크아웃 .env.local 의 GOOGLE_GENERATIVE_AI_API_KEY 확인')
  if (apiCalls >= apiBudget) throw new Error(`API 예산(${apiBudget}회) 소진 — 생성 중단`)
  apiCalls += 1
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }, ...(await refParts(refPaths))] }],
      generationConfig: { imageConfig: { aspectRatio, ...(imageSize ? { imageSize } : {}) } },
    }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${text.slice(0, 300)}`)
  const json = JSON.parse(text)
  const img = json?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData
  if (!img) throw new Error('이미지 파트 없음 — 응답: ' + text.slice(0, 300))
  return Buffer.from(img.data, 'base64')
}

function isAuthError(e) {
  const s = String(e?.message || e)
  return /401|403|API_KEY_INVALID|API key not valid|PERMISSION_DENIED|UNAUTHENTICATED/i.test(s)
}

const artPath = (code) => path.join(THEME_ART, code, 'room.webp')
const pilotDir = (code) => path.join(PILOT_ROOT, code)
const roundDir = (code, round) => path.join(pilotDir(code), `r${round}`)
const shotPath = (code, round, key) => path.join(roundDir(code, round), `${key}.png`)
const styleCardPath = (code) => path.join(pilotDir(code), 'style-card.webp')
/** 원샷 통짜 원판 — 라운드당 한 장. 3샷 캐시(left/center/right)와 파일명이 겹치지 않는다. */
const roomPath = (code, round) => path.join(roundDir(code, round), 'room.png')
const qaDir = (code) => path.join(pilotDir(code), 'qa')

/**
 * 샷 참조 이미지. **순서가 프롬프트의 «first attached» / «last attached» 와 맞물린다** —
 * 첫 장은 원화(색·세계 앵커), 마지막 장은 살림 화풍 카드(붓·빛 앵커). 옆칸은 그 사이에
 * 이미 그려진 center 를 끼워 연속성을 잡는다.
 * ⚠️ center 참조는 옆칸에 가구를 복사시킬 수 있는 자리다. 다만 이 파이프라인의 center 는
 *    애초에 가구가 없으므로 그 위험이 구조적으로 사라졌다(scene.mjs 의 경고가 여기서는 무해해진다).
 */
function refsFor(code, round, key) {
  return key === 'center'
    ? [artPath(code), styleCardPath(code)]
    : [artPath(code), shotPath(code, round, 'center'), styleCardPath(code)]
}

/** 라운드 폴더 안 원본은 재사용(멱등). regen 목록에 든 키만 다시 그린다. */
async function ensureShot(theme, round, key, { regen }) {
  const out = shotPath(theme.code, round, key)
  if (regen.has(key) && existsSync(out)) await rm(out, { force: true })
  if (existsSync(out)) {
    console.log(`  · ${key} 원본 재사용 (API 0회) ${showPath(out)}`)
    return { key, generated: false }
  }
  console.log(`  · ${key} 생성 (${MODEL}) — API ${apiCalls + 1}/${apiBudget}`)
  const buf = await callModel(shotPrompt(theme, key), refsFor(theme.code, round, key))
  await mkdir(path.dirname(out), { recursive: true })
  await writeFile(out, buf)
  return { key, generated: true }
}

/** 원샷 원판 — 라운드당 한 번만 그린다(멱등). regen 이면 다시 그린다. */
async function ensureRoom(theme, round, { regen }) {
  const out = roomPath(theme.code, round)
  if (regen.size && existsSync(out)) await rm(out, { force: true })
  if (existsSync(out)) {
    console.log(`  · 통짜 원판 재사용 (API 0회) ${showPath(out)}`)
    return { generated: false }
  }
  console.log(`  · 통짜 원판 생성 (${MODEL} · ${WIDE_ASPECT} · ${WIDE_SIZE}) — API ${apiCalls + 1}/${apiBudget}`)
  const buf = await callModelAspect(
    fullRoomPrompt(theme),
    [artPath(theme.code), styleCardPath(theme.code)],
    WIDE_ASPECT,
    WIDE_SIZE
  )
  await mkdir(path.dirname(out), { recursive: true })
  await writeFile(out, buf)
  const m = await sharp(out).metadata()
  console.log(`    ↳ ${m.width}×${m.height} (${(m.width / m.height).toFixed(3)}:1)`)
  return { generated: true }
}

/** 이전 라운드 승계 — 다시 그리지 않는 샷은 파일을 물려받는다(과금 0, 비교 기준 고정) */
async function inheritShots(code, round, from, regen) {
  if (!from) return []
  const taken = []
  for (const key of SHOT_KEYS) {
    if (regen.has(key)) continue
    const dst = shotPath(code, round, key)
    const src = shotPath(code, from, key)
    if (existsSync(dst) || !existsSync(src)) continue
    await mkdir(path.dirname(dst), { recursive: true })
    await copyFile(src, dst)
    taken.push(key)
  }
  return taken
}

function showPath(p) {
  const rel = path.relative(ROOT, p)
  return rel.startsWith('..') ? p.replace(/\\/g, '/') : rel.replace(/\\/g, '/')
}

// ══════════════════════ 조립 (API 0회) — scene.mjs 규약 승계 ══════════════════════

const smoothstep = (u) => u * u * (3 - 2 * u)

function colDiff(data, w, h, ch, x1, x2) {
  let s = 0
  for (let y = 0; y < h; y += 1) {
    const i = (y * w + x1) * ch
    const j = (y * w + x2) * ch
    s += Math.abs(data[i] - data[j]) + Math.abs(data[i + 1] - data[j + 1]) + Math.abs(data[i + 2] - data[j + 2])
  }
  return s / (h * 3)
}

/** 내부 이웃 열 차이 분포 — 절대 임계 대신 «보통 자리»를 기준선으로 삼는다 */
function interiorStats(data, w, h, ch) {
  const diffs = []
  for (let x = 0; x < w - 1; x += 1) diffs.push(colDiff(data, w, h, ch, x, x + 1))
  diffs.sort((a, b) => a - b)
  const at = (r) => diffs[Math.min(diffs.length - 1, Math.max(0, Math.round(r * (diffs.length - 1))))]
  return { median: at(0.5), p95: at(0.95), max: diffs[diffs.length - 1] }
}

function seamPass(seam, stats) {
  return seam <= Math.max(stats.p95, stats.median * 2 + 0.5)
}

async function normalizeShot(file, w, h) {
  const meta = await sharp(file).metadata()
  const { data, info } = await sharp(file)
    .resize(w, h, { fit: 'cover', position: 'centre', kernel: 'lanczos3' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { data, ch: info.channels, srcW: meta.width, srcH: meta.height, scale: h / meta.height }
}

function crossfadePanorama(shots, shotW, h, ch, ov) {
  const stride = shotW - ov
  const W = shotW + stride * (shots.length - 1)
  const out = Buffer.alloc(W * h * ch)
  const seams = []
  for (let i = 1; i < shots.length; i += 1) seams.push(i * stride + Math.floor(ov / 2))

  for (let i = 0; i < shots.length; i += 1) {
    const base = i * stride
    const src = shots[i]
    for (let x = 0; x < shotW; x += 1) {
      const blending = i > 0 && x < ov
      const t = blending ? smoothstep(x / ov) : 1
      if (t <= 0) continue
      const gx = base + x
      for (let y = 0; y < h; y += 1) {
        const si = (y * shotW + x) * ch
        const oi = (y * W + gx) * ch
        if (!blending) {
          for (let c = 0; c < ch; c += 1) out[oi + c] = src[si + c]
          continue
        }
        for (let c = 0; c < ch; c += 1) out[oi + c] = Math.round(out[oi + c] * (1 - t) + src[si + c] * t)
      }
    }
  }
  return { data: out, W, seams, ov }
}

function cropWidth(data, w, h, ch, left, outW) {
  if (left <= 0 && outW === w) return { data, W: w }
  const out = Buffer.alloc(outW * h * ch)
  for (let y = 0; y < h; y += 1) {
    data.copy(out, y * outW * ch, (y * w + left) * ch, (y * w + left + outW) * ch)
  }
  return { data: out, W: outW }
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

async function refChannelMean(code) {
  const p = artPath(code)
  if (!existsSync(p)) return null
  const st = await sharp(p).removeAlpha().stats()
  return st.channels.slice(0, 3).map((c) => c.mean)
}

/** 팔레트 앵커 — 원화 채널 평균으로 70% 부분 정렬, ±12% 상한(scene.mjs 원문 승계) */
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

async function renderScaleSeam(webpBuf, seamsX, srcW) {
  const dec = await sharp(webpBuf)
    .resize(Math.max(2, Math.round(srcW * RENDER_SCALE)), null, { kernel: 'lanczos3' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { data } = dec
  const { width: w, height: h, channels: ch } = dec.info
  const stats = interiorStats(data, w, h, ch)
  const seams = seamsX
    .map((x) => Math.round(x * RENDER_SCALE))
    .filter((x) => x > 0 && x < w)
    .map((x) => ({ at: x, diff: colDiff(data, w, h, ch, x - 1, x) }))
  return { seams, stats }
}

/**
 * 수평선(벽↔바닥) 위치 — 벽은 결이 잘게 서 있고(창호·판벽) 바닥은 널이 길게 누워 있어
 * **행별 가로 텍스처 에너지**가 그 경계에서 급락한다. 휘도 계단보다 안정적인 지표다
 * (짙은 마루 vs 짙은 판벽처럼 명도가 비슷한 테마에서도 잡힌다).
 * 계약은 60%(HORIZON 문장) — 어긋나면 62/40 슬라이스가 그림을 엉뚱한 데서 자른다.
 */
function horizonRow(data, W, H, ch) {
  const tex = new Float64Array(H)
  for (let y = 0; y < H; y += 1) {
    let s = 0
    for (let x = 0; x < W - 1; x += 1) {
      const i = (y * W + x) * ch
      const j = (y * W + x + 1) * ch
      const a = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
      const b = 0.2126 * data[j] + 0.7152 * data[j + 1] + 0.0722 * data[j + 2]
      s += Math.abs(b - a)
    }
    tex[y] = s / (W - 1)
  }
  const k = 9
  const sm = new Float64Array(H)
  for (let y = 0; y < H; y += 1) {
    let s = 0
    let n = 0
    for (let d = -k; d <= k; d += 1) {
      const yy = y + d
      if (yy < 0 || yy >= H) continue
      s += tex[yy]
      n += 1
    }
    sm[y] = s / n
  }
  /**
   * ★ 확산 처방(2026-08-10) ★ — 종전에는 창 안에서 **가장 큰** 낙차를 골랐다. 반가는 벽 전체가
   * 창호살이라 그 낙차가 곧 바닥선이었지만, 걸레받이(판벽 굽도리)가 있는 테마에서는 «판벽 위끝»이
   * 더 큰 낙차를 내서 검출기가 바닥선보다 **위**를 가리킨다(달집 r2: 바닥선 70.5% 인데 69.8%~64%를
   * 오락가락, 폐루프가 수렴하지 못했다). 우리가 찾는 것은 «가장 센 가로선»이 아니라 «벽이 끝나는
   * 마지막 가로선»이다 — 그래서 충분히 센 봉우리들 중 **가장 아래**를 고른다.
   */
  const lo = Math.floor(H * 0.42)
  const hi = Math.floor(H * 0.84)
  const dvs = new Float64Array(H)
  let maxDv = 0
  for (let y = lo; y < hi; y += 1) {
    dvs[y] = sm[Math.max(0, y - 6)] - sm[Math.min(H - 1, y + 6)]
    if (dvs[y] > maxDv) maxDv = dvs[y]
  }
  if (!(maxDv > 0)) return { row: -1, pct: null, drop: 0 }
  const thr = maxDv * 0.6
  let end = -1
  for (let y = hi - 1; y >= lo; y -= 1) {
    if (dvs[y] >= thr) {
      end = y
      break
    }
  }
  let best = -1
  let drop = 0
  for (let y = end; y >= lo && dvs[y] >= thr; y -= 1) {
    if (dvs[y] > drop) {
      drop = dvs[y]
      best = y
    }
  }
  return { row: best, pct: best < 0 ? null : (100 * best) / H, drop }
}

/**
 * ★ 발밑 밝기 ★ — 이번 회차가 발견한 실패 모드의 직접 지표.
 * 화가는 벽에 가까운 바닥(원경)을 어둡게 깔지만, **우리 무대에서는 바로 그 자리가 살림이 서는 곳**이다
 * (단상 y51 · 제단 y58 · 선반장 밑동 y62 — 전부 바닥 밴드 상단 1/4 안). 거기가 검으면 가구가
 * 검은 구멍 위에 뜬 것처럼 보인다. 밴드 위 12% 와 아래 25% 의 평균 휘도를 견준다.
 * ⚠️ 임계는 검출 방식과 무관한 값이다(합격선==검출임계 함정 회피). 눈으로도 반드시 본다.
 */
const FOOTROOM_MIN_RATIO = 0.55
const FOOTROOM_MIN_LUM = 45
function floorFootroom(data, W, H, ch) {
  const bandMean = (y0, y1) => {
    let s = 0
    let n = 0
    for (let y = y0; y < y1; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const i = (y * W + x) * ch
        s += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
        n += 1
      }
    }
    return s / n
  }
  const top = bandMean(0, Math.max(1, Math.round(H * 0.12)))
  const bottom = bandMean(Math.round(H * 0.75), H)
  const ratio = bottom > 0.5 ? top / bottom : 1
  return { top, bottom, ratio, pass: ratio >= FOOTROOM_MIN_RATIO && top >= FOOTROOM_MIN_LUM }
}

/**
 * 발밑 들어올리기 — **API 0회 결정론 보정**. 프롬프트로 세 라운드를 밀어도 모델은 원근 실내의
 * «뒤는 어둡다»를 놓지 않았다(R1 41 · R2 37 · R3 29 / 라이브 90). 그런데 우리 무대에서 그 «뒤»는
 * 살림이 서는 자리다. 그림의 의도는 살리고 **밴드 상단만** 부드럽게 올린다.
 *   g(y) = 1 + (gmax−1)·(1 − y/h0)²   (y < h0, h0 = 밴드 높이의 38%)
 * 2차 감쇠라 경계에서 기울기가 0 이 되어 «밝은 띠»가 생기지 않는다(크로스페이드가 선형 대신
 * smoothstep 을 쓰는 것과 같은 이유). 상한 1.8 은 그림을 씻어내지 않는 선이고, 목표에 못 미치면
 * 못 미친 채로 두고 게이트가 그렇다고 말한다 — 숫자를 맞추려고 그림을 태우지 않는다.
 */
const FOOT_LIFT_MAX = 1.8
const FOOT_LIFT_SPAN = 0.38
function liftFloorFoot(data, W, H, ch, before) {
  const target = Math.max(FOOTROOM_MIN_LUM, before.bottom * FOOTROOM_MIN_RATIO)
  if (before.top >= target || !(before.top > 1)) return { applied: 1 }
  // 상단 12% 평균이 목표에 닿게 하는 게인. 램프가 그 구간 안에서도 감쇠하므로 평균 계수로 역산한다.
  const h0 = Math.max(1, Math.round(H * FOOT_LIFT_SPAN))
  const topRows = Math.max(1, Math.round(H * 0.12))
  let rampMean = 0
  for (let y = 0; y < topRows; y += 1) {
    const u = Math.min(1, y / h0)
    rampMean += (1 - u) ** 2
  }
  rampMean /= topRows
  const gmax = Math.min(FOOT_LIFT_MAX, 1 + (target / before.top - 1) / Math.max(0.05, rampMean))
  for (let y = 0; y < h0; y += 1) {
    const u = y / h0
    const g = 1 + (gmax - 1) * (1 - u) ** 2
    for (let x = 0; x < W; x += 1) {
      const i = (y * W + x) * ch
      data[i] = Math.min(255, Math.round(data[i] * g))
      data[i + 1] = Math.min(255, Math.round(data[i + 1] * g))
      data[i + 2] = Math.min(255, Math.round(data[i + 2] * g))
    }
  }
  return { applied: gmax }
}

function sliceBands(data, W, ch) {
  const take = (top, h) => {
    const out = Buffer.alloc(W * h * ch)
    data.copy(out, 0, top * W * ch, (top + h) * W * ch)
    return out
  }
  return {
    wall: { data: take(0, WALL_H), h: WALL_H },
    floor: { data: take(FLOOR_TOP, FLOOR_H), h: FLOOR_H },
  }
}

/**
 * ★ 톤 계단 ★ — CEO 가 «따로 논다» 다음으로 본 것. 열 차이(colDiff)는 **국소 경계**만 잡아서
 * 크로스페이드로 문지른 «넓고 완만한 밝기 단차»를 놓친다(R2 왼쪽 1/3 경계가 그랬다: 이음매 게이트는
 * PASS 인데 눈에는 계단이 보였다). 열 평균 휘도를 크게 뭉갠 뒤 그 위에서 창(window) 양끝 차이를 본다.
 * 원샷에는 이을 자리가 아예 없으므로 이 값이 «그림 자체의 명암 리듬» 상한이 된다 — 라운드 간 대조용.
 */
function toneStep(data, W, H, ch, windowPx) {
  const col = new Float64Array(W)
  for (let x = 0; x < W; x += 1) {
    let s = 0
    for (let y = 0; y < H; y += 1) {
      const i = (y * W + x) * ch
      s += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
    }
    col[x] = s / H
  }
  // 이동평균으로 뭉갠다 — 기둥 한 줄이 아니라 «구간의 밝기»를 보려는 것이다
  const k = Math.max(4, Math.round(windowPx / 4))
  const sm = new Float64Array(W)
  let run = 0
  for (let x = 0; x < W; x += 1) {
    run += col[x]
    if (x >= 2 * k + 1) run -= col[x - 2 * k - 1]
    sm[x] = run / Math.min(x + 1, 2 * k + 1)
  }
  let max = 0
  let at = 0
  for (let x = windowPx; x < W; x += 1) {
    const d = Math.abs(sm[x] - sm[x - windowPx])
    if (d > max) {
      max = d
      at = x
    }
  }
  return { max, at }
}

/**
 * 통짜 원판 → 파노라마 규격(3435×1280 = 2.684:1).
 *
 * 21:9(2.333:1)는 목표보다 **세로가 길다**. 가로로 늘리면 창호 격자가 눌리므로(15% 압축은 눈에 띈다)
 * 세로를 잘라 맞춘다. 그냥 가운데를 자르면 수평선이 60% 계약에서 밀려나므로, **수평선이 결과의
 * 60%에 그대로 앉도록** 위·아래 크롭량을 나눈다:
 *   (hz·h − a) / h' = 0.60  →  a = hz·h − 0.60·h'   (h' = w/A, b = (h−h') − a)
 * 그래서 프롬프트에 «보 위에 여백을 조금» 을 넣었다 — 위에서 먹을 몫을 그림이 미리 갖고 있게.
 */
function fitToPanorama(srcW, srcH, horizonFrac) {
  const A = PANO_W / PANO_H
  if (srcW / srcH >= A) {
    // 원판이 목표보다 넓다 → 가로를 가운데서 버린다(세로 무손실)
    const w2 = Math.round(srcH * A)
    return { left: Math.round((srcW - w2) / 2), top: 0, width: w2, height: srcH, mode: '가로 크롭' }
  }
  const h2 = Math.round(srcW / A)
  const spare = srcH - h2
  const hz = horizonFrac * srcH
  const want = Math.round(hz - 0.6 * h2)
  if (want <= spare) {
    const top = Math.max(0, want)
    return { left: 0, top, width: srcW, height: h2, mode: '세로 크롭', spare, topShare: top / (spare || 1) }
  }
  /**
   * ★ 확산 처방(2026-08-10, 달집·설빛·용궁 r1) ★
   * 세로 여유(21:9 → 2.684:1 = 12%)를 다 써도 바닥선이 60% 아래에 남는다. 세 테마 모두 모델이
   * 바닥선을 프레임 70% 언저리에 놓았다 — 프롬프트의 「three-fifths」는 세 번 다 무시됐고,
   * 좌표 정밀 지시는 프롬프트로 안 된다는 것이 이 기획의 전제다(PLAN §1-3). 그러니 **잘라서** 맞춘다.
   * 폭을 좁히면 잘라낼 세로가 생긴다(늘이지 않으므로 왜곡 0, 화각만 좁아진다):
   *   top = hz − 0.6·h ≥ 0  ·  top + h ≤ srcH   ⇒   h ≤ (srcH − hz) / 0.4
   * 하한은 파노라마 세로(1280) — 그 밑으로 내려가면 업스케일이 되어 「수퍼샘플」 계약이 깨진다.
   * ⚠️ 이 가지는 want > spare 일 때만 열린다 — 반가(승인분)는 종전 경로 그대로다.
   */
  const h3 = Math.max(PANO_H, Math.min(h2, Math.floor((srcH - hz) / 0.4)))
  const width = Math.min(srcW, Math.round(h3 * A))
  const height = Math.min(srcH, Math.round(width / A))
  const top = Math.min(srcH - height, Math.max(0, Math.round(hz - 0.6 * height)))
  return { left: Math.round((srcW - width) / 2), top, width, height, mode: '세로·가로 크롭', spare, topShare: 1 }
}

/**
 * ★ 수평선 폐루프 ★ — 크롭량은 「수평선이 어디냐」에서 나오는데, 원판 전체에서 잰 수평선과
 * 파노라마로 줄인 뒤 잰 수평선이 서로 다르다(달집 r1: 원판 57% → 결과 67.7%). 벽에 밝기·결이
 * 갈리는 띠(창호↔흙벽, 판벽↔마루)가 있으면 축척에 따라 이긴 띠가 바뀌기 때문이다.
 * 그래서 **게이트가 재는 그 표현(파노라마 규격)에서 재고, 맞을 때까지 크롭을 다시 계산한다.**
 * API 0회·결정론이고 보통 2회 안에 붙는다.
 * ⚠️ 이 루프는 «검출기가 옳다»를 전제하지 않는다 — 합격선과 검출임계가 같아지는 함정
 *    (feedback_gate_measures_wrong_thing)이므로, 60% 선을 그린 확인판을 **눈으로도** 본다.
 */
const HORIZON_FIT_ROUNDS = 4
async function fitByHorizon(src, srcW, srcH) {
  let fit = fitToPanorama(srcW, srcH, 0.6)
  let best = { fit, err: Infinity, pct: null, tries: 0 }
  for (let i = 0; i < HORIZON_FIT_ROUNDS; i += 1) {
    const norm = await sharp(src)
      .extract(fit)
      .resize(PANO_W, PANO_H, { fit: 'fill', kernel: 'lanczos3' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const hz = horizonRow(norm.data, PANO_W, PANO_H, norm.info.channels)
    if (hz.pct === null) break
    const err = Math.abs(hz.pct - 60)
    if (err < best.err) best = { fit, err, pct: hz.pct, tries: i + 1 }
    if (err <= 0.5) break
    const next = fitToPanorama(srcW, srcH, (fit.top + (hz.pct / 100) * fit.height) / srcH)
    if (next.top === fit.top && next.height === fit.height && next.width === fit.width) break
    fit = next
  }
  return best
}

/**
 * 원샷 조립 — 이을 것이 없으므로 크로스페이드·이음매 계약이 통째로 사라진다.
 * 남는 일: 규격 맞추기(fitToPanorama) → 팔레트 앵커 → 수평선·발밑 게이트 → 밴드 슬라이스 → 인코딩.
 */
async function buildRoomScene(theme, round, outDir) {
  const src = roomPath(theme.code, round)
  if (!existsSync(src)) throw new Error(`통짜 원판 없음: ${showPath(src)}`)
  const meta = await sharp(src).metadata()

  // 수평선은 **게이트가 재는 표현**(파노라마 규격)에서 재고, 60% 에 앉을 때까지 크롭을 다시 계산한다
  const seat = await fitByHorizon(src, meta.width, meta.height)
  const fit = seat.fit

  const norm = await sharp(src)
    .extract(fit)
    .resize(PANO_W, PANO_H, { fit: 'fill', kernel: 'lanczos3' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const ch = norm.info.channels
  const data = norm.data

  const refMean = await refChannelMean(theme.code)
  const gains = refMean ? anchorPalette(data, ch, refMean, channelMean(data, ch)) : [1, 1, 1]

  const horizon = horizonRow(data, PANO_W, PANO_H, ch)
  const bands = sliceBands(data, PANO_W, ch)
  const footBefore = floorFootroom(bands.floor.data, PANO_W, FLOOR_H, ch)
  const lift = liftFloorFoot(bands.floor.data, PANO_W, FLOOR_H, ch, footBefore)
  const footroom = { ...floorFootroom(bands.floor.data, PANO_W, FLOOR_H, ch), before: footBefore, lift: lift.applied }

  let chosen = null
  for (const quality of QUALITY_LADDER) {
    const wall = await sharp(bands.wall.data, { raw: { width: PANO_W, height: WALL_H, channels: ch } })
      .webp({ quality })
      .toBuffer()
    const floor = await sharp(bands.floor.data, { raw: { width: PANO_W, height: FLOOR_H, channels: ch } })
      .webp({ quality })
      .toBuffer()
    chosen = { quality, wall, floor, total: wall.length + floor.length }
    if (chosen.total <= MURAL_TARGET_BYTES) break
    console.log(`  · q${quality} → 합 ${(chosen.total / 1024).toFixed(0)}KB (목표 초과, q 하향)`)
  }
  if (chosen.total > MURAL_BUDGET_BYTES) {
    throw new Error(`용량 게이트 실패 — 사다리 끝(q${chosen.quality})에서도 합 ${(chosen.total / 1024).toFixed(0)}KB`)
  }

  await mkdir(outDir, { recursive: true })
  const wallFile = path.join(outDir, 'wall.webp')
  const floorFile = path.join(outDir, 'floor.webp')
  await writeFile(wallFile, chosen.wall)
  await writeFile(floorFile, chosen.floor)

  // 이음매가 없으므로 «최악의 열»과 «톤 계단»을 대신 잰다 — 전폭 어디에도 경계가 없음을 보이는 지표.
  const measure = async (buf, h) => {
    const dec = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const stats = interiorStats(dec.data, PANO_W, h, dec.info.channels)
    const rs = await sharp(buf)
      .resize(Math.max(2, Math.round(PANO_W * RENDER_SCALE)), null, { kernel: 'lanczos3' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const rstats = interiorStats(rs.data, rs.info.width, rs.info.height, rs.info.channels)
    const step = toneStep(rs.data, rs.info.width, rs.info.height, rs.info.channels, Math.round(VIEW_W * 0.25))
    return { stats, render: { stats: rstats }, step, seams: [], pass: true }
  }

  return {
    code: theme.code,
    oneshot: true,
    quality: chosen.quality,
    files: { wall: wallFile, floor: floorFile },
    bytes: { wall: chosen.wall.length, floor: chosen.floor.length, total: chosen.total },
    withinBudget: chosen.total <= MURAL_BUDGET_BYTES,
    horizon,
    footroom,
    gains,
    seamsX: [],
    source: {
      w: meta.width,
      h: meta.height,
      ratio: meta.width / meta.height,
      fit,
      upscale: PANO_W / fit.width,
      seat,
    },
    wall: await measure(chosen.wall, WALL_H),
    floor: await measure(chosen.floor, FLOOR_H),
  }
}

async function buildScene(theme, round, outDir) {
  const files = SHOT_KEYS.map((k) => shotPath(theme.code, round, k))
  const missing = files.filter((f) => !existsSync(f))
  if (missing.length) throw new Error(`원본 샷 없음: ${missing.map((f) => path.basename(f)).join(', ')}`)

  const norm = []
  for (const f of files) norm.push(await normalizeShot(f, SHOT.shotW, PANO_H))
  const ch = norm[0].ch

  const pano = crossfadePanorama(
    norm.map((n) => n.data),
    SHOT.shotW,
    PANO_H,
    ch,
    SHOT.ov
  )
  const cropped = cropWidth(pano.data, pano.W, PANO_H, ch, SHOT.crop, PANO_W)
  const seamsX = pano.seams.map((x) => x - SHOT.crop).filter((x) => x > 0 && x < PANO_W)

  const refMean = await refChannelMean(theme.code)
  const gains = refMean ? anchorPalette(cropped.data, ch, refMean, channelMean(cropped.data, ch)) : [1, 1, 1]

  const horizon = horizonRow(cropped.data, PANO_W, PANO_H, ch)
  const bands = sliceBands(cropped.data, PANO_W, ch)
  const footBefore = floorFootroom(bands.floor.data, PANO_W, FLOOR_H, ch)
  const lift = liftFloorFoot(bands.floor.data, PANO_W, FLOOR_H, ch, footBefore)
  const footroom = { ...floorFootroom(bands.floor.data, PANO_W, FLOOR_H, ch), before: footBefore, lift: lift.applied }

  let chosen = null
  for (const quality of QUALITY_LADDER) {
    const wall = await sharp(bands.wall.data, { raw: { width: PANO_W, height: WALL_H, channels: ch } })
      .webp({ quality })
      .toBuffer()
    const floor = await sharp(bands.floor.data, { raw: { width: PANO_W, height: FLOOR_H, channels: ch } })
      .webp({ quality })
      .toBuffer()
    chosen = { quality, wall, floor, total: wall.length + floor.length }
    if (chosen.total <= MURAL_TARGET_BYTES) break
    console.log(`  · q${quality} → 합 ${(chosen.total / 1024).toFixed(0)}KB (목표 초과, q 하향)`)
  }
  if (chosen.total > MURAL_BUDGET_BYTES) {
    throw new Error(`용량 게이트 실패 — 사다리 끝(q${chosen.quality})에서도 합 ${(chosen.total / 1024).toFixed(0)}KB`)
  }

  await mkdir(outDir, { recursive: true })
  const wallFile = path.join(outDir, 'wall.webp')
  const floorFile = path.join(outDir, 'floor.webp')
  await writeFile(wallFile, chosen.wall)
  await writeFile(floorFile, chosen.floor)

  const measure = async (buf, h) => {
    const dec = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const stats = interiorStats(dec.data, PANO_W, h, dec.info.channels)
    const seams = seamsX.map((x) => ({ at: x, diff: colDiff(dec.data, PANO_W, h, dec.info.channels, x - 1, x) }))
    const render = await renderScaleSeam(buf, seamsX, PANO_W)
    // 톤 계단은 원샷과 **같은 방식**으로 잰다 — 캡처 전략이 바뀌어도 라운드 간 대조가 성립해야 한다
    const rs = await sharp(buf)
      .resize(Math.max(2, Math.round(PANO_W * RENDER_SCALE)), null, { kernel: 'lanczos3' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const step = toneStep(rs.data, rs.info.width, rs.info.height, rs.info.channels, Math.round(VIEW_W * 0.25))
    return { stats, seams, render, step, pass: seams.every((s) => seamPass(s.diff, stats)) }
  }

  return {
    code: theme.code,
    quality: chosen.quality,
    files: { wall: wallFile, floor: floorFile },
    bytes: { wall: chosen.wall.length, floor: chosen.floor.length, total: chosen.total },
    withinBudget: chosen.total <= MURAL_BUDGET_BYTES,
    horizon,
    footroom,
    gains,
    seamsX,
    shots: norm.map((n, i) => ({ key: SHOT_KEYS[i], src: `${n.srcW}×${n.srcH}`, scale: n.scale })),
    wall: await measure(chosen.wall, WALL_H),
    floor: await measure(chosen.floor, FLOOR_H),
  }
}

// ════════════════ 합성 QA판 — 「판정 단위 = 합성판」(PLAN §1-5) ════════════════
/**
 * 후보 뮤럴 위에 **라이브와 같은 좌표·같은 스케일**로 살림을 얹는다.
 * 좌표계 정리(라이브 렌더의 거울):
 *   · x 는 «세계 폭(320%) 대비 %» — stageContent 안의 CSS % 가 그대로 이 값이다.
 *   · y 는 «방 높이 대비 %».
 *   · 구조물 w 는 «뷰포트 폭 대비 %»(widthScale 이 세계 폭 확대를 되돌린다) → 픽셀은 뷰포트 폭에 곱한다.
 *   · 아이템은 px 단위(font-size) — 세계 폭과 무관하다.
 * 뷰포트 폭 = 방 실측 폭(520)을 그대로 쓴다. 그래야 «사람이 보는 크기»에서 판정하게 된다.
 */
const VIEW_W = C.roomW
const VIEW_H = C.roomH
const WORLD_PX = Math.round(VIEW_W * WORLD_SCREENS)

const pxX = (worldPct) => (WORLD_PX * worldPct) / 100
const pxY = (roomPct) => (VIEW_H * roomPct) / 100
/** 뷰포트 폭 기준 % → px (구조물 w 규약) */
const pxVW = (viewPct) => (VIEW_W * viewPct) / 100

/** 캔버스 밖으로 나가는 레이어를 잘라 넣는다 — sharp 는 음수 left/top 을 받지 않는다 */
async function clipLayer(buf, left, top, W, H, blend) {
  const meta = await sharp(buf).metadata()
  const l = Math.round(left)
  const t = Math.round(top)
  const x0 = Math.max(0, l)
  const y0 = Math.max(0, t)
  const x1 = Math.min(W, l + meta.width)
  const y1 = Math.min(H, t + meta.height)
  if (x1 <= x0 || y1 <= y0) return null
  if (l >= 0 && t >= 0 && x1 === l + meta.width && y1 === t + meta.height) {
    return { input: buf, left: l, top: t, ...(blend ? { blend } : {}) }
  }
  const sub = await sharp(buf)
    .extract({ left: x0 - l, top: y0 - t, width: x1 - x0, height: y1 - y0 })
    .png()
    .toBuffer()
  return { input: sub, left: x0, top: y0, ...(blend ? { blend } : {}) }
}

/**
 * CSS `drop-shadow(0 dy blur rgba(0,0,0,a))` 재현. 이걸 빼면 안 된다 —
 * 스프라이트가 «떠 보이는가»는 그림자가 만드는 판정이고, 이번 검수의 핵심 질문이 바로 그것이다.
 * CSS 의 blur 값은 표준편차의 2배 규약이라 sigma = blur/2.
 */
async function dropShadowLayer(buf, { dx = 0, dy, blur, alpha }) {
  const img = sharp(buf).ensureAlpha()
  const { width, height } = await img.metadata()
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
  return { buf: blurred, ox: dx - pad, oy: dy - pad }
}

/** 스프라이트 + 그림자 한 쌍을 레이어 목록에 밀어 넣는다 */
async function pushSprite(layers, buf, left, top, W, H, shadow) {
  if (shadow) {
    const s = await dropShadowLayer(buf, shadow)
    const l = await clipLayer(s.buf, left + s.ox, top + s.oy, W, H)
    if (l) layers.push(l)
  }
  const l = await clipLayer(buf, left, top, W, H)
  if (l) layers.push(l)
}

/** 세로 그라디언트 한 장(하단 암전) */
function vGradient(w, h, fromRgba, toRgba) {
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${fromRgba.c}" stop-opacity="${fromRgba.a}"/>
      <stop offset="1" stop-color="${toRgba.c}" stop-opacity="${toRgba.a}"/>
    </linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/></svg>`
  return Buffer.from(svg)
}

/**
 * 조명 오버레이 — `radial-gradient(120% 90% at 50% 52%, color 0%, transparent 72%)` + opacity(intensity),
 * mix-blend-mode: soft-light. **방(뷰포트) 기준**이라 전폭판이 아니라 1화면 크롭에만 얹는다
 * (전폭에 타일로 깔면 화면 경계마다 없는 띠가 생겨 «뮤럴의 얼룩»으로 오독된다).
 */
function lightOverlaySvg(w, h, light) {
  const cx = (w * light.origin.x) / 100
  const cy = (h * light.origin.y) / 100
  const rx = 1.2 * w
  const ry = 0.9 * h
  return Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><defs>
      <radialGradient id="g" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${rx}"
        gradientTransform="translate(0 ${cy}) scale(1 ${(ry / rx).toFixed(6)}) translate(0 ${-cy})">
        <stop offset="0" stop-color="${light.color}" stop-opacity="1"/>
        <stop offset="0.72" stop-color="${light.color}" stop-opacity="0"/>
      </radialGradient></defs>
      <rect width="${w}" height="${h}" fill="url(#g)" opacity="${light.intensity}"/></svg>`
  )
}

/** 제단 광원 — 타원 + blur(7px) */
async function altarGlowBuf(color) {
  const w = Math.round(pxVW(C.glowWPct))
  const h = Math.round(pxY(C.glowHPct))
  const pad = 24
  const svg = `<svg width="${w + pad * 2}" height="${h + pad * 2}" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="${w / 2 + pad}" cy="${h / 2 + pad}" rx="${w / 2}" ry="${h / 2}" fill="${color}"/></svg>`
  return { buf: await sharp(Buffer.from(svg)).blur(3.5).png().toBuffer(), pad, w, h }
}

/** 방문 가족 — 선반장 좌수만큼. 아바타는 실제 정령 초상(라이브와 같은 자산). */
const AVATARS = [
  '/avatars/five/wood.webp',
  '/avatars/five/fire.webp',
  '/avatars/five/water.webp',
  '/avatars/five/earth.webp',
  '/avatars/five/metal.webp',
  '/avatars/five/wood.webp',
]

/** 제단 앵커에 얹는 제물 — 기하 정본의 앵커 순서(왼·가운데·오른쪽)와 같은 순서 */
const OFFERINGS = ['offering-rice.webp', 'incense-burner.webp', 'candle-pair.webp']

/**
 * 전폭 합성판(조명 오버레이 없음) 한 장을 RGBA png 버퍼로 만든다.
 * 이 한 장에서 크롭을 떠야 «크롭마다 살림이 미세하게 달라지는» 사고가 구조적으로 없다.
 */
async function buildWideComposite({ wallFile, floorFile, seats, deityFile, light }) {
  const W = WORLD_PX
  const H = VIEW_H
  const wallH = Math.round(H * BAND_WALL)
  const floorH = Math.round(H * BAND_FLOOR)
  const layers = []

  // ① 벽·바닥 밴드 (object-cover)
  layers.push({ input: await sharp(wallFile).resize(W, wallH, { fit: 'cover' }).png().toBuffer(), left: 0, top: 0 })
  layers.push({
    input: await sharp(floorFile).resize(W, floorH, { fit: 'cover' }).png().toBuffer(),
    left: 0,
    top: H - floorH,
  })

  // ② 하단 암전 (`inset-x-0 bottom-0 h-[38%]` · transparent → rgba(0,0,0,0.32))
  const vigH = Math.round(H * 0.38)
  layers.push({
    input: await sharp(vGradient(W, vigH, { c: '#000000', a: 0 }, { c: '#000000', a: 0.32 }))
      .png()
      .toBuffer(),
    left: 0,
    top: H - vigH,
  })

  // ③ 제단 광원
  const glow = await altarGlowBuf(light.glow)
  layers.push({
    input: glow.buf,
    left: Math.round(W / 2 - glow.w / 2 - glow.pad),
    top: Math.round(pxY(C.glowTopPct) - glow.pad),
    blend: 'over',
  })

  // ④ 구조물 — 기하 정본(theme-stage-geometry.json) 좌표 그대로. w 는 뷰포트 폭 대비 %.
  for (const s of GEO.structures) {
    const file = path.join(COMMON_DIR, path.basename(s.assetUrl))
    if (!existsSync(file)) continue
    const sw = Math.max(4, Math.round(pxVW(s.w)))
    const buf = await sharp(file).resize({ width: sw, fit: 'inside' }).png().toBuffer()
    const meta = await sharp(buf).metadata()
    await pushSprite(layers, buf, pxX(s.x) - meta.width / 2, pxY(s.y) - meta.height / 2, W, H, {
      dy: 4,
      blur: 8,
      alpha: 0.45,
    })
  }

  // ⑤ 좌정 신위 — 발이 단상 상면(PODIUM_TOP_Y)에 닿고 머리는 머리 여백에 선다
  if (deityFile && existsSync(deityFile)) {
    const standH = Math.round(pxY(C.podiumTopY - C.deityHeadRoomY))
    const standBottom = pxY(C.podiumTopY)
    const buf = await sharp(deityFile).resize({ height: standH, fit: 'inside' }).png().toBuffer()
    const meta = await sharp(buf).metadata()
    await pushSprite(layers, buf, W / 2 - meta.width / 2, standBottom - meta.height, W, H, {
      dy: 5,
      blur: 9,
      alpha: 0.5,
    })
  }

  // ⑥ 가족 선반장 — objectFit:fill (박스에 딱 맞춤). 상단 칸에 정령 아바타 + 이름패.
  const shelfFile = path.join(PUB, C.shelfSprite.replace(/^\//, ''))
  const unitW = Math.round(pxX(C.fshelfW))
  const unitH = Math.round(pxY(C.fshelfBottom - C.fshelfTop))
  const unitTop = pxY(C.fshelfTop)
  for (let i = 0; i < seats; i += 1) {
    const cx = pxX(C.fshelfX[i])
    const buf = await sharp(shelfFile).resize(unitW, unitH, { fit: 'fill' }).png().toBuffer()
    await pushSprite(layers, buf, cx - unitW / 2, unitTop, W, H, { dy: 5, blur: 6, alpha: 0.45 })

    // 가족 자리(정령 초상) — width 46% · translate(-50%,-58%) · 골드 테
    const av = Math.round(unitW * 0.46)
    const avTop = unitTop + C.fshelfFamilyTier * unitH - av * 0.58
    const avFile = path.join(PUB, AVATARS[i % AVATARS.length].replace(/^\//, ''))
    const ring = Buffer.from(
      `<svg width="${av}" height="${av}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${av / 2}" cy="${av / 2}" r="${av / 2 - 1}" fill="rgba(201,168,76,0.27)"
          stroke="rgba(201,168,76,0.5)" stroke-width="1.5"/></svg>`
    )
    if (existsSync(avFile)) {
      const face = await sharp(avFile).resize(av, av, { fit: 'cover', position: 'top' }).png().toBuffer()
      const mask = Buffer.from(
        `<svg width="${av}" height="${av}" xmlns="http://www.w3.org/2000/svg">
          <circle cx="${av / 2}" cy="${av / 2}" r="${av / 2}" fill="#fff"/></svg>`
      )
      const round = await sharp(face)
        .composite([{ input: await sharp(mask).png().toBuffer(), blend: 'dest-in' }])
        .png()
        .toBuffer()
      const l1 = await clipLayer(round, cx - av / 2, avTop, W, H)
      if (l1) layers.push(l1)
    }
    const l2 = await clipLayer(await sharp(ring).png().toBuffer(), cx - av / 2, avTop, W, H)
    if (l2) layers.push(l2)

    // 이름패 — 어두운 칩(글자는 굽지 않는다: 폰트 유무로 QA 가 흔들리지 않게)
    const chipW = 36
    const chipH = 15
    const chipTop = unitTop + C.fshelfFamilyTier * unitH + chipH * 0.46
    const chip = Buffer.from(
      `<svg width="${chipW}" height="${chipH}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0.5" y="0.5" width="${chipW - 1}" height="${chipH - 1}" rx="5"
          fill="rgba(20,14,8,0.78)" stroke="rgba(201,168,76,0.35)"/></svg>`
    )
    const l3 = await clipLayer(await sharp(chip).png().toBuffer(), cx - chipW / 2, chipTop, W, H)
    if (l3) layers.push(l3)
  }

  // ⑦ 제물 — 제단 앵커(45/50/55 · y53.5) 위. altar 레이어는 depthScale 0.88 고정.
  const altar = GEO.structures.find((s) => Array.isArray(s.anchors) && s.anchors.length)
  const base = C.assetEm * C.itemMdPx
  const scaled = base * C.altarScale
  if (altar) {
    for (let i = 0; i < altar.anchors.length && i < OFFERINGS.length; i += 1) {
      const a = altar.anchors[i]
      const file = path.join(PUB, 'shrine', 'items', OFFERINGS[i])
      if (!existsSync(file)) continue
      const buf = await sharp(file).resize(Math.round(scaled), Math.round(scaled), { fit: 'inside' }).png().toBuffer()
      const meta = await sharp(buf).metadata()
      // translate(-50%,-50%) scale(s) · transform-origin 50% 100% → 밑변은 y+base/2 에 고정
      const left = pxX(a.x) - meta.width / 2
      const top = pxY(a.y) + base / 2 - meta.height
      await pushSprite(layers, buf, left, top, W, H, { dy: 3, blur: 3, alpha: 0.55 })
    }
  }

  // ⑧ 의식각 — 사방탁자 한 좌 + 현판 4문
  const hallW = Math.round(pxX(C.hallW))
  const hallH = Math.round(pxY(C.hallBottom - C.hallTop))
  const hallTop = pxY(C.hallTop)
  const hallCx = pxX(C.hallX)
  const hallBody = await sharp(shelfFile).resize(hallW, hallH, { fit: 'fill' }).png().toBuffer()
  await pushSprite(layers, hallBody, hallCx - hallW / 2, hallTop, W, H, { dy: 5, blur: 6, alpha: 0.45 })
  const plaqueFile = path.join(PUB, 'shrine', 'ritual', 'plaque.webp')
  if (existsSync(plaqueFile)) {
    const pw = Math.round((hallW * C.plaqueWPct) / 100)
    const ph = Math.round((pw * 2) / 5)
    for (const cy of C.plaqueCy) {
      const buf = await sharp(plaqueFile).resize(pw, ph, { fit: 'fill' }).png().toBuffer()
      await pushSprite(layers, buf, hallCx - pw / 2, hallTop + cy * hallH - ph / 2, W, H, {
        dy: 3,
        blur: 4,
        alpha: 0.5,
      })
    }
  }

  const png = await sharp({ create: { width: W, height: H, channels: 4, background: DARK } })
    .composite(layers)
    .png()
    .toBuffer()
  return { png, W, H }
}

/** 1화면 크롭 + 조명 오버레이(soft-light) — 사람이 실제로 보는 한 장 */
async function viewCrop(widePng, leftPx, light) {
  const cropped = await sharp(widePng)
    .extract({ left: Math.round(leftPx), top: 0, width: VIEW_W, height: VIEW_H })
    .png()
    .toBuffer()
  const overlay = await sharp(lightOverlaySvg(VIEW_W, VIEW_H, light))
    .png()
    .toBuffer()
  return sharp(cropped)
    .composite([{ input: overlay, blend: 'soft-light' }])
    .png()
    .toBuffer()
}

/** 두 장을 좌우로 붙여 «현행 vs 후보» 한 장 */
async function sideBySide(aBuf, bBuf, gap = 12) {
  const a = await sharp(aBuf).metadata()
  const b = await sharp(bBuf).metadata()
  const W = a.width + gap + b.width
  const H = Math.max(a.height, b.height)
  return sharp({ create: { width: W, height: H, channels: 4, background: DARK } })
    .composite([
      { input: aBuf, left: 0, top: 0 },
      { input: bBuf, left: a.width + gap, top: 0 },
      {
        input: {
          create: { width: 2, height: H, channels: 4, background: { r: 0xc9, g: 0xa8, b: 0x4c, alpha: 0.9 } },
        },
        left: a.width + Math.floor(gap / 2) - 1,
        top: 0,
      },
    ])
    .webp({ quality: 90 })
    .toBuffer()
}

/**
 * QA 한 벌 = 전폭 1 + 1화면 3(가운데·왼벽 선반장·의식각). 결과는 파일 경로 목록.
 * ⚠️ 전폭판에는 조명 오버레이를 얹지 않는다(위 lightOverlaySvg 주석 참조).
 */
async function makeQaSet({ code, tag, wallFile, floorFile, seats, deityFile, light }) {
  const { png, W } = await buildWideComposite({ wallFile, floorFile, seats, deityFile, light })
  const dir = qaDir(code)
  await mkdir(dir, { recursive: true })

  const out = {}
  const wide = path.join(dir, `${tag}-wide.webp`)
  await sharp(png).webp({ quality: 90 }).toFile(wide)
  out.wide = wide

  const views = {
    center: Math.round((W - VIEW_W) / 2),
    left: 0,
    right: W - VIEW_W,
  }
  out.views = {}
  out.viewBufs = {}
  for (const [name, left] of Object.entries(views)) {
    const buf = await viewCrop(png, left, light)
    const file = path.join(dir, `${tag}-view-${name}.webp`)
    await sharp(buf).webp({ quality: 92 }).toFile(file)
    out.views[name] = file
    out.viewBufs[name] = buf
  }
  return out
}

// ──────────────────────────── main ────────────────────────────
const args = process.argv.slice(2)
const VALUE_FLAGS = ['--round', '--from', '--regen', '--seats', '--deity', '--against']
const BOOL_FLAGS = ['--plan', '--assemble-only', '--qa-only', '--live', '--no-live', '--three-shot']

function flagValue(name, fallback) {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback
}

const planOnly = args.includes('--plan')
const assembleOnly = args.includes('--assemble-only')
/**
 * 조립까지 건너뛰고 **합성판만** 다시 굽는다(API 0회). 살림 스프라이트가 바뀌었을 때
 * 「승인된 뮤럴은 한 바이트도 건드리지 않고」 합성판만 최신 살림으로 갱신하는 경로다.
 * 조립을 다시 돌리면 크롭·인코딩이 다시 계산되어 승인분과 다른 그림이 나올 수 있다.
 */
const qaOnly = args.includes('--qa-only')
const liveOnly = args.includes('--live')
const skipLive = args.includes('--no-live')
/**
 * 캡처 전략. 기본은 **원샷 통짜**(CEO 2차 판정). `--three-shot` 은 r1~r3 를 만든 구 경로 —
 * 지우지 않고 남긴다(원복 레버). 두 경로가 같은 라운드 폴더를 쓰되 파일명이 달라 섞이지 않는다.
 */
const threeShot = args.includes('--three-shot')
/** 대비판 기준 — 기본은 현행 라이브. `--against r2` 면 r2 뮤럴로 한 벌 더 구워 나란히 붙인다. */
const against = flagValue('--against', 'live')
const round = Number(flagValue('--round', '1'))
const from = flagValue('--from', null)
const seats = Number(flagValue('--seats', '3'))
const deitySlug = flagValue('--deity', 'sansin')
const regenArg = flagValue('--regen', '')
const regen = new Set(
  regenArg === 'all'
    ? SHOT_KEYS
    : regenArg
      ? regenArg
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : []
)

const positional = args.filter((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(args[i - 1]))
const unknown = args.filter((a) => a.startsWith('--') && !VALUE_FLAGS.includes(a) && !BOOL_FLAGS.includes(a))
if (unknown.length) {
  console.error('unknown flag:', unknown.join(' '), '— 가능:', [...VALUE_FLAGS, ...BOOL_FLAGS].join(', '))
  process.exit(1)
}
const only = positional[0]
if (!only) {
  console.error(
    `사용: node scripts/shrine-assets/stage-theme-harmony.mjs <code> [${[...VALUE_FLAGS, ...BOOL_FLAGS].join('] [')}]`
  )
  console.error('가능한 code:', THEMES.map((t) => t.code).join(', '))
  process.exit(1)
}
const targets = only === 'all' ? THEMES : THEMES.filter((t) => t.code === only)
if (!targets.length) {
  console.error('unknown theme code:', only, '— 가능:', THEMES.map((t) => t.code).join(', '))
  process.exit(1)
}
const badRegen = [...regen].filter((k) => !SHOT_KEYS.includes(k))
if (badRegen.length) {
  console.error('unknown shot key:', badRegen.join(','), '— 가능:', SHOT_KEYS.join(', '), '또는 all')
  process.exit(1)
}
if (!Number.isInteger(seats) || seats < 0 || seats > C.fshelfX.length) {
  console.error(`--seats 는 0~${C.fshelfX.length}`)
  process.exit(1)
}

/**
 * 조명 — 라이브 `shrine_theme_packs` 실값. color/origin/intensity 는 `stage.light`(오행색),
 * glow 는 `assets.glow`(제단 광원 = CSS `--th-glow`). 합성판이 라이브와 다른 색으로 판정하지
 * 않게 하려는 것이므로, 시드가 바뀌면 여기도 같이 바꾼다.
 */
const LIGHT_BY_CODE = {
  banga: { color: '#C9A84C', intensity: 0.5, origin: { x: 50, y: 52 }, glow: 'rgba(201,168,76,0.2)' },
  daljip: { color: '#d4a017', intensity: 0.5, origin: { x: 50, y: 52 }, glow: 'rgba(230,195,122,0.17)' },
  seolbit: { color: '#c9a84c', intensity: 0.5, origin: { x: 50, y: 52 }, glow: 'rgba(200,212,220,0.16)' },
  yonggung: { color: '#2d5f8a', intensity: 0.5, origin: { x: 50, y: 52 }, glow: 'rgba(95,179,179,0.18)' },
}
const lightFor = (code) =>
  LIGHT_BY_CODE[code] ?? {
    color: GEO.light.neutralColor,
    intensity: GEO.light.intensity,
    origin: GEO.light.origin,
    glow: 'rgba(201,168,76,0.2)',
  }

const geoLine =
  `기하: 파노라마 ${PANO_W}×${PANO_H} (${WORLD_SCREENS}화면 × 방비율 ${C.roomW}/${C.roomH} = ${(PANO_W / PANO_H).toFixed(3)}:1) · ` +
  (threeShot
    ? `샷 ${SHOT.shotW}×${PANO_H} ×3, 겹침 ${SHOT.ov}px(${(OVERLAP_FRAC * 100).toFixed(0)}%) ×2, 크롭 ${SHOT.crop}px\n`
    : `캡처 **원샷 통짜** ${WIDE_ASPECT} → 세로 크롭으로 규격 맞춤 (이을 자리 없음)\n`) +
  `밴드: 벽 ${PANO_W}×${WALL_H} · 바닥 ${PANO_W}×${FLOOR_H} · 겹침 ${WALL_H - FLOOR_TOP}px · 렌더 스케일 ${RENDER_SCALE.toFixed(3)}\n` +
  `합성판: 세계 ${WORLD_PX}×${VIEW_H} · 1화면 ${VIEW_W}×${VIEW_H} · 선반장 x[${C.fshelfX.slice(0, seats).join(',')}] w${C.fshelfW} · ` +
  `의식각 x${C.hallX} · 신위 접지 y${C.podiumTopY}`

if (planOnly) {
  console.log(geoLine)
  for (const t of targets) {
    console.log(`\n══ ${t.code} · ${t.name} (${t.el}) ══`)
    if (!threeShot) {
      const refs = [artPath(t.code), styleCardPath(t.code)].map(showPath)
      console.log(`\n── room (통짜 ${WIDE_ASPECT}) · 참조 [${refs.join(' + ')}] ──`)
      console.log(fullRoomPrompt(t))
      continue
    }
    for (const key of GEN_ORDER) {
      const refs = refsFor(t.code, round, key).map(showPath)
      console.log(`\n── ${key} ${SHOT.shotW}×${PANO_H} · 참조 [${refs.join(' + ')}] ──`)
      console.log(shotPrompt(t, key))
    }
  }
  console.log(`\n(--plan: API 0회 · 프롬프트 ${targets.length * (threeShot ? SHOT_KEYS.length : 1)}건)`)
  process.exit(0)
}

apiBudget = assembleOnly || liveOnly || qaOnly ? 0 : targets.length * (threeShot ? SHOT_KEYS.length : 1)
if (apiBudget > 0 && !KEY) {
  console.error('✖ GEMINI 키 없음 — .env.local의 GOOGLE_GENERATIVE_AI_API_KEY / GEMINI_API_KEY 확인')
  process.exit(1)
}

console.log(
  `모델: ${MODEL}\n산출: ${showPath(PILOT_ROOT)}/{code}/  (public 무접촉)\n${geoLine}\n` +
    `라운드 r${round}${from ? ` (r${from} 승계)` : ''} · 재생성 [${[...regen].join(',') || '없음(누락분만)'}] · ` +
    `가족 ${seats}좌 · 신위 ${deitySlug} · API 예산 ${apiBudget}회\n`
)

const fmt = (v) => v.toFixed(2)
/** 수평선 이탈 판정 — 계약 60% 에서 3%p 밖. 밴드 슬라이스가 그림을 엉뚱한 데서 자른다는 뜻이다. */
const HORIZON_TOL_PCT = 3
const horizonOff = (h) => h.pct === null || Math.abs(h.pct - 60) > HORIZON_TOL_PCT
const report = []

for (const theme of targets) {
  const entry = { code: theme.code, name: theme.name, scene: null, qa: null, live: null, error: null }
  report.push(entry)
  console.log(`\n══ ${theme.code} · ${theme.name} (${theme.el}) ══`)
  const light = lightFor(theme.code)
  const deityFile = path.join(PUB, 'shrine', 'deities', deitySlug, 'base.webp')

  try {
    // ⓪ 현행 라이브 뮤럴 합성판 — 전/후 비교의 기준선
    const liveWall = path.join(STAGE_ROOT, theme.code, 'room-wall-mural.webp')
    const liveFloor = path.join(STAGE_ROOT, theme.code, 'room-floor-mural.webp')
    if (!skipLive && existsSync(liveWall) && existsSync(liveFloor)) {
      console.log('── 현행 라이브 뮤럴 합성판 (API 0회) ──')
      entry.live = await makeQaSet({
        code: theme.code,
        tag: 'live',
        wallFile: liveWall,
        floorFile: liveFloor,
        seats,
        deityFile,
        light,
      })
      console.log(`  ✔ ${showPath(entry.live.wide)} + view ${Object.keys(entry.live.views).join('/')}`)
    }
    if (liveOnly) continue

    // ⓪-b 합성판만 다시 굽기 — 승인된 뮤럴(r{N}/wall·floor.webp)을 그대로 두고 살림만 최신본으로
    if (qaOnly) {
      const w = path.join(roundDir(theme.code, round), 'wall.webp')
      const f = path.join(roundDir(theme.code, round), 'floor.webp')
      if (!existsSync(w) || !existsSync(f)) throw new Error(`후보 뮤럴 없음: ${showPath(w)}`)
      console.log(`── 합성 QA판 재생성 (API 0회 · 뮤럴 무변경) ──`)
      entry.qa = await makeQaSet({ code: theme.code, tag: `r${round}`, wallFile: w, floorFile: f, seats, deityFile, light })
      console.log(`  ✔ ${showPath(entry.qa.wide)} + view ${Object.keys(entry.qa.views).join('/')}`)
      if (entry.live) {
        for (const name of ['center', 'left', 'right']) {
          const buf = await sideBySide(entry.live.viewBufs[name], entry.qa.viewBufs[name])
          const file = path.join(qaDir(theme.code), `r${round}-compare-${name}.webp`)
          await writeFile(file, buf)
          console.log(`  ✔ 대비 ${showPath(file)} (왼쪽 live · 오른쪽 r${round})`)
        }
      }
      continue
    }

    // ① 살림 화풍 카드 (API 0회) — 참조 주입분. 매번 다시 굽는다(살림이 바뀌면 카드도 바뀌어야 한다).
    const card = await buildStyleCard(styleCardPath(theme.code))
    console.log(`── 살림 화풍 카드 ${showPath(card.out)} ${(card.bytes / 1024).toFixed(0)}KB ──`)

    // ② 캡처 — 원샷 통짜(기본) 또는 3샷(원복 레버)
    if (!assembleOnly) {
      if (!existsSync(artPath(theme.code))) {
        throw new Error(`원화 없음: public/shrine/themes/${theme.code}/room.webp — 참조·팔레트 앵커의 전제다`)
      }
      if (threeShot) {
        const inherited = await inheritShots(theme.code, round, from, regen)
        if (inherited.length) console.log(`  · r${from} 승계: ${inherited.join(', ')} (API 0회)`)
        for (const key of GEN_ORDER) await ensureShot(theme, round, key, { regen })
      } else {
        await ensureRoom(theme, round, { regen })
      }
    }

    // ③ 조립·슬라이스 (API 0회)
    console.log(threeShot ? '── 파노라마 조립·슬라이스 (API 0회) ──' : '── 통짜 규격 맞춤·슬라이스 (API 0회) ──')
    const r = threeShot
      ? await buildScene(theme, round, roundDir(theme.code, round))
      : await buildRoomScene(theme, round, roundDir(theme.code, round))
    entry.scene = r
    const band = (label, m) =>
      `      ${label} ${
        m.seams.length ? `이음매 ${m.seams.map((s) => `x${s.at}:${fmt(s.diff)}`).join(' · ')}` : '이음매 없음(통짜)'
      } / 내부 p95 ${fmt(m.stats.p95)}` +
      ` ${m.pass ? 'PASS' : '⚠️ 초과'} · 렌더 ${RENDER_SCALE.toFixed(3)} 축소 ` +
      `${m.render.seams ? m.render.seams.map((s) => fmt(s.diff)).join(' · ') : '—'} / p95 ${fmt(m.render.stats.p95)}` +
      ` · 톤 계단 ${fmt(m.step.max)}@x${m.step.at}`
    const ok = r.wall.pass && r.floor.pass && r.withinBudget
    console.log(
      `  ${ok ? '✔' : '⚠️'} 벽 ${(r.bytes.wall / 1024).toFixed(0)}KB + 바닥 ${(r.bytes.floor / 1024).toFixed(0)}KB` +
        ` = ${(r.bytes.total / 1024).toFixed(0)}KB q${r.quality} (예산 ${(MURAL_BUDGET_BYTES / 1024).toFixed(0)}KB ` +
        `${r.withinBudget ? 'OK' : '⚠️ 초과'})\n` +
        (r.oneshot
          ? `      원판 ${r.source.w}×${r.source.h} (${r.source.ratio.toFixed(3)}:1) → ${r.source.fit.mode} ` +
            `${r.source.fit.width}×${r.source.fit.height} @(${r.source.fit.left},${r.source.fit.top}) → ` +
            `업스케일 ×${r.source.upscale.toFixed(2)} · 수평선 폐루프 ${r.source.seat.tries}회\n`
          : `      샷 원본 ${r.shots.map((s) => `${s.key} ${s.src}(×${s.scale.toFixed(2)})`).join(' · ')}\n`) +
        `      팔레트 게인 ${r.gains.map((g) => g.toFixed(3)).join('/')} (원화 기준 · 70% · ±12% 상한)\n` +
        `      수평선 ${r.horizon.pct === null ? '검출 실패' : `${r.horizon.pct.toFixed(1)}%`} (계약 60%` +
        `${horizonOff(r.horizon) ? ' ⚠️ 이탈' : ' OK'}) · 발밑 밝기 ${r.footroom.before.top.toFixed(0)}` +
        `→${r.footroom.top.toFixed(0)}(×${r.footroom.lift.toFixed(2)} 램프)` +
        ` / 앞바닥 ${r.footroom.bottom.toFixed(0)} = ${r.footroom.ratio.toFixed(2)}` +
        ` ${r.footroom.pass ? 'OK' : `⚠️ 어둠(≥${FOOTROOM_MIN_RATIO} 또는 ≥${FOOTROOM_MIN_LUM})`}\n` +
        band('벽  ', r.wall) +
        '\n' +
        band('바닥', r.floor)
    )

    // ④ 합성 QA판 (API 0회) — **판정 단위**
    console.log('── 합성 QA판 (API 0회) ──')
    entry.qa = await makeQaSet({
      code: theme.code,
      tag: `r${round}`,
      wallFile: r.files.wall,
      floorFile: r.files.floor,
      seats,
      deityFile,
      light,
    })
    console.log(`  ✔ ${showPath(entry.qa.wide)} + view ${Object.keys(entry.qa.views).join('/')}`)

    // ⑤ 기준 vs 후보 — 판정 구간 셋(가운데 = 제단 · 왼쪽 = 선반장 · 오른쪽 = 의식각)
    //    기준은 기본 현행 라이브, `--against r2` 면 그 라운드 뮤럴로 한 벌 구워 나란히 붙인다.
    let baseSet = entry.live
    if (against !== 'live') {
      const bw = path.join(roundDir(theme.code, against.replace(/^r/, '')), 'wall.webp')
      const bf = path.join(roundDir(theme.code, against.replace(/^r/, '')), 'floor.webp')
      if (!existsSync(bw) || !existsSync(bf)) throw new Error(`대비 기준 뮤럴 없음: ${showPath(bw)}`)
      baseSet = await makeQaSet({
        code: theme.code,
        tag: against,
        wallFile: bw,
        floorFile: bf,
        seats,
        deityFile,
        light,
      })
      console.log(`  ✔ 대비 기준 ${against} 합성판 재생성 ${showPath(baseSet.wide)}`)
    }
    if (baseSet) {
      for (const name of ['center', 'left', 'right']) {
        const buf = await sideBySide(baseSet.viewBufs[name], entry.qa.viewBufs[name])
        const file = path.join(
          qaDir(theme.code),
          `r${round}-compare-${name}${against === 'live' ? '' : `-${against}`}.webp`
        )
        await writeFile(file, buf)
        entry.qa[`compare_${name}`] = file
        console.log(`  ✔ 대비 ${showPath(file)} (왼쪽 ${against} · 오른쪽 r${round})`)
      }
    }
  } catch (e) {
    if (isAuthError(e)) {
      console.error('\n✖✖ API 키 인증 실패 — 즉시 중단합니다. 재시도하지 않음.')
      console.error('   ', String(e?.message || e).slice(0, 400))
      process.exit(2)
    }
    entry.error = String(e?.message || e).slice(0, 400)
    console.error('  ✖', theme.code, entry.error)
  }
}

console.log('\n── 요약 ──')
for (const e of report) {
  if (e.error) {
    console.log(`  ✖ ${e.code.padEnd(11)} ${e.error}`)
    continue
  }
  if (!e.scene) {
    console.log(`  · ${e.code.padEnd(11)} 라이브 합성판만 (${e.live ? showPath(e.live.wide) : '없음'})`)
    continue
  }
  const s = e.scene
  const bad = [
    !s.wall.pass && '벽 이음매',
    !s.floor.pass && '바닥 이음매',
    !s.withinBudget && '용량',
    horizonOff(s.horizon) && '수평선',
    !s.footroom.pass && '발밑 어둠',
  ].filter(Boolean)
  console.log(
    `  ${bad.length ? '⚠️' : '✔'} ${e.code.padEnd(11)} ${(s.bytes.total / 1024).toFixed(0)}KB q${s.quality}` +
      `${bad.length ? ` — 게이트 미달: ${bad.join(', ')}` : ''}`
  )
}
console.log(`\nAPI 호출 ${apiCalls}/${apiBudget}회`)
console.log('⚠️ 수치 게이트는 이음매·용량만 본다. **조화는 합성판(qa/*-view-*.webp)을 눈으로 봐서** 판정할 것.')
process.exit(report.some((e) => e.error) ? 1 : 0)
