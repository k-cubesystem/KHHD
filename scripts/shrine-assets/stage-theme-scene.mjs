// 테마 공통 무대 — 15테마 **3샷 씬 파노라마** 파이프라인 (CEO 반려 후 재제작)
//
// ── 왜 다시 만드는가 ────────────────────────────────────────────────────────────
// 앞선 파이프라인(stage-theme-room.mjs)은 「1타일 → ×4 퀼트」였다. 이음새는 수학적으로 잡혔지만
// 그 대가로 그림이 죽었다 — 타일이 성립하려면 **균일광·무초점·빈 벽**을 강요해야 하고
// (그 스크립트의 TILE_RULE 이 문자 그대로 그렇게 적혀 있다), 그 셋은 회화의 고급스러움을 만드는
// 요소(깊이·초점광·분위기)와 정확히 반대다. CEO 판정: "기존 테마 이미지가 더 고급스러웠다."
//
// 그래서 기준을 뒤집는다. **기존 원화(public/shrine/themes/{code}/room.webp)가 정답**이고,
// 우리가 할 일은 그 한 장을 무대 폭(3.2화면)까지 **이어 그리는** 것이다.
//   C(중앙) = 원화를 같은 구도·같은 화풍으로 더 크게 재현 (원화의 제단·소품도 그대로 둔다)
//   L(왼쪽) = 같은 홀에서 카메라를 한 화면 왼쪽으로 옮긴 정경 — **가구 없이 빈 벽·빈 바닥**
//   R(오른쪽) = 좌동, 오른쪽
// L·R 이 비어 있어야 하는 이유는 예술이 아니라 계약이다 — 그 자리에 가족 선반장(왼쪽)과
// 의식각(오른쪽)이 런타임 스프라이트로 선다. 그린 가구와 실제 가구가 겹치면 방이 무너진다.
//
// ── 구 파이프라인과의 관계 ─────────────────────────────────────────────────────
// stage-theme-room.mjs 와 그 산출(room-*-tile.webp)은 **건드리지 않는다**. 원복 레버로 존치한다.
// 이 스크립트는 같은 파일명(room-wall-mural.webp / room-floor-mural.webp)을 덮어쓰므로
// 시드·도메인·컴포넌트 변경이 0이다. 되돌리려면 구 스크립트를 `--mural-only` 로 다시 돌리면 된다.
//
// 산출(테마당): public/shrine/stage/{code}/
//   room-wall-mural.webp    파노라마 상단 62% — 벽 밴드
//   room-floor-mural.webp   파노라마 하단 40% — 바닥 밴드 (62+40=102 → 2% 겹침이 렌더 규약)
// 검수: assets-src/shrine/stage-theme-qa/{code}-check.webp
//   왼쪽에 **원화 원본**, 오른쪽에 새 무대 조립 — 고급스러움을 한 장에서 견주라고 붙인 것이다.
// 원본 캐시: D:/anti/haehwadang/assets-src/shrine/raw-stage-scenes/{code}/{left,center,right}.png
//   ⚠️ **메인 체크아웃 절대경로**다 — 워크트리를 지워도 비싼 생성분이 남게 하려는 의도.
//
// 사용:
//   node scripts/shrine-assets/stage-theme-scene.mjs jonggak --plan  # 프롬프트만 (API 0회·키 불필요)
//   node scripts/shrine-assets/stage-theme-scene.mjs jonggak         # 시안 1테마 풀코스 (API 3회)
//   node scripts/shrine-assets/stage-theme-scene.mjs all             # 15테마 (누락분만)
//   node scripts/shrine-assets/stage-theme-scene.mjs jonggak --regen # 원본 캐시 삭제 후 재생성
//   node scripts/shrine-assets/stage-theme-scene.mjs all --assemble-only  # 조립·검수만 (API 0회)
//   node scripts/shrine-assets/stage-theme-scene.mjs jonggak --dry-run    # 산출을 임시폴더로 (public 무손)
//   ↳ 뮤럴 webp 만 지우고 재실행해도 **원본 캐시로 조립만** 다시 돈다(과금 0).
//
// 규율
//   - STYLE 문구는 stage-banga.mjs → stage-banga-room.mjs → stage-theme-room.mjs 로 이어온 원문을
//     **한 글자도 바꾸지 않고** 복제한다(신위·살림 스프라이트와 한 화면에서 만나므로 붓이 갈리면 안 된다).
//   - **LIGHT 원문은 쓰지 않는다.** 그 문구는 "좌상단 촛불 단일 광원"을 못 박는데, 원화의 빛은
//     테마마다 다르다(종각은 오른쪽 마당에서 새벽빛이 든다). 이번 파이프라인의 제1원칙은
//     "원화 보존"이므로 빛도 **원화가 정한다** — 대신 세 샷이 같은 빛을 쓰도록 CONTINUITY 로 묶는다.
//   - TILE_RULE(균일광·무초점·좌우 에지)은 **넣지 않는다**. 반복 타일이 아니라 회화다.
//   - 접지 그림자를 굽지 않는다(런타임 담당). 불투명 배경판이라 크로마키가 없다.
//   - API 예산은 **테마 수 × 3장**으로 자동 산정. 재시도 루프가 없으므로 이 상한을 넘으면 곧 버그다.
import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from 'dotenv'
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

// ⚠️ .env.local 은 **메인 체크아웃만** 로드한다.
//    워크트리(.claude/worktrees/*)의 .env.local 에는 폐기된 구키(AIzaSy…)가 잔존하며,
//    dotenv 는 먼저 설정된 값을 덮지 않으므로 워크트리를 같이 로드하면 구키가 우선권을 가진다.
//    키 우선순위도 GOOGLE_GENERATIVE_AI_API_KEY 를 앞에 둔다(앱 런타임과 동일 변수).
config({ path: 'D:/anti/haehwadang/.env.local' })

const MODEL = process.env.SHRINE_IMAGE_MODEL || 'gemini-3.1-flash-image'
const KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const STAGE_ROOT = path.join(ROOT, 'public', 'shrine', 'stage')
/** 원화(=팔레트 앵커 기준이자 참조 이미지)가 사는 곳 */
const THEME_ART = path.join(ROOT, 'public', 'shrine', 'themes')
/** 검수 산출물 — 제품 번들(public)에 QA 이미지를 흘리지 않는다 */
const QA_DIR = path.join(ROOT, 'assets-src', 'shrine', 'stage-theme-qa')
/** 공용 살림 스프라이트가 사는 곳. 테마가 바뀌어도 이 두 장은 그대로다. */
const COMMON_DIR = path.join(STAGE_ROOT, 'banga')
const RAW_ROOT = process.env.STAGE_SCENE_RAW_DIR || 'D:/anti/haehwadang/assets-src/shrine/raw-stage-scenes'

let apiCalls = 0
let apiBudget = 0

// ════════════════════════ 기하 — 정본은 도메인 JSON 이다 ════════════════════════
// ⚠️ 좌표를 여기에 다시 적지 않는다. 확산 사고의 대부분이 "같은 숫자 두 벌"에서 난다
//    (build-theme-stage-seed.mjs 가 같은 파일을 읽는 이유와 같다).
const GEO = JSON.parse(readFileSync(path.join(ROOT, 'lib', 'domain', 'shrine', 'theme-stage-geometry.json'), 'utf8'))

/** 방 컨테이너 실측 — ShrineRoomClient `max-w-[520px]` × `min(72vh, 620px)` */
const ROOM_REF_W = 520
const ROOM_REF_H = 620
/** 한 화면(%) — lib/domain/shrine/world.ts 의 WORLD_VIEWPORT_PCT 와 같은 값 */
const WORLD_VIEWPORT_PCT = 100
/** 세계 폭(%) — 기하 정본에서 온다(320) */
const WORLD_WIDTH_PCT = GEO.worldWidth
/** 세계가 몇 화면인가 = 3.2 */
const WORLD_SCREENS = WORLD_WIDTH_PCT / WORLD_VIEWPORT_PCT

/**
 * 밴드 분할 — **components/shrine/scene/StageLayers.tsx 의 거울**이다.
 *   벽지 `absolute inset-x-0 top-0 h-[62%]` · 바닥재 `absolute inset-x-0 bottom-0 h-[40%]`
 * 62+40=102 이라 2%가 겹치고, 그 겹침이 두 밴드 사이 틈을 없앤다. 이 값을 고칠 일이 생기면
 * 컴포넌트와 **동시에** 고친다 — 한쪽만 고치면 바닥 위에 벽이 얹히거나 틈이 벌어진다.
 */
const BAND_WALL = 0.62
const BAND_FLOOR = 0.4

/**
 * 파노라마 높이. 원화가 512급이라 이건 업스케일이 아니라 **재현 샷 자체를 이 크기로 받는 것**이다.
 * (모델 출력이 이보다 작으면 lanczos3 로 올린다 — 그 배율을 로그에 찍어 발주자가 판단하게 한다.)
 */
const PANO_H = 1280
/** 파노라마 폭:높이 = 3.2 × 방비율. 이래야 밴드가 화면에 1:1 로 앉는다(왜곡 0). */
const PANO_W = Math.round((PANO_H * WORLD_SCREENS * ROOM_REF_W) / ROOM_REF_H)
/** 이웃 샷끼리 겹치는 비율(샷 폭 대비). 크로스페이드 2곳이 여기서 나온다. */
const OVERLAP_FRAC = 0.12
/** 파노라마에 놓이는 순서(왼→오). 조립·슬라이스가 이 순서를 쓴다. */
const SHOT_KEYS = ['left', 'center', 'right']
/**
 * **생성** 순서. center 가 먼저여야 L·R 이 그것을 참조 이미지로 붙일 수 있다(refsFor 참조).
 * 순서가 뒤집히면 옆칸이 원화만 보고 그려져 연속성이 눈에 띄게 떨어진다 — 계약이다.
 */
const GEN_ORDER = ['center', 'left', 'right']

/**
 * 샷 폭 — 3장을 12%씩 겹쳐 이었을 때 파노라마 목표 폭을 **넘도록** 잡고 남는 몫은 가운데 크롭으로 버린다.
 * 리사이즈로 맞추지 않는 이유: 조립을 마친 뒤 가로로 늘이면 애써 섞은 겹침 구간이 재샘플링된다.
 */
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

/** 벽 밴드는 위에서, 바닥 밴드는 아래에서 자른다. 두 구간이 2% 겹치는 것이 규약 그 자체다. */
const WALL_H = Math.round(PANO_H * BAND_WALL)
const FLOOR_H = Math.round(PANO_H * BAND_FLOOR)
const FLOOR_TOP = PANO_H - FLOOR_H

/**
 * 실제 렌더 스케일 — 벽 밴드 한 장이 화면에서 몇 배로 줄어드는가.
 * ⚠️ 지각 품질(이음새가 "보이는가")은 반드시 이 배율에서 잰다. 원본 확대로 판단하면
 *    사람이 보지 않는 것을 재게 된다(반가 세로줄 3라운드가 그 실패였다).
 */
const RENDER_SCALE = (ROOM_REF_H * BAND_WALL) / WALL_H

/** 뮤럴 예산 — lib/domain/shrine/__tests__/theme-stage.test.ts 의 MURAL_BUDGET_BYTES 거울(벽+바닥 합) */
const MURAL_BUDGET_BYTES = 1.5 * 1024 * 1024
/** 목표는 예산의 90%. 그래야 나중에 한 장을 다시 구워도 jest 게이트를 스치지 않는다. */
const MURAL_TARGET_BYTES = Math.round(MURAL_BUDGET_BYTES * 0.9)
/** 자동 다이얼다운 사다리. 위에서부터 내려가며 **벽+바닥 합**이 목표 안에 드는 첫 품질을 택한다. */
const QUALITY_LADDER = [90, 86, 82, 78, 74, 70, 66, 62, 58, 54, 50]

/** 투명 자리 채움색 — 다른 무대 스크립트와 같은 값(합성 캔버스 바탕) */
const DARK = { r: 0x1a, g: 0x13, b: 0x08, alpha: 1 }

// ══════════════════════════════ 프롬프트 ══════════════════════════════
/** stage-theme-room.mjs / stage-banga*.mjs 원문 그대로. 한 글자도 바꾸지 않는다. */
const STYLE =
  'warm painterly watercolor illustration, soft K-anime aesthetic, visible gentle brush texture, ' +
  'muted sepia and dark-walnut palette with hanji ivory, candlelit warmth, ' +
  'calm and tidy composition rather than busy detail, refined key-art quality'

/**
 * 빛·재질·붓의 연속. LIGHT 원문(좌상단 촛불 고정)을 대신하는 절이다 —
 * 세 샷이 **같은 값**을 쓰기만 하면 파노라마가 한 홀로 읽힌다. 빛의 방향은 원화가 정한다.
 */
const CONTINUITY =
  'the light falls exactly as it does in the reference painting — the same source direction, the same warmth, ' +
  'the same depth in the shadows; the same timber, the same plaster, the same wear, the same brushwork'

/**
 * ★ 이 파이프라인에서 가장 중요한 한 줄 ★
 * 세 샷의 **벽·바닥 경계선 높이가 같아야** 파노라마를 62/40 으로 잘랐을 때 바닥이 한 줄로 이어진다.
 * 한 샷이라도 경계가 다른 높이에 있으면 슬라이스가 그림을 엉뚱한 데서 자르고, 바닥 밴드에 벽이 섞인다.
 * 그래서 세 프롬프트가 이 문장을 **같은 말로** 공유한다.
 */
const HORIZON =
  'The line where the wall meets the floor runs straight across the frame at three-fifths of the frame height, ' +
  'level and unbroken from the left edge to the right edge; above it is the wall, below it is the floor'

/** 카메라 규약 — 셋이 같아야 이어 붙였을 때 시점이 튀지 않는다 */
const FRAMING =
  'Seen straight on at standing eye level, the camera level and not tilted, ' +
  'an upright rectangular view a little taller than it is wide, the scene filling the whole frame'

const TAIL = 'full-bleed background plate, no text, no watermark, no border'

/**
 * 테마 표.
 *   hall      세 프롬프트가 공유하는 장소 명사구 — 이게 흔들리면 L·C·R 이 다른 건물이 된다.
 *   wall/floor  관찰 가능한 사실 문장. stage-theme-room.mjs 의 material 원문을 그대로 옮겼다
 *               (15회 육안 검수를 통과한 문장이라 다시 쓸 이유가 없다).
 * ⚠️ 구 표의 bay/edgeUnit/edgeNo(타일 좌우 에지 규칙)와 forbid 는 옮기지 않았다.
 *    - 에지 규칙: 반복 타일 전용이라 회화에서는 해롭다.
 *    - forbid(jonggak `no bell`): 원화에 그려진 범종을 지우라는 규칙이었는데, 이번엔 원화 보존이
 *      제1원칙이라 **C 에서는 남긴다**. 후속 「테마 시그니처 구조물」과 겹칠지는 발주자 판단 사항.
 * @type {Array<{code:string,name:string,el:string,hall:string,wall:string,floor:string}>}
 */
const THEMES = [
  {
    code: 'choga',
    name: '초가 신당',
    el: '무속성',
    hall: 'a humble Korean thatched-roof shrine (초가)',
    wall:
      'A long ochre earthen wall of packed clay and straw, the plaster slightly uneven and the straw fibres ' +
      'still showing through it. Slender bamboo battens run vertically under the plaster at regular intervals, ' +
      'reading as a soft even rhythm of shallow ridges. Along the very top the thatch eaves lay one straight ' +
      'band of grey shadow across the clay.',
    // 원화 재확인(2026-08-07): 바닥은 삿자리 흙바닥이 아니라 **짙은 마루널**이다.
    floor:
      'Wide dark-brown wooden floorboards, worn smooth and warm, their grain and nail heads showing in the ' +
      'soft dusk light.',
  },
  {
    code: 'yonggung',
    name: '용궁',
    el: '水',
    hall: 'an undersea dragon palace (용궁)',
    // ⚠️ 1차 반려(2026-08-07): 타일 시절 서술(밝은 진주모 인테리어)이 원화를 덮어 지상 궁궐이 나왔다.
    //    원화의 정본은 「짙은 청록 심해 + 수면에서 꽂히는 빛기둥」 — identity 로 못박고 벽·바닥도 그 세계로 적는다.
    identity:
      'The whole hall is deep under the sea: everything is steeped in dark teal-green water light, ' +
      'shafts of pale light fall from the surface far above, and the far depth fades to black-green haze.',
    wall:
      'Long palace walls of dark jade and teal, their dancheong beams muted by the water light, ' +
      'tall lattice openings glowing dim aqua where coral silhouettes drift beyond. Fine bubbles rise slowly ' +
      'along the pillars.',
    floor:
      'Deep green-black polished timber, wet-sheened, holding the pale reflections of the light shafts. ' +
      'Slow caustic ripples travel across the boards.',
  },
  {
    code: 'dokkaebi',
    name: '도깨비 불',
    el: '火',
    // ⚠️ 원화 재확인(2026-08-07): 숲이 아니라 **어두운 단청 실내**다 — 타일 시절 「밤 숲」 서술은 재발명이었다.
    hall: 'a haunted dancheong hall where dokkaebi fire drifts (도깨비 불)',
    identity:
      'A dim violet-grey hanok interior at night: dark dancheong beams overhead, murky plaster panels, and ' +
      'small green dokkaebi flames drifting through the air on thin trails of glow — they are the only ' +
      'bright things in the room.',
    wall:
      'Murky violet-grey plaster panels framed in dark aged timber, the dancheong on the beams almost ' +
      'swallowed by shadow. A faint green glow from the drifting flames touches the mouldings.',
    floor:
      'Wide dark-grey wooden boards, dull and cold, their grain catching a faint green sheen from the ' +
      'floating flames.',
  },
  {
    code: 'seolbit',
    name: '설빛 서고',
    el: '金',
    // ⚠️ 로어의 「두루마리 선반」은 벽에 **그리지 않는다** — 벽 전체가 가족 선반장(사방탁자) 자리이고
    //    진짜 선반은 런타임 스프라이트로 얹힌다. 서고의 정체성은 한지·서리·한기로 낸다.
    // ⚠️ v2 반려: 우측 연장이 격자 창호 패널의 기계적 반복 콜라주로 무너졌다 — identity 로
    //    「연속된 서재 실내, 격자는 창가에만」을 못박는다.
    hall: 'a snow-lit scholar library (설빛 서고)',
    identity:
      'Every stretch of this scene is the same continuous study interior: warm timber posts, plain pale hanji ' +
      'wall panels and low wooden wainscot, with the fine window lattice appearing only around the snow-lit ' +
      'windows — never as a repeating wall pattern.',
    wall:
      'A long wall of pale hanji paper set in a frost-white timber frame, the paper cool grey-white where the ' +
      'dawn light lies flat on it. Slender frame members stand at regular intervals with a fine lattice of thin ' +
      'ribs between them, and a bloom of frost softens every timber edge. The whole surface is quiet and even, ' +
      'with no warm tone anywhere in it.',
    floor:
      'Ash-grey timber bleached almost white, fine straight grain and a dry matte surface, the faintest blue ' +
      'held in its shadows.',
  },
  {
    code: 'daljip',
    name: '달집 마당',
    el: '土',
    hall: 'the moonlit courtyard of a Korean village house (달집 마당)',
    // ⚠️ 1차 반려(씬 파노라마): 좌우 연장부가 낮처럼 밝게 나와 중앙(밤)과 세계가 갈렸다.
    identity:
      'It is night everywhere in this scene: every wall and every stretch of ground stays in the same dim ' +
      'warm dusk as the reference, lit only by the full moon and the low lantern glow — no daylight anywhere.',
    // ⚠️ v1~v3 연속 반려의 교훈: 기와 캡(course of roof tiles) 서술이 있는 한 모델이 기와 띠를
    //    프레임 중단에도 반복해 그린다(이중 담장). 기와를 통째로 걷었다.
    wall:
      'One tall ochre clay wall filling the frame from top to bottom, its plaster warm and slightly uneven, ' +
      'hand-smoothed in broad strokes. Rounded field stones are set into the plaster in even horizontal rows. ' +
      'Moonlight lies pale and cool on the clay while the recesses keep a warm amber cast.',
    floor:
      'Dry pale-ochre swept earth with coarse golden straw mats laid flat on it, the weave reading as fine even ' +
      'texture. Moonlight cools the open ground while the mats stay warm.',
  },
  {
    code: 'hongsal',
    name: '홍살문 안뜰',
    el: '火',
    // 홍살「문」이 아니라 담이다 — 문을 그리면 벽이 선반장 자리를 잃는다.
    hall: 'a shrine forecourt behind a red-slatted timber boundary wall (홍살문 안뜰)',
    wall:
      'Round vermilion-painted slats stand upright at even close intervals, pegged into a heavy red rail above ' +
      'and a low red rail below that both run level to the edges. The paint is old and chalky, worn to pale rose ' +
      'on the high points. Behind the slats the ground is solid dark, so nothing shows through.',
    floor:
      'Broad rough granite flags in warm grey with a faint rose in the stone, their edges chipped and the joints ' +
      'packed with fine sand.',
  },
  {
    code: 'byeolbat',
    name: '별밭 천문각',
    el: '무속성',
    hall: 'an astronomical pavilion (별밭 천문각)',
    wall:
      'A long wall of deep indigo plaster painted as an old star chart: thin gold lines join small gold stars into ' +
      'constellations in an even scatter across the whole surface. The gold is matte and sparing, the indigo ' +
      'deepest near the top. Slender dark timber posts stand at regular intervals and carry one straight beam ' +
      'across the top.',
    floor:
      'Near-black timber with a cold blue sheen, wide straight boards, a faint dusting of starlight on the polish.',
  },
  {
    code: 'dangsan',
    name: '당산나무 그늘',
    el: '木',
    // 금줄은 「걸린 물건」이 아니라 **줄기에 감긴 것**으로 쓴다 — 빈 벽 계약과 충돌하지 않게.
    hall: 'the shade of an ancient village guardian tree (당산나무 그늘)',
    wall:
      'Massive mossy trunks stand close together at even intervals and fill the frame, the green shade between ' +
      'them almost black. A twisted straw rope is bound tightly around every trunk at the same height, with small ' +
      'five-colour cloth strips tucked into its twist. Dappled green light falls in soft patches over the moss.',
    floor:
      'Dark damp earth crossed by low woven roots, dry brown leaves settled in the hollows between them, moss on ' +
      'the higher ridges.',
  },
  {
    code: 'yeondeung',
    name: '연등 골짜기',
    el: '火',
    hall: 'a lantern-hung ravine at dusk (연등 골짜기)',
    wall:
      'A long rock face of grey-brown stone in level strata, the ledges repeating at even heights across the frame. ' +
      'Warm orange lantern light washes the stone from below in an even series of soft pools and fades to cool blue ' +
      'dusk higher up. Thin ferns root in the cracks.',
    floor:
      'Wet grey river stone laid flat, damp enough to hold a soft orange reflection of lantern light, fine sand ' +
      'and small pebbles in the joints.',
  },
  {
    code: 'seonang',
    name: '서낭 고갯길',
    el: '土',
    hall: 'a mountain pass shrine path behind a dry stone wall (서낭 고갯길)',
    wall:
      'A long wall of stacked field stones in warm grey and ochre, the courses running level to both edges and the ' +
      'stones repeating in an even balanced rhythm. Small strips of five-colour cloth are wedged deep between the ' +
      'stones at wide intervals, faded and weathered. Dry moss crusts the shaded faces.',
    floor:
      'Dry ochre trail earth with grey gravel spread over it, the small stones catching the low light, the surface ' +
      'packed hard where feet have passed.',
  },
  {
    code: 'jangdok',
    name: '장독대 새벽',
    el: '土',
    hall: 'the crock terrace of a Korean house at dawn (장독대 새벽)',
    wall:
      'A long clay boundary wall washed pale by the first light, the plaster smooth with fine straw showing through. ' +
      'One straight course of dark grey roof tiles caps it, the tile ends repeating at even intervals along the ' +
      'whole top. The lower plaster keeps a cool blue shadow while the upper face takes the first warm gold.',
    floor:
      'Broad grey stone slabs rubbed smooth and faintly glossy by generations of use, damp with dawn dew, pale ' +
      'gold light lying flat along their tops.',
  },
  {
    code: 'daejanggan',
    name: '무쇠 대장간',
    el: '金',
    hall: 'a traditional iron smithy (무쇠 대장간)',
    wall:
      'A long wall of soot-blackened brick and riveted iron plate, the brick courses running level to both edges ' +
      'and the iron plates repeating at even intervals. Soot lies heaviest near the top while the lower wall keeps ' +
      'a dull orange glow thrown from the forge. Old hammer scars and rust bloom pit the metal.',
    floor:
      'Charcoal-dark earth packed hard and glazed by heat, scattered with fine iron filings that catch the forge ' +
      'light as small warm sparks.',
  },
  {
    code: 'jonggak',
    name: '새벽 종각',
    el: '金',
    hall: 'a bell pavilion at first light (새벽 종각)',
    wall:
      'Round timber pillars stand at even intervals, their heads painted with cool blue-green dancheong bands, ' +
      'one straight painted beam running level across the top and a low sill across the bottom. The panels between ' +
      'the pillars are plain lime-washed plaster in pale blue-grey. Dawn mist cools every surface and the paint is ' +
      'faded and chalky with age.',
    floor:
      'Dark brown timber worn pale and smooth along the middle of every board, the grain raised by long use, cool ' +
      'dawn light lying flat on it.',
  },
  {
    code: 'saemgut',
    name: '옹달샘 굿터',
    el: '水',
    hall: 'a forest spring clearing walled in mossy rock (옹달샘 굿터)',
    // ⚠️ 1차 반려(씬 파노라마): 왼쪽 연장부가 바위 클로즈업으로 가득 차 실내 스케일이 파탄났다.
    identity:
      'The hall keeps one continuous indoor scale: the mossy stones stay small, knee-high at most, bordering ' +
      'the pool and the floor edges — they never grow into boulders and never fill a wall.',
    wall:
      'Grey boulders packed close fill the frame, thick green moss filling every seam and hanging over the higher ' +
      'stones. The rock is damp and dark, water seeping in thin sheets down the shaded hollows. Forest shade keeps ' +
      'the whole face cool and even.',
    floor:
      'Rounded grey stones set flat and slick with water, bright green moss crowding every seam, shallow films of ' +
      'clear water standing in the low spots.',
  },
  {
    code: 'naru',
    name: '안개 나루터',
    el: '水',
    hall: 'a river ferry landing in dawn mist (안개 나루터)',
    wall:
      'Tall weathered timber posts stand at even intervals, driven upright and bound with rope at the same height ' +
      'on each. Pale blue-grey fog fills the gaps completely so nothing is visible behind them, and the posts fade ' +
      'lighter toward the top of the frame. The wood is silvered and damp with river air.',
    floor:
      'Grey water-soaked timber, the grain raised and splintered along the edges, shallow puddles holding a pale ' +
      'sky reflection between the planks.',
  },
]

/**
 * C(중앙) — **원화 재현**. 이 프롬프트의 성패가 파이프라인의 성패다.
 * 원화가 카드 비율(대개 가로로 긴 512×279)이라 세로로 더 긴 무대 프레임에 다시 앉혀야 한다.
 * 그래서 "재현"만 말하지 않고 **재프레이밍을 관찰 가능한 사실로** 적는다(HORIZON·FRAMING).
 * 원화의 제단·소품은 지우지 않는다 — 우리 스프라이트가 앞에 얹혀도 배경 깊이로 읽힌다.
 */
function centerPrompt(t) {
  // ⚠️ 여기에 t.wall/t.floor 를 넣지 않는다 — 원화(참조)가 재질·팔레트·빛의 정본이다.
  //    용궁 1차 반려의 원인: 타일 시절 벽 서술(밝은 진주모)이 원화(짙은 청록 심해)를 덮어썼다.
  //    identity 는 원화에서 **눈으로 추출한 관찰 사실**만 담아 재현을 못박는 보강재다(있는 테마만).
  return (
    `The interior of ${t.hall}, painted again from the attached reference at a larger size and with finer detail. ` +
    'Keep the composition of the reference: the same architecture in the same places, the same depth, ' +
    'the same palette and the same light, and every piece of furniture and every object that the reference ' +
    'already shows — the altar table, the vessels, the hangings, all of it stays exactly where it is. ' +
    (t.identity ? `${t.identity} ` : '') +
    `${HORIZON}. ${FRAMING}. ` +
    `${STYLE}, ${CONTINUITY}, ${TAIL}`
  )
}

/**
 * L·R — 같은 홀의 옆칸. **비어 있음**이 계약이다(왼쪽=가족 선반장, 오른쪽=의식각 자리).
 * 「no window, no door」는 유지한다. 그 둘은 벽을 통째로 잡아먹어 선반장이 설 자리를 없앤다.
 */
function sidePrompt(t, side) {
  const dir = side === 'left' ? 'to the left' : 'to the right'
  return (
    `The interior of ${t.hall}, the same hall as the attached reference, with the camera moved one screen width ` +
    `${dir} along it. The building continues without a break: the same bays at the same spacing, the same ` +
    'materials, the same age and wear, the same light. ' +
    (t.identity ? `${t.identity} ` : '') +
    `${t.wall} ${t.floor} ` +
    'This stretch of the hall stands empty — bare wall above and bare floor below, ' +
    'no furniture, no shelf, no chest, no table, no cushion, no window, no door, nothing hanging on the wall. ' +
    `${HORIZON}. ${FRAMING}. ` +
    `${STYLE}, ${CONTINUITY}, ${TAIL}`
  )
}

function shotPrompt(theme, key) {
  return key === 'center' ? centerPrompt(theme) : sidePrompt(theme, key)
}

// ══════════════════════════════ 생성 ══════════════════════════════

/** generate.mjs 의 inlineData 규약 승계 — 존재하지 않는 참조는 조용히 건너뛴다. */
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

function isAuthError(e) {
  const s = String(e?.message || e)
  return /401|403|API_KEY_INVALID|API key not valid|PERMISSION_DENIED|UNAUTHENTICATED/i.test(s)
}

const artPath = (code) => path.join(THEME_ART, code, 'room.webp')
const rawPath = (code, key) => path.join(RAW_ROOT, code, `${key}.png`)

/**
 * 로그용 경로. 원본 캐시는 **메인 체크아웃 절대경로**라 워크트리 기준 상대경로로 찍으면
 * `../../../assets-src/…` 같은 헛것이 나온다 — 리포 밖이면 절대경로 그대로 보여 준다.
 */
function showPath(p) {
  const rel = path.relative(ROOT, p)
  return rel.startsWith('..') ? p.replace(/\\/g, '/') : rel.replace(/\\/g, '/')
}

/**
 * 샷 참조 이미지.
 *   center → 원화 한 장.
 *   left/right → 원화 + **이미 그려진 center**. 원화만 붙이면 옆칸이 다른 건물이 되기 쉽다 —
 *     실제로 이어 붙일 그림을 같이 보여 주는 편이 연속성에 훨씬 강하다(generate.mjs 의 base.png 규약과 같은 논리).
 * ⚠️ 부작용이 있다면 이 지점이다: center 를 붙이면 모델이 center 의 제단까지 옆칸에 복사할 수 있다.
 *    L·R 검수에서 가구가 따라오면 손댈 곳은 프롬프트가 아니라 **여기서 center 참조를 빼는 것**이다.
 */
function refsFor(code, key) {
  return key === 'center' ? [artPath(code)] : [artPath(code), rawPath(code, 'center')]
}

/** 원본 캐시가 있으면 재사용(멱등). `--regen` 이면 지우고 다시 받는다. */
async function ensureShot(theme, key, { regen }) {
  const out = rawPath(theme.code, key)
  if (regen && existsSync(out)) await rm(out, { force: true })
  if (existsSync(out)) {
    console.log(`  · ${key} 원본 캐시 재사용 (API 0회)`)
    return { key, generated: false }
  }
  console.log(`  · ${key} 생성 (${MODEL}) — API ${apiCalls + 1}/${apiBudget}`)
  const buf = await callModel(shotPrompt(theme, key), refsFor(theme.code, key))
  await mkdir(path.dirname(out), { recursive: true })
  await writeFile(out, buf)
  return { key, generated: true }
}

// ══════════════════════ 조립 (API 0회) ══════════════════════

const smoothstep = (u) => u * u * (3 - 2 * u)

/** 열 평균 휘도 프로파일 (다른 무대 스크립트와 동일 규약) */
function _columnLuma(data, w, h, ch) {
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
 * 내부 이웃 열 차이 분포 — 경계값을 견줄 기준선.
 * 절대 임계값을 쓰지 않는 이유: 거친 자갈 바닥은 내부 차이 자체가 크고 매끈한 한지 벽은 작다.
 * "경계가 보통 자리보다 튀지 않는다"가 이음새 소거의 정의다.
 */
function interiorStats(data, w, h, ch) {
  const diffs = []
  for (let x = 0; x < w - 1; x += 1) diffs.push(colDiff(data, w, h, ch, x, x + 1))
  diffs.sort((a, b) => a - b)
  const at = (r) => diffs[Math.min(diffs.length - 1, Math.max(0, Math.round(r * (diffs.length - 1))))]
  return { median: at(0.5), p95: at(0.95), max: diffs[diffs.length - 1] }
}

/** 합격: 이음매가 "보통 이웃 열"보다 튀지 않는다. 평탄한 그림에서 0 나눗셈이 나지 않게 여유항을 둔다. */
function seamPass(seam, stats) {
  return seam <= Math.max(stats.p95, stats.median * 2 + 0.5)
}

/** 샷 raw 정규화 — 목표 크기에 cover 로 맞춘다. 모델 출력이 작으면 lanczos3 업스케일(배율 보고). */
async function normalizeShot(file, w, h) {
  const meta = await sharp(file).metadata()
  const { data, info } = await sharp(file)
    .resize(w, h, { fit: 'cover', position: 'centre', kernel: 'lanczos3' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { data, ch: info.channels, srcW: meta.width, srcH: meta.height, scale: h / meta.height }
}

/**
 * 크로스페이드 파노라마 — stage-banga-mural.mjs `composeCrossfade` 의 가중치 규약을 그대로 쓰되,
 * 같은 타일의 서로 다른 위상이 아니라 **서로 다른 세 그림**을 잇는다.
 *
 *   out[base+x] = prev·(1−t) + cur·t ,  t = smoothstep(x/ov)  (겹침 구간에서만)
 *
 * 왼쪽부터 순서대로 깔기 때문에 겹침 구간에는 이전 샷이 이미 적혀 있고, 현재 샷이 그 위에 섞인다.
 * 가중치를 선형으로 두면 겹침 양끝에서 기울기가 꺾여 그 자리가 다시 선으로 보인다 → smoothstep 이다.
 */
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

/** 가운데 크롭 — 조립 폭이 목표보다 큰 몫만 버린다. 리사이즈가 아니라 잘라내기다(재샘플링 0). */
function cropWidth(data, w, h, ch, left, outW) {
  if (left <= 0 && outW === w) return { data, W: w }
  const out = Buffer.alloc(outW * h * ch)
  for (let y = 0; y < h; y += 1) {
    // 행 단위 복사 — 열 루프를 도는 것보다 빠르고, 잘라내기라 값이 한 바이트도 바뀌지 않는다.
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

/** 팔레트 앵커 기준 = 그 테마의 원화. 없으면 앵커를 생략한다(그럴 일은 없어야 한다). */
async function refChannelMean(code) {
  const p = artPath(code)
  if (!existsSync(p)) return null
  const st = await sharp(p).removeAlpha().stats()
  return st.channels.slice(0, 3).map((c) => c.mean)
}

/**
 * 팔레트 앵커 — 원화 채널 평균으로 **부분** 정렬(stage-theme-room.mjs 원문 승계).
 * 완전 정렬(100%)은 재현 샷의 의도를 지우므로 70%만 따라가고 ±12% 안에서만 움직인다.
 * 전역 게인이라 이음새에는 영향이 없다. 상점 카드와 방이 다른 색세계로 갈리지 않게 하는 보험이다.
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

/** 렌더 스케일로 축소했을 때 남는 이음매 — "눈에 보이는가"의 직접 지표 */
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

/** 파노라마 raw → 벽·바닥 두 밴드 raw. 잘라내기만 한다(리사이즈 0). */
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
 * 조립 본체 — 3샷 → 파노라마 → 팔레트 앵커 → 슬라이스 → 용량 사다리 인코딩 → 게이트.
 * 파노라마를 만들고 나서 자르는 순서가 중요하다: 밴드를 따로 그리면 벽·바닥이 서로 다른 그림이 된다.
 */
async function buildScene(theme, outDir) {
  const files = SHOT_KEYS.map((k) => rawPath(theme.code, k))
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

  const bands = sliceBands(cropped.data, PANO_W, ch)

  // 용량 사다리 — **벽+바닥 합**이 목표 안에 드는 첫 품질을 택한다(jest 게이트가 합계를 잰다).
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
  await writeFile(path.join(outDir, 'room-wall-mural.webp'), chosen.wall)
  await writeFile(path.join(outDir, 'room-floor-mural.webp'), chosen.floor)

  // 검증은 **인코딩된 최종본**을 다시 디코드해서 잰다 — webp 손실이 이음매에 남기는 것까지 포함해야 정직하다.
  const measure = async (buf, h) => {
    const dec = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    const stats = interiorStats(dec.data, PANO_W, h, dec.info.channels)
    const seams = seamsX.map((x) => ({ at: x, diff: colDiff(dec.data, PANO_W, h, dec.info.channels, x - 1, x) }))
    const render = await renderScaleSeam(buf, seamsX, PANO_W)
    return { stats, seams, render, pass: seams.every((s) => seamPass(s.diff, stats)) }
  }

  return {
    code: theme.code,
    quality: chosen.quality,
    bytes: { wall: chosen.wall.length, floor: chosen.floor.length, total: chosen.total },
    withinBudget: chosen.total <= MURAL_BUDGET_BYTES,
    gains,
    seamsX,
    shots: norm.map((n, i) => ({ key: SHOT_KEYS[i], src: `${n.srcW}×${n.srcH}`, scale: n.scale })),
    wall: await measure(chosen.wall, WALL_H),
    floor: await measure(chosen.floor, FLOOR_H),
  }
}

// ══════════════════════ QA 합성 (원화 나란히) ══════════════════════
/**
 * 테마당 **육안 판단용 1장**. 렌더와 같은 기하로 조립해야 판단 근거가 된다.
 *   - 오른쪽: 벽 62% / 바닥 40%(겹침 2%) 밴드 + 공용 단상·제단을 기하 정본 좌표로 얹은 무대
 *   - 왼쪽:  **원화 원본**을 방 비율 상자에 통째로(contain) — CEO 가 "더 고급스러웠다"고 한 그 그림.
 * 왼쪽을 붙인 이유가 이 스크립트의 존재 이유다 — 재제작이 원화를 따라잡았는지 한 장에서 판정한다.
 * ⚠️ 육안은 **렌더 스케일에서** 본다. 원본 확대로 판단하면 사람이 보지 않는 것을 재게 된다.
 */
const QA_VIEW_W = 640
const QA_WORLD = 240 // 2.4화면 — 한 장에 들어오는 최대치
const QA_GAP = 10

async function makeSceneQa(code, outDir, qaDir) {
  const wall = path.join(outDir, 'room-wall-mural.webp')
  const floor = path.join(outDir, 'room-floor-mural.webp')
  if (!existsSync(wall) || !existsSync(floor)) return null

  const stageW = Math.round((QA_VIEW_W * QA_WORLD) / 100)
  const H = Math.round((QA_VIEW_W * ROOM_REF_H) / ROOM_REF_W)
  const wallH = Math.round(H * BAND_WALL)
  const floorH = Math.round(H * BAND_FLOOR)

  // ① 원화 — 통째로, **원화 자신의 비율로**. 방 비율 상자에 contain 하면 원화가 가로로 긴 테마
  //    (대개 512×279)에서 절반이 검은 여백이 되어 견줄 그림이 작아진다. 판정 대상은 이쪽이므로
  //    높이를 무대와 맞추고 폭은 원화가 정하게 둔다(무대보다 넓어지지는 않게 상한만 건다).
  const art = artPath(code)
  const artMeta = existsSync(art) ? await sharp(art).metadata() : null
  const refW = artMeta
    ? Math.min(stageW, Math.max(160, Math.round((H * artMeta.width) / artMeta.height)))
    : Math.round((H * ROOM_REF_W) / ROOM_REF_H)
  const W = refW + QA_GAP + stageW
  const x0 = refW + QA_GAP

  const layers = []
  if (artMeta) {
    layers.push({
      input: await sharp(art).resize(refW, H, { fit: 'contain', background: DARK }).png().toBuffer(),
      left: 0,
      top: 0,
    })
  }
  // ② 새 무대 — object-cover 와 같은 기하(짧은 축을 채우고 가운데 크롭)
  layers.push({
    input: await sharp(wall).resize(stageW, wallH, { fit: 'cover' }).png().toBuffer(),
    left: x0,
    top: 0,
  })
  layers.push({
    input: await sharp(floor).resize(stageW, floorH, { fit: 'cover' }).png().toBuffer(),
    left: x0,
    top: H - floorH,
  })

  // ③ 공용 살림 — 기하 정본(theme-stage-geometry.json)의 좌표 그대로.
  //    w 는 **뷰포트 폭 대비 %** 라 전폭이 아니라 화면 한 장 폭에 곱한다.
  const placed = []
  for (const s of GEO.structures) {
    const file = path.join(COMMON_DIR, path.basename(s.assetUrl))
    if (!existsSync(file)) continue
    const sw = Math.max(4, Math.round((QA_VIEW_W * s.w) / 100))
    const buf = await sharp(file).resize({ width: sw, fit: 'inside' }).png().toBuffer()
    const meta = await sharp(buf).metadata()
    layers.push({
      input: buf,
      left: Math.round(x0 + (stageW * s.x) / 100 - meta.width / 2),
      top: Math.round((H * s.y) / 100 - meta.height / 2),
    })
    placed.push(`${s.code} w${s.w} y${s.y}`)
  }

  // ④ 구분선 — 어디까지가 원화인지 눈이 헷갈리지 않게
  layers.push({
    input: {
      create: { width: 2, height: H, channels: 4, background: { r: 0xc9, g: 0xa8, b: 0x4c, alpha: 0.9 } },
    },
    left: refW + Math.floor(QA_GAP / 2) - 1,
    top: 0,
  })

  await mkdir(qaDir, { recursive: true })
  const out = path.join(qaDir, `${code}-check.webp`)
  const info = await sharp({ create: { width: W, height: H, channels: 4, background: DARK } })
    .composite(layers)
    .webp({ quality: 86 })
    .toFile(out)
  return { out, bytes: info.size, W, H, refW, placed }
}

// ──────────────────────────── main ────────────────────────────
const args = process.argv.slice(2)
const FLAGS = ['--regen', '--assemble-only', '--plan', '--dry-run']
const regen = args.includes('--regen')
const assembleOnly = args.includes('--assemble-only')
const planOnly = args.includes('--plan')
const dryRun = args.includes('--dry-run')
const only = args.find((a) => !a.startsWith('--'))
const unknown = args.filter((a) => a.startsWith('--') && !FLAGS.includes(a))

if (unknown.length) {
  console.error('unknown flag:', unknown.join(' '), '— 가능:', FLAGS.join(', '))
  process.exit(1)
}
if (!only) {
  console.error(`사용: node scripts/shrine-assets/stage-theme-scene.mjs <code|all> [${FLAGS.join('] [')}]`)
  console.error('가능한 code:', THEMES.map((t) => t.code).join(', '))
  process.exit(1)
}
const targets = only === 'all' ? THEMES : THEMES.filter((t) => t.code === only)
if (!targets.length) {
  console.error('unknown theme code:', only, '— 가능:', THEMES.map((t) => t.code).join(', '))
  process.exit(1)
}

/** --dry-run: public·assets-src 를 건드리지 않고 임시폴더로 낸다(조립·슬라이스 경로 리허설용) */
const DRY_ROOT = path.join(os.tmpdir(), 'shrine-stage-scene-dryrun')
const outRootFor = (code) => (dryRun ? path.join(DRY_ROOT, 'stage', code) : path.join(STAGE_ROOT, code))
const qaRoot = dryRun ? path.join(DRY_ROOT, 'qa') : QA_DIR

const geoLine =
  `기하: 파노라마 ${PANO_W}×${PANO_H} (3.2화면 × 방비율 ${ROOM_REF_W}/${ROOM_REF_H}) · ` +
  `샷 ${SHOT.shotW}×${PANO_H} ×3, 겹침 ${SHOT.ov}px(${(OVERLAP_FRAC * 100).toFixed(0)}%) ×2, 크롭 ${SHOT.crop}px\n` +
  `밴드: 벽 ${PANO_W}×${WALL_H}(상단 ${(BAND_WALL * 100).toFixed(0)}%) · ` +
  `바닥 ${PANO_W}×${FLOOR_H}(하단 ${(BAND_FLOOR * 100).toFixed(0)}%) · 겹침 ${WALL_H - FLOOR_TOP}px · ` +
  `렌더 스케일 ${RENDER_SCALE.toFixed(3)}`

// ── --plan: API 없이 프롬프트만 (검수용) ───────────────────────────────
if (planOnly) {
  console.log(geoLine)
  for (const t of targets) {
    console.log(`\n══ ${t.code} · ${t.name} (${t.el}) ══`)
    console.log(`   산출 public/shrine/stage/${t.code}/{room-wall-mural,room-floor-mural}.webp`)
    console.log(`   원본 캐시 ${RAW_ROOT}/${t.code}/{left,center,right}.png`)
    console.log(`   참조·팔레트 앵커 public/shrine/themes/${t.code}/room.webp`)
    // 생성 순서대로 찍는다 — L·R 이 center 를 참조하므로 목록 순서가 곧 실행 순서여야 오해가 없다
    for (const key of GEN_ORDER) {
      const refs = refsFor(t.code, key).map(showPath)
      console.log(`\n── ${key} ${SHOT.shotW}×${PANO_H} · 참조 [${refs.join(' + ')}] ──`)
      console.log(shotPrompt(t, key))
    }
  }
  console.log(`\n(--plan: API 0회 · 테마 ${targets.length}건 · 프롬프트 ${targets.length * SHOT_KEYS.length}건)`)
  process.exit(0)
}

// 예산은 **필요분 딱 그만큼**. 재시도 루프가 없으므로 이 상한을 넘으면 곧 버그다.
apiBudget = assembleOnly ? 0 : targets.length * SHOT_KEYS.length
if (!assembleOnly && !KEY) {
  console.error('✖ GEMINI 키 없음 — .env.local의 GOOGLE_GENERATIVE_AI_API_KEY / GEMINI_API_KEY 확인')
  process.exit(1)
}

console.log(
  `모델: ${MODEL}\n원본 캐시: ${RAW_ROOT}\n산출: ${dryRun ? DRY_ROOT + ' (--dry-run)' : STAGE_ROOT + '/{code}'}\n` +
    `검수: ${qaRoot}\n${geoLine}\n` +
    `대상 ${targets.length}테마 (${targets.map((t) => t.code).join(', ')}) · API 예산 ${apiBudget}회\n`
)

const fmt = (v) => v.toFixed(2)
const report = []

for (const theme of targets) {
  const outDir = outRootFor(theme.code)
  const entry = { code: theme.code, name: theme.name, scene: null, qa: null, error: null }
  report.push(entry)
  console.log(`\n══ ${theme.code} · ${theme.name} (${theme.el}) ══`)

  try {
    // ① 3샷 — center 를 먼저 받아야 L·R 이 그것을 참조할 수 있다(순서가 계약이다)
    if (!assembleOnly) {
      if (!existsSync(artPath(theme.code))) {
        throw new Error(`원화 없음: public/shrine/themes/${theme.code}/room.webp — 참조·팔레트 앵커의 전제다`)
      }
      for (const key of GEN_ORDER) await ensureShot(theme, key, { regen })
    }

    // ② 조립·슬라이스 (API 0회)
    console.log('── 파노라마 조립·슬라이스 (API 0회) ──')
    const r = await buildScene(theme, outDir)
    entry.scene = r
    const band = (label, m) =>
      `      ${label} 이음매 ${m.seams.map((s) => `x${s.at}:${fmt(s.diff)}`).join(' · ')} / 내부 p95 ${fmt(m.stats.p95)}` +
      ` ${m.pass ? 'PASS' : '⚠️ 초과'} · 렌더 ${RENDER_SCALE.toFixed(3)} 축소 ` +
      `${m.render.seams.map((s) => fmt(s.diff)).join(' · ')} / p95 ${fmt(m.render.stats.p95)}`
    const ok = r.wall.pass && r.floor.pass && r.withinBudget
    console.log(
      `  ${ok ? '✔' : '⚠️'} 벽 ${(r.bytes.wall / 1024).toFixed(0)}KB + 바닥 ${(r.bytes.floor / 1024).toFixed(0)}KB` +
        ` = ${(r.bytes.total / 1024).toFixed(0)}KB q${r.quality} (예산 ${(MURAL_BUDGET_BYTES / 1024).toFixed(0)}KB ` +
        `${r.withinBudget ? 'OK' : '⚠️ 초과'})\n` +
        `      샷 원본 ${r.shots.map((s) => `${s.key} ${s.src}(×${s.scale.toFixed(2)})`).join(' · ')}\n` +
        `      팔레트 게인 ${r.gains.map((g) => g.toFixed(3)).join('/')} (원화 기준 · 70% · ±12% 상한)\n` +
        band('벽  ', r.wall) +
        '\n' +
        band('바닥', r.floor)
    )

    // ③ 검수 합성 (원화 나란히)
    entry.qa = await makeSceneQa(theme.code, outDir, qaRoot)
    if (entry.qa) {
      console.log(
        `  ✔ QA ${entry.qa.out.replace(/\\/g, '/')} ${(entry.qa.bytes / 1024).toFixed(0)}KB — ` +
          `${entry.qa.W}×${entry.qa.H} (왼쪽 ${entry.qa.refW}px 원화 · 오른쪽 2.4화면 무대 · ${entry.qa.placed.join(' · ')})`
      )
    }
  } catch (e) {
    if (isAuthError(e)) {
      console.error('\n✖✖ API 키 인증 실패 — 즉시 중단합니다. 재시도하지 않음.')
      console.error('   ', String(e?.message || e).slice(0, 400))
      process.exit(2)
    }
    entry.error = String(e?.message || e).slice(0, 300)
    console.error('  ✖', theme.code, entry.error)
  }
}

// ──────────────────────────── 요약 ────────────────────────────
console.log('\n── 테마별 요약 ──')
for (const e of report) {
  if (e.error) {
    console.log(`  ✖ ${e.code.padEnd(11)} ${e.error}`)
    continue
  }
  const s = e.scene
  const bad = [!s.wall.pass && '벽 이음매', !s.floor.pass && '바닥 이음매', !s.withinBudget && '용량'].filter(Boolean)
  console.log(
    `  ${bad.length ? '⚠️' : '✔'} ${e.code.padEnd(11)} ${(s.bytes.total / 1024).toFixed(0)}KB q${s.quality}` +
      `${e.qa ? ` · QA ${path.basename(e.qa.out)}` : ''}` +
      `${bad.length ? ` — 게이트 미달: ${bad.join(', ')}` : ''}`
  )
}
console.log(`\nAPI 호출 ${apiCalls}/${apiBudget}회`)
console.log('⚠️ 수치 게이트는 이음매·용량만 본다. **고급스러움은 QA 이미지를 눈으로 봐서** 판정할 것.')
process.exit(report.some((e) => e.error) ? 1 : 0)
