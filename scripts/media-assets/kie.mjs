// kie.ai 어댑터 — 이미지·영상 생성을 하나의 REST 계약으로 돌린다.
//
// 왜 서드파티 CLI/MCP 를 안 쓰나: kie.ai 에는 **공식 first-party 패키지가 없다**(2026-08-05 확인).
// npm 의 kie CLI·MCP 는 전부 개인 메인테이너의 커뮤니티 패키지다. 과금이 붙은 API 키를
// 남의 코드에 넘기는 셈이라, 이미 fetch 로 REST 를 치고 있는 이 리포에서는 직접 호출이 낫다.
//
// 계약 (출처: docs.kie.ai, 확인일 2026-08-05)
//   POST https://api.kie.ai/api/v1/jobs/createTask
//        { model, input:{...}, callBackUrl? }  →  { code, msg, data:{ taskId } }
//   GET  /api/v1/jobs/recordInfo?taskId=...
//        → { code, msg, data:{ state, resultJson, creditsConsumed, failCode, failMsg, progress } }
//   state: waiting | queuing | generating | success | fail
//   ⚠️ resultJson 은 객체가 아니라 **JSON 문자열**이다 → 파싱해서 .resultUrls[] 를 꺼낸다.
//   GET  /api/v1/chat/credit  → { code, msg, data: <남은 크레딧 수> }
//   레이트리밋: 생성 요청 10초당 20건 (초과 시 429)
//   실패한 작업은 과금되지 않는다.
//
// 💰 크레딧 1개 = $0.005. 모델별 단가는 문서에 일괄 표가 없어 **하드코딩하지 않는다** —
//    dry-run 은 알려진 기준값만 보여주고, 실제 비용은 성공 후 recordInfo 의 creditsConsumed 로 확정한다.
//
// 키: .env.local 의 KIE_API_KEY (메인 체크아웃 D:/anti/haehwadang/.env.local 을 절대경로로 읽는다).
//
// 사용:
//   node scripts/media-assets/kie.mjs credit                                  # 잔액
//   node scripts/media-assets/kie.mjs presets                                 # 프리셋 목록
//   node scripts/media-assets/kie.mjs gen <preset> --prompt "..."             # dry-run(기본, 무과금)
//   node scripts/media-assets/kie.mjs gen <preset> --prompt "..." --run       # 실제 생성(승인 후)
//   node scripts/media-assets/kie.mjs gen sns-video --prompt "..." --run --duration=10 --fetch
//   node scripts/media-assets/kie.mjs status <taskId>

import { MEDIA_DIRS } from './marketing-spec.mjs'

const BASE = 'https://api.kie.ai/api/v1'

// ────────────────────────────────────────────────────────────────
// 프리셋 — 우리 규격(MARKETING.md)을 모델 파라미터로 굳혀 둔 것.
// 매번 종횡비·해상도를 다시 유도하지 않기 위해서다.
//
// kling-3.0/video 를 SNS 기본으로 쓰는 이유:
//   · mode=pro + 9:16 이 **1080×1920** — Reels/Shorts/TikTok 규격과 정확히 일치(리프레임 불필요)
//   · duration 3~15초 — Veo 의 8초 상한보다 길어 컷 이어붙이기 횟수가 준다
//   · sound 플래그로 유음/무음을 고른다
// ────────────────────────────────────────────────────────────────
export const PRESETS = {
  'sns-video': {
    label: 'SNS 세로 영상 (Reels/Shorts/TikTok)',
    model: 'kling-3.0/video',
    kind: 'video',
    note: 'mode=pro + 9:16 → 1080×1920 네이티브. 리프레임 없이 바로 규격 통과.',
    input: { aspect_ratio: '9:16', mode: 'pro', sound: true, duration: '10', multi_shots: false },
    tunable: ['duration', 'sound', 'mode', 'aspect_ratio'],
  },
  'hero-video': {
    label: '랜딩 히어로 (무음 루프 소재)',
    model: 'kling-3.0/video',
    kind: 'video',
    note: '무음으로 뽑아 post.mjs loop 로 무이음 처리 후 사용.',
    input: { aspect_ratio: '9:16', mode: 'pro', sound: false, duration: '5', multi_shots: false },
    tunable: ['duration', 'mode', 'aspect_ratio'],
  },
  'ambient-overlay': {
    label: '앱 내 앰비언트 오버레이 (검정 위 요소만)',
    model: 'kling-3.0/video',
    kind: 'video',
    note: '순수 검정 배경 위 요소만 생성 → post.mjs crush → loop → lighten 오버레이.',
    input: { aspect_ratio: '9:16', mode: 'std', sound: false, duration: '5', multi_shots: false },
    tunable: ['duration', 'mode', 'aspect_ratio'],
  },
  'sns-image': {
    label: 'SNS 세로 이미지',
    model: 'nano-banana-2',
    kind: 'image',
    note: '광고 썸네일·정지 소재. 4K 까지 가능하나 SNS 는 2K 로 충분.',
    input: { aspect_ratio: '9:16', resolution: '2K', output_format: 'png' },
    tunable: ['aspect_ratio', 'resolution', 'output_format'],
  },
  'wide-image': {
    label: '가로 이미지 (OG·블로그·유튜브 썸네일)',
    model: 'nano-banana-2',
    kind: 'image',
    note: 'OG 이미지·콘텐츠 마케팅용.',
    input: { aspect_ratio: '16:9', resolution: '2K', output_format: 'png' },
    tunable: ['aspect_ratio', 'resolution', 'output_format'],
  },
}

// 참고 단가 — 문서·공식 가격 페이지에서 확인된 것만 적는다(출처: kie.ai/v3-api-pricing, 2026-08-05).
// 다른 모델은 미확인이라 추정치를 쓰지 않는다. 실비용은 creditsConsumed 가 알려준다.
const CREDIT_USD = 0.005
const KNOWN_PRICING = [
  ['Veo 3 Fast', '8초', 80, 0.4],
  ['Veo 3 Quality', '8초', 400, 2.0],
]

// ────────────────────────────────────────────────────────────────
// 음악(Suno) — ⚠️ **통합 jobs API 가 아니다.**
//   POST /generate                      { prompt, customMode, instrumental, model }
//   GET  /generate/record-info?taskId=  → data.response.sunoData[].audioUrl
// 응답 스키마도 jobs 쪽(resultJson 문자열)과 완전히 다르므로 폴링·추출을 따로 쓴다.
//
// 모델은 V4_5 를 기본으로 둔다. V5/V5_5 는 instrumental 에 uploadUrl 을 요구한다는 서술이 있어
// (docs.kie.ai/suno-api/quickstart) 텍스트만으로 뽑는 경로가 불확실하다 — 확인 전엔 쓰지 않는다.
// 단순 모드(customMode:false)가 문서의 동작 예시라 프롬프트 하나로 간다(500자 상한).
// ────────────────────────────────────────────────────────────────
export const MUSIC_PRESETS = {
  'shrine-gugak': {
    label: '신당 배경 — 잔잔한 국악풍 발라드(무보컬)',
    model: 'V4_5',
    instrumental: true,
    note: '싱잉볼·자연음은 shrine-ambience.mjs 합성분과 층을 나눠 섞는다(음악만 끄고 켜기 위해).',
    prompt:
      'A slow, calm Korean traditional instrumental ballad. Gayageum zither plucked gently with expressive ' +
      'bending vibrato, a low daegeum bamboo flute breathing long sustained notes, sparse soft janggu drum ' +
      'far away. Pentatonic Korean scale, meditative and reverent, unhurried, lots of space and silence ' +
      'between phrases. Warm, intimate, like a quiet shrine at dusk. No vocals, no percussion build-up.',
  },
}

// ── 인자 ──
// `--k=v` 와 `--k v` 를 모두 받는다. Windows 의 `npm run x -- --prompt "여러 낱말"` 은
// 따옴표가 벗겨진 채 넘어와 프롬프트가 조각나므로, 공백 분리형을 지원하지 않으면 못 쓴다.
const argv = process.argv.slice(2)
const cmd = argv[0]
const positional = []
const flags = {}
for (let i = 1; i < argv.length; i++) {
  const a = argv[i]
  if (!a.startsWith('--')) {
    positional.push(a)
    continue
  }
  const [k, ...v] = a.slice(2).split('=')
  if (v.length) {
    flags[k] = v.join('=')
  } else if (k === 'prompt') {
    // 프롬프트는 따옴표가 벗겨져 여러 조각으로 오므로 다음 플래그 전까지 전부 이어붙인다.
    const words = []
    while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) words.push(argv[++i])
    flags[k] = words.length ? words.join(' ') : true
  } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
    flags[k] = argv[++i]
  } else {
    flags[k] = true
  }
}

async function loadKey() {
  const { config } = await import('dotenv')
  const path = await import('node:path')
  // 워크트리의 .env.local 은 구키다 — 메인 체크아웃을 본다(generate-videos.mjs 와 동일 규칙).
  config({ path: path.resolve('D:/anti/haehwadang/.env.local') })
  const key = process.env.KIE_API_KEY || process.env.KIE_AI_API_KEY
  if (!key) {
    console.error('KIE_API_KEY 없음.')
    console.error('D:/anti/haehwadang/.env.local 에 다음 줄을 추가하라 (키는 kie.ai 대시보드에서 발급):')
    console.error('  KIE_API_KEY=여기에_키')
    process.exit(1)
  }
  return key
}

async function api(pathname, { method = 'GET', body, key } = {}) {
  const res = await fetch(`${BASE}${pathname}`, {
    method,
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    console.error(`응답이 JSON 이 아님 (HTTP ${res.status}):`, text.slice(0, 300))
    process.exit(1)
  }
  if (res.status === 429) {
    console.error('레이트리밋(10초당 20건 초과). 잠시 후 재시도.')
    process.exit(1)
  }
  if (!res.ok || json.code !== 200) {
    console.error(`API 오류 HTTP ${res.status} code=${json.code}: ${json.msg ?? ''}`)
    process.exit(1)
  }
  return json.data
}

/** resultJson 은 JSON 문자열이다. 스키마가 흔들려도 URL 은 건지도록 방어적으로 판다. */
function extractUrls(data) {
  const raw = data?.resultJson
  if (!raw) return []
  let parsed
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch {
    return []
  }
  if (Array.isArray(parsed?.resultUrls)) return parsed.resultUrls
  // 폴백: 트리 어딘가의 http(s) 문자열을 전부 긁는다.
  const out = []
  const walk = (v) => {
    if (typeof v === 'string' && /^https?:\/\//.test(v)) out.push(v)
    else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === 'object') Object.values(v).forEach(walk)
  }
  walk(parsed)
  return out
}

function buildInput(preset) {
  const input = { ...preset.input }
  if (typeof flags.prompt === 'string') input.prompt = flags.prompt
  for (const k of preset.tunable) {
    if (flags[k] === undefined) continue
    const v = flags[k]
    input[k] = v === 'true' ? true : v === 'false' ? false : v
  }
  return input
}

const COMMANDS = {
  async presets() {
    console.log('프리셋 — 규격은 TEAM_A_PM/MARKETING.md 기준\n')
    for (const [id, p] of Object.entries(PRESETS)) {
      console.log(`[${id}] ${p.label}`)
      console.log(`  모델: ${p.model} (${p.kind})`)
      console.log(`  기본값: ${JSON.stringify(p.input)}`)
      console.log(`  조정 가능: ${p.tunable.join(', ')}`)
      console.log(`  ${p.note}\n`)
    }
  },

  async credit() {
    const key = await loadKey()
    const credits = await api('/chat/credit', { key })
    const usd = (Number(credits) * CREDIT_USD).toFixed(2)
    console.log(`남은 크레딧: ${credits}  (≈ $${usd} · 크레딧당 $${CREDIT_USD})`)
    console.log('\n참고 단가(확인된 것만):')
    for (const [name, len, cr, usd2] of KNOWN_PRICING) {
      console.log(`  ${name} ${len} — ${cr} 크레딧 ($${usd2.toFixed(2)})`)
    }
    console.log('  그 외 모델은 단가 미공표 — 첫 생성 후 creditsConsumed 로 확정된다.')
  },

  async gen() {
    const id = positional[0]
    const preset = PRESETS[id]
    if (!preset) {
      console.error(`알 수 없는 프리셋: ${id ?? '(없음)'}`)
      console.error(`사용 가능: ${Object.keys(PRESETS).join(' | ')}`)
      process.exit(1)
    }
    if (typeof flags.prompt !== 'string' || !flags.prompt.trim()) {
      console.error('--prompt "..." 필수')
      process.exit(1)
    }
    const input = buildInput(preset)
    const wantRun = flags.run === true

    if (!wantRun) {
      console.log('=== kie.ai DRY-RUN — 생성/과금 없음 ===\n')
      console.log(`프리셋: [${id}] ${preset.label}`)
      console.log(`모델:   ${preset.model}`)
      console.log(`입력:   ${JSON.stringify(input, null, 2)}`)
      console.log(`\n${preset.note}`)
      console.log('\n비용: 이 모델의 단가는 공표되지 않았다. 크레딧당 $0.005 이고')
      console.log('      실제 차감액은 생성 성공 후 creditsConsumed 로 확인된다.')
      console.log('      잔액은 `node scripts/media-assets/kie.mjs credit` 로 먼저 볼 것.')
      console.log('\n실제 생성: 같은 명령에 --run 추가 (사용자 승인 후). --fetch 를 붙이면 D: 로 내려받는다.')
      return
    }

    const key = await loadKey()
    const before = await api('/chat/credit', { key })
    console.log(`생성 시작 — 모델 ${preset.model} · 잔액 ${before} 크레딧`)

    const { taskId } = await api('/jobs/createTask', {
      method: 'POST',
      key,
      body: { model: preset.model, input },
    })
    console.log(`taskId: ${taskId}`)

    const urls = await poll(taskId, key)
    if (flags.fetch) await fetchAll(urls)
  },

  // 음악 생성. jobs API 와 엔드포인트·응답이 달라 별도 경로다.
  // 단가가 미공표라 **잔액 차이**로 실비용을 확정한다(suno record-info 에 creditsConsumed 가 없다).
  async music() {
    const id = positional[0] ?? 'shrine-gugak'
    const preset = MUSIC_PRESETS[id]
    if (!preset) {
      console.error(`알 수 없는 음악 프리셋: ${id} — 가능: ${Object.keys(MUSIC_PRESETS).join(' | ')}`)
      process.exit(1)
    }
    const prompt = typeof flags.prompt === 'string' ? flags.prompt : preset.prompt
    const model = String(flags.model ?? preset.model)
    // ⚠️ 문서에는 callBackUrl 이 «선택»이라고 돼 있지만 실제로는 없으면 422 로 거절한다(2026-08-10 실측).
    //    콜백은 완료 시 결과(오디오 URL)를 이 주소로 POST 한다 → 남의 도메인을 적으면 생성물이 새어나간다.
    //    우리는 폴링으로 받으므로 응답할 필요가 없고, 자기 도메인이면 404 로 끝나며 아무 데도 안 샌다.
    const callBackUrl = String(flags.callback ?? 'https://k-haehwadang.com/api/kie-callback')
    const body = { prompt, customMode: false, instrumental: preset.instrumental, model, callBackUrl }

    if (flags.run !== true) {
      console.log('=== kie.ai 음악 DRY-RUN — 생성/과금 없음 ===\n')
      console.log(`프리셋: [${id}] ${preset.label}`)
      console.log(`엔드포인트: POST ${BASE}/generate  (jobs API 아님)`)
      console.log(`요청: ${JSON.stringify(body, null, 2)}`)
      console.log(`프롬프트 길이: ${prompt.length}자 (단순 모드 상한 500)`)
      console.log(`\n${preset.note}`)
      console.log('\n비용: Suno 단가 미공표 — 생성 전후 잔액 차이로 확정한다.')
      console.log('실제 생성: --run 추가. --fetch 를 붙이면 D: 로 내려받는다.')
      return
    }
    if (prompt.length > 500) {
      console.error(`프롬프트 ${prompt.length}자 — 단순 모드 상한 500 초과`)
      process.exit(1)
    }

    const key = await loadKey()
    const before = Number(await api('/chat/credit', { key }))
    console.log(`음악 생성 시작 — ${model} · instrumental ${preset.instrumental} · 잔액 ${before}`)
    const started = await api('/generate', { method: 'POST', key, body })
    const taskId = started?.taskId ?? started?.task_id
    if (!taskId) {
      console.error('taskId 없음:', JSON.stringify(started).slice(0, 300))
      process.exit(1)
    }
    console.log(`taskId: ${taskId}`)

    const urls = await pollMusic(taskId, key)
    const after = Number(await api('/chat/credit', { key }))
    const spent = before - after
    console.log(`\n차감 ${spent} 크레딧 (≈ $${(spent * CREDIT_USD).toFixed(3)}) · 잔액 ${after}`)
    if (flags.fetch) await fetchAll(urls)
  },

  async status() {
    const taskId = positional[0]
    if (!taskId) {
      console.error('사용: status <taskId>')
      process.exit(1)
    }
    const key = await loadKey()
    const data = await api(`/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, { key })
    console.log(`state: ${data.state} · progress: ${data.progress ?? '-'} · 크레딧: ${data.creditsConsumed ?? '-'}`)
    if (data.state === 'fail') console.error(`실패: ${data.failCode ?? ''} ${data.failMsg ?? ''}`)
    const urls = extractUrls(data)
    urls.forEach((u) => console.log(`  ${u}`))
  },
}

/** 성공/실패까지 폴링. 상태값은 문서 기준 5종. */
async function poll(taskId, key) {
  const started = Date.now()
  const LIMIT_MS = 20 * 60 * 1000
  let last = ''
  while (Date.now() - started < LIMIT_MS) {
    await new Promise((r) => setTimeout(r, 8000))
    const data = await api(`/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, { key })
    if (data.state !== last) {
      console.log(`  ${data.state}${data.progress ? ` (${data.progress}%)` : ''}`)
      last = data.state
    }
    if (data.state === 'success') {
      const urls = extractUrls(data)
      // 실비용은 여기서 확정된다 — 프리셋 단가를 추정하지 않는 이유.
      const cr = Number(data.creditsConsumed ?? 0)
      console.log(`완료 — ${cr} 크레딧 차감 (≈ $${(cr * CREDIT_USD).toFixed(3)}) · ${data.costTime ?? '?'}ms`)
      if (!urls.length) console.warn('⚠️ 결과 URL 을 못 찾음 — resultJson 스키마 확인 필요')
      urls.forEach((u) => console.log(`  ${u}`))
      return urls
    }
    if (data.state === 'fail') {
      console.error(`생성 실패: ${data.failCode ?? ''} ${data.failMsg ?? ''}`)
      console.error('(실패한 작업은 과금되지 않는다)')
      process.exit(1)
    }
  }
  console.error(`시간 초과(20분). 작업은 서버에 남아 있다 — status ${taskId} 로 확인.`)
  process.exit(1)
}

/**
 * 음악 폴링. suno 응답은 `data.response.sunoData[]` 이고 상태 문자열도 jobs 와 다르다
 * (SUCCESS / *_FAILED / PENDING …). 스키마가 흔들려도 mp3 URL 은 건지도록 방어적으로 판다.
 */
async function pollMusic(taskId, key) {
  const started = Date.now()
  const LIMIT_MS = 15 * 60 * 1000
  let last = ''
  while (Date.now() - started < LIMIT_MS) {
    await new Promise((r) => setTimeout(r, 10000))
    const d = await api(`/generate/record-info?taskId=${encodeURIComponent(taskId)}`, { key })
    const st = String(d?.status ?? d?.response?.status ?? '')
    if (st && st !== last) {
      console.log(`  ${st}`)
      last = st
    }
    const audio = []
    const walk = (v) => {
      if (typeof v === 'string' && /^https?:\/\/.*\.(mp3|m4a|wav)(\?|$)/i.test(v)) audio.push(v)
      else if (Array.isArray(v)) v.forEach(walk)
      else if (v && typeof v === 'object') Object.values(v).forEach(walk)
    }
    walk(d)
    if (audio.length) {
      const uniq = [...new Set(audio)]
      console.log(`완료 — 트랙 ${uniq.length}개`)
      uniq.forEach((u) => console.log(`  ${u}`))
      return uniq
    }
    if (/FAIL|ERROR/i.test(st)) {
      console.error(`생성 실패: ${st} ${d?.errorMessage ?? ''}`)
      console.error('(실패한 작업은 과금되지 않는다)')
      process.exit(1)
    }
  }
  console.error(`시간 초과(15분). 작업은 서버에 남아 있다 — taskId ${taskId}`)
  process.exit(1)
}

/** 결과를 D: 미디어 루트로 내려받는다. C: 로 새지 않게 하는 게 요점. */
async function fetchAll(urls) {
  const { mkdirSync, createWriteStream, statSync } = await import('node:fs')
  const { Readable } = await import('node:stream')
  const { pipeline } = await import('node:stream/promises')
  const { resolve } = await import('node:path')
  mkdirSync(MEDIA_DIRS.downloads, { recursive: true })
  for (const url of urls) {
    const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || 'kie-result.bin')
    const out = resolve(`${MEDIA_DIRS.downloads}/${name}`)
    const res = await fetch(url)
    if (!res.ok) {
      console.error(`  다운로드 실패 ${res.status}: ${url}`)
      continue
    }
    await pipeline(Readable.fromWeb(res.body), createWriteStream(out))
    console.log(`  → ${out} (${(statSync(out).size / 1024 / 1024).toFixed(2)}MB)`)
  }
}

if (!cmd || !COMMANDS[cmd]) {
  console.error(`커맨드: ${Object.keys(COMMANDS).join(' | ')}`)
  console.error('사용법은 scripts/media-assets/kie.mjs 상단 주석 참조.')
  process.exit(1)
}
await COMMANDS[cmd]()
