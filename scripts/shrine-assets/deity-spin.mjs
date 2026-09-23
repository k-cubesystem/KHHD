// 신당 신위 «탭 한 바퀴» 영상 등급 — Veo 회전 영상 생성(gen) · 스프라이트 시트 굽기(sheet)
//
// ── 왜 영상인가 (2026-09-23 CEO 「터치하면 한 바퀴 도는 모습도 실제 애니메이션처럼」)
// 종전 회전(deity-turnaround.mjs)은 굽은 자세 넷을 45° 마다 갈아 끼우고 뒤 반 바퀴는 좌우 반전으로
// 때웠다. 초당 6장이라 «그림 교체»로 읽혔고, 반전 탓에 소지품이 반대 손으로 넘어갔다.
// 영상 모델은 제자리 한 바퀴를 **진짜 뒷모습·옷자락 뒤따름**까지 찍어 준다. 그 프레임에서 칸을 골라
// 시트 한 장으로 굽고, 재생은 lib/domain/shrine/deity-spin.ts 타임라인이 맡는다.
//
// ── gen: 회전 영상
// 첫 프레임 = 정면 스프라이트(base.webp)를 초록 배경에 세운 그림. **끝 프레임도 같은 그림**으로 묶고
// 8초를 준다 — 묶지 않으면 느린 신위가 한 바퀴를 못 채우고 끝나거나(6초 시범 실측) 되감기를 한다.
// 동반물(백마·호랑이·족제비)과 소지품은 «한 덩어리로 돈다»를 따로 적는다 — 안 적으면 사람만 돌고
// 말은 걸어 나가거나, 칼·창을 떨어뜨린다. 옆모습이 길어지는 신위는 가로판(16:9)에서 돌린다.
//
// ── sheet: 영상 → 시트(칸 44개) + 규격(spin.json)
//   예비 6칸  — 한 바퀴 직전 자세(정면에서 반대로 살짝 돈 모습)로 비틀었다 푼다
//   회전 33칸 — 움직이기 시작한 프레임 ~ 한 바퀴 직전(≈ −15°). 프레임 간 변화량의 누적(바닥값을 둔)
//              으로 고른다. 영상이 멈칫한 구간(뒷모습에서 쉬기)은 줄고 제 속도 구간은 그대로 남는다
//   착지 5칸  — 한 바퀴 직전 → 정면 도착을 감속으로 잇고, 뒤 세 칸은 정면 스프라이트로 녹아든다.
//              다음 순간 서는 것은 원본 해상도의 <img> 그 자체라 캔버스가 걷혀도 튀지 않는다
// 정면 그대로인 순간(시작 전·착지 뒤)은 시트에 넣지 않는다 — <img> 가 더 선명하고 칸도 준다.
// 한 바퀴의 끝은 «정면 프레임과의 차이»로 잰다(뒷모습 = 가장 다른 프레임, 그 뒤 처음 18% 밑 = 직전,
// 7% 밑 = 도착). 도착한 뒤 몸짓을 하는 신위(동자 — 종이학을 든다)는 차이가 다시 커져 판정이 늦게
// 잡힌다 → 육안 검수 후 OVERRIDES 에 프레임 번호를 박는다(검수 인화: {SRC}/qa/{code}.png).
//
// ── 산출(배선 계약 — DB 갱신 없음)
//   public/shrine/deities/{code}/spin.webp  시트(투명)
//   public/shrine/deities/{code}/spin.json  규격(DeitySpinManifest — 형식의 정본은 deity-spin.ts)
// 두 파일이 있으면 DeityTurn 이 스스로 영상 등급으로 올라선다. 없으면 종전 등급 그대로다.
// 원본 영상·검수 인화는 저장소 밖(SPIN_SRC_DIR, 기본 D:/anti/shrine-style-explore/spin-proto)에 둔다.
//
// 사용 (실행 위치: 저장소 루트):
//   node --env-file=<메인 체크아웃>/.env.local scripts/shrine-assets/deity-spin.mjs gen baekma sansin
//   node scripts/shrine-assets/deity-spin.mjs sheet            # 전 신위
//   node scripts/shrine-assets/deity-spin.mjs sheet dongja     # 한 신위만
import sharp from 'sharp'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { DEITIES } from './manifest.mjs'

const ROOT = path.resolve(import.meta.dirname, '../..')
const DEITY_DIR = path.join(ROOT, 'public', 'shrine', 'deities')
const SRC = process.env.SPIN_SRC_DIR || 'D:/anti/shrine-style-explore/spin-proto'

// ────────────────────────────── 공통 ──────────────────────────────

const lf8Dir = (code) => `${SRC}/deities/${code}-lf8`
/** 6초·끝 프레임 미고정으로 찍은 시범 2종 — 검수를 통과한 영상이라 다시 찍지 않았다 */
const LEGACY_VIDEO = {
  seongju: `${SRC}/seongju-veo.mp4`,
  eopsin: `${SRC}/deities/eopsin/spin.mp4`,
}
function videoOf(code) {
  const v = `${lf8Dir(code)}/spin.mp4`
  return existsSync(v) ? v : (LEGACY_VIDEO[code] ?? v)
}

/** 옆모습이 길어지는 신위 — 가로판에서 돌린다(세로판이면 말·호랑이·언월도가 화면 밖으로 나간다) */
const WIDE = new Set(['baekma', 'sansin', 'gwanseong'])

// ────────────────────────────── gen ──────────────────────────────

const VEO_MODEL = process.env.VEO_MODEL || 'veo-3.1-fast-generate-preview'
const API = 'https://generativelanguage.googleapis.com/v1beta'
/** 동시 작업 상한 — 7건째부터 HTTP 429(2026-09-23 실측) */
const VEO_CONCURRENCY = 6

/** 동반물·소지품 — 모델이 사람만 돌리거나 물건을 떨어뜨리지 않게(외형 정본: manifest.mjs) */
const COMPANION = {
  baekma:
    'The general and the white horse standing beside him turn around together in place as ONE group, like figures on a rotating turntable — the horse never walks away and stays right beside him.',
  sansin:
    'The old sage and the baby white tiger beside him turn around together in place as ONE group, like figures on a rotating turntable — the tiger stays right beside him.',
  eopsin: 'The small white weasel stays sitting on her shoulder the whole time and turns with her.',
  okhwang:
    'The small clouds under his feet stay under his feet and turn with him; he keeps holding the golden scepter.',
  gwanseong: 'He keeps holding the long green-dragon glaive upright at his side the whole time; it turns with him.',
  dokkaebi: 'He keeps holding the spiked club the whole time.',
  choiyoung: 'He keeps holding the long sword and the helmet the whole time.',
}

function spinPrompt(code) {
  return [
    "The character turns around in place, rotating one full 360-degree turn toward the viewer's right at a smooth steady speed, and finishes facing the camera again exactly as at the start.",
    COMPANION[code] ?? '',
    'The feet stay planted on the same spot and the body stays centered in the frame the whole time.',
    'The camera is completely still — no pan, no zoom, no cut.',
    'The robe, sleeves, hair and ribbons swing gently with the turn and settle at the end.',
    'Keep the exact same character, face, outfit, colours and illustration style.',
    'The background stays a perfectly flat, uniform, pure bright green the entire time — no shadows, no floor, no scenery, no lighting change.',
    'No other characters, no text.',
  ]
    .filter(Boolean)
    .join(' ')
}

/** 첫(=끝) 프레임 — 키 70% 이하, 폭은 세로판 80%·가로판 40%(회전 여유) 이하, 발은 86% 줄 */
async function firstFrame(code) {
  const wide = WIDE.has(code)
  const FW = wide ? 1280 : 720
  const FH = wide ? 720 : 1280
  const base = await sharp(path.join(DEITY_DIR, code, 'base.webp'))
    .trim({ threshold: 1 })
    .toBuffer({ resolveWithObject: true })
  const aspect = base.info.width / base.info.height
  const figH = Math.round(Math.min(FH * 0.7, (FW * (wide ? 0.4 : 0.8)) / aspect))
  const fig = await sharp(base.data).resize(null, figH).png().toBuffer()
  const { width: figW } = await sharp(fig).metadata()
  const png = await sharp({ create: { width: FW, height: FH, channels: 3, background: { r: 0, g: 255, b: 0 } } })
    .composite([{ input: fig, left: Math.round((FW - figW) / 2), top: Math.round(FH * 0.86) - figH }])
    .png()
    .toBuffer()
  return { png, aspectRatio: wide ? '16:9' : '9:16' }
}

async function genOne(code, key) {
  const dir = lf8Dir(code)
  await mkdir(dir, { recursive: true })
  const { png, aspectRatio } = await firstFrame(code)
  await writeFile(`${dir}/first-frame.png`, png)
  const frame = { bytesBase64Encoded: png.toString('base64'), mimeType: 'image/png' }
  const res = await fetch(`${API}/models/${VEO_MODEL}:predictLongRunning`, {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt: spinPrompt(code), image: frame, lastFrame: frame }],
      parameters: { aspectRatio, durationSeconds: 8 },
    }),
  })
  const job = await res.json()
  if (!res.ok) throw new Error(`${code} 시작 실패 HTTP ${res.status} ${JSON.stringify(job).slice(0, 200)}`)
  console.log(`  ▶ ${code.padEnd(10)} ${aspectRatio}`)
  for (let i = 0; i < 72; i += 1) {
    await new Promise((r) => setTimeout(r, 10_000))
    const op = await (await fetch(`${API}/${job.name}`, { headers: { 'x-goog-api-key': key } })).json()
    if (!op.done) continue
    if (op.error) throw new Error(`${code} 생성 실패: ${JSON.stringify(op.error).slice(0, 200)}`)
    const uri = op.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri
    if (!uri) throw new Error(`${code} 영상 주소 없음: ${JSON.stringify(op).slice(0, 200)}`)
    const video = await fetch(uri, { headers: { 'x-goog-api-key': key } })
    await writeFile(`${dir}/spin.mp4`, Buffer.from(await video.arrayBuffer()))
    console.log(`  ✔ ${code.padEnd(10)} → ${dir}/spin.mp4`)
    return
  }
  throw new Error(`${code} 12분 초과`)
}

async function gen(codes) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!key) throw new Error('Gemini 키 없음 — node --env-file=<메인 체크아웃>/.env.local 로 실행')
  for (let i = 0; i < codes.length; i += VEO_CONCURRENCY) {
    const batch = await Promise.allSettled(codes.slice(i, i + VEO_CONCURRENCY).map((c) => genOne(c, key)))
    for (const r of batch) if (r.status === 'rejected') console.error(`  ✘ ${r.reason.message}`)
  }
}

// ────────────────────────────── sheet ──────────────────────────────

/** 칸 안 정면 인물 키(px) — 시트 무게를 정하는 값이다 */
const CELL_BASE_H = Number(process.env.SPIN_CELL_H || 300)
const FPS = 25
/** 예비 동작 — 1 이 한 바퀴 직전 자세(도착에서 거꾸로 되짚은 깊이) */
const ANTIC_DEPTH = [0.5, 0.85, 1, 0.85, 0.5, 0.15]
/** 회전 칸 수 — 1.32초. 종전 회전(1.3초)과 같은 길이다 */
const SPIN_CELLS = 33
/** 착지 칸별 정면 스프라이트 섞는 비율 — 그다음 표시 프레임이 정지 스프라이트(= 1) */
const LAND_BASE_MIX = [0, 0, 0.25, 0.5, 0.75]
/** 멈칫 구간을 얼마나 줄일지 — 프레임 간 변화량의 바닥(회전 구간 중앙값 대비) */
const STEP_FLOOR = 0.35
const SHEET_MAX_W = 4096

/**
 * 육안 검수로 박은 구간(영상 프레임 번호, 0 부터). turnEnd = 한 바퀴 직전(≈ −15°), arrive = 정면 도착.
 * 자동 판정이 몸짓·멈칫에 속은 신위만 적는다 — 근거를 한 줄씩 남길 것.
 */
const OVERRIDES = {
  // 135 에 정면 도착 후 종이학을 들어 올리는 몸짓 — 정면 차이가 다시 커져 자동 판정이 163 까지 밀렸다
  dongja: { turnEnd: 130, arrive: 136 },
}

function ffprobeSize(file) {
  const out = execFileSync('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height',
    '-of',
    'csv=p=0',
    file,
  ])
  const [w, h] = out.toString().trim().split(',').map(Number)
  return { W: w, H: h }
}

/** 전 프레임의 64×64 흑백 축소본 — 구간 판정용 */
function thumbnails(file) {
  const raw = execFileSync(
    'ffmpeg',
    ['-v', 'error', '-i', file, '-vf', 'scale=64:64:flags=area,format=gray', '-f', 'rawvideo', '-'],
    {
      maxBuffer: 1 << 28,
    }
  )
  const size = 64 * 64
  return Array.from({ length: raw.length / size }, (_, i) => raw.subarray(i * size, (i + 1) * size))
}

/** 고른 프레임만 원본 해상도 RGB 로 — select 필터 한 번(프레임 번호 오름차순으로 나온다) */
function fullFrames(file, indices, W, H) {
  const sorted = [...new Set(indices)].sort((a, b) => a - b)
  const expr = sorted.map((i) => `eq(n\\,${i})`).join('+')
  const raw = execFileSync(
    'ffmpeg',
    [
      '-v',
      'error',
      '-i',
      file,
      '-vf',
      `select='${expr}'`,
      '-fps_mode',
      'passthrough',
      '-f',
      'rawvideo',
      '-pix_fmt',
      'rgb24',
      '-',
    ],
    {
      maxBuffer: 1 << 30,
    }
  )
  const size = W * H * 3
  if (raw.length !== size * sorted.length) throw new Error(`프레임 수 불일치: ${raw.length / size} ≠ ${sorted.length}`)
  return new Map(sorted.map((idx, k) => [idx, raw.subarray(k * size, (k + 1) * size)]))
}

const meanDiff = (a, b) => {
  let s = 0
  for (let i = 0; i < a.length; i += 1) s += Math.abs(a[i] - b[i])
  return s / a.length
}

/**
 * 구간 판정 — head(움직이기 직전) · turnEnd(한 바퀴 직전) · arrive(정면 도착).
 * 정면(0번)과의 차이 d 로 잰다: 뒷모습 = 앞 70% 에서 가장 다른 프레임, 그 뒤 처음 18% 밑 = 직전, 7% 밑 = 도착.
 */
function segment(th, override) {
  const d = th.map((t) => meanDiff(th[0], t))
  const step = th.map((t, i) => (i ? meanDiff(th[i - 1], t) : 0))
  const n = th.length
  let peak = 1
  for (let i = 1; i < Math.floor(n * 0.7); i += 1) if (d[i] > d[peak]) peak = i
  /** 처음으로 비율 밑에 드는 프레임 — 끝까지 못 들면 그 구간에서 정면에 가장 가까운 프레임 */
  const firstAfter = (from, ratio) => {
    let best = from
    for (let i = from; i < n; i += 1) {
      if (d[i] < d[peak] * ratio) return i
      if (d[i] < d[best]) best = i
    }
    return best
  }
  let head = 0
  while (head + 1 < peak && d[head + 1] <= d[peak] * 0.03) head += 1
  const turnEnd = override?.turnEnd ?? firstAfter(peak + 1, 0.18)
  const arrive = override?.arrive ?? Math.max(turnEnd + 1, firstAfter(turnEnd, 0.07))
  if (!(head < turnEnd && turnEnd < arrive && arrive < n))
    throw new Error(`구간 판정 실패 head ${head} · turnEnd ${turnEnd} · arrive ${arrive} · n ${n}`)
  return { d, step, peak, head, turnEnd, arrive, n }
}

/** 회전 칸 — 바닥을 둔 변화량 누적을 균등 분할. 멈칫(변화 ≈0)은 바닥 속도로 줄고, 제 속도 구간은 그대로다 */
function spinPicks({ step, head, turnEnd }) {
  const moving = step.slice(head + 1, turnEnd + 1).sort((a, b) => a - b)
  const floor = moving[Math.floor(moving.length / 2)] * STEP_FLOOR
  const acc = [0]
  for (let i = head + 1; i <= turnEnd; i += 1) acc.push(acc[acc.length - 1] + Math.max(step[i], floor))
  const total = acc[acc.length - 1]
  return Array.from({ length: SPIN_CELLS }, (_, k) => {
    const target = (k / (SPIN_CELLS - 1)) * total
    const j = acc.findIndex((v) => v >= target - 1e-9)
    return head + j
  })
}

/** 초록 키잉 + 가장자리 스필 억제 → RGBA */
function keyGreen(rgb) {
  const out = Buffer.alloc((rgb.length / 3) * 4)
  for (let i = 0, o = 0; i < rgb.length; i += 3, o += 4) {
    const r = rgb[i]
    let g = rgb[i + 1]
    const b = rgb[i + 2]
    let a = 255
    if (g > 90 && g - r > 60 && g - b > 60) a = 0
    else if (g - r > 12 && g - b > 12) {
      if (g - r > 35 && g - b > 35) a = Math.round(a * 0.4)
      g = Math.min(g, Math.round((r + b) / 2) + 6)
    }
    out[o] = r
    out[o + 1] = g
    out[o + 2] = b
    out[o + 3] = a
  }
  return out
}

function alphaBox(rgba, W, H, threshold) {
  let x0 = W
  let y0 = H
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (rgba[(y * W + x) * 4 + 3] <= threshold) continue
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
  }
  return { x0, y0, x1, y1 }
}

/** 곧은 알파 두 장을 미리곱 공간에서 섞는다(w = b 쪽 비율) — 반투명 가장자리가 검게 뜨지 않는다 */
function mixRgba(a, b, w) {
  const out = Buffer.alloc(a.length)
  for (let i = 0; i < a.length; i += 4) {
    const wa = a[i + 3] * (1 - w)
    const wb = b[i + 3] * w
    const al = wa + wb
    out[i + 3] = Math.round(al)
    if (al > 0) for (let c = 0; c < 3; c += 1) out[i + c] = Math.round((a[i + c] * wa + b[i + c] * wb) / al)
  }
  return out
}

async function sheetOne(code) {
  const file = videoOf(code)
  if (!existsSync(file)) throw new Error(`${code} 영상 없음: ${file} — 먼저 gen`)
  const { W, H } = ffprobeSize(file)
  const seg = segment(thumbnails(file), OVERRIDES[code])
  const { head, turnEnd, arrive } = seg

  // ① 칸마다 [영상 프레임, 정면 섞기 비율]
  const at = (depth) => Math.round(arrive - depth * (arrive - turnEnd))
  const antic = ANTIC_DEPTH.map((depth) => ({ idx: at(depth), base: 0 }))
  const spin = spinPicks(seg).map((idx) => ({ idx, base: 0 }))
  // 착지 — 직전 → 도착을 감속(1−(1−u)²)으로 잇는다. 도착은 그다음 표시 프레임의 정지 스프라이트 몫이다
  const land = LAND_BASE_MIX.map((base, k) => {
    const u = (k + 1) / (LAND_BASE_MIX.length + 1)
    return { idx: Math.round(turnEnd + (arrive - turnEnd) * (1 - (1 - u) ** 2)), base }
  })
  const cells = [...antic, ...spin, ...land]

  // ② 원본 프레임 키잉 → 공통 상자(전 칸 합집합 + 정면 상자)
  const frames = fullFrames(file, cells.map((c) => c.idx).concat(head), W, H)
  const keyed = new Map([...frames].map(([i, rgb]) => [i, keyGreen(rgb)]))
  const baseBox = alphaBox(keyed.get(head), W, H, 128)
  let U = { ...baseBox }
  for (const rgba of keyed.values()) {
    const b = alphaBox(rgba, W, H, 24)
    U = { x0: Math.min(U.x0, b.x0), y0: Math.min(U.y0, b.y0), x1: Math.max(U.x1, b.x1), y1: Math.max(U.y1, b.y1) }
  }
  const PAD = 6
  const crop = { left: Math.max(0, U.x0 - PAD), top: Math.max(0, U.y0 - PAD) }
  crop.width = Math.min(W, U.x1 + PAD + 1) - crop.left
  crop.height = Math.min(H, U.y1 + PAD + 1) - crop.top

  // ③ 배율 — 정면 상자 키가 CELL_BASE_H 가 되게
  const k = CELL_BASE_H / (baseBox.y1 - baseBox.y0 + 1)
  const frameW = Math.round(crop.width * k)
  const frameH = Math.round(crop.height * k)
  const box = {
    x: (baseBox.x0 - crop.left) * k,
    y: (baseBox.y0 - crop.top) * k,
    w: (baseBox.x1 - baseBox.x0 + 1) * k,
    h: (baseBox.y1 - baseBox.y0 + 1) * k,
  }

  // 정면 스프라이트 칸 — base.webp 를 정면 상자 자리에 그대로 앉힌다
  const baseSprite = await sharp(path.join(DEITY_DIR, code, 'base.webp'))
    .resize(Math.round(box.w), Math.round(box.h), { fit: 'fill' })
    .png()
    .toBuffer()
  const baseCell = await sharp({
    create: { width: frameW, height: frameH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: baseSprite, left: Math.round(box.x), top: Math.round(box.y) }])
    .raw()
    .toBuffer()
  const videoCell = async (idx) =>
    sharp(keyed.get(idx), { raw: { width: W, height: H, channels: 4 } })
      .extract(crop)
      .resize(frameW, frameH, { fit: 'fill' })
      .raw()
      .toBuffer()

  const rendered = []
  for (const c of cells)
    rendered.push(c.base ? mixRgba(await videoCell(c.idx), baseCell, c.base) : await videoCell(c.idx))

  // ④ 시트 — 가로 SHEET_MAX_W 안에서 줄바꿈
  const cols = Math.min(cells.length, Math.floor(SHEET_MAX_W / frameW))
  const rows = Math.ceil(cells.length / cols)
  const sheet = await sharp({
    create: { width: cols * frameW, height: rows * frameH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(
      rendered.map((buf, i) => ({
        input: buf,
        raw: { width: frameW, height: frameH, channels: 4 },
        left: (i % cols) * frameW,
        top: Math.floor(i / cols) * frameH,
      }))
    )
    .png()
    .toBuffer()
  const outDir = path.join(DEITY_DIR, code)
  await sharp(sheet).webp({ quality: 70, alphaQuality: 70, effort: 6 }).toFile(path.join(outDir, 'spin.webp'))
  const r2 = (v) => Math.round(v * 100) / 100
  const manifest = {
    version: 1,
    frameW,
    frameH,
    cols,
    count: cells.length,
    anticEnd: antic.length,
    spinEnd: antic.length + spin.length,
    fps: FPS,
    baseX: r2(box.x),
    baseY: r2(box.y),
    baseW: r2(box.w),
    baseH: r2(box.h),
  }
  await writeFile(path.join(outDir, 'spin.json'), `${JSON.stringify(manifest, null, 2)}\n`)

  // ⑤ 검수 인화 — 어두운 바탕에 칸 순서대로(저장소 밖)
  await mkdir(`${SRC}/qa`, { recursive: true })
  await sharp(sheet)
    .flatten({ background: '#1d1a17' })
    .resize(Math.min(cols * frameW, 1800))
    .png()
    .toFile(`${SRC}/qa/${code}.png`)

  const kb = Math.round((await sharp(path.join(outDir, 'spin.webp')).toBuffer()).length / 1024)
  const pct = (i) => `${Math.round((seg.d[i] / seg.d[seg.peak]) * 100)}%`
  console.log(
    `  ✔ ${code.padEnd(10)} ${W}×${H} ${seg.n}f · 시작 #${head} · 뒷모습 #${seg.peak} · 직전 #${turnEnd}(${pct(turnEnd)}) · 도착 #${arrive}(${pct(arrive)})` +
      `${OVERRIDES[code] ? ' [수동]' : ''} · 칸 ${frameW}×${frameH} × ${cells.length} → ${cols * frameW}×${rows * frameH} ${kb}KB`
  )
}

// ────────────────────────────── main ──────────────────────────────

const [cmd, ...rest] = process.argv.slice(2)
const known = new Set(DEITIES.map((d) => d.code))
const codes = rest.length ? rest : [...known]
const unknown = codes.filter((c) => !known.has(c))
if (unknown.length) {
  console.error(`모르는 신위: ${unknown.join(', ')}`)
  process.exit(1)
}
if (cmd === 'gen') await gen(codes)
else if (cmd === 'sheet') {
  let failed = 0
  for (const code of codes) {
    try {
      await sheetOne(code)
    } catch (e) {
      failed += 1
      console.error(`  ✘ ${code}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  if (failed) process.exit(1)
} else {
  console.error('사용: deity-spin.mjs gen|sheet [신위 코드…]')
  process.exit(1)
}
