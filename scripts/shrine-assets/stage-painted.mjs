// 신당 무대 ⑦ 「캐릭터 화풍 시네마틱」 — 파노라마(빛·그늘 두 판)·대제단·신물 생성과 수출
//
// ── 왜 (2026-09-23 대표 결정) ────────────────────────────────────────────────
// 「그림 퀄리티와 구도가 옛날 스타일」. 파일럿(D:/anti/shrine-style-explore/pilot-banga)에서 사진풍 방은
// 웹툰 화풍 신위를 스티커로 만들었다 — 그래서 **방을 캐릭터에 맞춘다**: 신위 스프라이트와 같은 붓으로
// 방을 다시 그리고, 빛·연무·그림자만 시네마틱하게. 대표가 고른 결: ⑦ 화풍 · 감실 뒤 빛나는 창호 ·
// 제단 이동·크기 조절 유지(«두 바닥 마스크»). 반가(52차)에서 확정한 것을 16테마로 넓힌다.
//
// ── 파일럿이 박은 규칙 (이 스크립트의 프롬프트가 지키는 것) ───────────────────
//   ① 숫자로 구도를 지시하면 무시된다 → **현행 파노라마를 구도 참조로 묶는다**(기둥·문·수평선 유지).
//   ② 물건용 빛 문구에 광원의 모양(창호)을 쓰면 그 모양을 물건에 그려 넣는다 → 제단은 «빛의 방향»만,
//      감실 뒷벽의 창은 **설계의 일부**로만 적는다.
//   ③ 화풍 기준은 대표가 승인한 ⑦ 한 장(painted-scene.png) 하나다 — 조각마다 붙인다.
//      팔레트는 반가만 그 금빛을 따르고, 나머지 테마는 **제 원화의 색·시간대**를 지킨다(밤·물속·안개).
//   ④ 빛 판·그늘 판은 **같은 그림에서 한 가지만 바꿔** 받는다(바닥 직사광 유무). 두 판의 널 이음매가
//      겹쳐야 마스크 경계가 안 보인다.
//
// ── 두 바닥 마스크 ─────────────────────────────────────────────────────────
// 제단은 한가운데 선다. 빛 판 바닥의 빛무늬가 제단 밑·앞까지 이어지면 «빛이 제단을 뚫고 지나간» 그림이
// 된다(파일럿 ⑤). 그래서 **직사광 없는 바닥 한 장을 더 굽고 제단 자리에서만 마스크로 바꿔 끼운다** —
// 사용자가 제단을 옮기면 마스크도 따라간다(마스크 기하 정본: lib/domain/shrine/theme-stage.ts floorShadeMask).
//
// ── 수출 계약 = 그 테마의 현행 v3 뮤럴과 같은 치수 ─────────────────────────────
// v3 는 테마마다 폭(5116~5504)과 수평선(65.8~74.5%)이 다르다(stage-theme-harmony.mjs 가 원판마다 쟀다).
// 그 치수를 **현행 파일에서 읽어** 그대로 지킨다 — 렌더(폭 맞춤·접지선 고정)가 한 줄도 달라지지 않는다.
//   구도 참조 = 현행 벽(수평선까지) + 바닥 → 16:9 로 늘여 보낸다 → 받은 4K 원판을 다시 현행 폭으로 줄인다
//   (가로만 최대 7.6% 오갔다 돌아오므로 수평선 행은 그대로다).
// 파일명은 `-p7-v3.webp` — `-v3.webp` 로 끝나면 `-v3-sd.webp` 형제가 있다는 StageLayers 계약을 그대로 탄다.
//
// ── 신물 ────────────────────────────────────────────────────────────────────
// 신물 스프라이트(수채 + 종이 얼룩 받침)를 ⑦ 붓으로 다시 그린다. 받침은 걷는다(접지 그림자는 런타임 몫).
// 화풍 참조 이미지는 붙이지 않는다(방 장면은 물건을 그 방에 그려 넣고, ⑦ 물건 카드는 그 물건을 끼워 넣었다).
// 모델이 그린 자리·크기도 믿지 않는다 — 원본 실루엣 안에 윗변·가로 중심을 맞춰 가장 크게 들어가는 배율로
// 앉힌다(fitProp). 캔버스 치수·물건 자리가 그대로라 배치 좌표·표시 크기 규격이 변하지 않는다.
// 수호신은 대상이 아니다 — 신위와 같은 수채 치비라 이미 한 붓이다.
//
// 산출: public/shrine/stage/{code}/
//   room-wall-mural-p7-v3.webp · room-wall-mural-p7-v3-sd.webp
//   room-floor-mural-p7-v3.webp · room-floor-mural-p7-v3-sd.webp
//   room-floor-shade-p7-v3.webp · room-floor-shade-p7-v3-sd.webp    ← 그늘 판 바닥(두 바닥 마스크)
//   grand-altar-p7.webp                                               ← 감실 창 빛 · 랜드마크 4줄 현행과 동일
//       public/shrine/items/{slug}-p7.webp · public/shrine/stage/banga/{prop}-p7.webp   ← 신물
// 원본(생성물)은 저장소 밖 {PAINTED_SRC_DIR}/{code|_props}/ — pano-lit-{tag}.png · pano-unlit-{tag}.png ·
//   altar-green-{tag}.png · {slug}-green-{tag}.png · qa/*.jpg(검수판)
//
// 사용 (실행 위치: 저장소 루트, 키는 메인 체크아웃 env 로):
//   node --env-file=<메인>/.env.local scripts/shrine-assets/stage-painted.mjs pano <code> --tag r1
//   node --env-file=<메인>/.env.local scripts/shrine-assets/stage-painted.mjs unlit <code> --from r1 --tag u1
//   node --env-file=<메인>/.env.local scripts/shrine-assets/stage-painted.mjs altar <code> --tag a1
//   node scripts/shrine-assets/stage-painted.mjs qa <code> --lit r1 --unlit u1 --altar a1      # 검수판 (API 0회)
//   node scripts/shrine-assets/stage-painted.mjs export <code> --lit r1 --unlit u1 --altar a1  # API 0회
//   node --env-file=<메인>/.env.local scripts/shrine-assets/stage-painted.mjs prop <slug> --tag p1
//   node scripts/shrine-assets/stage-painted.mjs prop-export <slug> --tag p1                   # API 0회
import sharp from 'sharp'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const GEO = JSON.parse(readFileSync(path.join(ROOT, 'lib', 'domain', 'shrine', 'theme-stage-geometry.json'), 'utf8'))
const STAGE_DIR = path.join(ROOT, 'public', 'shrine', 'stage')
const ITEM_DIR = path.join(ROOT, 'public', 'shrine', 'items')
const SRC = process.env.PAINTED_SRC_DIR || 'D:/anti/shrine-style-explore/painted'
/** 대표가 승인한 ⑦ 한 장 — 모든 조각의 화풍 기준 */
const STYLE_REF = process.env.PAINTED_STYLE_REF || 'D:/anti/shrine-style-explore/pilot-banga/work/painted-scene.png'
/** 파일럿 ⑦ 제단 — 반가 감실 창호 빛(승인안)의 설계 정본. 다른 테마는 제 v2 제단이 설계 정본이다 */
const BANGA_ALTAR_REF =
  process.env.PAINTED_ALTAR_REF || 'D:/anti/shrine-style-explore/pilot-banga/prod/altar-green.png'
const MODEL = process.env.PAINTED_MODEL || 'gemini-3-pro-image'
const API = 'https://generativelanguage.googleapis.com/v1beta'

// ── 수출 치수 ──
/** 현행 v3 벽 아래 물림 — stage-theme-harmony.mjs V3_WALL_BLEED 와 같은 규약(물림 = 수평선 × 0.02/0.98) */
const V3_WALL_BLEED = 0.02
const SD_W = 2048
/** 대제단 높이(px) — 현행 grand-altar-v2 와 같은 해상도(폰 DPR3 소요 ≈1300 을 덮는다) */
const ALTAR_H = 1456
/** 대제단 상자의 세로 규격(무대 %) — theme-stage.ts GRAND_ALTAR_BOX_H 와 접지선 82 의 거울(검수판 선 긋기용) */
const ALTAR_BOX = { top: 82 - 71.56, h: 71.56 }

const NO_TEXT = 'No text, no letters, no characters, no calligraphy, no watermark, no UI, no border.'
const STYLE_CORE =
  'Paint in EXACTLY the illustration style of the STYLE reference: the same clean confident line work, the same soft painterly cel shading, the same paper-like texture, the same cinematic light.'
/** 반가만 승인안의 금빛을 따른다 — 나머지는 제 원화의 색·시간대가 정체성이다 */
const styleRule = (golden) =>
  golden
    ? `${STYLE_CORE.replace('the same cinematic light', 'the same warm golden palette, the same cinematic light')}`
    : `${STYLE_CORE} Keep the colours, the time of day and the mood of IMAGE 1 — only the painting style changes.`

/**
 * 테마 표.
 *   place   장소 명사구(파노라마 첫 문장)
 *   light   빛 — 관찰 가능한 사실만. 가운데(제단 뒤)가 가장 밝고 양끝이 가라앉는 ⑦ 의 구조를 테마의 광원으로 쓴다
 *   views   열린 문·창 너머 원경(현행 그대로 — r1 반려 교훈: 적지 않으면 뿌연 벽이 된다)
 *   alcove  감실 뒷벽의 빛(제단 설계의 일부)
 *   golden  승인안 금빛 팔레트를 따르는가(반가만)
 *   keep    반려를 갚는 «관찰 가능한 사실» 한 줄(설명을 늘리지 않는다 — feedback_image_prompt_rules)
 */
const THEMES = {
  banga: {
    place: 'traditional Korean hall (hanok daecheong)',
    light:
      'warm golden daylight glows through the hanji doors in the CENTER of the hall and throws the door lattice as soft light patches and shadows across the floor in front of those doors',
    views: 'the sunlit garden — pine trees, a stone lantern, a low stone wall with a tiled coping, shrubs',
    alcove: 'a latticed hanji window glows softly with warm light from behind',
    golden: true,
  },
  byeolbat: {
    place: 'astronomical pavilion hall at night',
    light:
      'it is a clear night; the warm glow of the lanterns hanging near the CENTER pools on the middle of the floor and lights the lattice panels behind them, while cool silver-blue starlight comes in through the two open doorways and lies in long pale shapes on the floor in front of them',
    views: 'the deep starry night sky with the Milky Way above a wooden railing',
    alcove: 'a latticed paper window glows softly with pale silver-blue moonlight from behind',
  },
  choga: {
    place: 'humble thatched-roof shrine hall with earthen walls',
    light:
      'late afternoon; low warm sunlight comes in through the two open doorways and lies in long soft golden shapes across the floor, and the earthen wall in the CENTER catches a warm glow',
    views: 'sunlit rice fields, a thatched village and distant hills',
    alcove: 'a latticed hanji window glows softly with warm light from behind',
    // r1 반려: 금줄·호리병을 «빈 벽»으로 지웠다 — 초가 신당의 표지다
    keep: 'The straw ropes hung with white zigzag paper strips above the openings and the dried gourds hanging on the posts stay exactly as in IMAGE 1.',
  },
  daejanggan: {
    place: 'traditional iron smithy hall',
    light:
      'the small forges along the bottom of the wall glow bright orange and throw warm flickering light across the floor in front of them, the hottest glow in the CENTER of the hall, while pale grey daylight comes in through the two open doorways and soot haze hangs under the roof',
    views: 'a smithy yard with a stone wall and firewood stacked under a shed',
    alcove: 'a latticed window glows with warm orange forge light from behind',
  },
  daljip: {
    place: 'Korean village house hall beside a moonlit courtyard',
    light:
      'night under a full moon; cool blue moonlight pours in through the two open doorways and lies in long pale shapes across the straw mats, and a small warm lamp at the CENTER post makes a soft amber pool of light on the middle of the floor',
    views: 'a moonlit yard with a pine tree and a stacked wooden daljip bonfire pile under the full moon',
    alcove: 'a latticed hanji window glows softly with warm lamplight from behind',
  },
  dangsan: {
    place: 'old shrine hall in the shade of an ancient village guardian tree',
    light:
      'soft green-gold daylight filters through the leaves of the great trees outside and falls as dappled light spots over the walls and the floor, strongest in the CENTER of the hall',
    views: 'the huge mossy guardian tree bound with a straw rope, and a tiled wall behind it',
    alcove: 'a latticed hanji window glows softly with green-gold daylight from behind',
    // r1 반려: 회녹색 이끼 그늘이 따뜻한 갈색 나무로 바뀌었다 — 木 테마의 색이다
    keep: 'The timber stays weathered grey-green with green moss in its seams and the plaster stays cool grey-green, exactly as in IMAGE 1.',
  },
  dokkaebi: {
    place: 'dim haunted dancheong hall at night',
    light:
      'the small floating green dokkaebi flames are the only light: they cast a cold eerie green glow on the beams, the panels and the floor, a cluster of them brightening the CENTER of the hall, and the floor holds faint green reflections',
    views: 'a dark misty forest with floating green flames',
    alcove: 'a latticed paper window glows faintly with cold green light from behind',
  },
  hongsal: {
    place: 'red-pillared shrine hall facing an inner courtyard',
    light:
      'a clear autumn afternoon; warm sunlight streams in through the two open doorways and lies in long bright shapes across the stone step and the floor, and the plain wall in the CENTER glows warmly in the reflected light',
    views: 'an autumn courtyard with golden trees, a stone wall and the red hongsal gate',
    alcove: 'a latticed hanji window glows softly with warm light from behind',
  },
  jangdok: {
    place: 'Korean house hall beside the crock terrace at dawn',
    light:
      'dawn; soft pink-gold first light comes in through the two open doorways and lies in long pale shapes on the floor, and the pale hanji wall in the CENTER glows softly with the dawn light',
    views: 'the crock terrace with rows of dark earthenware jars before a tiled wall',
    alcove: 'a latticed hanji window glows softly with pink-gold dawn light from behind',
  },
  jonggak: {
    place: 'bell pavilion hall at first light',
    light:
      'early dawn in mist; cool pale light comes in through the two open doorways and makes the mist glow, the CENTER of the hall is the brightest with soft light lying across the middle of the floor, and mist drifts low along the floor',
    views: 'the great bronze temple bell hanging in its pavilion in the mist',
    alcove: 'a latticed hanji window glows softly with pale dawn light from behind',
  },
  naru: {
    place: 'riverside ferry-landing hall in morning mist',
    light:
      'morning mist; soft cool light glows through the lattice paper windows and the two open doorways to the river and lies in long pale shapes across the warm floorboards, the CENTER of the hall the brightest',
    views: 'a misty river with a wooden jetty and a moored boat',
    alcove: 'a latticed hanji window glows softly with pale misty light from behind',
  },
  saemgut: {
    place: 'forest spring shrine hall',
    light:
      'soft cool green forest daylight glows through the paper windows and the two open doorways to the spring, and the wet floor holds bright reflections and gentle ripples, brightest in the CENTER of the hall',
    views: 'a forest spring among mossy stones and green trees',
    alcove: 'a latticed hanji window glows softly with cool green daylight from behind',
    // r1 반려: 민트빛 벽이 복숭아색으로 따뜻해졌다 — 옹달샘(水)의 서늘함이 정체다
    keep: 'The plaster panels stay pale mint green and the light in the hall stays cool and green, exactly as in IMAGE 1.',
  },
  seolbit: {
    place: 'scholar library hall on a snowy winter morning',
    light:
      'a winter morning after snow; cool bright snow light comes in through the two open windows and the paper panels and lies in soft pale shapes on the floor, the CENTER of the hall the brightest, everything cool silver-white with a little warm wood',
    views: 'a snowy garden with snow-laden pine trees and a low wall',
    alcove: 'a latticed hanji window glows softly with cool white snow light from behind',
  },
  seonang: {
    place: 'mountain-pass shrine hall with earthen walls',
    light:
      'late afternoon on the mountain pass; warm golden sunlight comes in through the two open doorways and throws long bright shapes across the floor, and the earthen wall in the CENTER glows warmly',
    views: 'a mountain pass with stone cairns, a pine tree hung with cloth strips and distant ridges',
    alcove: 'a latticed hanji window glows softly with warm golden light from behind',
  },
  yeondeung: {
    place: 'lantern-hung hall in a valley at dusk',
    light:
      'dusk; the warm paper lanterns hanging from the ceiling and the glowing lattice doors in the CENTER are the key light, and warm amber light pools on the polished floor and reflects in it',
    views: 'a valley at sunset with strings of glowing lanterns over a river',
    alcove: 'a latticed hanji window glows softly with warm amber lantern light from behind',
  },
  yonggung: {
    place: 'undersea dragon palace hall',
    light:
      'deep under the sea; shafts of pale light fall from the surface far above, the brightest in the CENTER of the hall, and cast slow rippling caustic light on the dark floor while fine bubbles rise',
    views: 'the dim seabed with coral and drifting light',
    alcove: 'a latticed window glows softly with pale aqua light, like light through water, from behind',
  },
}

function apiKey() {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!key) throw new Error('Gemini 키 없음 — node --env-file=<메인 체크아웃>/.env.local 로 실행')
  return key
}

const inline = (mimeType, buf) => ({ inlineData: { mimeType, data: buf.toString('base64') } })

async function generate(parts, aspectRatio, imageSize) {
  const res = await fetch(`${API}/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey(), 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio, imageSize } },
    }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 300)}`)
  const img = (await res.json()).candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData
  if (!img) throw new Error('이미지 파트 없음')
  return Buffer.from(img.data, 'base64')
}

/** 현행 v3 의 치수 — 벽 높이 = 수평선 + 물림 규약을 거꾸로 풀어 수평선 행을 찾는다 */
async function stageDims(code) {
  const wall = await sharp(path.join(STAGE_DIR, code, 'room-wall-mural-v3.webp')).metadata()
  const floor = await sharp(path.join(STAGE_DIR, code, 'room-floor-mural-v3.webp')).metadata()
  if (wall.width !== floor.width) throw new Error(`${code}: 벽·바닥 폭이 다르다 ${wall.width}≠${floor.width}`)
  for (let hz = Math.floor(wall.height * 0.97); hz <= wall.height; hz += 1) {
    if (hz + Math.round((hz * V3_WALL_BLEED) / (1 - V3_WALL_BLEED)) === wall.height)
      return { width: wall.width, wallH: wall.height, floorH: floor.height, hz, height: hz + floor.height }
  }
  throw new Error(`${code}: 벽 높이 ${wall.height} 에서 수평선 행을 못 풀었다 — v3 물림 규약이 바뀌었나`)
}

/** 현행 v3 벽(수평선까지) + 바닥을 이어 붙인 파노라마 — ⑦ 파노라마의 구도 참조 */
async function currentPanorama(code) {
  const d = await stageDims(code)
  const wall = path.join(STAGE_DIR, code, 'room-wall-mural-v3.webp')
  const floor = path.join(STAGE_DIR, code, 'room-floor-mural-v3.webp')
  const buf = await sharp({ create: { width: d.width, height: d.height, channels: 3, background: '#000' } })
    .composite([
      {
        input: await sharp(wall).extract({ left: 0, top: 0, width: d.width, height: d.hz }).png().toBuffer(),
        left: 0,
        top: 0,
      },
      { input: await sharp(floor).png().toBuffer(), left: 0, top: d.hz },
    ])
    .png()
    .toBuffer()
  return { buf, dims: d }
}

/** 원판(16:9) → 그 테마 현행 폭 × 높이로 되돌린다(가로만 오간다) */
async function toStageFrame(file, dims) {
  return sharp(file).resize(dims.width, dims.height, { fit: 'fill', kernel: 'lanczos3' }).png().toBuffer()
}

async function pano(code, tag) {
  const t = THEMES[code]
  const { buf } = await currentPanorama(code)
  const layout = await sharp(buf).resize(2400, 1340, { fit: 'fill' }).jpeg({ quality: 90 }).toBuffer()
  const style = await sharp(STYLE_REF).jpeg({ quality: 92 }).toBuffer()
  const text = [
    `You are given two images. IMAGE 1 is the LAYOUT: a very wide panoramic view of ONE long ${t.place}, seen straight-on. IMAGE 2 is the STYLE reference.`,
    'Repaint the whole panorama of IMAGE 1 at the same size. KEEP IDENTICAL: the camera, the straight-on framing, the position and width of every post, beam, door, window, opening, panel and wall section, every hanging decoration, the ceiling, and — most important — the exact height of the line where the wall meets the floor (it must stay at the same height across the whole width).',
    styleRule(t.golden),
    `Light: ${t.light}. Toward the far left and far right the hall falls into a calmer, softer shade — still clearly readable, never black. A faint haze in the air.`,
    `Every open doorway and window keeps its view out exactly as in IMAGE 1: ${t.views} — painted in the same style, clearly outdoors.`,
    ...(t.keep ? [t.keep] : []),
    'Inside the hall, the floor and the walls are completely EMPTY — no altar, no cabinet, no shelf, no table, no furniture, no objects on the floor, no figures, no animals. Plain empty wall sections stay plain and empty (they will be furnished later).',
    NO_TEXT,
  ].join('\n\n')
  const out = await generate([{ text }, inline('image/jpeg', layout), inline('image/jpeg', style)], '16:9', '4K')
  await writeFile(path.join(SRC, code, `pano-lit-${tag}.png`), out)
  return `pano-lit-${tag}.png`
}

async function unlit(code, from, tag) {
  const lit = await sharp(path.join(SRC, code, `pano-lit-${from}.png`))
    .resize(2752)
    .jpeg({ quality: 92 })
    .toBuffer()
  const text = [
    'Re-paint EXACTLY the attached image at the same size — the identical hall, camera, framing, posts, doors, windows, lattices, decorations, ceiling, views outside, floor boards and their joints, the identical illustration style and colours.',
    'Change ONE thing only: NO direct light falls on the floor. The whole floor lies in soft, even, calm shade — NO light patches, NO pools of light, NO lattice or window shadows, NO caustic ripples and NO bright reflections anywhere on the floor. The doors, windows and lamps themselves still glow and the views outside stay bright. The floor keeps the same colour and the same boards, only evenly and softly lit (slightly darker where the light was).',
    NO_TEXT,
  ].join('\n\n')
  const out = await generate([{ text }, inline('image/jpeg', lit)], '16:9', '4K')
  await writeFile(path.join(SRC, code, `pano-unlit-${tag}.png`), out)
  return `pano-unlit-${tag}.png`
}

/** 설계 정본 — 반가는 파일럿 ⑦ 제단, 나머지는 제 v2 제단을 초록 3:4 판 한가운데 여백 두고 앉힌다 */
async function altarDesign(code) {
  if (code === 'banga') return { mime: 'image/png', buf: await readFile(BANGA_ALTAR_REF) }
  const v2 = path.join(STAGE_DIR, code, 'grand-altar-v2.webp')
  const H = 1400
  const obj = await sharp(v2).trim({ threshold: 1 }).resize(null, Math.round(H * 0.9)).png().toBuffer()
  const W = Math.round((H * 3) / 4)
  const m = await sharp(obj).metadata()
  const buf = await sharp({ create: { width: W, height: H, channels: 3, background: '#00ff00' } })
    .composite([{ input: obj, left: Math.round((W - m.width) / 2), top: Math.round((H - m.height) / 2) }])
    .png()
    .toBuffer()
  return { mime: 'image/png', buf }
}

async function altar(code, tag) {
  const t = THEMES[code]
  const design = await altarDesign(code)
  const style = await sharp(STYLE_REF).jpeg({ quality: 92 }).toBuffer()
  const parts =
    code === 'banga'
      ? 'the two-tier palace-style canopy roof with carved brackets, the open alcove with the softly glowing latticed hanji window at its back, the carved valance at the top of the alcove, the chest of drawers with mother-of-pearl floral inlay and brass handles, the long offering table with upturned ends and the openwork carved apron, the four legs'
      : 'the roof, the carved valance, the open alcove, the chest of drawers, the long offering table with its apron, the legs'
  const text = [
    'You are given two images. IMAGE 1 is the OBJECT to paint. IMAGE 2 is the STYLE reference.',
    `Paint EXACTLY the object of IMAGE 1 again, larger and with finer detail — the same design, the same materials and colours, the same proportions, the same parts in the same places: ${parts}. Keep the heights of the top of the alcove opening, the alcove floor, the table top and the feet exactly where they are in IMAGE 1.`,
    'Front straight-on view, the whole object fully inside the frame with a small margin on every side. The alcove is EMPTY — no figure, no statue inside.',
    ...(code === 'banga' ? [] : [`At the back of the open alcove, ${t.alcove}.`]),
    styleRule(t.golden),
    // 물건용 빛 — 광원의 «모양»은 말하지 않는다(파일럿 교훈 ②)
    'Lighting: a warm key light from BEHIND and slightly ABOVE, painting a soft bright rim along the top and back edges, with a weak cool fill from the front.',
    'Fully isolated on a perfectly flat, uniform, pure bright green (#00FF00) background filling the ENTIRE frame — no walls, no windows outside the object, no floor, no surface, no scenery, no shadow of any kind on the background.',
    NO_TEXT,
  ].join('\n\n')
  const out = await generate([{ text }, inline(design.mime, design.buf), inline('image/jpeg', style)], '3:4', '2K')
  await writeFile(path.join(SRC, code, `altar-green-${tag}.png`), out)
  return `altar-green-${tag}.png`
}

/** 초록 키잉 + 가장자리 스필 억제(chroma.mjs 규칙) */
async function keyGreen(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (g > 90 && g - r > 60 && g - b > 60) data[i + 3] = 0
    else if (g - r > 12 && g - b > 12) {
      data[i + 1] = Math.min(g, Math.round((r + b) / 2) + 6)
      if (g - r > 35 && g - b > 35) data[i + 3] = Math.round(data[i + 3] * 0.4)
    }
  }
  return sharp(data, { raw: info }).png().toBuffer()
}

async function webp(input, width, quality, alpha = false) {
  const img = sharp(input)
  if (width) img.resize(width, null, { kernel: 'lanczos3' })
  return img.webp({ quality, ...(alpha ? { alphaQuality: 90 } : null), effort: 6 }).toBuffer()
}

async function exportAll(code, litTag, unlitTag, altarTag) {
  const dir = path.join(STAGE_DIR, code)
  const dims = await stageDims(code)
  const band = async (file, top, height) =>
    sharp(await toStageFrame(file, dims))
      .extract({ left: 0, top, width: dims.width, height })
      .png()
      .toBuffer()
  const lit = path.join(SRC, code, `pano-lit-${litTag}.png`)
  const shade = path.join(SRC, code, `pano-unlit-${unlitTag}.png`)
  const bands = {
    'room-wall-mural-p7': await band(lit, 0, dims.wallH),
    'room-floor-mural-p7': await band(lit, dims.hz, dims.floorH),
    'room-floor-shade-p7': await band(shade, dims.hz, dims.floorH),
  }
  const report = [`치수 ${dims.width} · 벽 ${dims.wallH} · 바닥 ${dims.floorH} · 수평선 ${dims.hz}행`]
  for (const [name, buf] of Object.entries(bands)) {
    const hi = await webp(buf, null, 80)
    const sd = await webp(buf, SD_W, 78)
    await writeFile(path.join(dir, `${name}-v3.webp`), hi)
    await writeFile(path.join(dir, `${name}-v3-sd.webp`), sd)
    report.push(`${name}-v3 ${Math.round(hi.length / 1024)}KB · sd ${Math.round(sd.length / 1024)}KB`)
  }
  const altarBuf = await altarSprite(code, altarTag)
  await writeFile(path.join(dir, 'grand-altar-p7.webp'), altarBuf)
  const am = await sharp(altarBuf).metadata()
  report.push(
    `grand-altar-p7 ${am.width}×${am.height} (비 ${(am.width / am.height).toFixed(4)}) ${Math.round(altarBuf.length / 1024)}KB`
  )
  return report
}

/**
 * 제단 — 키잉 → 트림(바닥 행 = 그려진 접지) → 현행 v2 와 **같은 세로 배치**.
 * 틀은 이미지 전체 높이가 상자(71.56%)에 들어가는 규격이라(StageLayers byHeight) v2 가 지붕 위에 남긴
 * 투명 머리 여백(0~4.4%)까지 같아야 감실 바닥·상판·접지가 제자리에 선다. 아래 여백은 v2 전부 0 이다.
 */
async function altarSprite(code, tag) {
  const keyed = await keyGreen(path.join(SRC, code, `altar-green-${tag}.png`))
  const trimmed = await sharp(keyed).trim({ threshold: 1 }).png().toBuffer()
  const v2 = path.join(STAGE_DIR, code, 'grand-altar-v2.webp')
  const v2Meta = await sharp(v2).metadata()
  const v2Obj = (await sharp(v2).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true })).info
  const objH = Math.round((ALTAR_H * v2Obj.height) / v2Meta.height)
  const obj = await sharp(trimmed).resize(null, objH, { kernel: 'lanczos3' }).png().toBuffer()
  return sharp(obj)
    .extend({ top: ALTAR_H - objH, bottom: 0, left: 0, right: 0, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 86, alphaQuality: 90, effort: 6 })
    .toBuffer()
}

/**
 * 검수판 — 사람이 보는 크기로 «현행 ↔ ⑦» 를 한 장에.
 *   pano   : 현행 / ⑦ 빛 판 / ⑦ 그늘 판 — 수평선(빨강) 한 줄
 *   unlit  : 가운데 바닥을 빛·그늘·반반 섞기로 — 널 이음매가 이중이면 두 판이 어긋난 것
 *   altar  : v2 / ⑦ 같은 높이에 랜드마크 4줄(감실 윗턱은 테마별 · 감실 바닥 · 상판 앞턱 · 접지)
 */
async function qa(code, litTag, unlitTag, altarTag) {
  const out = path.join(SRC, code, 'qa')
  await mkdir(out, { recursive: true })
  const { buf: cur, dims } = await currentPanorama(code)
  const W = 1600
  const H = Math.round((dims.height * W) / dims.width)
  const hzY = Math.round((dims.hz * H) / dims.height)
  const hzLine = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><line x1="0" y1="${hzY}" x2="${W}" y2="${hzY}" stroke="#ff3030" stroke-width="2"/></svg>`
  )
  const frames = [cur]
  const litFile = path.join(SRC, code, `pano-lit-${litTag}.png`)
  const unlitFile = path.join(SRC, code, `pano-unlit-${unlitTag}.png`)
  if (existsSync(litFile)) frames.push(await toStageFrame(litFile, dims))
  if (existsSync(unlitFile)) frames.push(await toStageFrame(unlitFile, dims))
  const rows = []
  for (const f of frames) rows.push(await sharp(f).resize(W, H, { fit: 'fill' }).composite([{ input: hzLine }]).png().toBuffer())
  await sharp({ create: { width: W, height: rows.length * (H + 10), channels: 3, background: '#000' } })
    .composite(rows.map((input, i) => ({ input, left: 0, top: i * (H + 10) })))
    .jpeg({ quality: 82 })
    .toFile(path.join(out, `pano-${litTag}-${unlitTag}.jpg`))

  if (frames.length === 3) {
    const crop = { left: Math.round(dims.width * 0.3), top: Math.round(dims.height * 0.55), width: Math.round(dims.width * 0.4), height: Math.round(dims.height * 0.45) }
    const a = await sharp(frames[1]).extract(crop).resize(1000).png().toBuffer()
    const b = await sharp(frames[2]).extract(crop).resize(1000).png().toBuffer()
    const mix = await sharp(a).composite([{ input: await sharp(b).ensureAlpha(0.5).png().toBuffer() }]).png().toBuffer()
    const h = (await sharp(a).metadata()).height
    await sharp({ create: { width: 1000, height: h * 3 + 16, channels: 3, background: '#000' } })
      .composite([{ input: a, left: 0, top: 0 }, { input: b, left: 0, top: h + 8 }, { input: mix, left: 0, top: 2 * h + 16 }])
      .jpeg({ quality: 82 })
      .toFile(path.join(out, `unlit-${litTag}-${unlitTag}.jpg`))
  }

  const altarFile = path.join(SRC, code, `altar-green-${altarTag}.png`)
  if (existsSync(altarFile)) {
    const AH = 900
    const headFrac = (headRoomY(code) - ALTAR_BOX.top) / ALTAR_BOX.h
    const lines = [
      [headFrac, '#33ddff'],
      [(54.3 - ALTAR_BOX.top) / ALTAR_BOX.h, '#ff33ff'],
      [0.832, '#ffcc33'],
      [1, '#ff3333'],
    ]
    const guide = (w) =>
      Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${AH}">${lines.map(([f, c]) => `<line x1="0" y1="${Math.min(AH - 1, f * AH)}" x2="${w}" y2="${Math.min(AH - 1, f * AH)}" stroke="${c}" stroke-width="2"/>`).join('')}</svg>`
      )
    const v2 = await sharp(path.join(STAGE_DIR, code, 'grand-altar-v2.webp')).resize(null, AH).flatten({ background: '#2a2a2a' }).png().toBuffer()
    const p7 = await sharp(await altarSprite(code, altarTag)).resize(null, AH).flatten({ background: '#2a2a2a' }).png().toBuffer()
    const w1 = (await sharp(v2).metadata()).width
    const w2 = (await sharp(p7).metadata()).width
    await sharp({ create: { width: w1 + w2 + 20, height: AH, channels: 3, background: '#000' } })
      .composite([
        { input: v2, left: 0, top: 0 },
        { input: guide(w1), left: 0, top: 0 },
        { input: p7, left: w1 + 20, top: 0 },
        { input: guide(w2), left: w1 + 20, top: 0 },
      ])
      .jpeg({ quality: 85 })
      .toFile(path.join(out, `altar-${altarTag}.jpg`))
  }
  return out
}

/** 감실 윗턱(무대 %) — 기하 정본 JSON 에서 읽는다(숫자 두 벌 금지) */
function headRoomY(code) {
  const v = GEO.grandAltar?.deityHeadRoomY?.[code]
  if (typeof v !== 'number') throw new Error(`${code}: deityHeadRoomY 없음`)
  return v
}

// ── 신물 ───────────────────────────────────────────────────────────────────
/** 신물 원본 위치 — 대부분 items/, 기본 촛불·향로(v2 무대 소품)는 stage/banga/ */
function propSource(slug) {
  const item = path.join(ITEM_DIR, `${slug}.webp`)
  if (existsSync(item)) return { src: item, out: path.join(ITEM_DIR, `${slug}-p7.webp`) }
  const stage = path.join(STAGE_DIR, 'banga', `${slug}.webp`)
  if (existsSync(stage)) return { src: stage, out: path.join(STAGE_DIR, 'banga', `${slug}-p7.webp`) }
  throw new Error(`신물 원본 없음: ${slug}`)
}

/** 글자가 물건의 정체인 신물 — 그 글자만 남긴다(나머지는 NO_TEXT) */
const PROP_TEXT = { 'talisman-bok': '福', 'liquor-clear': '清酒' }
/** 반려를 갚는 사실 한 줄 — 켜짐은 런타임(점화 글로우)이 그리므로 꺼진 초는 꺼진 채여야 한다 */
const PROP_FACTS = {
  'prop-candle': 'The candle is NOT lit: no flame at all, only a short dark wick.',
  // q1 반려 3/3: 방울을 키우고 끈 고리를 줄였다
  'bell-brass':
    'The braided red cord rises in a tall loop above the small bell and the long red tassel hangs down on the left — the same sizes as in IMAGE 1.',
  // q1: 장대가 짧아져 발이 캔버스 72% 에서 끝났다(바닥 신물이 뜬다)
  'pole-sindae':
    'The bamboo pole is tall and reaches all the way down to the bottom of the frame; the white paper streamers hang only on its upper half.',
}

/**
 * 원본 캔버스를 정사각 초록 판에 앉힌다(세로로 긴 캔버스는 가운데) — 생성·되돌림이 같은 기하를 쓴다.
 * 사방에 여백(PROP_MARGIN)을 둔다: 캔버스 끝까지 닿은 물건(촛대 0~511행)은 모델이 여백을 새로 두며
 * 줄여 그린다 — 여백을 미리 주면 제 크기로 남고, 되돌릴 때 잘라낸다.
 */
const PROP_MARGIN = 0.125
async function propFrame(slug) {
  const { src } = propSource(slug)
  const m = await sharp(src).metadata()
  const side = Math.round(Math.max(m.width, m.height) * (1 + 2 * PROP_MARGIN))
  const left = Math.round((side - m.width) / 2)
  const top = Math.round((side - m.height) / 2)
  return { src, m, side, left, top }
}

/** 알파 마스크(임계 40) — 격자 N×N 로 내린 판 */
async function maskOf(buf, w, h) {
  const { data } = await sharp(buf)
    .resize(w, h, { fit: 'fill', kernel: 'lanczos3' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const m = new Uint8Array(w * h)
  for (let i = 0; i < m.length; i += 1) m[i] = data[i * 4 + 3] > 40 ? 1 : 0
  return m
}

function boxOf(m, w, h) {
  let x0 = w
  let y0 = h
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < h; y += 1)
    for (let x = 0; x < w; x += 1)
      if (m[y * w + x]) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
  return x1 < 0 ? null : { x0, y0, x1: x1 + 1, y1: y1 + 1 }
}

const FIT_N = 192
/**
 * 새 실루엣이 원본 실루엣 안에 들어가야 하는 비율 — 원본은 물건 + 종이 받침이라 새 물건을 품는다.
 * 가늘고 비스듬한 물건(삼지창·신대·술 달린 방울)은 기울기·술 길이가 조금만 달라도 엄격 기준을 못 넘는다 —
 * 그때만 느슨한 기준으로 한 번 더 맞추고 `loose` 로 알려 눈 검수 대상으로 남긴다.
 */
const FIT_INSIDE = [0.955, 0.85]

/**
 * 모델이 그린 자리·크기를 믿지 않는다(글로만 화풍을 주면 좌상단에 작게 그리는 일이 잦다 — 09-23 시험).
 * 새 물건을 **원본 실루엣 안에 윗변·가로 중심을 맞춰 가장 크게 들어가는 배율**로 앉힌다. 받침은 아래·옆으로만
 * 번지므로 윗변과 가로 중심은 물건의 것이다. 설계가 바뀌었거나 다른 물건을 끼워 그렸으면 안에 안 들어가 걸린다.
 * @returns {{ ok: true, h: number, top: number, cx: number } | { ok: false, reason: string }}  (판 한 변 대비 비율)
 */
async function fitProp(origPadded, keyedNew) {
  const N = FIT_N
  const O = await maskOf(origPadded, N, N)
  const ob = boxOf(O, N, N)
  if (!ob) return { ok: false, reason: '원본 실루엣 없음' }
  const dil = new Uint8Array(N * N)
  for (let y = 0; y < N; y += 1)
    for (let x = 0; x < N; x += 1)
      if (O[y * N + x])
        for (let dy = -1; dy <= 1; dy += 1)
          for (let dx = -1; dx <= 1; dx += 1) {
            const yy = y + dy
            const xx = x + dx
            if (yy >= 0 && yy < N && xx >= 0 && xx < N) dil[yy * N + xx] = 1
          }

  const meta = await sharp(keyedNew).metadata()
  const full = await maskOf(keyedNew, meta.width, meta.height)
  let edge = 0
  for (let x = 0; x < meta.width; x += 1) edge += full[x] + full[(meta.height - 1) * meta.width + x]
  for (let y = 0; y < meta.height; y += 1) edge += full[y * meta.width] + full[y * meta.width + meta.width - 1]
  if (edge / (2 * (meta.width + meta.height)) > 0.03) return { ok: false, reason: '가장자리까지 그렸다(배경·방 장면)' }
  const nb = boxOf(full, meta.width, meta.height)
  if (!nb) return { ok: false, reason: '키잉 뒤 물건 없음' }
  const gw = nb.x1 - nb.x0
  const gh = nb.y1 - nb.y0
  const oh = ob.y1 - ob.y0
  const cx = (ob.x0 + ob.x1) / 2
  const insideAt = (k) => {
    const w = Math.max(1, Math.round((gw * k) / gh))
    const left = Math.round(cx - w / 2)
    let total = 0
    let inside = 0
    for (let y = 0; y < k; y += 1) {
      const oy = ob.y0 + y
      const sy = nb.y0 + Math.min(gh - 1, Math.floor((y * gh) / k))
      for (let x = 0; x < w; x += 1) {
        if (!full[sy * meta.width + nb.x0 + Math.min(gw - 1, Math.floor((x * gw) / w))]) continue
        total += 1
        const ox = left + x
        if (oy >= 0 && oy < N && ox >= 0 && ox < N && dil[oy * N + ox]) inside += 1
      }
    }
    return total ? inside / total : 0
  }
  for (const [pass, need] of FIT_INSIDE.entries()) {
    for (let k = Math.ceil(oh * 1.08); k >= Math.floor(oh * 0.55); k -= 1) {
      if (insideAt(k) < need) continue
      return {
        ok: true,
        loose: pass > 0,
        h: k / N,
        top: ob.y0 / N,
        cx: cx / N,
        crop: { left: nb.x0, top: nb.y0, width: gw, height: gh },
      }
    }
  }
  return { ok: false, reason: '원본 실루엣 안에 안 들어간다(설계가 달라졌다)' }
}

/** 원본 스프라이트를 여백 판(투명)에 앉힌 것 — 정합의 기준 실루엣 */
async function propPadded(f) {
  return sharp({ create: { width: f.side, height: f.side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await sharp(f.src).png().toBuffer(), left: f.left, top: f.top }])
    .png()
    .toBuffer()
}

const PROP_ATTEMPTS = 3

async function prop(slug, tag) {
  const f = await propFrame(slug)
  const onGreen = await sharp({ create: { width: f.side, height: f.side, channels: 3, background: '#00ff00' } })
    .composite([{ input: await sharp(f.src).png().toBuffer(), left: f.left, top: f.top }])
    .resize(1024, 1024, { kernel: 'lanczos3' })
    .png()
    .toBuffer()
  const padded = await propPadded(f)
  const keep = PROP_TEXT[slug]
  // 화풍 참조 이미지를 붙이지 않는다 — 방 장면은 물건을 그 방에 그려 넣고(09-23 시험 2/4), 초록 판 위
  // ⑦ 물건 카드·제단은 그 물건을 결과에 끼워 넣거나 통째로 베꼈다. 화풍은 글로 준다.
  const text = [
    'IMAGE 1 is ONE OBJECT to repaint, on a flat green background.',
    'Repaint the object of IMAGE 1 in a clean Korean webtoon illustration style: clean confident dark line work, soft painterly cel shading in two or three tones, a subtle paper-like texture, warm light. The object itself stays identical to IMAGE 1: the same design, shape, parts, materials, colours and proportions. Show the whole object large and centred in the frame.',
    'Leave out the pale paper-coloured wash under the object: the object stands alone with nothing under it.',
    ...(PROP_FACTS[slug] ? [PROP_FACTS[slug]] : []),
    'Lighting: a soft warm key light from above and slightly behind, a gentle bright rim along the top edges, soft shading on the lower parts.',
    'The result is ONE isolated object on a perfectly flat, uniform, pure bright green (#00FF00) background filling the entire frame — no other objects, no room, no walls, no floor, no table, no scenery, no shadow on the background.',
    keep ? `Keep the characters ${keep} exactly as they are in IMAGE 1. No other text, no watermark, no border.` : NO_TEXT,
  ].join('\n\n')
  await mkdir(path.join(SRC, '_props'), { recursive: true })
  const reasons = []
  for (let i = 1; i <= PROP_ATTEMPTS; i += 1) {
    const out = await generate([{ text }, inline('image/png', onGreen)], '1:1', '1K')
    const fit = await fitProp(padded, await keyGreen(out))
    if (fit.ok) {
      await writeFile(path.join(SRC, '_props', `${slug}-green-${tag}.png`), out)
      return `${slug}-green-${tag}.png (${i}회째 · 높이 ${(fit.h * 100).toFixed(1)}%${fit.loose ? ' · 느슨한 정합 — 눈 검수' : ''})`
    }
    reasons.push(fit.reason)
    await writeFile(path.join(SRC, '_props', `${slug}-green-${tag}-x${i}.png`), out)
  }
  throw new Error(`${slug}: ${PROP_ATTEMPTS}회 모두 검증 실패 — ${reasons.join(' / ')}`)
}

/** 키잉 → 정합(fitProp) 자리에 앉힘 → 원본 캔버스 치수로 되돌림 */
async function propSprite(slug, tag) {
  const f = await propFrame(slug)
  const keyed = await keyGreen(path.join(SRC, '_props', `${slug}-green-${tag}.png`))
  const fit = await fitProp(await propPadded(f), keyed)
  if (!fit.ok) throw new Error(`${slug}: 정합 실패 — ${fit.reason}`)
  const h = Math.max(1, Math.round(fit.h * f.side))
  const placed = await sharp(keyed).extract(fit.crop).resize(null, h, { kernel: 'lanczos3' }).png().toBuffer()
  const pw = (await sharp(placed).metadata()).width
  // 판 밖으로 조금 나가도 잘리게 두 배 판에 앉혔다가 원래 자리를 떼어 낸다(sharp 합성은 음수 좌표를 못 받는다)
  const pad = f.side
  const canvas = await sharp({
    create: { width: f.side + 2 * pad, height: f.side + 2 * pad, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: placed, left: pad + Math.round(fit.cx * f.side - pw / 2), top: pad + Math.round(fit.top * f.side) },
    ])
    .png()
    .toBuffer()
  return sharp(canvas)
    .extract({ left: pad + f.left, top: pad + f.top, width: f.m.width, height: f.m.height })
    .png()
    .toBuffer()
}

async function propExport(slug, tag) {
  const { out } = propSource(slug)
  const png = await propSprite(slug, tag)
  const buf = await sharp(png).webp({ quality: 88, alphaQuality: 92, effort: 6 }).toBuffer()
  await writeFile(out, buf)
  return `${path.relative(ROOT, out)} ${Math.round(buf.length / 1024)}KB`
}

// ── main ──
const [cmd, target, ...rest] = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = rest.indexOf(`--${name}`)
  return i >= 0 && rest[i + 1] ? rest[i + 1] : fallback
}
const USAGE = '사용: stage-painted.mjs pano|unlit|altar|qa|export <테마 코드> · prop|prop-export <신물 slug> [--tag …]'
if (!target || !/^[a-z][a-z0-9-]{0,40}$/.test(target)) {
  console.error(USAGE)
  process.exit(1)
}
if (cmd === 'prop' || cmd === 'prop-export') {
  if (cmd === 'prop') console.log(`  ✔ ${await prop(target, flag('tag', 'p1'))}`)
  else console.log(`  ✔ ${await propExport(target, flag('tag', 'p1'))}`)
} else {
  if (!THEMES[target] || !existsSync(path.join(STAGE_DIR, target))) {
    console.error(`테마 표에 없는 코드: ${target}\n${USAGE}`)
    process.exit(1)
  }
  await mkdir(path.join(SRC, target), { recursive: true })
  if (cmd === 'pano') console.log(`  ✔ ${await pano(target, flag('tag', 'r1'))}`)
  else if (cmd === 'unlit') console.log(`  ✔ ${await unlit(target, flag('from', 'r1'), flag('tag', 'u1'))}`)
  else if (cmd === 'altar') console.log(`  ✔ ${await altar(target, flag('tag', 'a1'))}`)
  else if (cmd === 'qa')
    console.log(`  ✔ ${await qa(target, flag('lit', 'r1'), flag('unlit', 'u1'), flag('altar', 'a1'))}`)
  else if (cmd === 'export') {
    for (const line of await exportAll(target, flag('lit', 'r1'), flag('unlit', 'u1'), flag('altar', 'a1')))
      console.log(`  ✔ ${line}`)
  } else {
    console.error(USAGE)
    process.exit(1)
  }
}
