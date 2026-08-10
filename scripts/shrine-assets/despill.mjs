// 황록 스필 처방 (warm despill) — 크로마키·기존 despill 이 못 잡는 잔류 녹색의 파이프라인 처방.
// 기존 조건(g-r>20 && g-b>20, gd=g-max(r,b)>0)은 «초록 우세» 픽셀만 본다. 그린스크린 반사광이
// 자산의 난색과 섞이면 g≈r 이고 b 만 낮은 **황록**(예: rgb(205,208,118), gd≈3)이 되어 전부 통과한다.
// 2026-08-10 살림 스프라이트 4종 픽셀 수술(0f637df)의 처방을 그대로 옮긴 것:
//   hue 50~160° && S > 0.06 (HSL) → hue 를 브랜드 금색 44° 로 회전.
//   알파·명도(L) 보존, 채도는 자산 자가 팔레트(비스필 픽셀) 95퍼센타일로 상한 — 네온 금색 방지.
// ⚠️ 반드시 자산별 opt-in (`despill: 'warm'`) 으로만 쓸 것 — bamboo-green(청죽)·plant-solgaji(솔가지)
//    같은 정상 초록 자산에 일괄 적용하면 초록이 통째로 금색이 되어 자산이 파괴된다.

const HUE_MIN = 50
const HUE_MAX = 160
const SAT_MIN = 0.06
const HUE_GOLD = 44
const PALETTE_ALPHA_MIN = 160
const PALETTE_PCT = 0.95

function rgbToHsl(r, g, b) {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return [0, 0, l]
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60
  else if (max === gn) h = ((bn - rn) / d + 2) * 60
  else h = ((rn - gn) / d + 4) * 60
  return [h, s, l]
}

function hslToRgb(h, s, l) {
  if (s === 0) {
    const v = Math.round(l * 255)
    return [v, v, v]
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const hk = h / 360
  const chan = (t0) => {
    let t = t0
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return [chan(hk + 1 / 3), chan(hk), chan(hk - 1 / 3)].map((v) => Math.round(v * 255))
}

function isWarmSpill(h, s) {
  return h >= HUE_MIN && h <= HUE_MAX && s > SAT_MIN
}

/** 키잉 직후의 raw RGBA 버퍼에 제자리 적용. 반환값은 로그용 {changed, satCap}. */
export function warmDespill(data, channels) {
  const sats = []
  for (let i = 0; i < data.length; i += channels) {
    if (data[i + 3] < PALETTE_ALPHA_MIN) continue
    const [h, s] = rgbToHsl(data[i], data[i + 1], data[i + 2])
    if (isWarmSpill(h, s)) continue
    sats.push(s)
  }
  sats.sort((a, b) => a - b)
  const satCap = sats.length ? sats[Math.min(sats.length - 1, Math.floor(sats.length * PALETTE_PCT))] : 1
  let changed = 0
  for (let i = 0; i < data.length; i += channels) {
    if (data[i + 3] === 0) continue
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2])
    if (!isWarmSpill(h, s)) continue
    const [r2, g2, b2] = hslToRgb(HUE_GOLD, Math.min(s, satCap), l)
    data[i] = r2
    data[i + 1] = g2
    data[i + 2] = b2
    changed += 1
  }
  return { changed, satCap }
}

/** 보이는 픽셀(알파≥alphaMin) 중 황록 스필 비율 측정 — 수술 전후 검증용. */
export function measureWarmSpill(data, channels, alphaMin = 16) {
  let visible = 0
  let spill = 0
  for (let i = 0; i < data.length; i += channels) {
    if (data[i + 3] < alphaMin) continue
    visible += 1
    const [h, s] = rgbToHsl(data[i], data[i + 1], data[i + 2])
    if (isWarmSpill(h, s)) spill += 1
  }
  return { visible, spill, ratio: visible ? spill / visible : 0 }
}
