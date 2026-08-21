// 미디어(영상) 배치 생성 — Veo(기본) / Higgsfield(스텁) 어댑터.
// scripts/shrine-assets/generate.mjs 골격 미러링(env 키 폴백 → 스펙 → 생성 → 멱등 skip → CLI 필터).
//
// ⚠️ 실제 생성은 초당 과금(원가 폭탄 방지: runtime 생성 금지, 1회 생성 에셋).
//    기본 --dry-run(프롬프트·예상 비용만 출력). 실제 생성(--run)은 예상 비용 보고 후 사용자 승인.
//
// 사용:
//   node scripts/media-assets/generate-videos.mjs                      # dry-run(기본)
//   node scripts/media-assets/generate-videos.mjs --dry-run summon-ritual
//   node scripts/media-assets/generate-videos.mjs --run                # 실제 생성(승인 후)
//   node scripts/media-assets/generate-videos.mjs --run --adapter=higgsfield
//
// 흐름(--run): env 키 → 어댑터 → assets-src/video/raw/{id}.mp4 → (ffmpeg 있으면) public/videos/{id}.webm → 멱등 skip.

import { VIDEO_SPECS } from './video-spec.mjs'
import { existsSync } from 'node:fs'

// ────────────────────────────────────────────────────────────────
// Veo 3.1 단가 (USD/초, audio 포함).
// 출처: Google 공식 https://ai.google.dev/gemini-api/docs/pricing (확인일 2026-07-21).
//   Veo 2/3 은 2026-06-30 종료 예정 → Veo 3.1 사용.
//   Standard: 720p/1080p $0.40, 4k $0.60 · Fast: 720p $0.10, 1080p $0.12, 4k $0.30 · Lite: 720p $0.05, 1080p $0.08
// ────────────────────────────────────────────────────────────────
const VEO_PRICING = {
  'veo-3.1-generate-preview': { '720p': 0.4, '1080p': 0.4, '4k': 0.6 },
  'veo-3.1-fast-generate-preview': { '720p': 0.1, '1080p': 0.12, '4k': 0.3 },
  'veo-3.1-lite-generate-preview': { '720p': 0.05, '1080p': 0.08 },
}
// 앰비언트 배경 루프(무음·저해상)라 Fast 720p 가 비용/품질 균형.
const DEFAULT_VEO_MODEL = 'veo-3.1-fast-generate-preview'

function pricePerSec(model, res) {
  const m = VEO_PRICING[model]
  return m && m[res] != null ? m[res] : null
}
function estimateUsd(spec, model) {
  const per = pricePerSec(model, spec.resolution)
  return per == null ? null : Math.round(per * spec.durationSec * 100) / 100
}

// ── 인자 파싱 ──
const argv = process.argv.slice(2)
const wantRun = argv.includes('--run') && !argv.includes('--dry-run')
const adapterArg = argv.find((a) => a.startsWith('--adapter='))
const adapter = adapterArg ? adapterArg.split('=')[1] : 'veo'
const targetIds = argv.filter((a) => !a.startsWith('--'))
const specs = targetIds.length ? VIDEO_SPECS.filter((s) => targetIds.includes(s.id)) : VIDEO_SPECS

if (specs.length === 0) {
  console.error('대상 스펙 없음. 사용 가능한 id:', VIDEO_SPECS.map((s) => s.id).join(', '))
  process.exit(1)
}

// ── DRY-RUN(기본): 프롬프트 + 예상 비용 ──
if (!wantRun) {
  console.log('=== 영상 생성 DRY-RUN — 실제 생성/과금 없음 ===')
  console.log(`어댑터: ${adapter} · 기본 모델(veo): ${DEFAULT_VEO_MODEL} @ 720p`)
  let total = 0
  for (const s of specs) {
    const cost = estimateUsd(s, DEFAULT_VEO_MODEL)
    if (cost != null) total += cost
    console.log(`\n[${s.id}] ${s.title}`)
    console.log(`  길이/해상도: ${s.durationSec}s · ${s.resolution}   배치: ${s.placement}`)
    console.log(`  프롬프트: ${s.prompt}`)
    console.log(`  예상 비용(${DEFAULT_VEO_MODEL}): ${cost == null ? '미확정' : '$' + cost.toFixed(2)}`)
    console.log(`  출력: public/videos/${s.id}.webm`)
  }
  console.log(`\n총 예상 비용(1회 생성, Fast 720p): $${total.toFixed(2)}`)
  console.log('대안 단가(초당): Lite 720p $0.05 · Fast 720p $0.10 · Standard 720p $0.40 (출처 ai.google.dev/gemini-api/docs/pricing, 2026-07-21)')
  console.log('\n실제 생성: --run (비용 발생, 사용자 승인 후). Higgsfield: --run --adapter=higgsfield (HIGGSFIELD_API_KEY 필요)')
  process.exit(0)
}

// ── --run: 실제 생성 (Opus 는 여기 도달 안 함 — 사용자 승인 후 실행) ──
if (adapter === 'higgsfield') {
  await runHiggsfield(specs)
} else if (adapter === 'veo') {
  await runVeo(specs)
} else {
  console.error(`알 수 없는 어댑터: ${adapter} (veo | higgsfield)`)
  process.exit(1)
}

// REST 형식 출처: https://ai.google.dev/gemini-api/docs/veo (확인일 2026-07-21)
//   POST {BASE}/models/{model}:predictLongRunning  { instances:[{prompt}], parameters:{aspectRatio,resolution,durationSeconds} }
//   → { name: "operations/..." } 폴링 → done 시 응답에서 video uri → x-goog-api-key 로 다운로드.
//   durationSeconds 지원값: 4 | 6 | 8 (5초 불가 — 스펙은 4초로 운용).
// (함수 선언 — 최상위 await 이후에 정의돼도 호이스팅으로 안전)
function veoBase() {
  return 'https://generativelanguage.googleapis.com/v1beta'
}

function findVideoUri(obj) {
  // 응답 스키마 방어: response 트리에서 첫 번째 http(s) uri 필드를 찾는다.
  if (obj == null) return null
  if (typeof obj === 'string') return /^https?:\/\//.test(obj) ? obj : null
  if (Array.isArray(obj)) {
    for (const v of obj) {
      const hit = findVideoUri(v)
      if (hit) return hit
    }
    return null
  }
  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if ((k === 'uri' || k === 'videoUri' || k === 'url') && typeof v === 'string' && /^https?:\/\//.test(v)) return v
      const hit = findVideoUri(v)
      if (hit) return hit
    }
  }
  return null
}

async function runVeo(list) {
  const { config } = await import('dotenv')
  const path = await import('node:path')
  const { mkdirSync, writeFileSync, copyFileSync } = await import('node:fs')
  const { execSync } = await import('node:child_process')
  config({ path: path.resolve('D:/anti/haehwadang/.env.local') })
  const KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!KEY) {
    console.error('GEMINI 키 없음 (.env.local의 GEMINI_API_KEY 또는 GOOGLE_GENERATIVE_AI_API_KEY)')
    process.exit(1)
  }

  // ffmpeg 는 PATH 에 없다 → ffmpeg-static 을 먼저 보고, 없을 때만 PATH 를 본다.
  // (PATH 만 보던 이전 코드는 항상 실패해 webm 트랜스코드가 조용히 건너뛰어졌다.)
  let ffmpegBin = null
  try {
    ffmpegBin = (await import('ffmpeg-static')).default
    execSync(`"${ffmpegBin}" -version`, { stdio: 'ignore' })
  } catch {
    ffmpegBin = null
  }
  if (!ffmpegBin) {
    try {
      execSync('ffmpeg -version', { stdio: 'ignore' })
      ffmpegBin = 'ffmpeg'
    } catch {
      console.log('ffmpeg 없음(ffmpeg-static 미설치 + PATH 부재) → webm 생략, mp4 그대로 배포')
    }
  }

  mkdirSync('assets-src/video/raw', { recursive: true })
  mkdirSync('public/videos', { recursive: true })

  for (const s of list) {
    const outWebm = `public/videos/${s.id}.webm`
    const outMp4 = `public/videos/${s.id}.mp4`
    if (existsSync(outWebm) || existsSync(outMp4)) {
      console.log('skip(존재)', s.id)
      continue
    }

    const durationSeconds = [4, 6, 8].includes(s.durationSec) ? s.durationSec : 4
    const aspectRatio = s.aspectRatio === '9:16' ? '9:16' : '16:9'
    console.log(`gen(veo) ${s.id} — ${durationSeconds}s @ ${s.resolution} ${aspectRatio} (${DEFAULT_VEO_MODEL})`)

    // 이미지-투-비디오: imageInput(webp 등)을 PNG 로 변환해 첫 프레임으로 전달.
    // predictLongRunning(predict 계열)의 이미지 필드는 bytesBase64Encoded — inlineData 는
    // Gemini generateContent 형식이라 400 거부됨(2026-07-22 실측).
    const instance = { prompt: s.prompt }
    if (s.imageInput) {
      const sharp = (await import('sharp')).default
      const png = await sharp(s.imageInput).png().toBuffer()
      instance.image = { bytesBase64Encoded: png.toString('base64'), mimeType: 'image/png' }
      console.log(`  첫 프레임: ${s.imageInput} (png ${(png.length / 1024).toFixed(0)}KB)`)
    }

    const startRes = await fetch(`${veoBase()}/models/${DEFAULT_VEO_MODEL}:predictLongRunning`, {
      method: 'POST',
      headers: { 'x-goog-api-key': KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [instance],
        parameters: { aspectRatio, resolution: s.resolution, durationSeconds },
      }),
    })
    if (!startRes.ok) {
      console.error(`  생성 요청 실패 ${startRes.status}:`, (await startRes.text()).slice(0, 500))
      process.exitCode = 1
      continue
    }
    const op = await startRes.json()
    if (!op.name) {
      console.error('  operation name 없음:', JSON.stringify(op).slice(0, 300))
      process.exitCode = 1
      continue
    }
    console.log('  operation:', op.name)

    // 폴링 — 10초 간격, 최대 12분
    let finalOp = null
    for (let i = 0; i < 72; i++) {
      await new Promise((r) => setTimeout(r, 10_000))
      const poll = await fetch(`${veoBase()}/${op.name}`, { headers: { 'x-goog-api-key': KEY } })
      if (!poll.ok) {
        console.error(`  폴링 실패 ${poll.status}`)
        continue
      }
      const j = await poll.json()
      if (j.done) {
        finalOp = j
        break
      }
      if (i % 3 === 2) console.log(`  ...생성 중 (${(i + 1) * 10}s)`)
    }
    if (!finalOp) {
      console.error('  시간 초과(12분) — operation 은 서버에 남아 있음:', op.name)
      process.exitCode = 1
      continue
    }
    if (finalOp.error) {
      console.error('  생성 오류:', JSON.stringify(finalOp.error).slice(0, 500))
      process.exitCode = 1
      continue
    }

    const uri = findVideoUri(finalOp.response)
    if (!uri) {
      console.error('  응답에서 video uri 를 못 찾음:', JSON.stringify(finalOp.response).slice(0, 600))
      process.exitCode = 1
      continue
    }

    const dl = await fetch(uri, { headers: { 'x-goog-api-key': KEY }, redirect: 'follow' })
    if (!dl.ok) {
      console.error(`  다운로드 실패 ${dl.status}`)
      process.exitCode = 1
      continue
    }
    const buf = Buffer.from(await dl.arrayBuffer())
    const raw = `assets-src/video/raw/${s.id}.mp4`
    writeFileSync(raw, buf)
    console.log(`  저장 ${raw} (${(buf.length / 1024 / 1024).toFixed(2)}MB)`)

    if (ffmpegBin) {
      execSync(
        `"${ffmpegBin}" -y -i "${raw}" -an -c:v libvpx-vp9 -b:v 0 -crf 36 -vf scale=720:-2 -loglevel error "${outWebm}"`,
        { stdio: 'inherit' }
      )
      console.log('  →', outWebm)
    } else {
      copyFileSync(raw, outMp4)
      console.log('  →', outMp4)
    }
  }
}

async function runHiggsfield() {
  const KEY = process.env.HIGGSFIELD_API_KEY
  if (!KEY) {
    console.error('HIGGSFIELD_API_KEY 미설정 — Higgsfield 어댑터 비활성.')
    console.error('※ Higgsfield 는 공식 first-party API 부재(2026-07 확인). 서드파티 게이트웨이')
    console.error('  (pixazo.ai · videogenapi.com · segmind 등) 경유가 필요하며 형식·단가는 게이트웨이별 상이.')
    console.error('  키·엔드포인트 확정 후 이 어댑터를 구현·활성화하라 (인터페이스는 준비됨).')
    process.exit(1)
  }
  console.error('higgsfield 스텁 — 게이트웨이 엔드포인트/요청 형식 확정 후 구현.')
  process.exit(2)
}
