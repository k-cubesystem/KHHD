// 신위 이미지 배치 생성 (Gemini Nano Banana 2)
// ⚠️ OPUS 확인 필요: 이미지 모델 ID를 실제 사용 가능 값으로 확정할 것.
//    후보: gemini-3.1-flash-image (NB2), gemini-3-pro-image (NB Pro).
//    /claude-api 아님 — Gemini. https://ai.google.dev/gemini-api/docs/image-generation 로 검증.
// 키: 기존 앱과 동일 GEMINI_API_KEY(.env.local). 이 스크립트는 .env.local을 dotenv로 로드.
//
// 사용:
//   node scripts/shrine-assets/generate.mjs base            # 17 스탠딩 base
//   node scripts/shrine-assets/generate.mjs emotions samsin # 특정 신위 표정 7종
//   node scripts/shrine-assets/generate.mjs all             # 전량
//
// 흐름: 프롬프트 → 녹색배경 PNG 생성 → assets-src/shrine/raw/ → chroma.mjs로 public/shrine/deities/
import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from 'dotenv'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { DEITIES, EMOTIONS, basePrompt, emotionPrompt } from './manifest.mjs'

config({ path: path.resolve('D:/anti/haehwadang/.env.local') })

const MODEL = process.env.SHRINE_IMAGE_MODEL || 'gemini-3.1-flash-image' // 이미지 생성 모델
// 키 폴백: 앱은 GOOGLE_GENERATIVE_AI_API_KEY를 쓰므로 그것도 허용(둘 중 있는 것 사용).
const KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
if (!KEY) { console.error('GEMINI 키 없음 (.env.local의 GEMINI_API_KEY 또는 GOOGLE_GENERATIVE_AI_API_KEY)'); process.exit(1) }

const RAW = 'D:/anti/haehwadang/assets-src/shrine/raw'
const genAI = new GoogleGenerativeAI(KEY)
const model = genAI.getGenerativeModel({ model: MODEL })

async function gen(prompt, outPng, refPaths = []) {
  const parts = [{ text: prompt }]
  // 스타일/캐릭터 일관성: 참조 이미지를 inlineData로 첨부 (style-refs + base.png)
  for (const rp of refPaths) {
    if (!existsSync(rp)) continue
    const buf = await readFile(rp)
    parts.push({ inlineData: { mimeType: rp.endsWith('.webp') ? 'image/webp' : 'image/png', data: buf.toString('base64') } })
  }
  const res = await model.generateContent(parts)
  const cand = res.response.candidates?.[0]
  const img = cand?.content?.parts?.find((p) => p.inlineData)?.inlineData
  if (!img) throw new Error('이미지 파트 없음 — 모델 ID/응답 형식 확인 필요\n' + JSON.stringify(cand)?.slice(0, 300))
  await mkdir(path.dirname(outPng), { recursive: true })
  await writeFile(outPng, Buffer.from(img.data, 'base64'))
  console.log('  ✔', outPng)
}

// 스타일 참조: 확정 시안 1~3장을 여기에 두면 모든 생성에 첨부됨
const STYLE_DIR = 'D:/anti/haehwadang/assets-src/shrine/style-refs'
const styleRefs = ['ref1.png', 'ref2.png', 'ref3.png'].map((f) => path.join(STYLE_DIR, f)).filter((p) => existsSync(p))

const mode = process.argv[2] || 'base'
const only = process.argv[3]
const targets = only ? DEITIES.filter((d) => d.code === only) : DEITIES

for (const d of targets) {
  const baseOut = path.join(RAW, d.code, 'base.png')
  if (mode === 'base' || mode === 'all') {
    if (existsSync(baseOut)) { console.log('skip', baseOut) }
    else {
      console.log('gen base', d.code)
      try { await gen(basePrompt(d), baseOut, styleRefs) } catch (e) { console.error('  ✖', d.code, String(e).slice(0, 200)) }
    }
  }
  if (mode === 'emotions' || mode === 'all') {
    for (const emo of EMOTIONS) {
      const out = path.join(RAW, d.code, `${emo}.png`)
      if (existsSync(out)) { console.log('skip', out); continue }
      console.log('gen emo', d.code, emo)
      // base.png를 참조로 첨부해 캐릭터 동일성 유지
      try { await gen(emotionPrompt(d, emo), out, [baseOut, ...styleRefs]) } catch (e) { console.error('  ✖', d.code, emo, String(e).slice(0, 200)) }
    }
  }
}
console.log('done. 다음: chroma.mjs로 키잉 → public/shrine/deities/{code}/{emo}.webp')
