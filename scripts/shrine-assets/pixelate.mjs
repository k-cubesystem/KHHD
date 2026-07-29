// 픽셀화 후처리 유틸 — 어떤 그림이든 16-bit 도트 격자로 정규화한다 (PRD-shrine-gamefeel §안4).
//
// 파이프라인 3단: ①다운스케일(도트 격자 확정) → ②팔레트 감색(미디언컷, 디더 없음) → ③nearest 업스케일
//   ① 다운스케일 커널은 mitchell 기본 — lanczos 의 링잉이 감색 후 점박이로 남는다.
//   ② 감색은 미디언컷 자체 구현. sharp 의 png palette 옵션(libimagequant)은 디더가 기본이라
//      도트 아트에 노이즈를 넣고, 빌드 바이너리에 따라 유무가 갈린다. 새 의존성은 설치하지 않는다.
//   ③ 업스케일은 nearest + webp lossless — 하나라도 어기면 픽셀 경계가 뭉개진다.
//
// 알파는 **이진화**한다(부분알파 금지). 도트 아트는 가장자리가 딱 떨어져야 하고,
// 소프트 매트를 남기면 확대 시 반투명 테가 격자를 흐린다.
//
// 사용:
//   node scripts/shrine-assets/pixelate.mjs <in> <out> [--px 112] [--colors 24] [--scale 5]
//   추가 옵션: --px-h <n> (세로 격자 고정) --fit cover|contain|inside --sat 1.15
//              --alpha-cut 128 --kernel mitchell|cubic|lanczos3|nearest
//
// 모듈로도 쓴다: import { pixelate } from './pixelate.mjs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import sharp from 'sharp'

// 퍼셉추얼 가중(녹색 민감). 축 선택·최근접 매칭 양쪽에 같은 가중을 쓴다.
const W = [2, 4, 3]
// 완전 투명 픽셀의 RGB — 신당 배경색(#1a1308). 다른 스크립트와 같은 값으로 맞춘다.
const VOID_RGB = [0x1a, 0x13, 0x08]

export const DEFAULTS = {
  px: 112, // 가로 도트 수
  pxH: null, // 세로 도트 수(지정 시 격자 고정)
  colors: 24,
  scale: 5,
  fit: null, // 기본: pxH 있으면 cover, 없으면 inside(비율 유지)
  sat: 1, // 감색 전 채도 보정(1 = 무보정)
  alphaCut: 128,
  kernel: 'mitchell',
}

function makeBox(pts) {
  const min = [255, 255, 255]
  const max = [0, 0, 0]
  const sum = [0, 0, 0]
  for (const p of pts) {
    for (let c = 0; c < 3; c++) {
      if (p[c] < min[c]) min[c] = p[c]
      if (p[c] > max[c]) max[c] = p[c]
      sum[c] += p[c]
    }
  }
  let axis = 0
  let range = -1
  for (let c = 0; c < 3; c++) {
    const r = (max[c] - min[c]) * W[c]
    if (r > range) {
      range = r
      axis = c
    }
  }
  const n = pts.length || 1
  return {
    pts,
    axis,
    range,
    mean: [Math.round(sum[0] / n), Math.round(sum[1] / n), Math.round(sum[2] / n)],
  }
}

/** 미디언컷 감색 — 가장 "넓고 인구 많은" 상자를 중앙값에서 쪼갠다. 디더링 없음(플랫 도트). */
function medianCut(pts, maxColors) {
  if (!pts.length) return [[...VOID_RGB]]
  const boxes = [makeBox(pts)]
  while (boxes.length < maxColors) {
    let bi = -1
    let best = 0
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i]
      if (b.pts.length < 2 || b.range <= 0) continue
      const score = b.range * Math.cbrt(b.pts.length)
      if (score > best) {
        best = score
        bi = i
      }
    }
    if (bi < 0) break
    const b = boxes[bi]
    const ax = b.axis
    const sorted = b.pts.slice().sort((p, q) => p[ax] - q[ax])
    const mid = sorted.length >> 1
    boxes.splice(bi, 1, makeBox(sorted.slice(0, mid)), makeBox(sorted.slice(mid)))
  }
  return boxes.map((b) => b.mean)
}

function nearestIndex(palette, r, g, b) {
  let bi = 0
  let bd = Infinity
  for (let i = 0; i < palette.length; i++) {
    const p = palette[i]
    const dr = r - p[0]
    const dg = g - p[1]
    const db = b - p[2]
    const d = W[0] * dr * dr + W[1] * dg * dg + W[2] * db * db
    if (d < bd) {
      bd = d
      bi = i
    }
  }
  return bi
}

/**
 * @param {string|Buffer} input 원본 경로 또는 버퍼
 * @param {Partial<typeof DEFAULTS>} opts
 * @returns {Promise<{basePng:Buffer,baseW:number,baseH:number,webp:Buffer,outW:number,outH:number,palette:number[][],colorsUsed:number,hasAlpha:boolean}>}
 */
export async function pixelate(input, opts = {}) {
  const o = { ...DEFAULTS, ...opts }
  const fit = o.fit || (o.pxH ? 'cover' : 'inside')

  let pipe = sharp(input).resize({
    width: o.px,
    height: o.pxH ?? undefined,
    fit,
    kernel: o.kernel,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  if (o.sat !== 1) pipe = pipe.modulate({ saturation: o.sat })

  const { data, info } = await pipe.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: baseW, height: baseH, channels } = info

  // ① 알파 이진화 (부분알파 제거 — 도트는 가장자리가 딱 떨어져야 한다)
  let opaque = 0
  for (let i = 0; i < data.length; i += channels) {
    const a = data[i + 3] >= o.alphaCut ? 255 : 0
    data[i + 3] = a
    if (a) opaque++
  }
  const hasAlpha = opaque < baseW * baseH

  // ② 감색 — 보이는 픽셀만 히스토그램에 넣는다(투명 영역이 팔레트를 먹지 않게)
  const pts = []
  for (let i = 0; i < data.length; i += channels) {
    if (data[i + 3] === 0) continue
    pts.push([data[i], data[i + 1], data[i + 2]])
  }
  const palette = medianCut(pts, o.colors)
  const cache = new Map()
  const used = new Set()
  for (let i = 0; i < data.length; i += channels) {
    if (data[i + 3] === 0) {
      data[i] = VOID_RGB[0]
      data[i + 1] = VOID_RGB[1]
      data[i + 2] = VOID_RGB[2]
      continue
    }
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2]
    let idx = cache.get(key)
    if (idx === undefined) {
      idx = nearestIndex(palette, data[i], data[i + 1], data[i + 2])
      cache.set(key, idx)
    }
    used.add(idx)
    const p = palette[idx]
    data[i] = p[0]
    data[i + 1] = p[1]
    data[i + 2] = p[2]
  }

  const raw = { raw: { width: baseW, height: baseH, channels } }
  const basePng = await sharp(data, raw).png({ compressionLevel: 9 }).toBuffer()

  // ③ nearest 업스케일 + 무손실 webp (하나라도 어기면 픽셀 경계가 뭉개진다)
  const outW = baseW * o.scale
  const outH = baseH * o.scale
  const webp = await sharp(basePng)
    .resize(outW, outH, { kernel: 'nearest' })
    .webp({ lossless: true, effort: 5 })
    .toBuffer()

  return { basePng, baseW, baseH, webp, outW, outH, palette, colorsUsed: used.size, hasAlpha }
}

// ──────────────────────────── CLI ────────────────────────────
function parseArgs(argv) {
  const positional = []
  const opts = {}
  const map = {
    '--px': ['px', Number],
    '--px-h': ['pxH', Number],
    '--colors': ['colors', Number],
    '--scale': ['scale', Number],
    '--sat': ['sat', Number],
    '--alpha-cut': ['alphaCut', Number],
    '--fit': ['fit', String],
    '--kernel': ['kernel', String],
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (map[a]) {
      const [key, cast] = map[a]
      opts[key] = cast(argv[++i])
    } else if (a.startsWith('--')) {
      throw new Error(`unknown option: ${a}`)
    } else {
      positional.push(a)
    }
  }
  return { positional, opts }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { positional, opts } = parseArgs(process.argv.slice(2))
  const [inPath, outPath] = positional
  if (!inPath || !outPath) {
    console.error('usage: node pixelate.mjs <in> <out> [--px 112] [--colors 24] [--scale 5]')
    process.exit(1)
  }
  const r = await pixelate(inPath, opts)
  await mkdir(path.dirname(outPath), { recursive: true })
  await writeFile(outPath, r.webp)
  console.log(
    `✔ ${path.basename(outPath)}  격자 ${r.baseW}×${r.baseH} → ${r.outW}×${r.outH}` +
      `  팔레트 ${r.colorsUsed}색  ${(r.webp.length / 1024).toFixed(1)}KB${r.hasAlpha ? '  (알파)' : ''}`
  )
}
