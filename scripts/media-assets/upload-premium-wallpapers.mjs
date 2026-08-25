// 「채운(彩運)」 프리미엄 17장 — Storage 업로드 + 공개 썸네일 생성.
//
// 사용:  node scripts/media-assets/upload-premium-wallpapers.mjs          # dry-run
//        node scripts/media-assets/upload-premium-wallpapers.mjs --run
//
// 하는 일(--run):
//   ① private 버킷 `wallpapers-premium` 생성(있으면 skip)
//   ② preview-shots/premium/{id}.webp 17장 → 버킷 {id}.webp 업로드(upsert)
//   ③ 공개 썸네일 360×640 q60 → public/wallpapers/premium-thumbs/{id}.webp
//
// 🔴 원본은 절대 public/ 에 두지 않는다 — 유료 자산은 서명 URL 로만 나간다(PRD v2 §5).
//    썸네일은 잠금 화면의 «흐릿한 미리보기» 겸 마케팅 자산이라 공개가 의도다(360px, blur 로 표시).
// 🔴 버킷을 public 으로 만들지 말 것. 실수로 public 이면 서명 없이 원본이 새는 것이므로,
//    스크립트가 기존 버킷의 public 여부를 검사해 true 면 중단한다.
import { readFile, readdir, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

// 🔴 로컬 .env/.env.local 의 SUPABASE 값은 죽은 구 프로젝트(ukuscwvkkbedszwmetfu — DNS
//    미해석)를 가리킨다(2026-08-25 실측. 프로덕션은 Vercel env 를 쓰므로 무사했다).
//    그래서 env 파일 대신 **Management API** 로 현행 프로젝트의 service_role 키를 런타임에
//    받아온다 — 토큰은 셸 환경변수 SUPABASE_ACCESS_TOKEN(CLAUDE.md 규약), 키는 로그에 내지 않는다.
const CURRENT_REF = 'plzvanxcxjkaazcfrtls'

async function fetchServiceRoleKey() {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  if (!token) return null
  const res = await fetch(`https://api.supabase.com/v1/projects/${CURRENT_REF}/api-keys?reveal=true`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    console.error(`✖ Management API ${res.status}`)
    return null
  }
  const keys = await res.json()
  const row = Array.isArray(keys) ? keys.find((k) => k.name === 'service_role') : null
  return row?.api_key ?? null
}

const BUCKET = 'wallpapers-premium'
const SRC_DIR = 'preview-shots/premium'
const THUMB_DIR = 'public/wallpapers/premium-thumbs'
const THUMB_W = 360
const THUMB_H = 640

const url = `https://${CURRENT_REF}.supabase.co`
const wantRun = process.argv.includes('--run')

// v1 잔재(premium-rooster 등)는 올리지 않는다 — 채운 17장(gi/jae/ga/yeon/seong-*)만.
const isChaeun = (f) => /^(gi|jae|ga|yeon|seong)-[a-z-]+\.webp$/.test(f)

const files = (await readdir(SRC_DIR)).filter(isChaeun).sort()
console.log(`대상 ${files.length}장:`, files.map((f) => f.replace('.webp', '')).join(', '))
if (files.length !== 17) {
  console.error(`✖ 17장이어야 하는데 ${files.length}장 — 중단`)
  process.exit(1)
}

if (!wantRun) {
  console.log('\nDRY-RUN — 실제 업로드 없음. --run 으로 실행.')
  process.exit(0)
}
const key = await fetchServiceRoleKey()
if (!key) {
  console.error('✖ service_role 키 획득 실패 (SUPABASE_ACCESS_TOKEN 확인)')
  process.exit(1)
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

// ① 버킷 — 없으면 private 으로 생성, 있으면 public 여부 검사
const { data: buckets, error: listErr } = await admin.storage.listBuckets()
if (listErr) throw listErr
const existing = (buckets ?? []).find((b) => b.name === BUCKET)
if (!existing) {
  const { error } = await admin.storage.createBucket(BUCKET, { public: false })
  if (error) throw error
  console.log(`버킷 생성: ${BUCKET} (private)`)
} else if (existing.public) {
  console.error(`✖ 버킷 ${BUCKET} 이 public 이다 — 유료 자산이 새는 구성. 중단.`)
  process.exit(1)
} else {
  console.log(`버킷 존재: ${BUCKET} (private) — 재사용`)
}

// ② 업로드 + ③ 썸네일
const sharp = (await import('sharp')).default
await mkdir(THUMB_DIR, { recursive: true })
let fail = 0
for (const f of files) {
  const id = f.replace('.webp', '')
  const buf = await readFile(path.join(SRC_DIR, f))
  const { error } = await admin.storage.from(BUCKET).upload(f, buf, { contentType: 'image/webp', upsert: true })
  if (error) {
    console.error(`  ✖ ${id} 업로드 실패:`, error.message)
    fail++
    continue
  }
  await sharp(buf).resize(THUMB_W, THUMB_H, { fit: 'cover' }).webp({ quality: 60 }).toFile(path.join(THUMB_DIR, f))
  console.log(`  ✓ ${id} → ${BUCKET}/${f} (${(buf.length / 1024).toFixed(0)}KB) + 썸네일`)
}
console.log(fail ? `\n✖ ${fail}건 실패` : '\n완료 — 17장 업로드 + 썸네일 생성')
process.exit(fail ? 1 : 0)
