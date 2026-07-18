// 신당 테마 방 배경(room.webp) 생성 — spec-data.mjs 의 themes 정의를 그대로 사용
// 사용: node scripts/shrine-assets/generate-themes.mjs [code]   # code 생략 시 누락분 전량
// 멱등: public/shrine/themes/{code}/room.webp 가 이미 있으면 skip
// 산출: 512px 폭 webp (클라이언트가 저해상 다운스케일로 쓰는 규격 — 고DPR 흰화면 버그 회피 이력)
import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from 'dotenv'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

config({ path: path.resolve('D:/anti/haehwadang/.env.local') })

const MODEL = process.env.SHRINE_IMAGE_MODEL || 'gemini-3.1-flash-image'
const KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
if (!KEY) {
  console.error('GEMINI 키 없음 — .env.local 확인')
  process.exit(1)
}

const PUB = path.resolve(import.meta.dirname, '../../public')
const genAI = new GoogleGenerativeAI(KEY)
const model = genAI.getGenerativeModel({ model: MODEL })

// spec-data.mjs 는 stdout 으로 JSON 을 뱉는 모듈이라, 정의를 직접 import 하지 않고 재선언 대신
// 동일 파일을 실행해 파싱한다(단일 소스 유지).
const { execFileSync } = await import('node:child_process')
const specJson = execFileSync(process.execPath, [path.join(import.meta.dirname, 'spec-data.mjs')], {
  encoding: 'utf8',
})
const { themes } = JSON.parse(specJson)

const only = process.argv[2]
const targets = only ? themes.filter((t) => t.code === only) : themes

let made = 0
for (const t of targets) {
  const out = path.join(PUB, 'shrine', 'themes', t.code, 'room.webp')
  if (existsSync(out)) {
    console.log('skip', t.code)
    continue
  }
  console.log('gen', t.code, '—', t.name)
  try {
    const res = await model.generateContent([{ text: t.prompt }])
    const cand = res.response.candidates?.[0]
    const img = cand?.content?.parts?.find((p) => p.inlineData)?.inlineData
    if (!img) throw new Error('이미지 파트 없음: ' + JSON.stringify(cand)?.slice(0, 200))

    await mkdir(path.dirname(out), { recursive: true })
    // 512폭 webp — 방 배경은 object-cover 로 깔리므로 원본 해상도 불필요(메모리 절감)
    await sharp(Buffer.from(img.data, 'base64')).resize({ width: 512 }).webp({ quality: 82 }).toFile(out)
    console.log('  ✔', out)
    made++
  } catch (e) {
    console.error('  ✖', t.code, String(e).slice(0, 220))
  }
}
console.log(`done. 생성 ${made}건`)
