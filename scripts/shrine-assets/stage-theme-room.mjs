// 테마 공통 무대 — 15테마 **벽·바닥 무라** 파이프라인 (PLAN-theme-stage-common-v2 §P2-a)
//
// 반가(banga) 전용이던 두 스크립트를 테마 코드만 갈아끼우면 되게 일반화한 것이다.
//   stage-banga-room.mjs   → 타일 생성 + 후처리(감마 평탄화·팔레트 앵커·랩 크로스페이드) + 이음새 게이트
//   stage-banga-mural.mjs  → 하드 에지 페더링 + 가변 세그먼트 퀼팅 + 무라 굽기 (API 0회)
// 두 단계가 한 파일에 있는 이유는 확산이 「테마당 2장」 단위로 돌기 때문이다 — 테마 하나를 굽고
// 조립하고 검수 이미지까지 내는 데 스크립트를 세 번 부르게 만들면 15회전에서 반드시 어긋난다.
//
// ── 「살림과 장소」 원칙 (PLAN §0) ────────────────────────────────────────────
// 이 스크립트가 만드는 것은 **장소(벽·바닥)뿐**이다. 단상·제단·사방탁자·신위·신물은 살림이라
// 테마가 바뀌어도 그대로 따라간다 → 재생성 0장. 검수 이미지에 반가의 단상·제단을 그대로 얹는 이유도
// 그것이 실제 렌더와 같기 때문이다(공용 스프라이트).
//
// 산출(테마당): public/shrine/stage/{code}/
//   room-wall-tile.webp    1024×640  불투명 — 벽 1타일 (좌우 반복 가능)
//   room-floor-tile.webp   1024×420  불투명 — 바닥 1타일 (수평 — 소실점 없음)
//   room-wall-mural.webp   4096×640  불투명 — 벽 무라 (타일 1024 × 4, 퀼팅/크로스페이드)
//   room-floor-mural.webp  4096×420  불투명 — 바닥 무라
// 검수: assets-src/shrine/stage-theme-qa/{code}-check.webp — 벽·바닥 무라에 공용 단상·제단을
//   반가 좌표로 얹은 **육안 판단용 1장**. (public 에 QA 산출물을 남기지 않는다.)
// 원본 캐시: D:/anti/haehwadang/assets-src/shrine/raw-stage-themes/{code}/*.png
//   ⚠️ **메인 체크아웃 절대경로**다 — 워크트리를 지워도 비싼 생성분이 남게 하려는 의도.
//
// 사용:
//   node scripts/shrine-assets/stage-theme-room.mjs jonggak --plan   # 프롬프트만 출력 (API 0회·키 불필요)
//   node scripts/shrine-assets/stage-theme-room.mjs jonggak          # 시안 1테마 풀코스
//   node scripts/shrine-assets/stage-theme-room.mjs all              # 15테마 일괄 (누락분만)
//   node scripts/shrine-assets/stage-theme-room.mjs jonggak --regen  # 원본 캐시 삭제 후 재생성
//   node scripts/shrine-assets/stage-theme-room.mjs all --mural-only # 조립·검수만 (API 0회)
//   ↳ 타일 webp 만 지우고 재실행하면 **원본 캐시로 후처리만** 다시 돈다(과금 0). 반가의 --reblend 대응.
//
// 규율 (반가 원문 승계 — 한 화면에서 만나므로 갈리면 안 된다)
//   - STYLE / LIGHT 문구는 stage-banga-room.mjs 원문을 **한 글자도 바꾸지 않고** 복제한다.
//     ⚠️ 그래서 STYLE 안의 "muted sepia and dark-walnut palette" 절이 용궁·설빛 같은 한색 테마와
//        어긋날 수 있다. 완충은 둘이다 — ① 테마 묘사 문장이 색을 **관찰 가능한 사실**로 먼저 못박고,
//        ② 후처리 팔레트 앵커가 기존 room.webp 채널 평균으로 ±12% 끌어당긴다. 시안(jonggak) 검수에서
//        세피아가 겉돌면 손댈 곳은 STYLE 이 아니라 **테마의 색 문장**이다(같은 붓 규율 유지).
//   - 후처리·게이트 수치는 전부 반가 실측값 승계(벽 degree 3 · 바닥 degree 5 · SEAM_EPS 3 …).
//   - 접지 그림자를 굽지 않는다(런타임 담당). 불투명 배경판이라 크로마키가 없다.
//   - API 예산은 **테마 수 × 2장**으로 자동 산정. 재시도 루프가 없으므로 이 상한을 넘으면 곧 버그다.
import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from 'dotenv'
import { mkdir, writeFile, rm } from 'node:fs/promises'
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
const STAGE_ROOT = path.join(ROOT, 'public', 'shrine', 'stage')
/** 검수 산출물 — 제품 번들(public)에 QA 이미지를 흘리지 않는다 */
const QA_DIR = path.join(ROOT, 'assets-src', 'shrine', 'stage-theme-qa')
/** 공용 살림 스프라이트가 사는 곳. 테마가 바뀌어도 이 두 장은 그대로다(PLAN §0). */
const COMMON_DIR = path.join(STAGE_ROOT, 'banga')
const RAW_ROOT = process.env.STAGE_THEME_RAW_DIR || 'D:/anti/haehwadang/assets-src/shrine/raw-stage-themes'

let apiCalls = 0
let apiBudget = 0

// ────────────────────────────── 프롬프트 ──────────────────────────────
// STYLE·LIGHT 는 stage-banga-room.mjs 원문 그대로(파일 상단 규율 참조).
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
 * 테마 표. 벽 = 수직면 재질(창·문·가구 없음) · 바닥 = 수평 지면 재질(전부 비어 있음).
 *
 * 필드는 **반가 원문의 빈칸**이다 — 문장 뼈대는 wallPrompt/floorPrompt 가 고정으로 들고 있고
 * 여기서는 재질 명사와 색 사실만 갈아끼운다. 그래서 「무창·무문」·좌우 에지 규칙·수평 규칙이
 * 테마마다 흔들릴 수 없다(확산 사고의 90%가 여기서 난다).
 *
 *   wall.subject   도입 주어구(끝에 마침표 없음 — 뒤에 조립 문구가 붙는다)
 *   wall.material  관찰 가능한 사실 2~3문장. 색·질감·리듬만 쓴다(형용사 나열 금지).
 *   wall.bay       "Every bay is a plain ___ — no window, no door, …"
 *   wall.edgeUnit  "cut through the middle of a ___ of identical width and identical tone"
 *   wall.edgeNo    "— ___ touching either edge"
 *   wall.forbid    (선택) 「완전 비어 있음」 절에 덧붙일 금지 품목. jonggak 범종처럼 후속
 *                  시그니처로 남겨 둘 물건에만 쓴다.
 *   floor.unit/joint/depth  수평 규칙의 단위 명사(널·판석·자리…) — 소실점 금지 문장의 주어
 * @type {Array<{code:string,name:string,el:string,wall:object,floor:object}>}
 */
const THEMES = [
  {
    code: 'choga',
    name: '초가 신당',
    el: '무속성',
    wall: {
      subject: 'Interior wall of a humble Korean thatched-roof shrine (초가), flat frontal elevation view',
      material:
        'A long ochre earthen wall of packed clay and straw, the plaster slightly uneven and the straw fibres ' +
        'still showing through it. Slender bamboo battens run vertically under the plaster at regular intervals, ' +
        'reading as a soft even rhythm of shallow ridges. Along the very top the thatch eaves lay one straight ' +
        'band of grey shadow across the clay.',
      bay: 'ochre clay plaster panel',
      edgeUnit: 'plain clay plaster panel',
      edgeNo: 'no batten, no crack, no ornament touching either edge',
    },
    floor: {
      subject:
        'Packed earthen floor of a humble Korean thatched-roof shrine (초가), seen from slightly above at a low angle',
      unit: 'woven reed mats (삿자리)',
      joint: 'mat edge',
      depth: 'mats',
      material:
        'Warm ochre-brown swept earth, hard and faintly polished by use, with pale straw-coloured reed mats laid ' +
        'flat on it. Fine dust and broom marks catch the low light.',
      edgeUnit: 'plain continuous swept earth of identical tone',
      edgeNo: 'no stone, no mat corner, no feature touching either edge',
    },
  },
  {
    code: 'yonggung',
    name: '용궁',
    el: '水',
    wall: {
      subject: 'Interior wall of an undersea dragon palace (용궁), flat frontal elevation view',
      material:
        'A long wall faced in mother-of-pearl plates, pale rose and jade and silver-blue shifting across the ' +
        'iridescent surface. Pale coral columns rise at regular intervals like slender pillars, their branches ' +
        'fusing back into the wall. Faint caustic ripples of light drift over everything as if seen through clear water.',
      bay: 'pearlescent nacre panel',
      edgeUnit: 'plain nacre panel',
      edgeNo: 'no coral column, no shell, no ornament touching either edge',
    },
    floor: {
      subject:
        'Polished jade marble floor of an undersea dragon palace (용궁), seen from slightly above at a low angle',
      unit: 'marble slabs',
      joint: 'slab joint',
      depth: 'slabs',
      material:
        'Cool jade-green marble with pale veining and a wet mirror polish, drifts of fine pearl-white sand ' +
        'gathered along the joints. Slow caustic ripples of light travel across the polish.',
      edgeUnit: 'plain continuous jade marble of identical tone',
      edgeNo: 'no vein knot, no slab corner, no feature touching either edge',
    },
  },
  {
    code: 'dokkaebi',
    name: '도깨비 불',
    el: '火',
    wall: {
      subject: 'A wall of dense night forest in a dokkaebi haunt (도깨비 불), flat frontal elevation view',
      material:
        'Deep violet mist packed between close-standing black tree trunks that repeat at even intervals like posts. ' +
        'A faint green phosphorescence clings to the bark and the moss, dim enough to leave the depth of the forest ' +
        'almost black. The mist thickens toward the top until the canopy dissolves into flat violet.',
      bay: 'bank of violet night mist',
      edgeUnit: 'plain bank of violet mist',
      edgeNo: 'no trunk, no branch, no glow touching either edge',
    },
    floor: {
      subject: 'Mossy dark stone ground of a dokkaebi haunt (도깨비 불), seen from slightly above at a low angle',
      unit: 'flat dark stones',
      joint: 'stone seam',
      depth: 'stones',
      material:
        'Wet black-grey stone worn flat, dark moss filling every seam, a faint green sheen lying on the damp surface.',
      edgeUnit: 'plain continuous dark stone of identical tone',
      edgeNo: 'no stone corner, no moss clump, no feature touching either edge',
    },
  },
  {
    code: 'seolbit',
    name: '설빛 서고',
    el: '金',
    wall: {
      // ⚠️ 로어의 「두루마리 선반」은 벽에 **그리지 않는다** — 벽 전체가 가족 선반장(사방탁자) 자리이고
      //    진짜 선반은 런타임 스프라이트로 얹힌다. 그린 선반과 실제 선반이 겹치면 방이 무너진다.
      //    서고의 정체성은 한지·서리·한기로 낸다.
      subject: 'Interior wall of a snow-lit scholar library (설빛 서고), flat frontal elevation view',
      material:
        'A long wall of pale hanji paper set in a frost-white timber frame, the paper cool grey-white where the ' +
        'dawn light lies flat on it. Slender frame members stand at regular intervals with a fine lattice of thin ' +
        'ribs between them, and a bloom of frost softens every timber edge. The whole surface is quiet and even, ' +
        'with no warm tone anywhere in it.',
      bay: 'frost-white hanji paper panel',
      edgeUnit: 'plain frost-white hanji panel',
      edgeNo: 'no frame member, no lattice rib, no ornament touching either edge',
    },
    floor: {
      subject:
        'Cold grey-white wooden floor of a snow-lit scholar library (설빛 서고), seen from slightly above at a low angle',
      unit: 'floorboards',
      joint: 'board joint',
      depth: 'boards',
      material:
        'Ash-grey timber bleached almost white, fine straight grain and a dry matte surface, the faintest blue ' +
        'held in its shadows.',
      edgeUnit: 'plain continuous board wood of identical tone',
      edgeNo: 'no knot, no plank end, no feature touching either edge',
    },
  },
  {
    code: 'daljip',
    name: '달집 마당',
    el: '土',
    wall: {
      subject:
        'Ochre earthen courtyard wall of a Korean village house under a full moon (달집 마당), flat frontal elevation view',
      material:
        // ⚠️ v1~v3 연속 반려의 교훈: 기와 캡(course of roof tiles) 서술이 있는 한 모델이 기와 띠를
        //    프레임 중단에도 반복해 그린다(이중 담장). 기와를 통째로 걷었다 — 달집의 정체성은
        //    달빛·황토·멍석이 들고, 기와는 필수 모티프가 아니다.
        'One tall ochre clay wall filling the frame from top to bottom, its plaster warm and slightly uneven, ' +
        'hand-smoothed in broad strokes. Rounded field stones are set into the plaster in even horizontal rows. ' +
        'Moonlight lies pale and cool on the clay while the recesses keep a warm amber cast.',
      bay: 'moonlit clay panel',
      edgeUnit: 'plain clay panel',
      edgeNo: 'no stone, no tile end, no ornament touching either edge',
    },
    floor: {
      subject:
        'Beaten earth courtyard ground of a Korean village house (달집 마당), seen from slightly above at a low angle',
      unit: 'woven straw mats (멍석)',
      joint: 'mat edge',
      depth: 'mats',
      material:
        'Dry pale-ochre swept earth with coarse golden straw mats laid flat on it, the weave reading as fine even ' +
        'texture. Moonlight cools the open ground while the mats stay warm.',
      edgeUnit: 'plain continuous swept earth of identical tone',
      edgeNo: 'no pebble, no mat corner, no feature touching either edge',
    },
  },
  {
    code: 'hongsal',
    name: '홍살문 안뜰',
    el: '火',
    wall: {
      // 홍살「문」이 아니라 담이다 — 문을 그리면 무창·무문 계약이 깨지고 벽이 선반장 자리를 잃는다.
      subject: 'Red-slatted timber boundary wall of a shrine forecourt (홍살문 안뜰), flat frontal elevation view',
      material:
        'Round vermilion-painted slats stand upright at even close intervals, pegged into a heavy red rail above ' +
        'and a low red rail below that both run level to the edges. The paint is old and chalky, worn to pale rose ' +
        'on the high points. Behind the slats the ground is solid dark, so nothing shows through.',
      bay: 'span of evenly spaced red slats',
      edgeUnit: 'plain red slat of identical width',
      edgeNo: 'no post, no rail joint, no ornament touching either edge',
    },
    floor: {
      subject: 'Flagstone forecourt paving of a Korean shrine (홍살문 안뜰), seen from slightly above at a low angle',
      unit: 'flagstones (박석)',
      joint: 'course joint',
      depth: 'flagstones',
      material:
        'Broad rough granite flags in warm grey with a faint rose in the stone, their edges chipped and the joints ' +
        'packed with fine sand.',
      edgeUnit: 'plain continuous granite flag of identical tone',
      edgeNo: 'no chipped corner, no flag end, no feature touching either edge',
    },
  },
  {
    code: 'byeolbat',
    name: '별밭 천문각',
    el: '무속성',
    wall: {
      subject: 'Star-chart wall of an astronomical pavilion (별밭 천문각), flat frontal elevation view',
      material:
        'A long wall of deep indigo plaster painted as an old star chart: thin gold lines join small gold stars into ' +
        'constellations in an even scatter across the whole surface. The gold is matte and sparing, the indigo ' +
        'deepest near the top. Slender dark timber posts stand at regular intervals and carry one straight beam ' +
        'across the top.',
      bay: 'indigo star-chart panel',
      edgeUnit: 'plain indigo panel',
      edgeNo: 'no post, no constellation figure, no ornament touching either edge',
    },
    floor: {
      subject:
        'Ink-dark wooden floor of an astronomical pavilion (별밭 천문각), seen from slightly above at a low angle',
      unit: 'floorboards',
      joint: 'board joint',
      depth: 'boards',
      material:
        'Near-black timber with a cold blue sheen, wide straight boards, a faint dusting of starlight on the polish.',
      edgeUnit: 'plain continuous board wood of identical tone',
      edgeNo: 'no knot, no plank end, no feature touching either edge',
    },
  },
  {
    code: 'dangsan',
    name: '당산나무 그늘',
    el: '木',
    wall: {
      // 금줄은 「걸린 물건」이 아니라 **줄기에 감긴 것**으로 쓴다 — 「완전 비어 있음」 절과 충돌하지 않게.
      subject:
        'A wall of deep forest in the shade of an ancient village guardian tree (당산나무 그늘), flat frontal elevation view',
      material:
        'Massive mossy trunks stand close together at even intervals and fill the frame, the green shade between ' +
        'them almost black. A twisted straw rope is bound tightly around every trunk at the same height, with small ' +
        'five-colour cloth strips tucked into its twist. Dappled green light falls in soft patches over the moss.',
      bay: 'span of mossy trunk and deep green shade',
      edgeUnit: 'plain span of moss and shade',
      edgeNo: 'no trunk edge, no rope end, no ornament touching either edge',
    },
    floor: {
      subject:
        'Root-woven forest ground under an ancient guardian tree (당산나무 그늘), seen from slightly above at a low angle',
      unit: 'exposed tree roots',
      joint: 'root ridge',
      depth: 'roots',
      material:
        'Dark damp earth crossed by low woven roots, dry brown leaves settled in the hollows between them, moss on ' +
        'the higher ridges.',
      edgeUnit: 'plain continuous forest earth of identical tone',
      edgeNo: 'no root end, no leaf pile, no feature touching either edge',
    },
  },
  {
    code: 'yeondeung',
    name: '연등 골짜기',
    el: '火',
    wall: {
      subject: 'Valley cliff face at dusk in a lantern-hung ravine (연등 골짜기), flat frontal elevation view',
      material:
        'A long rock face of grey-brown stone in level strata, the ledges repeating at even heights across the frame. ' +
        'Warm orange lantern light washes the stone from below in an even series of soft pools and fades to cool blue ' +
        'dusk higher up. Thin ferns root in the cracks.',
      bay: 'span of layered rock',
      edgeUnit: 'plain span of layered rock',
      edgeNo: 'no ledge end, no fern, no ornament touching either edge',
    },
    floor: {
      subject:
        'Streamside stone paving of a lantern-hung ravine (연등 골짜기), seen from slightly above at a low angle',
      unit: 'flat stone slabs',
      joint: 'slab joint',
      depth: 'slabs',
      material:
        'Wet grey river stone laid flat, damp enough to hold a soft orange reflection of lantern light, fine sand ' +
        'and small pebbles in the joints.',
      edgeUnit: 'plain continuous wet stone of identical tone',
      edgeNo: 'no slab corner, no pebble cluster, no feature touching either edge',
    },
  },
  {
    code: 'seonang',
    name: '서낭 고갯길',
    el: '土',
    wall: {
      subject: 'Dry stone wall along a mountain pass shrine path (서낭 고갯길), flat frontal elevation view',
      material:
        'A long wall of stacked field stones in warm grey and ochre, the courses running level to both edges and the ' +
        'stones repeating in an even balanced rhythm. Small strips of five-colour cloth are wedged deep between the ' +
        'stones at wide intervals, faded and weathered. Dry moss crusts the shaded faces.',
      bay: 'span of stacked field stone',
      edgeUnit: 'plain span of stacked stone',
      edgeNo: 'no large boulder, no cloth strip, no ornament touching either edge',
    },
    floor: {
      subject: 'Mountain path ground of a pass shrine (서낭 고갯길), seen from slightly above at a low angle',
      unit: 'bands of loose gravel',
      joint: 'gravel band',
      depth: 'gravel bands',
      material:
        'Dry ochre trail earth with grey gravel spread over it, the small stones catching the low light, the surface ' +
        'packed hard where feet have passed.',
      edgeUnit: 'plain continuous trail earth of identical tone',
      edgeNo: 'no boulder, no root, no feature touching either edge',
    },
  },
  {
    code: 'jangdok',
    name: '장독대 새벽',
    el: '土',
    wall: {
      subject: 'Earthen courtyard wall beside the crock terrace at dawn (장독대 새벽), flat frontal elevation view',
      material:
        'A long clay boundary wall washed pale by the first light, the plaster smooth with fine straw showing through. ' +
        'One straight course of dark grey roof tiles caps it, the tile ends repeating at even intervals along the ' +
        'whole top. The lower plaster keeps a cool blue shadow while the upper face takes the first warm gold.',
      bay: 'pale dawn-lit clay panel',
      edgeUnit: 'plain clay panel',
      edgeNo: 'no tile end, no crack, no ornament touching either edge',
    },
    floor: {
      subject:
        'Worn flagstone terrace where the earthen crocks stand (장독대 새벽), seen from slightly above at a low angle',
      unit: 'flagstones',
      joint: 'stone joint',
      depth: 'flagstones',
      material:
        'Broad grey stone slabs rubbed smooth and faintly glossy by generations of use, damp with dawn dew, pale ' +
        'gold light lying flat along their tops.',
      edgeUnit: 'plain continuous smooth stone of identical tone',
      edgeNo: 'no slab corner, no drain channel, no feature touching either edge',
    },
  },
  {
    code: 'daejanggan',
    name: '무쇠 대장간',
    el: '金',
    wall: {
      subject: 'Interior wall of a traditional iron smithy (무쇠 대장간), flat frontal elevation view',
      material:
        'A long wall of soot-blackened brick and riveted iron plate, the brick courses running level to both edges ' +
        'and the iron plates repeating at even intervals. Soot lies heaviest near the top while the lower wall keeps ' +
        'a dull orange glow thrown from the forge. Old hammer scars and rust bloom pit the metal.',
      bay: 'panel of sooty brick',
      edgeUnit: 'plain sooty brick panel',
      edgeNo: 'no iron plate edge, no rivet, no ornament touching either edge',
    },
    floor: {
      subject:
        'Beaten black earth floor of a traditional iron smithy (무쇠 대장간), seen from slightly above at a low angle',
      unit: 'bands of trodden cinder',
      joint: 'cinder band',
      depth: 'bands',
      material:
        'Charcoal-dark earth packed hard and glazed by heat, scattered with fine iron filings that catch the forge ' +
        'light as small warm sparks.',
      edgeUnit: 'plain continuous black earth of identical tone',
      edgeNo: 'no anvil base, no scrap pile, no feature touching either edge',
    },
  },
  {
    code: 'jonggak',
    name: '새벽 종각',
    el: '金',
    wall: {
      subject: 'Interior wall of a bell pavilion at first light (새벽 종각), flat frontal elevation view',
      material:
        'Round timber pillars stand at even intervals, their heads painted with cool blue-green dancheong bands, ' +
        'one straight painted beam running level across the top and a low sill across the bottom. The panels between ' +
        'the pillars are plain lime-washed plaster in pale blue-grey. Dawn mist cools every surface and the paint is ' +
        'faded and chalky with age.',
      bay: 'pale blue-grey lime-washed plaster panel',
      edgeUnit: 'plain plaster panel',
      edgeNo: 'no pillar, no dancheong band, no ornament touching either edge',
      // 범종은 후속 「테마 시그니처 구조물」(PLAN §4-B) 몫이다. 벽에 구워 넣으면 그 자리를 잃는다.
      forbid: 'no bell',
    },
    floor: {
      subject: 'Worn dark wooden floor of a bell pavilion (새벽 종각), seen from slightly above at a low angle',
      unit: 'floorboards',
      joint: 'board joint',
      depth: 'boards',
      material:
        'Dark brown timber worn pale and smooth along the middle of every board, the grain raised by long use, cool ' +
        'dawn light lying flat on it.',
      edgeUnit: 'plain continuous board wood of identical tone',
      edgeNo: 'no knot, no plank end, no feature touching either edge',
    },
  },
  {
    code: 'saemgut',
    name: '옹달샘 굿터',
    el: '水',
    wall: {
      subject: 'Mossy rock wall around a forest spring (옹달샘 굿터), flat frontal elevation view',
      material:
        'Grey boulders packed close fill the frame, thick green moss filling every seam and hanging over the higher ' +
        'stones. The rock is damp and dark, water seeping in thin sheets down the shaded hollows. Forest shade keeps ' +
        'the whole face cool and even.',
      bay: 'span of mossy grey rock',
      edgeUnit: 'plain span of mossy rock',
      edgeNo: 'no boulder edge, no seep line, no ornament touching either edge',
    },
    floor: {
      subject: 'Wet mossy stone ground around a forest spring (옹달샘 굿터), seen from slightly above at a low angle',
      unit: 'flat wet stones',
      joint: 'stone seam',
      depth: 'stones',
      material:
        'Rounded grey stones set flat and slick with water, bright green moss crowding every seam, shallow films of ' +
        'clear water standing in the low spots.',
      edgeUnit: 'plain continuous wet stone of identical tone',
      edgeNo: 'no stone corner, no moss clump, no feature touching either edge',
    },
  },
  {
    code: 'naru',
    name: '안개 나루터',
    el: '水',
    wall: {
      subject: 'Row of timber pier posts standing in river mist at dawn (안개 나루터), flat frontal elevation view',
      material:
        'Tall weathered timber posts stand at even intervals, driven upright and bound with rope at the same height ' +
        'on each. Pale blue-grey fog fills the gaps completely so nothing is visible behind them, and the posts fade ' +
        'lighter toward the top of the frame. The wood is silvered and damp with river air.',
      bay: 'bank of pale river fog',
      edgeUnit: 'plain bank of fog',
      edgeNo: 'no post, no rope, no ornament touching either edge',
    },
    floor: {
      subject: 'Damp wooden decking of a river ferry landing (안개 나루터), seen from slightly above at a low angle',
      unit: 'deck planks',
      joint: 'plank joint',
      depth: 'planks',
      material:
        'Grey water-soaked timber, the grain raised and splintered along the edges, shallow puddles holding a pale ' +
        'sky reflection between the planks.',
      edgeUnit: 'plain continuous plank wood of identical tone',
      edgeNo: 'no knot, no plank end, no feature touching either edge',
    },
  },
]

/** 벽 프롬프트 — 뼈대는 반가 원문. 갈아끼우는 것은 재질 명사와 색 사실뿐이다. */
function wallPrompt(t) {
  const w = t.wall
  return (
    `${w.subject}, ` +
    'composed as ONE HORIZONTALLY REPEATING WALL SECTION of a long continuous wall. ' +
    `${w.material} ` +
    `Every bay is a plain ${w.bay} — no window, no door, no opening anywhere on the wall. ` +
    `The LEFT EDGE and the RIGHT EDGE must both cut through the middle of a ${w.edgeUnit} of identical width ` +
    `and identical tone — ${w.edgeNo}. ` +
    'The wall is COMPLETELY EMPTY — no furniture, no shelves, no scrolls, no objects, nothing hanging on it' +
    `${w.forbid ? `, ${w.forbid}` : ''}. ` +
    'No floor and no ceiling visible, only the wall plane filling the entire frame. ' +
    `${STYLE}, ${LIGHT}, ${TILE_RULE}, full-bleed background plate, no text, no watermark, no border`
  )
}

/** 바닥 프롬프트 — 「좌우로만 흐른다·소실점 없음」이 이 문장의 존재 이유다. 구조를 흔들지 말 것. */
function floorPrompt(t) {
  const f = t.floor
  return (
    `${f.subject}, ` +
    'composed as ONE HORIZONTALLY REPEATING FLOOR SECTION of a long continuous floor. ' +
    `The ${f.unit} run STRICTLY LEFT TO RIGHT, parallel to the bottom edge: every ${f.joint} is a straight ` +
    'horizontal line spanning the full width of the frame. There is NO perspective convergence and NO vanishing ' +
    'point — no diagonal line anywhere, nothing narrows toward a point. ' +
    `Depth is expressed ONLY by the ${f.depth} being thinner and dimmer near the TOP of the frame and wider and ` +
    'warmer near the BOTTOM. ' +
    `${f.material} ` +
    `The LEFT EDGE and the RIGHT EDGE must both be ${f.edgeUnit} — ${f.edgeNo}. ` +
    'The floor is COMPLETELY EMPTY — no furniture, no rugs, no cushions, no objects at all. ' +
    'No walls, no horizon line, no ceiling — only the floor plane filling the entire frame. ' +
    `${STYLE}, ${LIGHT}, ${TILE_RULE}, full-bleed background plate, no text, no watermark, no border`
  )
}

/**
 * 타일 사양 — 크기·평탄화 차수는 반가 실측값 승계.
 *   벽 degree 3 — 기둥/패널의 명암 교대가 크다. 차수를 올리면 적합이 그 구조를 따라가 그림이 밋밋해진다.
 *   바닥 degree 5 — 가로 널만 있어 오인할 구조가 없다. 세게 걸어도 잃을 게 없다(반가 실측 1.6배 → 1.01배).
 */
function tileSpecs(theme) {
  return [
    {
      key: 'room-wall-tile',
      file: 'room-wall-tile.webp',
      w: 1024,
      h: 640,
      flatten: { degree: 3, pMin: 0.78, pMax: 1.4 },
      prompt: wallPrompt(theme),
    },
    {
      key: 'room-floor-tile',
      file: 'room-floor-tile.webp',
      w: 1024,
      h: 420,
      flatten: { degree: 5, pMin: 0.45, pMax: 2.2 },
      prompt: floorPrompt(theme),
    },
  ]
}

/** 무라 사양. repeats 4 = 폭 4096 — 320% 방을 데스크톱 1280px 뷰포트에서 1:1 로 덮는다(3.2 × 1280). */
const MURALS = [
  { key: 'room-wall-mural', tile: 'room-wall-tile.webp', file: 'room-wall-mural.webp', repeats: 4 },
  { key: 'room-floor-mural', tile: 'room-floor-tile.webp', file: 'room-floor-mural.webp', repeats: 4 },
]

// ═══════════════════ 1단계: 타일 생성·후처리 (stage-banga-room.mjs 승계) ═══════════════════

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
 * 이동평균 대신 저차 다항을 쓰는 이유: 벽 타일은 기둥/패널의 명암 교대가 커서 이동평균이
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
 * 단순 곱셈 게인은 어두운 쪽을 끌어올릴 때 밝은 결이 255 에 눌어붙는다(하이라이트 소실).
 * 감마는 0 과 255 를 고정점으로 두므로 아무리 세게 걸어도 클리핑이 없다:
 *   v' = 255 · (v/255)^p,  p = ln(target/255) / ln(fit(x)/255)  → 열 평균이 정확히 target 으로 간다.
 *
 * 타일마다 같은 자리에 같은 밝기 웅덩이가 반복되면 이음새를 아무리 지워도
 * "같은 그림이 계속 나온다"가 먼저 읽힌다 — 그래서 이 단계가 이음새보다 앞선다.
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

/**
 * 팔레트 앵커 — 기존 테마 카드(public/shrine/themes/{code}/room.webp)의 채널 평균으로 **부분** 정렬.
 * 완전 정렬(100%)은 원화의 의도를 지우므로 70% 만 따라가고 ±12% 안에서만 움직인다.
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

const smoothstep = (u) => u * u * (3 - 2 * u)

/**
 * 랩 크로스페이드 — 폭 srcW 를 (srcW - B) 로 줄이면서 **오른쪽 꼬리 B 열을 왼쪽 머리 B 열에 녹인다.**
 *
 *   out[x] = x < B ? lerp(src[x], src[x + outW], t(x)) : src[x],  t(0)=1 · t(B)=0 (smoothstep)
 *
 * out[0] = src[outW] · out[outW-1] = src[outW-1] 이라 **원본에서 인접했던 두 열**이 타일 경계에서
 * 만난다 → 경계 불연속이 원본의 평범한 이웃 차이 수준으로 내려앉는다.
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

/**
 * 경계 열 차이를 **내부 이웃 열 차이 분포**와 견준다.
 * 절대 임계값을 쓰지 않는 이유: 거친 자갈 바닥은 내부 차이 자체가 크고 매끈한 한지 벽은 작다.
 * "경계가 보통 자리보다 튀지 않는다"가 이음새 소거의 정의다 — 테마가 15개로 늘어날수록 더 그렇다.
 */
function seamMetrics(data, w, h, ch) {
  const colDiffLocal = (x1, x2) => {
    let s = 0
    for (let y = 0; y < h; y += 1) {
      const i = (y * w + x1) * ch
      const j = (y * w + x2) * ch
      s += Math.abs(data[i] - data[j]) + Math.abs(data[i + 1] - data[j + 1]) + Math.abs(data[i + 2] - data[j + 2])
    }
    return s / (h * 3)
  }
  const interior = []
  for (let x = 0; x < w - 1; x += 1) interior.push(colDiffLocal(x, x + 1))
  interior.sort((p, q) => p - q)
  const at = (r) => interior[Math.min(interior.length - 1, Math.max(0, Math.round(r * (interior.length - 1))))]
  const seam = colDiffLocal(w - 1, 0)
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

async function callModel(prompt) {
  if (!KEY) throw new Error('GEMINI 키 없음 — 메인 체크아웃 .env.local 의 GOOGLE_GENERATIVE_AI_API_KEY 확인')
  if (apiCalls >= apiBudget) throw new Error(`API 예산(${apiBudget}회) 소진 — 생성 중단`)
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

async function rawToObj(buf, w, h) {
  return sharp(buf)
    .resize(w, h, { fit: 'cover', position: 'centre' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
}

/** 팔레트 앵커 기준 = 그 테마의 기존 방 카드. 없으면 앵커를 생략한다(그럴 일은 없어야 한다). */
async function refChannelMean(code) {
  const p = path.join(ROOT, 'public', 'shrine', 'themes', code, 'room.webp')
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

async function buildTile(theme, asset, outDir, { regen }) {
  const rawPng = path.join(RAW_ROOT, theme.code, `${asset.key}.png`)
  const outWebp = path.join(outDir, asset.file)

  if (regen && existsSync(rawPng)) await rm(rawPng, { force: true })
  if (!existsSync(rawPng)) {
    console.log(`  · 생성 (${MODEL}) — API ${apiCalls + 1}/${apiBudget}`)
    const buf = await callModel(asset.prompt)
    await mkdir(path.dirname(rawPng), { recursive: true })
    await writeFile(rawPng, buf)
  } else {
    console.log('  · 원본 캐시 재사용 (API 0회)')
  }
  await mkdir(outDir, { recursive: true })

  const rawBuf = await sharp(rawPng).toBuffer()
  const refMean = await refChannelMean(theme.code)

  // 후처리 전(plain): 순진하게 리사이즈만 한 타일. "개선 전" 수치의 기준선.
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
    const score = (pass ? 0 : 1000) + ghost + metrics.ratio
    if (!best || score < best.score) best = { B, webp, metrics, ghost, pass, score, trend, gains }
  }

  await writeFile(outWebp, best.webp)
  return {
    key: asset.key,
    ok: true,
    file: asset.file,
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

// ═══════════════════ 2단계: 무라 조립 (stage-banga-mural.mjs 승계 · API 0회) ═══════════════════

const DARK = { r: 0x1a, g: 0x13, b: 0x08, alpha: 1 }
/** 무라 1장 용량 목표. 초과 시 q 를 낮춰 재인코딩하고, 그래도 넘으면 반복 수를 3배로 줄인다. */
const MURA_MAX_BYTES = 300 * 1024
const MURA_QUALITY_LADDER = [78, 72, 66, 60]
/** 시드 세계 폭(%) — supabase 시드의 거울일 뿐이다. 대칭도는 **한 화면 창 안에서** 재야 의미가 있다. */
const SEED_WORLD_WIDTH = 320
/** 한 화면(%) — lib/domain/shrine/world.ts 의 WORLD_VIEWPORT_PCT 와 같은 값 */
const WORLD_VIEWPORT_PCT = 100

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

/** 이음매 열 차이 — 조립이 만든 **실제 경계 위치**에서 잰다. 랩은 단일 stretch 라 참고값이다. */
function boundaryDiffs(data, w, h, ch, seams) {
  const out = seams.map((at) => ({ at, diff: colDiff(data, w, h, ch, at - 1, at) }))
  out.push({ at: 0, wrap: true, diff: colDiff(data, w, h, ch, w - 1, 0) })
  return out
}

/**
 * 좌우 대칭도 — 반가 4차 검수 "세로줄"의 정체였던 지표.
 * 미러 교대 [T|flop(T)|…] 는 이음새를 0 으로 만드는 대신 무라에 **완벽한 거울축**을 남긴다.
 * 한 화면에 그 축이 들어오면 사람은 방이 아니라 "무늬"로 읽는다. 낮을수록 좋다.
 */
function mirrorSymmetry(col, w, viewW) {
  let worst = 0
  let worstAt = 0
  const step = Math.max(1, Math.round(viewW / 16))
  for (let left = 0; left + viewW <= w; left += step) {
    const n = Math.floor(viewW / 2)
    let sa = 0
    let sb = 0
    for (let i = 0; i < n; i += 1) {
      sa += col[left + i]
      sb += col[left + viewW - 1 - i]
    }
    const ma = sa / n
    const mb = sb / n
    let num = 0
    let da = 0
    let db = 0
    for (let i = 0; i < n; i += 1) {
      const a = col[left + i] - ma
      const b = col[left + viewW - 1 - i] - mb
      num += a * b
      da += a * a
      db += b * b
    }
    const r = da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0
    if (r > worst) {
      worst = r
      worstAt = left
    }
  }
  return { worst, worstAt }
}

/** 내부 이웃 열 차이 분포 — 경계값을 견줄 기준선 */
function interiorStats(data, w, h, ch) {
  const diffs = []
  for (let x = 0; x < w - 1; x += 1) diffs.push(colDiff(data, w, h, ch, x, x + 1))
  diffs.sort((a, b) => a - b)
  const at = (r) => diffs[Math.min(diffs.length - 1, Math.max(0, Math.round(r * (diffs.length - 1))))]
  return { median: at(0.5), p95: at(0.95), max: diffs[diffs.length - 1] }
}

// ─────────────── 하드 에지 검출·페더링 ───────────────
// **상수 단일 출처.** 값을 고칠 일이 생기면 여기만 고친다 — 아래 함수엔 리터럴을 두지 않는다.
// ⚠️ 이음새(tiling)와 그림 안의 경계(hard edge)는 **다른 지표**다. 반가에서 미러 조립으로 이음새를
//    수학적 0 으로 만들고도 세로줄이 남았던 이유가 후자였다(1px 먹선이 축소되며 뭉친다).
const EDGE_DETECT_REL = 20
const EDGE_DETECT_ABS = 20
const EDGE_SPREAD_TARGET = 16
const EDGE_RADIUS_MAX = 14
const EDGE_TAPER_PAD = 2
const EDGE_PASS_MAX = 3
/** 톤 허용 오차 — 열 휘도 평균 기준(±%) */
const EDGE_TONE_TOL = 0.02
/** 실제 렌더 스케일 — 이 배율로 축소했을 때의 열 차이가 "눈에 보이는가"의 지표다 */
const RENDER_SCALE = 0.445
/** 렌더 스케일에서 "육안 무해"로 이미 입증된 열 차이(반가 마루 실측 5.5) */
const HARMLESS_RENDER_DELTA = 6

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
 * 가로 블러만 쓰는 이유: 경계가 세로선이므로 **경계 방향(세로) 디테일은 한 픽셀도 건드리지 않는다**.
 */
function featherColumnEdge(data, w, h, ch, edge, radius, half) {
  const win = radius * 2 + 1
  const x0 = Math.max(0, edge - half + 1)
  const x1 = Math.min(w - 1, edge + half)
  const src = Buffer.from(data) // 이 경계를 처리하는 동안의 읽기 원본(자기 출력을 되먹지 않게)
  for (let x = x0; x <= x1; x += 1) {
    const s = 0.5 * (1 + Math.cos(Math.PI * Math.min(1, Math.abs(x - (edge + 0.5)) / half)))
    if (s <= 0.001) continue
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
}

/**
 * 픽셀 영역 톤 — 전 픽셀 휘도의 평균·표준편차.
 * 열 휘도 표준편차는 절벽을 램프로 펴면 **정의상** 줄어든다. 톤 보존의 정직한 지표는 이쪽이다.
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

/**
 * 타일 raw 를 제자리에서 페더링한다. **타일 파일은 건드리지 않는다** —
 * 원본 2장은 원복 경로이자 재굽기 입력이고, 톤은 검수 통과분이다.
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

/** 렌더 스케일로 축소했을 때 남는 열 차이 — "눈에 보이는가"의 직접 지표 */
async function renderScaleProfile(webpBuf) {
  const meta = await sharp(webpBuf).metadata()
  const dec = await sharp(webpBuf)
    .resize(Math.max(2, Math.round(meta.width * RENDER_SCALE)), null, { kernel: 'lanczos3' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return lumaProfile(columnLuma(dec.data, dec.info.width, dec.info.height, dec.info.channels))
}

// ─────────────── 가변 세그먼트 퀼팅 ───────────────
// 타일을 **길이가 제각각인 조각**으로 잘라 이어붙인다. 자르는 자리는 아무 데나 잡으면 안 되고,
//   ① 국소적으로 평탄할 것(주변 열 기울기가 작다 = 기둥·먹선 위가 아니다)
//   ② 직전 조각의 마지막 열과 RGB 가 거의 같을 것(colDiff ≤ SEAM_EPS)
// 이 두 조건을 통과한 열끼리는 붙여도 인접 열 차이가 2·SEAM_EPS 를 넘지 않는다.
// ⚠️ 랩(끝↔처음) 연속성은 요구하지 않는다 — 무라는 단일 stretch 라 그 경계가 화면에 없다.

/** 이음매로 인정할 최대 RGB 열 차이(반가 실측 스윕 결과 — 1.6 은 순환 자체가 성립하지 않았다) */
const SEAM_EPS = 3
/** 평탄 판정 창 — 이 반경 안의 최대 기울기가 이 값 이하여야 "기둥 위가 아니다" */
const FLAT_RADIUS = 3
const FLAT_GRAD_MAX = 1.2
/** 조각 길이 범위(타일 폭 대비). 하한이 크면 이을 수 있는 열 쌍이 급감해 계획이 실패한다. */
const SEG_MIN_FRAC = 0.22
const SEG_MAX_FRAC = 1
/** 조립 난수 시드 — 고정이라 재굽기가 항상 같은 무라를 낸다(결정론). */
const QUILT_SEED = 0x5eed1a3

/** 결정론 LCG. Math.random 을 쓰면 재굽기마다 벽이 바뀌어 검수가 성립하지 않는다. */
function lcg(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0x100000000
  }
}

/**
 * 잘라도 되는 열(= 국소적으로 평탄한 열) 목록.
 * ⚠️ "기준 열 하나와 같은 열만 후보"로 좁히면 안 된다 — 벽은 패널마다 밝기가 달라 후보가 한 패널에만
 *    몰리고 조각 길이가 안 나온다. 이음매는 **쌍끼리만** 맞으면 된다.
 */
function flatColumns(tile) {
  const { data, width: w, height: h, channels: ch } = tile
  const col = columnLuma(data, w, h, ch)
  const grad = new Float64Array(w)
  for (let x = 0; x < w - 1; x += 1) grad[x] = Math.abs(col[x + 1] - col[x])
  const flat = []
  const margin = FLAT_RADIUS + 1
  for (let x = margin; x < w - margin; x += 1) {
    let g = 0
    for (let k = -FLAT_RADIUS; k <= FLAT_RADIUS; k += 1) g = Math.max(g, grad[Math.min(w - 2, Math.max(0, x + k))])
    if (g <= FLAT_GRAD_MAX) flat.push(x)
  }
  return { flat, col }
}

/**
 * 조립 계획. 이음매 하나의 조건은 「직전 조각의 **마지막 열**(b−1)과 다음 조각의 **첫 열**(a′)이 같을 것」뿐.
 * @returns {{a:number,b:number,flop:boolean}[] | null}
 */
function planQuilt(tile, targetW) {
  const { data, width: w, height: h, channels: ch } = tile
  const { flat, col } = flatColumns(tile)
  if (flat.length < 4) return null
  const rand = lcg(QUILT_SEED)
  const minLen = Math.round(w * SEG_MIN_FRAC)
  const maxLen = Math.round(w * SEG_MAX_FRAC)

  const endsCache = new Map()
  const endsFrom = (a) => {
    if (!endsCache.has(a))
      endsCache.set(
        a,
        flat.filter((b) => b - a >= minLen && b - a <= maxLen)
      )
    return endsCache.get(a)
  }
  const starts = flat.filter((a) => endsFrom(a).length > 0)

  /** 휘도로 먼저 거르고(싸다) RGB 로 확정한다(정확하다). 캐시하지 않으면 470² 번 colDiff 를 돈다. */
  const nextsCache = new Map()
  const nextsAfter = (b) => {
    if (!nextsCache.has(b)) {
      const p = b - 1
      nextsCache.set(
        b,
        starts.filter((q) => Math.abs(col[q] - col[p]) <= SEAM_EPS && colDiff(data, w, h, ch, p, q) <= SEAM_EPS)
      )
    }
    return nextsCache.get(b)
  }

  const pick = (arr) => arr[Math.floor(rand() * arr.length)]

  /**
   * **막다른 길 가지치기(고정점).** 한 수 앞만 보면 부족하다 — "이어지는 끝"이 다시 막다른 시작 열로만
   * 이어질 수 있다. 「무한히 이어갈 수 있는 시작 열」 집합을 수렴할 때까지 깎는다.
   */
  let liveStarts = new Set(starts)
  let liveEnds = new Set()
  for (let iter = 0; iter < 12; iter += 1) {
    liveEnds = new Set(flat.filter((b) => nextsAfter(b).some((q) => liveStarts.has(q))))
    const next = new Set([...liveStarts].filter((a) => endsFrom(a).some((b) => liveEnds.has(b))))
    if (next.size === liveStarts.size) break
    liveStarts = next
  }
  const liveStartList = [...liveStarts]

  if (process.env.QUILT_DEBUG) {
    console.log(
      `[quilt] 평탄 ${flat.length}(${flat[0]}..${flat[flat.length - 1]}) · minLen ${minLen} · 시작가능 ${starts.length}` +
        ` → 가지치기 후 시작 ${liveStartList.length} · 끝 ${liveEnds.size}`
    )
  }
  if (!liveStartList.length) return null

  // 첫 조각은 이음매가 없으므로(왼쪽 끝) 아무 시작 열에서나 출발할 수 있다.
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const plan = []
    let a = pick(liveStartList)
    let filled = 0
    let ok = true
    while (filled < targetW) {
      const ends = endsFrom(a)
      // 마지막 조각은 잘려 나가므로 이어질 필요가 없다 — 가지치기 밖의 끝도 쓸 수 있다.
      const closing = ends.filter((b) => filled + (b - a) >= targetW)
      const usable = closing.length ? closing : ends.filter((b) => liveEnds.has(b))
      if (!usable.length) {
        ok = false
        break
      }
      const b = pick(usable)
      // ⚠️ 조각을 뒤집지 **않는다**. flop 을 섞으면 인접 두 조각이 정·역상이 되어 국소 거울축이 생긴다.
      plan.push({ a, b, flop: false })
      filled += b - a
      if (filled >= targetW) break
      a = pick(nextsAfter(b).filter((q) => liveStarts.has(q)))
    }
    if (ok && filled >= targetW) return plan
  }
  return null
}

/** 크로스페이드 겹침 폭(px). 넓을수록 이음매가 부드럽지만 그만큼 잔상이 길어진다. */
const CROSSFADE_OVERLAP = 160

/**
 * 종전 미러 교대 조립 — **출력용이 아니라 기준선 측정용**이다.
 * 대칭도에 절대 임계를 걸면 안 된다(창 폭에 민감하고 타일 원본이 이미 대칭이라 0 에 못 간다).
 * 묻는 것은 **"우리가 버린 미러 조립보다 나아졌는가"** 다 — 같은 자로 재는 단조 기준.
 */
function mirrorBaselineLuma(tile, targetW) {
  const { data, width: W, height: H, channels: ch } = tile
  const col = new Float64Array(targetW)
  for (let x = 0; x < targetW; x += 1) {
    const i = Math.floor(x / W)
    const u = x - i * W
    const sx = i % 2 === 0 ? u : W - 1 - u // 홀수 복사본은 flop
    let s = 0
    for (let y = 0; y < H; y += 1) {
      const p = (y * W + sx) * ch
      s += 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]
    }
    col[x] = s / H
  }
  return col
}

/**
 * **크로스페이드 조립** — 퀼팅 불가 타일(매끈해서 절단 후보 짝이 안 서는 경우)의 폴백.
 * 뒤집지 않고 같은 방향으로 겹쳐 깔고 겹침 구간을 섞는다 → 경계도 없고 대칭축도 안 생긴다.
 * 가중치는 smoothstep 이다(선형이면 겹침 양끝에서 기울기가 꺾여 그 자리가 다시 선으로 보인다).
 */
function composeCrossfade(tile, targetW) {
  const { data, width: W, height: H, channels: ch } = tile
  const ov = Math.max(8, Math.min(CROSSFADE_OVERLAP, Math.floor(W / 4)))
  const stride = W - ov
  const out = Buffer.alloc(targetW * H * ch)
  const seams = []
  for (let i = 1; i * stride < targetW; i += 1) seams.push(i * stride + Math.floor(ov / 2))

  for (let x = 0; x < targetW; x += 1) {
    const i = Math.floor(x / stride)
    const u = x - i * stride
    const blending = u < ov && i > 0
    const t = blending ? (u / ov) * (u / ov) * (3 - 2 * (u / ov)) : 1
    for (let y = 0; y < H; y += 1) {
      const dst = (y * targetW + x) * ch
      const a = (y * W + Math.min(W - 1, u)) * ch
      if (!blending) {
        for (let c = 0; c < ch; c += 1) out[dst + c] = data[a + c]
        continue
      }
      const b = (y * W + (u + stride)) * ch
      for (let c = 0; c < ch; c += 1) out[dst + c] = Math.round(data[b + c] * (1 - t) + data[a + c] * t)
    }
  }
  return { raw: { data: out, info: { width: targetW, height: H, channels: ch } }, W: targetW, seams, crossfaded: true }
}

/**
 * 계획대로 조각을 이어붙여 무라 raw 를 만든다. 리사이즈는 **한 번도 하지 않는다** —
 * 스케일이 끼면 이음매 열의 픽셀 값이 재샘플링돼 애써 맞춘 열 일치가 깨진다.
 */
async function composeMural(tile, plan, targetW) {
  const rawIn = { raw: { width: tile.width, height: tile.height, channels: tile.channels } }
  if (plan === null) return composeCrossfade(tile, targetW)
  const layers = []
  const seams = []
  let x = 0
  for (const seg of plan) {
    if (x >= targetW) break
    const segW = Math.min(seg.b - seg.a, targetW - x)
    let piece = sharp(tile.data, rawIn).extract({ left: seg.a, top: 0, width: seg.b - seg.a, height: tile.height })
    if (seg.flop) piece = piece.flop()
    layers.push({ input: await piece.png().toBuffer(), left: x, top: 0 })
    if (x > 0) seams.push(x)
    x += segW
  }
  const raw = await sharp({ create: { width: targetW, height: tile.height, channels: 3, background: DARK } })
    .composite(layers)
    .raw()
    .toBuffer({ resolveWithObject: true })
  return { raw, W: targetW, seams }
}

async function buildMural(spec, outDir) {
  const tilePath = path.join(outDir, spec.tile)
  if (!existsSync(tilePath)) throw new Error(`입력 타일이 없다: ${tilePath} — --mural-only 없이 먼저 실행할 것`)

  // 원본 타일 raw. **파일은 수정하지 않는다** — 페더링은 이 메모리 버퍼에서만 일어난다.
  const tileRaw = await sharp(tilePath).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const tileW = tileRaw.info.width
  const tileH = tileRaw.info.height
  const tileCh = tileRaw.info.channels
  const rawTile = { data: tileRaw.data, width: tileW, height: tileH, channels: tileCh }

  const feather = featherHardEdges(rawTile.data, tileW, tileH, tileCh)
  // 원본 타일의 열 휘도 산포 — 무라가 이보다 나빠지면(=밝기 물결 악화) 조립이 잘못된 것이다.
  const tileStd = stdev(columnLuma(rawTile.data, tileW, tileH, tileCh))

  const quiltPlans = new Map()
  const planFor = (targetW) => {
    if (!quiltPlans.has(targetW)) quiltPlans.set(targetW, planQuilt(rawTile, targetW))
    return quiltPlans.get(targetW)
  }

  let repeats = spec.repeats
  let chosen = null
  // 용량 사다리: q 를 낮춰 보고, 그래도 넘으면 반복 수를 하나 줄여(4→3) 폭을 깎는다.
  for (; repeats >= 3 && !chosen; repeats -= 1) {
    const targetW = tileW * repeats
    const { raw, W, seams, crossfaded } = await composeMural(rawTile, planFor(targetW), targetW)
    const ch = raw.info.channels
    // ① 인코딩 **전** 이음매 검증 — 후보 열끼리 붙였으므로 2·SEAM_EPS 를 넘으면 조립 버그다.
    const preBoundary = boundaryDiffs(raw.data, W, tileH, ch, seams)

    for (const quality of MURA_QUALITY_LADDER) {
      const webp = await sharp(raw.data, { raw: { width: W, height: tileH, channels: ch } })
        .webp({ quality })
        .toBuffer()
      if (webp.length > MURA_MAX_BYTES && quality !== MURA_QUALITY_LADDER[MURA_QUALITY_LADDER.length - 1]) continue
      // ② 검증은 **인코딩된 최종본**을 다시 디코드해서 잰다.
      const dec = await sharp(webp).removeAlpha().raw().toBuffer({ resolveWithObject: true })
      const decCol = columnLuma(dec.data, W, tileH, dec.info.channels)
      const viewW = Math.round(W * (WORLD_VIEWPORT_PCT / SEED_WORLD_WIDTH))
      chosen = {
        webp,
        quality,
        W,
        repeats,
        seams,
        preBoundary,
        postBoundary: boundaryDiffs(dec.data, W, tileH, dec.info.channels, seams),
        interior: interiorStats(dec.data, W, tileH, dec.info.channels),
        muralStd: stdev(decCol),
        muralEdge: lumaProfile(decCol),
        symmetry: mirrorSymmetry(decCol, W, viewW),
        // 기준선: 같은 타일을 **종전 미러 방식**으로 깔았을 때의 대칭도. 이보다 낮아야 개선이다.
        symmetryBaseline: mirrorSymmetry(mirrorBaselineLuma(rawTile, W), W, viewW),
        crossfaded: crossfaded === true,
      }
      break
    }
  }
  if (!chosen) throw new Error('무라 조립 실패 — 용량 사다리를 다 내려가도 채택본이 없다')

  await mkdir(outDir, { recursive: true })
  await writeFile(path.join(outDir, spec.file), chosen.webp)

  const renderAfter = await renderScaleProfile(chosen.webp)
  /** 기준선: 페더링을 마친 **타일 한 장**을 같은 배율로 축소한 프로파일. 조립이 더한 몫만 남는다. */
  const tileRender = await renderScaleProfile(
    await sharp(rawTile.data, { raw: { width: tileW, height: tileH, channels: tileCh } })
      .webp({ quality: chosen.quality })
      .toBuffer()
  )

  /** ⚠️ 랩(끝↔처음)은 **제외**한다 — 무라는 단일 stretch 라 그 경계가 화면에 존재하지 않는다. */
  const worstPre = Math.max(...chosen.preBoundary.filter((b) => !b.wrap).map((b) => b.diff))
  const worstPost = Math.max(...chosen.postBoundary.filter((b) => !b.wrap).map((b) => b.diff))
  return {
    key: spec.key,
    ok: true,
    file: spec.file,
    bytes: chosen.webp.length,
    quality: chosen.quality,
    width: chosen.W,
    height: tileH,
    repeats: chosen.repeats,
    segments: chosen.seams.length + 1,
    crossfaded: chosen.crossfaded,
    interior: chosen.interior,
    tileStd,
    muralStd: chosen.muralStd,
    feather,
    muralEdge: chosen.muralEdge,
    renderAfter,
    tileRender,
    symmetry: chosen.symmetry,
    symmetryBaseline: chosen.symmetryBaseline,
    worstPre,
    worstPost,
    wrapPost: chosen.postBoundary.find((b) => b.wrap)?.diff ?? 0,
    // 합격 ① 이음매 허용치 안 ② 인코딩 후도 내부 이웃 열 분포 안 ③ 밝기 산포 무악화 ④ 용량
    passSeam: worstPre <= SEAM_EPS * 2,
    passEncoded: worstPost <= Math.max(chosen.interior.p95, chosen.interior.median * 2 + 0.5),
    passRipple: chosen.muralStd <= tileStd * 1.02 + 0.01,
    withinBudget: chosen.webp.length <= MURA_MAX_BYTES,
    /**
     * ⑤ 하드 에지 — **렌더 스케일에서**, **원본 타일을 기준선으로** 잰다.
     * 묻는 것은 "선이 있는가"가 아니라 **"조립이 원본에 없던 선을 더했는가"** 다
     * (한지 위 먹빛 기둥은 그 자체로 Δ80+ 이고 그건 아티팩트가 아니라 그림이다).
     */
    passEdge: renderAfter.max <= Math.max(tileRender.max * 1.05 + 1, HARMLESS_RENDER_DELTA),
    /** ⑥ 좌우 대칭 — 한 화면 창 안에서 거울축이 잡히면 불합격 */
    passSymmetry: chosen.symmetry.worst < chosen.symmetryBaseline.worst,
    /** ⑦ 톤 — 페더링이 열 휘도 평균을 ±EDGE_TONE_TOL 밖으로 밀지 않았는가 */
    passTone: Math.abs(feather.after.mean - feather.before.mean) <= feather.before.mean * EDGE_TONE_TOL,
  }
}

// ═══════════════════ 3단계: QA 합성 1장 ═══════════════════
/**
 * 테마당 **육안 판단용 1장**. 렌더와 같은 기하로 조립해야 판단 근거가 된다.
 *   - 밴드: 벽 top0 h62% · 바닥 bottom h38%, 무라는 단일 stretch(object-cover)
 *   - 구조물: 반가 좌표 그대로 — 단상 x50 y51 w44 · 제단 x50 y58 w58 (표준 와이드 무대 계약, PLAN §2)
 *     w 는 **뷰포트 폭 대비 %** 라 전폭이 아니라 화면 한 장 폭에 곱한다(반가 검사 이미지와 동일 규약).
 *   - 그리는 순서 = 뒤→앞. 단상이 먼저, 제단 상판이 나중이라 단상 밑동을 가린다.
 * ⚠️ 육안은 **렌더 스케일에서** 본다 — 원본 확대로 판단하면 사람이 보지 않는 것을 재게 된다.
 */
const QA_VIEW_W = 640
const QA_WORLD = 240 // 2.4화면 폭
const QA_ROOM_REF_W = 520 // ShrineRoomClient 실측 컨테이너 max-w-[520px]
const QA_ROOM_REF_H = 620 // 높이 min(72vh, 620px)
const QA_BAND_WALL = 0.62
const QA_BAND_FLOOR = 0.38
const QA_STRUCTURES = [
  { file: 'platform.webp', x: 50, y: 51, w: 44 },
  { file: 'altar-top.webp', x: 50, y: 58, w: 58 },
]

async function makeThemeQa(code, outDir) {
  const wall = path.join(outDir, 'room-wall-mural.webp')
  const floor = path.join(outDir, 'room-floor-mural.webp')
  if (!existsSync(wall) || !existsSync(floor)) return null

  const W = Math.round((QA_VIEW_W * QA_WORLD) / 100)
  const H = Math.round((QA_VIEW_W * QA_ROOM_REF_H) / QA_ROOM_REF_W)
  const wallH = Math.round(H * QA_BAND_WALL)
  const floorH = Math.round(H * QA_BAND_FLOOR)

  const layers = [
    // object-cover 와 같은 기하: 짧은 축을 채우고 가로 중앙 크롭 (stretch 왜곡이 아니다)
    { input: await sharp(wall).resize(W, wallH, { fit: 'cover' }).png().toBuffer(), left: 0, top: 0 },
    { input: await sharp(floor).resize(W, floorH, { fit: 'cover' }).png().toBuffer(), left: 0, top: H - floorH },
  ]
  const placed = []
  for (const s of QA_STRUCTURES) {
    const file = path.join(COMMON_DIR, s.file)
    if (!existsSync(file)) continue
    const sw = Math.max(4, Math.round((QA_VIEW_W * s.w) / 100))
    const buf = await sharp(file).resize({ width: sw, fit: 'inside' }).png().toBuffer()
    const meta = await sharp(buf).metadata()
    layers.push({
      input: buf,
      left: Math.round((W * s.x) / 100 - meta.width / 2),
      top: Math.round((H * s.y) / 100 - meta.height / 2),
    })
    placed.push(`${s.file} w${s.w} y${s.y}`)
  }

  await mkdir(QA_DIR, { recursive: true })
  const out = path.join(QA_DIR, `${code}-check.webp`)
  const info = await sharp({ create: { width: W, height: H, channels: 4, background: DARK } })
    .composite(layers)
    .webp({ quality: 86 })
    .toFile(out)
  return { out, bytes: info.size, W, H, placed }
}

// ──────────────────────────── main ────────────────────────────
const args = process.argv.slice(2)
const regen = args.includes('--regen')
const muralOnly = args.includes('--mural-only')
const planOnly = args.includes('--plan')
const only = args.find((a) => !a.startsWith('--'))
const unknown = args.filter((a) => a.startsWith('--') && !['--regen', '--mural-only', '--plan'].includes(a))

if (unknown.length) {
  console.error('unknown flag:', unknown.join(' '), '— 가능: --regen, --mural-only, --plan')
  process.exit(1)
}
if (!only) {
  console.error('사용: node scripts/shrine-assets/stage-theme-room.mjs <code|all> [--regen] [--mural-only] [--plan]')
  console.error('가능한 code:', THEMES.map((t) => t.code).join(', '))
  process.exit(1)
}
const targets = only === 'all' ? THEMES : THEMES.filter((t) => t.code === only)
if (!targets.length) {
  console.error('unknown theme code:', only, '— 가능:', THEMES.map((t) => t.code).join(', '))
  process.exit(1)
}

// ── --plan: API 없이 프롬프트만 (검수용) ───────────────────────────────
if (planOnly) {
  for (const t of targets) {
    const outDir = path.join(STAGE_ROOT, t.code)
    console.log(`\n══ ${t.code} · ${t.name} (${t.el}) ══`)
    console.log(
      `   산출 ${path.relative(ROOT, outDir).replace(/\\/g, '/')}/  ·  팔레트 앵커 public/shrine/themes/${t.code}/room.webp`
    )
    for (const a of tileSpecs(t)) {
      console.log(`\n── ${a.key} ${a.w}×${a.h} ──`)
      console.log(a.prompt)
    }
  }
  console.log(`\n(--plan: API 0회 · 테마 ${targets.length}건 · 프롬프트 ${targets.length * 2}건)`)
  process.exit(0)
}

// 예산은 **필요분 딱 그만큼**. 재시도 루프가 없으므로 이 상한을 넘으면 곧 버그다.
apiBudget = muralOnly ? 0 : targets.length * 2
if (!muralOnly && !KEY) {
  console.error('✖ GEMINI 키 없음 — .env.local의 GEMINI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY 확인')
  process.exit(1)
}

console.log(
  `모델: ${MODEL}\n원본 캐시: ${RAW_ROOT}\n산출: ${STAGE_ROOT}/{code}\n검수: ${QA_DIR}\n` +
    `대상 ${targets.length}테마 (${targets.map((t) => t.code).join(', ')}) · API 예산 ${apiBudget}회\n`
)

const report = []
for (const theme of targets) {
  const outDir = path.join(STAGE_ROOT, theme.code)
  const entry = { code: theme.code, name: theme.name, tiles: [], murals: [], qa: null, error: null }
  report.push(entry)
  console.log(`\n══ ${theme.code} · ${theme.name} (${theme.el}) ══`)

  try {
    // ① 타일
    if (!muralOnly) {
      for (const asset of tileSpecs(theme)) {
        const outWebp = path.join(outDir, asset.file)
        if (!regen && existsSync(outWebp)) {
          console.log(`  skip ${asset.file} (이미 존재 — 재생성은 --regen, 후처리만 다시 하려면 이 파일을 지울 것)`)
          continue
        }
        console.log(`── ${asset.key} (${asset.w}×${asset.h}) ──`)
        const r = await buildTile(theme, asset, outDir, { regen })
        console.log(
          `  ${r.pass ? '✔' : '⚠️'} ${r.file} ${(r.bytes / 1024).toFixed(1)}KB (B=${r.B}) · ` +
            `seam ${fmt(r.plainMetrics.seam)} → ${fmt(r.metrics.seam)} (내부중앙값 ${fmt(r.metrics.median)} · p95 ${fmt(r.metrics.p95)})\n` +
            `      밝기물결 ${fmt(r.trend.rippleBefore)}배 → ${fmt(r.trend.rippleAfter)}배 · 유령 ${fmt(r.ghost)} · 팔레트게인 ${r.gains.map((g) => g.toFixed(3)).join('/')}`
        )
        entry.tiles.push(r)
      }
    }

    // ② 무라
    for (const spec of MURALS) {
      const outPath = path.join(outDir, spec.file)
      if (!regen && !muralOnly && existsSync(outPath)) {
        console.log(`  skip ${spec.file} (이미 존재 — 재조립은 --mural-only)`)
        continue
      }
      console.log(`── ${spec.key} (조립, API 0회) ──`)
      const r = await buildMural(spec, outDir)
      const verdict = r.passSeam && r.passEncoded && r.passRipple && r.withinBudget && r.passSymmetry && r.passEdge
      console.log(
        `  ${verdict ? '✔' : '⚠️'} ${r.file} ${r.width}×${r.height} ${(r.bytes / 1024).toFixed(1)}KB q${r.quality} · ` +
          `${r.crossfaded ? `크로스페이드 ${r.segments - 1}겹` : `퀼팅 조각 ${r.segments}개`}\n` +
          `      ① 이음매 최대 ${fmt(r.worstPre)}(전) → ${fmt(r.worstPost)}(webp후) / 내부 p95 ${fmt(r.interior.p95)}` +
          ` ${r.passSeam && r.passEncoded ? 'PASS' : '⚠️ 초과'}\n` +
          `      ② 밝기 산포 타일 ${fmt(r.tileStd)} → 무라 ${fmt(r.muralStd)} ${r.passRipple ? 'PASS' : '⚠️ 악화'}` +
          ` · 용량 ${r.withinBudget ? 'OK' : '⚠️ 초과'}\n` +
          `      ③ ★하드에지★ 렌더 ${RENDER_SCALE} 축소 최대 열차 ${r.renderAfter.max.toFixed(1)} / 타일 기준선 ${r.tileRender.max.toFixed(1)}` +
          ` → 조립이 더한 몫 ${(r.renderAfter.max - r.tileRender.max).toFixed(1)} ${r.passEdge ? 'PASS' : 'FAIL'}\n` +
          `      ④ ★좌우 대칭★ ${r.symmetry.worst.toFixed(3)} (x=${r.symmetry.worstAt}) / 미러 기준선 ${r.symmetryBaseline.worst.toFixed(3)}` +
          ` ${r.passSymmetry ? 'PASS' : '⚠️ 거울축이 화면에 잡힌다'}\n` +
          `      ⑤ 페더 ${r.feather.edges.length}곳/${r.feather.touched}열 · 톤 평균 ${r.feather.before.mean.toFixed(2)} → ${r.feather.after.mean.toFixed(2)}` +
          ` ${r.passTone ? 'OK' : '⚠️ 초과'} · 랩 ${fmt(r.wrapPost)}(참고값)`
      )
      entry.murals.push(r)
    }

    // ③ 검수 합성
    entry.qa = await makeThemeQa(theme.code, outDir)
    if (entry.qa) {
      console.log(
        `  ✔ QA ${path.relative(ROOT, entry.qa.out).replace(/\\/g, '/')} ${(entry.qa.bytes / 1024).toFixed(1)}KB ` +
          `— ${entry.qa.W}×${entry.qa.H} (2.4화면 · 벽62%/바닥38% · ${entry.qa.placed.join(' · ')})`
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
  const muralBytes = e.murals.reduce((s, m) => s + m.bytes, 0)
  const bad = [
    ...e.tiles.filter((t) => !t.pass).map((t) => t.key),
    ...e.murals
      .filter((m) => !(m.passSeam && m.passEncoded && m.passRipple && m.withinBudget && m.passSymmetry && m.passEdge))
      .map((m) => m.key),
  ]
  console.log(
    `  ${bad.length ? '⚠️' : '✔'} ${e.code.padEnd(11)} 타일 ${e.tiles.length} · 무라 ${e.murals.length}` +
      `${muralBytes ? ` (합 ${(muralBytes / 1024).toFixed(0)}KB)` : ''}` +
      `${e.qa ? ` · QA ${path.basename(e.qa.out)}` : ''}` +
      `${bad.length ? ` — 게이트 미달: ${bad.join(', ')}` : ''}`
  )
}
console.log(`\nAPI 호출 ${apiCalls}/${apiBudget}회`)
process.exit(report.some((e) => e.error) ? 1 : 0)
