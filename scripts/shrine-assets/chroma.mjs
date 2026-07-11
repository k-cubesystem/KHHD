// 그린스크린(#00FF00) → 투명 WebP 변환 (sharp)
// 사용: node scripts/shrine-assets/chroma.mjs <입력.png> <출력.webp>
// Gemini는 알파 미지원 → 녹색 배경 생성 후 이 스크립트로 키잉.
import sharp from 'sharp'

const [, , inPath, outPath] = process.argv
if (!inPath || !outPath) {
  console.error('usage: node chroma.mjs <in.png> <out.webp>')
  process.exit(1)
}

// 임계값: 녹색이 우세하고 충분히 밝은 픽셀을 투명 처리. 가장자리 스필 완화.
const G_DOMINANCE = 60 // g가 r,b보다 이만큼 크면 배경
const G_MIN = 90

const img = sharp(inPath).ensureAlpha()
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
const { width, height, channels } = info
for (let i = 0; i < data.length; i += channels) {
  const r = data[i], g = data[i + 1], b = data[i + 2]
  if (g > G_MIN && g - r > G_DOMINANCE && g - b > G_DOMINANCE) {
    data[i + 3] = 0 // 완전 투명
  } else if (g - r > 20 && g - b > 20) {
    // 반투명 경계: 녹색 스필 억제 (g를 r,b 평균으로 당김)
    data[i + 1] = Math.min(g, Math.round((r + b) / 2) + 10)
  }
}
await sharp(data, { raw: { width, height, channels } })
  .webp({ quality: 90, alphaQuality: 100 })
  .toFile(outPath)
console.log('✅ keyed →', outPath)
