// 영상 후처리 CLI — 생성(Veo)과 배포 사이의 모든 가공을 한 곳에 모은다.
//
// 여기 있는 레시피는 전부 실패를 통해 확정된 것이다. 다시 유도하지 말고 그대로 쓸 것:
//   crush    검정 대비를 올려 lighten/screen 오버레이용으로 만든다. screen 블렌드는 방 전체를
//            물들여 실패했고 lighten(픽셀별 max)이라야 배경이 정지 상태로 남는다.
//   loop     Veo 출력은 루프 재시작 지점이 하드컷이라 깜빡인다. 앞/뒤 절반을 스왑해 이음새를
//            중앙으로 옮기고 거기서만 크로스페이드한다(경계 프레임은 연속 원본이 된다).
//   vertical 16:9 소재를 9:16 에 넣을 때 여백을 검정으로 두면 죽은 화면이 된다 → 블러 커버.
//   caption  drawtext 는 Windows 경로·한글 줄바꿈에서 깨진다 → ASS + libass 로 태운다.
//
// ffmpeg 는 PATH 에 없다. 반드시 ffmpeg-static 을 경유한다(이 전제를 어기면 조용히 건너뛴다).
//
// 🔴 저장은 D: 다. C: 는 여유 27G 뿐 — 출력이 C: 로 향하면 경고한다. MEDIA_ROOT 는 marketing-spec.mjs.
//
// 사용 (npm run video:post -- <커맨드> ... 로도 동일):
//   post.mjs fetch    <url> [out]        # Higgsfield·Veo 결과 URL → D:/anti/media/downloads
//   post.mjs probe    in.mp4 [--platform=reels]
//   post.mjs crush    in.mp4 out.mp4
//   post.mjs loop     in.mp4 out.mp4 [--fade=0.6]
//   post.mjs vertical in.mp4 out.mp4 [--platform=reels]
//   post.mjs concat   c1.mp4 c2.mp4 [...] out.mp4 [--platform=reels] [--xfade=0.4]
//   post.mjs caption  in.mp4 out.mp4 --text="첫 줄|둘째 줄" [--at=0:3] [--style=sans] [--keepAss]
//   post.mjs caption  in.mp4 out.mp4 --cues=cues.json
//   post.mjs audio    in.mp4 track.mp3 out.mp4 [--volume=0.8] [--fade=0.4] [--platform=reels]
//   post.mjs encode   in.mp4 out.mp4 --platform=reels
//
// SNS 광고 표준 흐름: 생성(9:16 컷 N개) → concat → caption → audio → probe --platform=reels
// 앰비언트 흐름:     생성(검정 위 요소만) → crush → loop → public/videos/

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync, unlinkSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import ffmpegPath from 'ffmpeg-static'
import { PLATFORMS, SAFE_AREA, BRAND, MEDIA_DIRS } from './marketing-spec.mjs'

// ffprobe 는 ffmpeg-static 에 없다 → ffmpeg 자체의 stderr 를 파싱한다.
const FFMPEG = ffmpegPath

// ── 인자 파싱 ──
// 순차 파싱이다. Windows 의 `npm run video:post -- ... --text "첫 줄|둘째 줄"` 은 따옴표가 벗겨진 채
// 넘어와 자막이 조각나고, 남은 조각이 파일 인자로 흘러들어간다(=형도 마찬가지).
// 그래서 --text 는 다음 플래그 전까지 조각을 전부 이어붙인다. 파일 경로는 플래그보다 앞에 오므로 안전.
const argv = process.argv.slice(2)
const cmd = argv[0]
const positional = []
const flags = {}
const GREEDY = new Set(['text'])
for (let i = 1; i < argv.length; i++) {
  const a = argv[i]
  if (!a.startsWith('--')) {
    positional.push(a)
    continue
  }
  const [k, ...v] = a.slice(2).split('=')
  const head = v.length ? [v.join('=')] : []
  if (GREEDY.has(k)) {
    while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) head.push(argv[++i])
    flags[k] = head.length ? head.join(' ') : true
  } else if (head.length) {
    flags[k] = head[0]
  } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
    flags[k] = argv[++i]
  } else {
    flags[k] = true
  }
}

/** filtergraph 안에 들어가는 파일 경로 — 콜론이 인자 구분자라 이스케이프가 필요하다. */
function ffPath(p) {
  return resolve(p).replace(/\\/g, '/').replace(/:/g, '\\:')
}

function run(args, { quiet = false } = {}) {
  return execFileSync(FFMPEG, args, { stdio: quiet ? 'pipe' : 'inherit', encoding: 'utf8' })
}

/** ffmpeg -i 의 stderr 에서 규격을 긁어온다. */
function probe(input) {
  let err = ''
  try {
    execFileSync(FFMPEG, ['-hide_banner', '-i', resolve(input)], { stdio: 'pipe', encoding: 'utf8' })
  } catch (e) {
    err = String(e.stderr ?? '')
  }
  const dur = err.match(/Duration: (\d+):(\d+):(\d+\.\d+)/)
  const vid = err.match(/Stream #\d+:\d+.*?: Video: (\w+).*?, (\d+)x(\d+)/s)
  const fps = err.match(/([\d.]+) fps/)
  const aud = err.match(/Stream #\d+:\d+.*?: Audio: (\w+)/)
  return {
    durationSec: dur ? +dur[1] * 3600 + +dur[2] * 60 + +dur[3] : null,
    vcodec: vid?.[1] ?? null,
    width: vid ? +vid[2] : null,
    height: vid ? +vid[3] : null,
    fps: fps ? +fps[1] : null,
    acodec: aud?.[1] ?? null,
  }
}

/**
 * 시스템 드라이브 경고 — C: 는 여유가 27G 뿐이라 영상이 쌓이면 바로 막힌다.
 * 리포(D:)나 MEDIA_ROOT(D:) 밖으로 출력이 새는 걸 조용히 넘기지 않는다.
 */
function warnIfSystemDrive(p) {
  const abs = resolve(p).replace(/\\/g, '/')
  if (/^[Cc]:/.test(abs)) {
    console.warn(`⚠️ 출력이 C: 로 향한다 — ${abs}`)
    console.warn(`   영상은 D: 에 둔다. 예: ${MEDIA_DIRS.scratch}/ 또는 리포의 assets-src/video/`)
  }
}

function requireIO(n = 2) {
  if (positional.length < n) {
    console.error(`인자 부족 — 필요: ${n}개. 사용법은 파일 상단 주석 참조.`)
    process.exit(1)
  }
  for (const p of positional.slice(0, n - 1)) {
    if (!existsSync(p)) {
      console.error(`입력 없음: ${p}`)
      process.exit(1)
    }
  }
  warnIfSystemDrive(positional[n - 1])
  mkdirSync(dirname(resolve(positional[n - 1])), { recursive: true })
}

function platform() {
  const key = flags.platform ?? 'reels'
  const p = PLATFORMS[key]
  if (!p) {
    console.error(`알 수 없는 플랫폼: ${key} (${Object.keys(PLATFORMS).join(' | ')})`)
    process.exit(1)
  }
  return p
}

/** 플랫폼 인코딩 인자 — 무음 플랫폼(hero)은 오디오 트랙을 아예 뺀다. */
function encodeArgs(p) {
  const a = ['-c:v', p.vcodec, '-crf', String(p.crf), '-r', String(p.fps), '-pix_fmt', 'yuv420p']
  if (p.vcodec === 'libvpx-vp9') a.push('-b:v', '0', '-row-mt', '1')
  else a.push('-preset', 'slow', '-profile:v', 'high', '-movflags', '+faststart')
  if (p.acodec) a.push('-c:a', p.acodec, '-b:a', p.abitrate)
  else a.push('-an')
  return a
}

// ── ASS 자막 ──

function assTime(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = (sec % 60).toFixed(2).padStart(5, '0')
  return `${h}:${String(m).padStart(2, '0')}:${s}`
}

/**
 * 자막 ASS 생성. 하단 정렬(Alignment 2) + MarginV 를 세이프에어리어 하단값으로 잡아
 * 플랫폼 UI(캡션·CTA·사운드)에 절대 가리지 않게 한다.
 */
function buildAss(cues, { width, height, styleKey }) {
  const isSerif = styleKey !== 'sans'
  const fontName = isSerif ? BRAND.font.serifFamily : BRAND.font.sansFamily
  // 1080폭 기준 64px. 다른 해상도면 비례.
  const size = Math.round(64 * (width / 1080))
  const marginV = Math.round(SAFE_AREA.bottom * (height / 1920))
  const marginH = Math.round(SAFE_AREA.left * (width / 1080))
  const lines = [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${width}`,
    `PlayResY: ${height}`,
    'WrapStyle: 2', // 자동 줄바꿈 금지 — 줄바꿈은 "|" 로 직접 지정한다(한글 어절이 깨지지 않게)
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour,' +
      ' Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline,' +
      ' Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Main,${fontName},${size},${BRAND.ass.textPrimary},${BRAND.ass.gold},` +
      `${BRAND.ass.outlineHyeon},${BRAND.ass.shadow},1,0,0,0,100,100,2,0,1,4,2,2,` +
      `${marginH},${marginH},${marginV},1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ]
  for (const c of cues) {
    const text = String(c.text).split('|').join('\\N')
    lines.push(`Dialogue: 0,${assTime(c.startSec)},${assTime(c.endSec)},Main,,0,0,0,,${text}`)
  }
  return lines.join('\n')
}

// ── 커맨드 ──

const COMMANDS = {
  // Higgsfield·Veo 는 결과를 URL 로만 돌려준다 — higgsfield CLI 에는 다운로드 명령이 아예 없다.
  // 받는 위치를 D: 로 고정해서 생성물이 C: 로 새지 않게 한다.
  async fetch() {
    const url = positional[0]
    if (!url || !/^https?:\/\//.test(url)) {
      console.error(`사용: fetch <url> [출력경로]  — 생략 시 ${MEDIA_DIRS.downloads} 에 저장`)
      process.exit(1)
    }
    const named = positional[1]
    const fromUrl = decodeURIComponent(new URL(url).pathname.split('/').pop() || '') || 'download.bin'
    const out = named ?? `${MEDIA_DIRS.downloads}/${fromUrl}`
    warnIfSystemDrive(out)
    mkdirSync(dirname(resolve(out)), { recursive: true })

    const res = await globalThis.fetch(url)
    if (!res.ok) {
      console.error(`다운로드 실패 ${res.status} ${res.statusText}`)
      process.exit(1)
    }
    const { createWriteStream } = await import('node:fs')
    const { Readable } = await import('node:stream')
    const { pipeline } = await import('node:stream/promises')
    await pipeline(Readable.fromWeb(res.body), createWriteStream(resolve(out)))
    const mb = (statSync(resolve(out)).size / 1024 / 1024).toFixed(2)
    console.log('→', out, `(${mb}MB)`)
  },

  probe() {
    if (!positional[0] || !existsSync(positional[0])) {
      console.error('입력 없음')
      process.exit(1)
    }
    const info = probe(positional[0])
    console.log(`${positional[0]}`)
    console.log(`  ${info.width}×${info.height} · ${info.durationSec}s · ${info.fps}fps`)
    console.log(`  영상: ${info.vcodec} · 오디오: ${info.acodec ?? '없음(무음)'}`)
    if (flags.platform) {
      const p = platform()
      const fail = []
      if (info.width !== p.width || info.height !== p.height) fail.push(`해상도 ${p.width}×${p.height} 아님`)
      if (info.durationSec > p.maxSec) fail.push(`길이 ${p.maxSec}s 초과`)
      if (p.acodec && !info.acodec) fail.push('오디오 트랙 없음')
      if (!p.acodec && info.acodec) fail.push('무음 규격인데 오디오 트랙 있음')
      console.log(`  [${p.label}] ${fail.length ? '❌ ' + fail.join(' / ') : '✅ 규격 통과'}`)
    }
  },

  crush() {
    requireIO(2)
    const [i, o] = positional
    run([
      '-y',
      '-i',
      resolve(i),
      '-an',
      '-vf',
      "curves=all='0/0 0.16/0 1/1'",
      '-crf',
      '18',
      '-loglevel',
      'error',
      resolve(o),
    ])
    console.log('→', o, '(검정 crush — lighten 오버레이용)')
  },

  loop() {
    requireIO(2)
    const [i, o] = positional
    const fade = Number(flags.fade ?? 0.6)
    const { durationSec } = probe(i)
    if (!durationSec) {
      console.error('길이를 못 읽음 — 입력 확인')
      process.exit(1)
    }
    const half = durationSec / 2
    if (fade >= half) {
      console.error(`fade(${fade}s)가 절반 길이(${half}s) 이상 — 더 짧게`)
      process.exit(1)
    }
    // 뒤 절반을 앞으로 보내 원래의 하드컷 이음새를 중앙에 놓고, 거기서만 크로스페이드한다.
    const graph =
      `[0:v]trim=0:${half},setpts=PTS-STARTPTS[a];` +
      `[0:v]trim=${half},setpts=PTS-STARTPTS[b];` +
      `[b][a]xfade=transition=fade:duration=${fade}:offset=${half - fade}[v]`
    run([
      '-y',
      '-i',
      resolve(i),
      '-filter_complex',
      graph,
      '-map',
      '[v]',
      '-an',
      '-crf',
      '18',
      '-loglevel',
      'error',
      resolve(o),
    ])
    console.log('→', o, `(무이음 루프 ${(durationSec - fade).toFixed(2)}s — 원본 ${durationSec}s, 페이드 ${fade}s)`)
  },

  vertical() {
    requireIO(2)
    const [i, o] = positional
    const p = platform()
    // 배경: 꽉 채워 크롭 후 강블러. 전경: 폭 맞춰 중앙 배치.
    const graph =
      `[0:v]scale=${p.width}:${p.height}:force_original_aspect_ratio=increase,` +
      `crop=${p.width}:${p.height},gblur=sigma=32,eq=brightness=-0.12[bg];` +
      `[0:v]scale=${p.width}:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[v]`
    run([
      '-y',
      '-i',
      resolve(i),
      '-filter_complex',
      graph,
      '-map',
      '[v]',
      '-map',
      '0:a?',
      ...encodeArgs(p),
      '-loglevel',
      'error',
      resolve(o),
    ])
    console.log('→', o, `(${p.label} ${p.width}×${p.height} 리프레임)`)
  },

  caption() {
    requireIO(2)
    const [i, o] = positional
    const info = probe(i)
    let cues
    if (flags.cues) {
      cues = JSON.parse(readFileSync(resolve(String(flags.cues)), 'utf8'))
    } else if (typeof flags.text === 'string') {
      const at = String(flags.at ?? `0:${info.durationSec ?? 3}`).split(':')
      cues = [{ text: flags.text, startSec: Number(at[0]), endSec: Number(at[1]) }]
    } else {
      console.error('--text="..." 또는 --cues=파일.json 필요')
      process.exit(1)
    }
    const ass = buildAss(cues, {
      width: info.width ?? 1080,
      height: info.height ?? 1920,
      styleKey: flags.style ?? 'serif',
    })
    const assFile = resolve(o).replace(/\.[^.]+$/, '') + '.ass'
    writeFileSync(assFile, ass, 'utf8')
    try {
      run([
        '-y',
        '-i',
        resolve(i),
        '-vf',
        `subtitles=filename='${ffPath(assFile)}'`,
        '-c:a',
        'copy',
        '-crf',
        '18',
        '-loglevel',
        'error',
        resolve(o),
      ])
      console.log(
        '→',
        o,
        `(자막 ${cues.length}큐 번인 · ${flags.style === 'sans' ? 'Sans' : 'Serif'} · 하단여백 ${SAFE_AREA.bottom}px)`
      )
    } finally {
      if (!flags.keepAss) unlinkSync(assFile)
    }
  },

  // Veo 는 1회 생성이 최대 8초다. 15~30초 광고는 컷을 따로 생성해 여기서 이어붙인다.
  // 규격이 다른 클립이 섞이면 concat demuxer 가 깨지므로 전부 재인코딩(filter concat)한다.
  concat() {
    if (positional.length < 3) {
      console.error('사용: concat in1.mp4 in2.mp4 [...] out.mp4 [--platform=reels] [--xfade=0.4]')
      process.exit(1)
    }
    const out = positional[positional.length - 1]
    const ins = positional.slice(0, -1)
    for (const p of ins) {
      if (!existsSync(p)) {
        console.error(`입력 없음: ${p}`)
        process.exit(1)
      }
    }
    mkdirSync(dirname(resolve(out)), { recursive: true })
    const p = platform()
    // 정규화는 꽉 채워 크롭이다 — 종횡비가 다른 소스는 좌우(또는 상하)가 잘려 나간다.
    // SNS 용은 Veo 에서 애초에 9:16 으로 생성하는 게 맞다. 16:9 를 살려야 하면 vertical(블러 커버)을 먼저 걸 것.
    const target = p.width / p.height
    for (const f of ins) {
      const { width, height } = probe(f)
      if (!width || !height) continue
      if (Math.abs(width / height - target) > 0.02) {
        console.warn(
          `⚠️ ${f} — ${width}×${height} 는 ${p.aspectRatio} 가 아니다. 크롭으로 잘려나간다(vertical 을 먼저 쓸지 판단할 것)`
        )
      }
    }
    const xfade = flags.xfade === undefined ? 0 : Number(flags.xfade)
    const norm = ins
      .map(
        (_, k) =>
          `[${k}:v]scale=${p.width}:${p.height}:force_original_aspect_ratio=increase,` +
          `crop=${p.width}:${p.height},fps=${p.fps},setpts=PTS-STARTPTS[v${k}]`
      )
      .join(';')

    let graph
    if (xfade > 0) {
      // 컷 사이를 크로스페이드. offset 은 누적 길이에서 페이드를 빼며 전진한다.
      const durs = ins.map((f) => probe(f).durationSec)
      let acc = durs[0]
      let cur = 'v0'
      const steps = []
      for (let k = 1; k < ins.length; k++) {
        const label = k === ins.length - 1 ? 'v' : `x${k}`
        steps.push(
          `[${cur}][v${k}]xfade=transition=fade:duration=${xfade}:offset=${(acc - xfade).toFixed(3)}[${label}]`
        )
        acc += durs[k] - xfade
        cur = label
      }
      graph = `${norm};${steps.join(';')}`
      console.log(`컷 ${ins.length}개 · 크로스페이드 ${xfade}s → 예상 ${acc.toFixed(2)}s`)
    } else {
      const chain = ins.map((_, k) => `[v${k}]`).join('')
      graph = `${norm};${chain}concat=n=${ins.length}:v=1:a=0[v]`
      console.log(`컷 ${ins.length}개 · 하드컷`)
    }

    const args = ['-y']
    for (const f of ins) args.push('-i', resolve(f))
    args.push('-filter_complex', graph, '-map', '[v]', ...encodeArgs(p), '-loglevel', 'error', resolve(out))
    run(args)
    console.log('→', out, `(${p.label} 합성 — 오디오는 별도 트랙으로 mux)`)
  },

  // 오디오 mux — concat 은 영상만 남기므로 BGM/내레이션을 여기서 얹는다.
  // 영상 길이에 맞춰 자르고 양끝을 페이드한다(SNS 는 앞뒤 하드컷 소리가 특히 거슬린다).
  audio() {
    if (positional.length < 3) {
      console.error('사용: audio in.mp4 track.mp3 out.mp4 [--volume=0.8] [--fade=0.4] [--platform=reels]')
      process.exit(1)
    }
    const [vin, ain, out] = positional
    for (const f of [vin, ain]) {
      if (!existsSync(f)) {
        console.error(`입력 없음: ${f}`)
        process.exit(1)
      }
    }
    mkdirSync(dirname(resolve(out)), { recursive: true })
    const p = platform()
    if (!p.acodec) {
      console.error(`${p.label} 는 무음 규격 — 오디오를 얹지 않는다`)
      process.exit(1)
    }
    const { durationSec } = probe(vin)
    const vol = Number(flags.volume ?? 0.8)
    const fade = Number(flags.fade ?? 0.4)
    const af =
      `volume=${vol},afade=t=in:st=0:d=${fade},` +
      `afade=t=out:st=${Math.max(0, durationSec - fade).toFixed(3)}:d=${fade}`
    run([
      '-y',
      '-i',
      resolve(vin),
      '-i',
      resolve(ain),
      '-filter_complex',
      `[1:a]${af}[a]`,
      '-map',
      '0:v',
      '-map',
      '[a]',
      '-c:v',
      'copy',
      '-c:a',
      p.acodec,
      '-b:a',
      p.abitrate,
      '-shortest',
      '-loglevel',
      'error',
      resolve(out),
    ])
    console.log('→', out, `(오디오 mux · vol ${vol} · 페이드 ${fade}s · ${durationSec}s 맞춤)`)
  },

  encode() {
    requireIO(2)
    const [i, o] = positional
    const p = platform()
    const info = probe(i)
    if (info.durationSec > p.maxSec) console.warn(`⚠️ 길이 ${info.durationSec}s > ${p.label} 상한 ${p.maxSec}s`)
    run([
      '-y',
      '-i',
      resolve(i),
      '-vf',
      `scale=${p.width}:${p.height}:flags=lanczos`,
      ...encodeArgs(p),
      '-loglevel',
      'error',
      resolve(o),
    ])
    console.log('→', o, `(${p.label} 인코딩)`)
  },
}

if (!cmd || !COMMANDS[cmd]) {
  console.error(`커맨드: ${Object.keys(COMMANDS).join(' | ')}`)
  console.error('사용법은 scripts/media-assets/post.mjs 상단 주석 참조.')
  process.exit(1)
}
// fetch 는 async — await 하지 않으면 실패가 조용히 삼켜진다.
await COMMANDS[cmd]()
