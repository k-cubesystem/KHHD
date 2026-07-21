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

async function runVeo(list) {
  const { config } = await import('dotenv')
  const path = await import('node:path')
  config({ path: path.resolve('D:/anti/haehwadang/.env.local') })
  const KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!KEY) {
    console.error('GEMINI 키 없음 (.env.local의 GEMINI_API_KEY 또는 GOOGLE_GENERATIVE_AI_API_KEY)')
    process.exit(1)
  }
  for (const s of list) {
    const out = `public/videos/${s.id}.webm`
    if (existsSync(out)) {
      console.log('skip', out)
      continue
    }
    console.log('gen(veo)', s.id, `— ${s.durationSec}s @ ${s.resolution}`)
    // Veo 는 long-running operation(생성 요청 → 폴링 → 다운로드). SDK 메서드·응답 형식은
    // 버전 의존 → 활성화 시 공식 문서로 확정: https://ai.google.dev/gemini-api/docs/video
    // 이후 assets-src/video/raw/{id}.mp4 저장 → ffmpeg 있으면 webm 트랜스코드 → public/videos/{id}.webm.
  }
  console.error('\nveo 실호출부 미구현 — 모델/단가는 확정(위 상수)이나 SDK 영상 API 는 활성화 시 공식 문서로 확정.')
  console.error('현재는 dry-run 만 지원(설계 의도: 파이프라인 준비 + 안전한 미설정 처리).')
  process.exit(2)
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
