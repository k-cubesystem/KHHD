// 신당 무대 ⑦ 「캐릭터 화풍 시네마틱」 — 파노라마(빛·그늘 두 판)·대제단 생성과 수출
//
// ── 왜 (2026-09-23 대표 결정) ────────────────────────────────────────────────
// 「그림 퀄리티와 구도가 옛날 스타일」. 파일럿(D:/anti/shrine-style-explore/pilot-banga)에서 사진풍 방은
// 웹툰 화풍 신위를 스티커로 만들었다 — 그래서 **방을 캐릭터에 맞춘다**: 신위 스프라이트와 같은 붓으로
// 방을 다시 그리고, 빛·연무·그림자만 시네마틱하게. 대표가 고른 결: ⑦ 화풍 · 감실 뒤 빛나는 창호 ·
// 제단 이동·크기 조절 유지(«두 바닥 마스크»).
//
// ── 파일럿이 박은 규칙 (이 스크립트의 프롬프트가 지키는 것) ───────────────────
//   ① 숫자로 구도를 지시하면 무시된다 → **현행 파노라마를 구도 참조로 묶는다**(기둥·문·수평선 유지).
//   ② 물건용 빛 문구에 광원의 모양(창호)을 쓰면 그 모양을 물건에 그려 넣는다 → 제단은 «빛의 방향»만.
//   ③ 화풍 기준은 대표가 승인한 ⑦ 한 장(painted-scene.png) 하나다 — 조각마다 붙인다.
//   ④ 빛 판·그늘 판은 **같은 그림에서 한 가지만 바꿔** 받는다(바닥 직사광 유무). 두 판의 널 이음매가
//      겹쳐야 마스크 경계가 안 보인다.
//
// ── 두 바닥 마스크 ─────────────────────────────────────────────────────────
// 제단은 한가운데 창호 앞에 선다. 빛 판 바닥의 창살 빛무늬가 제단 밑·앞까지 이어지면 «빛이 제단을
// 뚫고 지나간» 그림이 된다(파일럿 ⑤). 그림자를 덧칠하면 무늬가 비쳐 보인다. 그래서 **직사광 없는
// 바닥 한 장을 더 굽고 제단 자리에서만 마스크로 바꿔 끼운다** — 사용자가 제단을 옮기면 마스크도 따라간다
// (마스크 기하 정본: lib/domain/shrine/theme-stage.ts floorShadeMask).
//
// ── 수출 계약 = 현행 v3 뮤럴과 같은 치수 ──────────────────────────────────
// 원판 16:9·4K(5504×3072) → 가운데 5441 폭 · 수평선 70%(2150행)에서 가른다:
//   벽 [0, 2194) (수평선 아래 44행 = 2% 물림) · 바닥 [2150, 3072)
// 현행 반가 v3 와 픽셀 치수가 같아 렌더(폭 맞춤·접지선 고정)가 한 줄도 달라지지 않는다.
// 파일명은 `-p7-v3.webp` — `-v3.webp` 로 끝나면 `-v3-sd.webp` 형제가 있다는 StageLayers 계약을 그대로 탄다.
// 현행 v3 는 옛 원화 평균색으로 팔레트를 당겼지만(anchorPalette) ⑦ 은 당기지 않는다 — ⑦ 의 금빛이 곧 결정이다.
//
// 산출: public/shrine/stage/{code}/
//   room-wall-mural-p7-v3.webp · room-wall-mural-p7-v3-sd.webp
//   room-floor-mural-p7-v3.webp · room-floor-mural-p7-v3-sd.webp
//   room-floor-shade-p7-v3.webp · room-floor-shade-p7-v3-sd.webp    ← 그늘 판 바닥(두 바닥 마스크)
//   grand-altar-p7.webp                                               ← 감실 창호 빛 · 랜드마크 4줄 현행과 동일
// 원본(생성물)은 저장소 밖 {PAINTED_SRC_DIR}/{code}/ — pano-lit-{tag}.png · pano-unlit-{tag}.png · altar-green-{tag}.png
//
// 사용 (실행 위치: 저장소 루트, 키는 메인 체크아웃 env 로):
//   node --env-file=<메인>/.env.local scripts/shrine-assets/stage-painted.mjs pano banga --tag r2
//   node --env-file=<메인>/.env.local scripts/shrine-assets/stage-painted.mjs unlit banga --from r2 --tag u1
//   node --env-file=<메인>/.env.local scripts/shrine-assets/stage-painted.mjs altar banga --tag a1
//   node scripts/shrine-assets/stage-painted.mjs export banga --lit r2 --unlit u1 --altar a1   # API 0회
import sharp from 'sharp'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const STAGE_DIR = path.join(ROOT, 'public', 'shrine', 'stage')
const SRC = process.env.PAINTED_SRC_DIR || 'D:/anti/shrine-style-explore/painted'
/** 대표가 승인한 ⑦ 한 장 — 모든 조각의 화풍 기준 */
const STYLE_REF = process.env.PAINTED_STYLE_REF || 'D:/anti/shrine-style-explore/pilot-banga/work/painted-scene.png'
/** 파일럿 ⑦ 제단 — 감실 창호 빛(승인안)의 설계 정본 */
const ALTAR_DESIGN_REF =
  process.env.PAINTED_ALTAR_REF || 'D:/anti/shrine-style-explore/pilot-banga/prod/altar-green.png'
const MODEL = process.env.PAINTED_MODEL || 'gemini-3-pro-image'
const API = 'https://generativelanguage.googleapis.com/v1beta'

// ── 수출 치수 (현행 반가 v3 와 동일) ──
const PANO_W = 5504
const PANO_H = 3072
const OUT_W = 5441
const HZ_ROW = 2150
const WALL_BLEED = 44
const SD_W = 2048
/** 대제단 높이(px) — 현행 grand-altar-v2 와 같은 해상도(폰 DPR3 소요 ≈1300 을 덮는다) */
const ALTAR_H = 1456

const NO_TEXT = 'No text, no letters, no characters, no calligraphy, no watermark, no UI, no border.'
const STYLE_RULE =
  'Paint in EXACTLY the illustration style of the STYLE reference: the same clean confident line work, the same soft painterly cel shading, the same warm golden palette, the same paper-like texture, the same cinematic light.'

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

/** 현행 v3 벽(수평선까지) + 바닥을 이어 붙인 파노라마 — ⑦ 파노라마의 구도 참조 */
async function currentPanorama(code) {
  const wall = path.join(STAGE_DIR, code, 'room-wall-mural-v3.webp')
  const floor = path.join(STAGE_DIR, code, 'room-floor-mural-v3.webp')
  const wm = await sharp(wall).metadata()
  const fm = await sharp(floor).metadata()
  return sharp({ create: { width: wm.width, height: HZ_ROW + fm.height, channels: 3, background: '#000' } })
    .composite([
      {
        input: await sharp(wall).extract({ left: 0, top: 0, width: wm.width, height: HZ_ROW }).png().toBuffer(),
        left: 0,
        top: 0,
      },
      { input: await sharp(floor).png().toBuffer(), left: 0, top: HZ_ROW },
    ])
    .png()
    .toBuffer()
}

async function pano(code, tag) {
  const layout = await sharp(await currentPanorama(code))
    .resize(2400)
    .jpeg({ quality: 90 })
    .toBuffer()
  const style = await sharp(STYLE_REF).jpeg({ quality: 92 }).toBuffer()
  const text = [
    'You are given two images. IMAGE 1 is the LAYOUT: a very wide panoramic view of ONE long traditional Korean hall (hanok daecheong), seen straight-on. IMAGE 2 is the STYLE reference.',
    'Repaint the whole panorama of IMAGE 1 at the same size. KEEP IDENTICAL: the camera, the straight-on framing, the position and width of every post, beam, door, window, lattice panel and wall section, the ceiling rafters, and — most important — the exact height of the line where the wall meets the floor (it must stay at the same height across the whole width).',
    STYLE_RULE,
    'Light: warm golden daylight glows through the hanji doors in the CENTER of the hall and throws the door lattice as soft light patches and shadows across the floor in front of those doors. Toward the far left and far right the hall falls into a calm, warmer, softer shade — still clearly readable, never black. A faint warm haze in the air.',
    // r1 반려: 열린 문 두 곳의 정원이 뿌연 벽이 됐다 — 현행 규격이 일부러 연 «개구부 원경»이다
    'The two OPEN doorways (one left of center, one right of center) keep their view out to the sunlit garden exactly as in IMAGE 1: pine trees, a stone lantern, a low stone wall with a tiled coping, shrubs — painted in the same style, bright and airy, clearly outdoors.',
    'Inside the hall, the floor and the walls are completely EMPTY — no altar, no cabinet, no shelf, no table, no furniture, no objects, no figures, no animals. Plain empty wall sections stay plain and empty (they will be furnished later).',
    NO_TEXT,
  ].join('\n\n')
  const buf = await generate([{ text }, inline('image/jpeg', layout), inline('image/jpeg', style)], '16:9', '4K')
  await writeFile(path.join(SRC, code, `pano-lit-${tag}.png`), buf)
  return `pano-lit-${tag}.png`
}

async function unlit(code, from, tag) {
  const lit = await sharp(path.join(SRC, code, `pano-lit-${from}.png`))
    .resize(2752)
    .jpeg({ quality: 92 })
    .toBuffer()
  const text = [
    'Re-paint EXACTLY the attached image at the same size — the identical hall, camera, framing, posts, doors, lattices, rafters, garden views, floor boards and their joints, the identical illustration style and colours.',
    'Change ONE thing only: NO direct sunlight reaches the floor. The whole floor lies in soft, even, calm shade — NO lattice light patches and NO lattice shadows anywhere on the floor. The hanji doors themselves still glow softly and the garden is still bright. The floor keeps the same warm wood colour and the same boards, only evenly and softly lit (slightly darker where the light patches were).',
    NO_TEXT,
  ].join('\n\n')
  const buf = await generate([{ text }, inline('image/jpeg', lit)], '16:9', '4K')
  await writeFile(path.join(SRC, code, `pano-unlit-${tag}.png`), buf)
  return `pano-unlit-${tag}.png`
}

async function altar(code, tag) {
  const design = await readFile(ALTAR_DESIGN_REF)
  const style = await sharp(STYLE_REF).jpeg({ quality: 92 }).toBuffer()
  const text = [
    'You are given two images. IMAGE 1 is the OBJECT to paint. IMAGE 2 is the STYLE reference.',
    'Paint EXACTLY the object of IMAGE 1 again, larger and with finer detail — the same design, the same proportions, the same parts in the same places: the two-tier palace-style canopy roof with carved brackets, the open alcove with the softly glowing latticed hanji window at its back, the carved valance at the top of the alcove, the chest of drawers with mother-of-pearl floral inlay and brass handles, the long offering table with upturned ends and the openwork carved apron, the four legs. Keep the heights of the alcove floor, the table top and the feet exactly where they are in IMAGE 1.',
    'Front straight-on view, the whole object fully inside the frame with a small margin on every side. The alcove is EMPTY — no figure, no statue inside.',
    STYLE_RULE,
    // 물건용 빛 — 광원의 «모양»은 말하지 않는다(파일럿 교훈 ②)
    'Lighting: a warm golden key light from BEHIND and slightly ABOVE, painting a soft bright rim along the top and back edges, with a weak cool fill from the front.',
    'Fully isolated on a perfectly flat, uniform, pure bright green (#00FF00) background filling the ENTIRE frame — no walls, no windows outside the object, no floor, no surface, no scenery, no shadow of any kind on the background.',
    NO_TEXT,
  ].join('\n\n')
  const buf = await generate([{ text }, inline('image/png', design), inline('image/jpeg', style)], '3:4', '2K')
  await writeFile(path.join(SRC, code, `altar-green-${tag}.png`), buf)
  return `altar-green-${tag}.png`
}

/** 초록 키잉 + 가장자리 스필 억제(chroma.mjs 규칙) */
async function keyGreen(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
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
  const band = async (file, top, height) => {
    const meta = await sharp(file).metadata()
    if (meta.width !== PANO_W || meta.height !== PANO_H)
      throw new Error(`원판 치수 ${meta.width}×${meta.height} ≠ ${PANO_W}×${PANO_H}: ${file}`)
    return sharp(file)
      .extract({ left: Math.round((PANO_W - OUT_W) / 2), top, width: OUT_W, height })
      .png()
      .toBuffer()
  }
  const lit = path.join(SRC, code, `pano-lit-${litTag}.png`)
  const shade = path.join(SRC, code, `pano-unlit-${unlitTag}.png`)
  const bands = {
    'room-wall-mural-p7': await band(lit, 0, HZ_ROW + WALL_BLEED),
    'room-floor-mural-p7': await band(lit, HZ_ROW, PANO_H - HZ_ROW),
    'room-floor-shade-p7': await band(shade, HZ_ROW, PANO_H - HZ_ROW),
  }
  const report = []
  for (const [name, buf] of Object.entries(bands)) {
    const hi = await webp(buf, null, 80)
    const sd = await webp(buf, SD_W, 78)
    await writeFile(path.join(dir, `${name}-v3.webp`), hi)
    await writeFile(path.join(dir, `${name}-v3-sd.webp`), sd)
    report.push(`${name}-v3 ${Math.round(hi.length / 1024)}KB · sd ${Math.round(sd.length / 1024)}KB`)
  }
  // 제단 — 키잉 → 트림(바닥 행 = 그려진 접지) → 현행과 같은 높이
  const keyed = await keyGreen(path.join(SRC, code, `altar-green-${altarTag}.png`))
  const trimmed = await sharp(keyed).trim({ threshold: 1 }).png().toBuffer()
  const altarBuf = await sharp(trimmed)
    .resize(null, ALTAR_H, { kernel: 'lanczos3' })
    .webp({ quality: 86, alphaQuality: 90, effort: 6 })
    .toBuffer()
  await writeFile(path.join(dir, 'grand-altar-p7.webp'), altarBuf)
  const am = await sharp(altarBuf).metadata()
  report.push(
    `grand-altar-p7 ${am.width}×${am.height} (비 ${(am.width / am.height).toFixed(4)}) ${Math.round(altarBuf.length / 1024)}KB`
  )
  return report
}

// ── main ──
const [cmd, code, ...rest] = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = rest.indexOf(`--${name}`)
  return i >= 0 && rest[i + 1] ? rest[i + 1] : fallback
}
if (!code || !/^[a-z][a-z0-9-]{0,30}$/.test(code) || !existsSync(path.join(STAGE_DIR, code))) {
  console.error('사용: stage-painted.mjs pano|unlit|altar|export <테마 코드> [--tag …]')
  process.exit(1)
}
await mkdir(path.join(SRC, code), { recursive: true })
if (cmd === 'pano') console.log(`  ✔ ${await pano(code, flag('tag', 'r1'))}`)
else if (cmd === 'unlit') console.log(`  ✔ ${await unlit(code, flag('from', 'r1'), flag('tag', 'u1'))}`)
else if (cmd === 'altar') console.log(`  ✔ ${await altar(code, flag('tag', 'a1'))}`)
else if (cmd === 'export') {
  for (const line of await exportAll(code, flag('lit', 'r1'), flag('unlit', 'u1'), flag('altar', 'a1')))
    console.log(`  ✔ ${line}`)
} else {
  console.error('사용: stage-painted.mjs pano|unlit|altar|export <테마 코드>')
  process.exit(1)
}
