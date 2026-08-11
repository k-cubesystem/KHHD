// 신당 배경음(BGM) 합성 — 싱잉볼·드론·자연음을 코드로 만든다(생성 API 0회·무과금·결정론).
//
// 왜 합성인가: 싱잉볼과 물·바람 소리는 «음악»이 아니라 «질감»이라 생성 모델보다 DSP 가 정확하다.
// 배음비·감쇠·맥놀이를 수치로 잡으면 재현·수정이 되지만, 생성물은 매번 달라지고 고칠 수가 없다.
// (2026-08-11 CEO 결정: Suno 국악 선율 배제 → 16테마 전부 이 스크립트의 싱잉볼 트랙으로 간다.)
//
// 🔴 싱잉볼이 «종»이 아니라 «볼»로 들리는 이유는 배음이 정수배가 아니기 때문이다(비조화 배음).
// 실측 계열의 볼 배음비 1 : 2.75 : 5.38 : 8.94 를 쓰고, 좌우를 미세하게 어긋나게 튜닝해
// 맥놀이(beating)를 만든다 — 이 흔들림이 없으면 신디사이저 소리로 들린다.
// **이 배음비를 순정(1:2:3)으로 바꾸면 볼이 아니라 오르간이 된다. 절대 건드리지 말 것.**
// 테마 변주는 배음«비»가 아니라 배음«진폭»(bright)과 «여운»(sustain)으로만 준다.
//
// 음계는 평조(平調) 5음 — 黃太仲林南 = 1 : 9/8 : 4/3 : 3/2 : 27/16. 서양 장음계면 국악풍이 안 난다.
// 테마 루트는 오행-오음 정통 대응(宮土·商金·角木·徵火·羽水)에서 파생한다 — 임의 배정이 아니다.
//
// ── 이음새 없는 루프(seamless loop)를 «크로스페이드 없이» 만드는 법 ──
// 크로스페이드는 이음새를 가리는 것이지 없애는 게 아니다. 여기서는 신호 자체를 루프 주기에
// 대해 수학적으로 주기적으로 만든다:
//   1) 드론·LFO 주파수를 «버퍼 길이 안에 정수 회 진동»하도록 양자화한다 → x[N] == x[0].
//   2) 볼 타격은 꼬리를 **모듈로 N 으로 되감아** 쓴다 → 다음 루프로 넘어가는 여운이 이미 앞부분에
//      들어 있다. 실제 무한 재생과 «같은 파형»이 되므로 이음새 자체가 존재하지 않는다.
//   3) 잡음 IIR 은 같은 난수열을 두 번 흘려(2-pass) 필터 상태를 감는다 → 경계에서 상태가 수렴해
//      역시 주기적이 된다. (선형 안정 필터 + 주기 입력 → 출력도 주기적)
//   4) 페이드인·페이드아웃은 넣지 않는다. 루프에 페이드가 있으면 그게 곧 이음새다.
// mp3 는 인코더 지연·패딩이 있으므로 Xing/LAME 게이트리스 태그를 쓰고(ffmpeg 기본),
// 버퍼 길이를 mp3 그래뉼(1152 샘플)의 정수배로 맞춰 마지막 반쪽 프레임을 없앤다.
//
// 사용:
//   node scripts/media-assets/shrine-ambience.mjs --all            # 16테마 wav+mp3+검증
//   node scripts/media-assets/shrine-ambience.mjs --theme=banga
//   node scripts/media-assets/shrine-ambience.mjs --check          # 배포된 mp3 만 재검증
// 플래그: --seconds=60 --kbps=96 --wavDir=<D:경로> --mp3Dir=<public 경로> --keepWav
// ⚠️ 중간 산출물(wav)은 반드시 D: — C: 여유가 없다(MEMORY project_media_storage_d_drive).

import { writeFileSync, mkdirSync, readFileSync, existsSync, statSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const SR = 44100
/** mp3 그래뉼 2개 = 1152 샘플. 버퍼를 이 정수배로 맞춰야 끝에 반쪽 프레임 패딩이 안 생긴다. */
const MP3_FRAME = 1152

// ─── CLI ──────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2)
const flags = Object.fromEntries(
  argv
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, ...v] = a.slice(2).split('=')
      return [k, v.length ? v.join('=') : true]
    })
)

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SECONDS = Number(flags.seconds ?? 60)
const KBPS = Number(flags.kbps ?? 96)
const WAV_DIR = String(flags.wavDir ?? 'D:/anti/media/out/shrine-bgm')
const MP3_DIR = String(flags.mp3Dir ?? join(REPO, 'public', 'sounds', 'shrine'))

/** 루프 길이(샘플). mp3 프레임 정수배로 올림 → 60s 요청 시 60.0033s. */
const N = MP3_FRAME * Math.round((SR * SECONDS) / MP3_FRAME)

// ─── 음계 · 오행 ──────────────────────────────────────────────────────────────

/** 평조(平調) 5음 비율 — 黃 太 仲 林 南. 서양 장음계 금지. */
const PYEONGJO = [1, 9 / 8, 4 / 3, 3 / 2, 27 / 16]
/** 黃鍾 기준음(F3). 배경으로 깔려야 하므로 낮게 잡는다. */
const HWANG = 174.61
/** 오행-오음 정통 대응: 宮=土 商=金 角=木 徵=火 羽=水. 테마 루트는 여기서 파생된다. */
const ELEMENT_DEGREE = { earth: 0, metal: 1, wood: 2, fire: 3, water: 4 }
/** 오음 이름(보고·주석용) */
const DEGREE_NAME = ['宮/黃', '商/太', '角/仲', '徵/林', '羽/南']

/** 휴대폰 스피커·헤드폰 하한. 드론이 이 아래로 내려가면 통째로 안 들린다 → 옥타브를 올린다. */
const DRONE_FLOOR_HZ = 65

/** 🔴 실측 계열 싱잉볼 비조화 배음비. 변경 금지 — 정수배로 바꾸면 오르간 소리가 된다. */
const PARTIAL_RATIO = [1.0, 2.75, 5.38, 8.94]
/** 배음별 기본 진폭·감쇠(초). 높은 배음이 먼저 죽는다. */
const PARTIAL_AMP = [1.0, 0.5, 0.26, 0.13]
const PARTIAL_DECAY = [11.0, 7.0, 4.5, 2.8]

/** 마스터 목표 RMS. 테마마다 피크 정규화하면 테마 전환 때 음량이 튄다 → RMS 로 맞춘다. */
const TARGET_RMS = 0.13

// ─── 16테마 스펙 ──────────────────────────────────────────────────────────────
//
// el·무드 출처는 lib/domain/shrine/theme-stage-geometry.json(themeElements)과
// lib/domain/shrine/theme-ambient.ts 의 테마 주석·pulseMs(맥동 속도)다.
// oct = 무드 무게(0.5 = 깊고 광대·느림 / 1 = 기본). every = 볼 타격 간격(초) = 사실상 템포.
// bright = 상배음 진폭 배율(배음«비»는 불변) · sustain = 여운 배율 · detune = 좌우 맥놀이 폭.
// 같은 오행끼리 루트가 겹치는 것은 «의도»다(오음 대응이 그렇다) — 정체성은 템포·음색·자연음이 낸다.

const THEMES = {
  // 반가(木) — 문살로 든 낮빛과 빛기둥 속 먼지. 전 테마의 기준선이라 값이 전부 1.0 이다.
  banga: { ko: '반가', el: 'wood', oct: 1, every: [9, 13], gain: 0.20, bright: 1.00, sustain: 1.00, detune: 0.00175, drone: 0.050, stream: 0.045, wind: 0.050, cutStream: 1400, cutWind: 90, gust: 23, breath: 17, pattern: [0, 2, 1, 3, 2, 4, 1] },
  // 초가 — 호롱 온광과 아궁이 김. 소박하게: 고역을 죽이고 바람을 앞세운다.
  choga: { ko: '초가', el: null, oct: 1, every: [10, 14], gain: 0.19, bright: 0.88, sustain: 1.05, detune: 0.00170, drone: 0.055, stream: 0.030, wind: 0.058, cutStream: 900, cutWind: 80, gust: 26, breath: 19, pattern: [0, 1, 0, 2, 1, 3, 0] },
  // 용궁(水) — 심해. 물속은 고역이 죽으므로 bright 가 가장 낮고, 여운은 길다.
  yonggung: { ko: '용궁', el: 'water', oct: 0.5, every: [13, 18], gain: 0.22, bright: 0.70, sustain: 1.35, detune: 0.00220, drone: 0.075, stream: 0.050, wind: 0.062, cutStream: 700, cutWind: 60, gust: 31, breath: 29, pattern: [0, 2, 4, 2, 0, 3, 1] },
  // 도깨비(火) — 야광·불꽃. 맥동이 빠르고 디튠이 커서 소리가 «흔들린다».
  dokkaebi: { ko: '도깨비', el: 'fire', oct: 1, every: [6, 9], gain: 0.17, bright: 1.22, sustain: 0.72, detune: 0.00260, drone: 0.040, stream: 0.022, wind: 0.040, cutStream: 2100, cutWind: 120, gust: 13, breath: 11, pattern: [0, 3, 2, 4, 3, 1, 0] },
  // 설빛(金) — 달빛 냉광·함박눈. 금속이라 배음이 밝고, 눈 스치는 고역 잡음을 얹는다.
  seolbit: { ko: '설빛', el: 'metal', oct: 1, every: [11, 15], gain: 0.18, bright: 1.30, sustain: 1.15, detune: 0.00150, drone: 0.042, stream: 0.038, wind: 0.044, cutStream: 3200, cutWind: 100, gust: 27, breath: 21, pattern: [0, 4, 2, 0, 3, 1, 4] },
  // 달집(土) — 대보름 큰 불. 옥타브를 내려 «큰 울림»을 만들고 드론을 두껍게 깐다.
  daljip: { ko: '달집', el: 'earth', oct: 0.5, every: [10, 14], gain: 0.24, bright: 0.82, sustain: 1.30, detune: 0.00200, drone: 0.070, stream: 0.030, wind: 0.056, cutStream: 1100, cutWind: 70, gust: 22, breath: 23, pattern: [0, 1, 0, 2, 1, 3, 0] },
  // 홍살(火) — 노을·홍엽. 火 지만 넓고 느긋해 옥타브를 내렸다.
  hongsal: { ko: '홍살', el: 'fire', oct: 0.5, every: [10, 14], gain: 0.20, bright: 0.95, sustain: 1.20, detune: 0.00190, drone: 0.058, stream: 0.034, wind: 0.052, cutStream: 1300, cutWind: 85, gust: 25, breath: 19, pattern: [0, 3, 2, 4, 3, 1, 0] },
  // 별밭 — 은하. 자연음을 거의 지우고 여운만 남긴다(정적이 주인공).
  byeolbat: { ko: '별밭', el: null, oct: 0.5, every: [15, 21], gain: 0.23, bright: 1.10, sustain: 1.45, detune: 0.00130, drone: 0.066, stream: 0.018, wind: 0.034, cutStream: 4200, cutWind: 55, gust: 37, breath: 31, pattern: [0, 2, 1, 4, 3, 0, 2] },
  // 대장간(金) — 화덕·불똥. 16테마 중 맥동이 가장 빠르고 여운이 가장 짧다.
  daejanggan: { ko: '대장간', el: 'metal', oct: 1, every: [5.5, 8], gain: 0.16, bright: 1.35, sustain: 0.62, detune: 0.00280, drone: 0.038, stream: 0.050, wind: 0.046, cutStream: 2600, cutWind: 130, gust: 11, breath: 9, pattern: [0, 4, 2, 0, 3, 1, 4] },
  // 연등(火) — 등불 «무리». 볼이 촘촘하되 대장간보다는 부드럽다.
  yeondeung: { ko: '연등', el: 'fire', oct: 1, every: [7, 10], gain: 0.18, bright: 1.12, sustain: 0.95, detune: 0.00210, drone: 0.048, stream: 0.026, wind: 0.042, cutStream: 1800, cutWind: 95, gust: 17, breath: 13, pattern: [0, 3, 2, 4, 3, 1, 0] },
  // 당산(木) — 숲. 바람이 주인공이라 wind 가 16테마 중 가장 크다.
  dangsan: { ko: '당산', el: 'wood', oct: 0.5, every: [9, 13], gain: 0.21, bright: 0.90, sustain: 1.18, detune: 0.00180, drone: 0.060, stream: 0.042, wind: 0.066, cutStream: 1600, cutWind: 75, gust: 19, breath: 23, pattern: [0, 2, 1, 3, 2, 4, 1] },
  // 장독(土) — 아침 햇살. 맑고 평범하게 — 土 의 기준값에 가깝다.
  jangdok: { ko: '장독', el: 'earth', oct: 1, every: [10, 14], gain: 0.19, bright: 1.05, sustain: 1.02, detune: 0.00160, drone: 0.046, stream: 0.028, wind: 0.040, cutStream: 2000, cutWind: 105, gust: 29, breath: 17, pattern: [0, 1, 0, 2, 1, 3, 0] },
  // 종각(金) — 범종 여운. 16테마 중 맥동이 가장 느리고 여운이 가장 길다(sustain 최대).
  jonggak: { ko: '종각', el: 'metal', oct: 0.5, every: [16, 22], gain: 0.26, bright: 1.18, sustain: 1.55, detune: 0.00140, drone: 0.062, stream: 0.020, wind: 0.038, cutStream: 2800, cutWind: 65, gust: 41, breath: 37, pattern: [0, 4, 2, 0, 3, 1, 4] },
  // 나루(水) — 물빛·저층 안개. 강물이 느리게 흐르는 폭으로 gust 를 길게 잡는다.
  naru: { ko: '나루', el: 'water', oct: 0.5, every: [12, 16], gain: 0.20, bright: 0.84, sustain: 1.25, detune: 0.00200, drone: 0.064, stream: 0.046, wind: 0.054, cutStream: 1000, cutWind: 68, gust: 33, breath: 27, pattern: [0, 2, 4, 2, 0, 3, 1] },
  // 샘굿(水) — 낙수. 물소리가 주인공이라 stream 이 16테마 중 가장 크고 맑다.
  saemgut: { ko: '샘굿', el: 'water', oct: 1, every: [9, 13], gain: 0.17, bright: 1.25, sustain: 0.88, detune: 0.00170, drone: 0.040, stream: 0.062, wind: 0.036, cutStream: 2400, cutWind: 90, gust: 21, breath: 15, pattern: [0, 2, 4, 2, 0, 3, 1] },
  // 서낭(土) — 안개·돌탑. 고요하고 둔탁하게.
  seonang: { ko: '서낭', el: 'earth', oct: 1, every: [12, 17], gain: 0.21, bright: 0.86, sustain: 1.28, detune: 0.00190, drone: 0.058, stream: 0.026, wind: 0.060, cutStream: 1200, cutWind: 72, gust: 35, breath: 25, pattern: [0, 1, 0, 2, 1, 3, 0] },
}

/** 테마 도수(오음 index). el 이 없는 테마(초가·별밭)는 살림의 기본인 宮 에 둔다. */
function themeDegree(code) {
  const t = THEMES[code]
  if (!t) throw new Error(`알 수 없는 테마: ${code} (가능: ${Object.keys(THEMES).join(', ')})`)
  return t.el === null ? 0 : ELEMENT_DEGREE[t.el]
}

/** 테마 루트(Hz) — 오행→오음 도수 × 무드 옥타브. 하드코딩이 아니라 파생값이다. */
function themeRoot(code) {
  return Math.round(HWANG * PYEONGJO[themeDegree(code)] * THEMES[code].oct * 100) / 100
}

// ─── 결정론 난수 ──────────────────────────────────────────────────────────────

/** LCG — 같은 시드면 같은 트랙이 나와야 재현·수정이 된다. Math.random 금지. */
function makeRng(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** 테마 코드 → 시드. 손으로 배정하지 않는다(테마 추가 시 자동으로 고유 시드가 나온다). */
function themeSeed(code) {
  let h = 2166136261
  for (let i = 0; i < code.length; i++) {
    h ^= code.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h ^ 20260811) >>> 0
}

// ─── 합성 ─────────────────────────────────────────────────────────────────────

/**
 * 싱잉볼 한 타. 비조화 배음 + 배음별 감쇠 + 좌우 디튠 맥놀이.
 * 🔴 꼬리를 모듈로 N 으로 되감아 쓴다 — 이게 이음새 없는 루프의 핵심이다.
 * 위상은 i 로 이어지므로 되감기 지점에서도 파형이 연속이다.
 */
function bowl(L, R, atSec, f0, gain, t, rng) {
  const start = Math.floor(atSec * SR) % N
  const dMax = PARTIAL_DECAY[0] * t.sustain
  // 3.5 시정수면 진폭 3%. 남는 꼬리는 끝 25% 를 코사인으로 눕혀 «칼로 자른 소리»(클릭)를 막는다.
  const dur = Math.min(N - 1, Math.floor(Math.min((N / SR) * 0.5, 3.5 * dMax) * SR))
  const taperFrom = Math.floor(dur * 0.75)
  const taperLen = dur - taperFrom
  // 어택 계수: 감쇠·어택 모두 지수이므로 샘플마다 곱셈 1회로 갱신한다(exp 호출 70M회 회피).
  const kAtk = Math.exp(-1 / (SR * 0.012))
  for (let p = 0; p < PARTIAL_RATIO.length; p++) {
    const ratio = PARTIAL_RATIO[p]
    // 배음«비»는 절대 불변. 테마 변주는 진폭 지수로만 준다.
    const amp = PARTIAL_AMP[p] * Math.pow(t.bright, p * 0.75)
    const kDec = Math.exp(-1 / (SR * PARTIAL_DECAY[p] * t.sustain))
    const fL = f0 * ratio * (1 - t.detune)
    const fR = f0 * ratio * (1 + t.detune)
    const phL = rng() * Math.PI * 2
    const phR = rng() * Math.PI * 2
    const wL = (2 * Math.PI * fL) / SR
    const wR = (2 * Math.PI * fR) / SR
    const base = gain * amp
    let dec = 1
    let atk = 1
    for (let i = 0; i < dur; i++) {
      let env = dec * (1 - atk) // 감쇠 × 짧은 «림» 어택
      dec *= kDec
      atk *= kAtk
      if (i >= taperFrom) env *= 0.5 * (1 + Math.cos((Math.PI * (i - taperFrom)) / taperLen))
      const g = base * env
      const j = (start + i) % N
      L[j] += Math.sin(wL * i + phL) * g
      R[j] += Math.sin(wR * i + phR) * g
    }
  }
}

/**
 * 저음 드론 — 근음과 5도. 아주 느린 진폭 LFO 로 «숨쉬게» 한다.
 * 🔴 주파수·LFO 를 «N 안에 정수 회» 로 양자화해야 x[N] == x[0] 이 된다(루프 조건).
 */
function drone(L, R, f0, gain, breathSec) {
  const quant = (f) => (Math.max(1, Math.round((f * N) / SR)) * SR) / N
  const f1 = quant(f0)
  const f2 = quant(f0 * 1.4983) // 순정 5도
  const w1 = (2 * Math.PI * f1) / SR
  const w2 = (2 * Math.PI * f2) / SR
  const breathCycles = Math.max(1, Math.round(N / (SR * breathSec)))
  for (let i = 0; i < N; i++) {
    const lfo = 0.75 + 0.25 * Math.sin((2 * Math.PI * breathCycles * i) / N)
    const s = (Math.sin(w1 * i) + 0.45 * Math.sin(w2 * i)) * gain * lfo
    L[i] += s
    R[i] += s * 0.97
  }
}

/**
 * 자연음 — 흰잡음을 두 번 저역통과해 «개울»(고역 잔물결)과 «바람»(저역 너울)을 만든다.
 * 🔴 같은 난수열을 두 번 흘린다(2-pass): 1회차는 필터 상태를 감기만 하고 2회차만 기록한다.
 *    선형 안정 필터에 주기 입력을 넣으면 출력도 주기적 → 경계에서 상태가 일치해 이음새가 없다.
 */
function nature(L, R, t, seed) {
  const aS = Math.exp((-2 * Math.PI * t.cutStream) / SR)
  const aW = Math.exp((-2 * Math.PI * t.cutWind) / SR)
  const st = [0, 0]
  const st2 = [0, 0]
  const wd = [0, 0]
  const wd2 = [0, 0]
  const gustCycles = Math.max(1, Math.round(N / (SR * t.gust)))
  for (let pass = 0; pass < 2; pass++) {
    const rng = makeRng(seed) // 회차마다 같은 잡음열 = 주기 입력
    for (let i = 0; i < N; i++) {
      // 바람은 아주 느리게 부풀었다 잦아든다 — 일정하면 «화이트노이즈»로 들킨다.
      const gust = 0.55 + 0.45 * Math.sin((2 * Math.PI * gustCycles * i) / N + 1.1)
      for (let c = 0; c < 2; c++) {
        const n = rng() * 2 - 1
        st[c] = st[c] * aS + n * (1 - aS)
        st2[c] = st2[c] * aS + st[c] * (1 - aS)
        wd[c] = wd[c] * aW + n * (1 - aW)
        wd2[c] = wd2[c] * aW + wd[c] * (1 - aW)
        if (pass === 0) continue
        // ×14 = 저역 2단 필터가 잡아먹은 에너지 보정(원본 계수 승계).
        const s = st2[c] * t.stream + wd2[c] * t.wind * gust * 14
        if (c === 0) L[i] += s
        else R[i] += s
      }
    }
  }
}

/** 테마 1종 렌더 → { L, R, meta } */
function renderTheme(code) {
  const t = THEMES[code]
  const seed = themeSeed(code)
  const root = themeRoot(code)
  const L = new Float64Array(N)
  const R = new Float64Array(N)

  // 드론 근음: 휴대폰에서 사라지지 않도록 하한을 지킨다.
  const droneF = root / 2 < DRONE_FLOOR_HZ ? root : root / 2
  drone(L, R, droneF, t.drone, t.breath)
  nature(L, R, t, seed ^ 0x9e3779b9)

  // 볼은 «드물게». 촘촘하면 명상이 아니라 알림음이 된다. 음은 평조 5음에서 고른다.
  const rng = makeRng(seed)
  const [lo, hi] = t.every
  const loopSec = N / SR
  let at = 1.5
  let hits = 0
  while (at < loopSec) {
    const deg = t.pattern[hits % t.pattern.length]
    bowl(L, R, at, root * PYEONGJO[deg], t.gain * (1 + rng() * 0.3), t, rng)
    at += lo + rng() * (hi - lo)
    hits++
  }

  // ── 마스터: RMS 정렬 후 소프트 클립. 피크 정규화가 아니라 RMS 정렬인 이유는
  //    테마를 바꿀 때 음량이 튀면 안 되기 때문이다. tanh 가 RMS 를 깎으므로 3회 수렴시킨다.
  let rms = 0
  for (let i = 0; i < N; i++) rms += L[i] * L[i] + R[i] * R[i]
  rms = Math.sqrt(rms / (2 * N))
  let g = rms > 0 ? TARGET_RMS / rms : 1
  let outRms = 0
  let peak = 0
  for (let iter = 0; iter < 3; iter++) {
    outRms = 0
    peak = 0
    for (let i = 0; i < N; i++) {
      const a = Math.tanh(L[i] * g)
      const b = Math.tanh(R[i] * g)
      outRms += a * a + b * b
      peak = Math.max(peak, Math.abs(a), Math.abs(b))
    }
    outRms = Math.sqrt(outRms / (2 * N))
    if (iter < 2 && outRms > 0) g *= TARGET_RMS / outRms
  }
  for (let i = 0; i < N; i++) {
    L[i] = Math.tanh(L[i] * g)
    R[i] = Math.tanh(R[i] * g)
  }

  // ── 루프 회전 ──────────────────────────────────────────────────────────────
  // 🔴 mp3 는 MDCT 라 «파일 첫 프레임/끝 프레임»에 겹칠 이웃이 없다. 그래서 파일이 큰 진폭에서
  // 시작하면 인코더가 «무음→신호» 계단을 표현해야 하고, 96kbps 로는 비트가 모자라 바로 그
  // 루프 지점에 오차가 몰린다(실측: 종각 R 채널 이음새 도약 1587 = 곡 내부 p99.9 의 2.3배).
  // 버퍼는 순환이므로 **회전해도 루프 음악은 완전히 동일하다** — 양 채널이 동시에 0 을 지나는
  // 지점으로 시작점을 옮기면 계단이 사라진다(실측 1587 → 9, 같은 96kbps·같은 용량).
  const rot = quietestOffset(L, R)
  const L2 = new Float64Array(N)
  const R2 = new Float64Array(N)
  for (let i = 0; i < N; i++) {
    const j = (rot + i) % N
    L2[i] = L[j]
    R2[i] = R[j]
  }

  return { L: L2, R: R2, meta: { code, ko: t.ko, el: t.el, root, droneF, hits, rot, rms: outRms, peak, seed } }
}

/** 양 채널 진폭 + 기울기가 동시에 가장 작은 표본 위치. 여기서 파일을 시작·종료시킨다. */
function quietestOffset(L, R) {
  let best = 0
  let bestScore = Infinity
  for (let i = 1; i < N; i++) {
    const s = Math.abs(L[i]) + Math.abs(R[i]) + 0.5 * (Math.abs(L[i] - L[i - 1]) + Math.abs(R[i] - R[i - 1]))
    if (s < bestScore) {
      bestScore = s
      best = i
    }
  }
  return best
}

// ─── WAV · MP3 ────────────────────────────────────────────────────────────────

function writeWav(path, L, R) {
  const data = Buffer.alloc(N * 4)
  for (let i = 0; i < N; i++) {
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))), i * 4)
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))), i * 4 + 2)
  }
  const head = Buffer.alloc(44)
  head.write('RIFF', 0)
  head.writeUInt32LE(36 + data.length, 4)
  head.write('WAVE', 8)
  head.write('fmt ', 12)
  head.writeUInt32LE(16, 16)
  head.writeUInt16LE(1, 20)
  head.writeUInt16LE(2, 22)
  head.writeUInt32LE(SR, 24)
  head.writeUInt32LE(SR * 4, 28)
  head.writeUInt16LE(4, 32)
  head.writeUInt16LE(16, 34)
  head.write('data', 36)
  head.writeUInt32LE(data.length, 40)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, Buffer.concat([head, data]))
}

/** ffmpeg 경로 — PATH 에 없어도 node_modules/ffmpeg-static 이 있다(Windows 기본 경로). */
function ffmpegBin() {
  try {
    const req = createRequire(import.meta.url)
    const p = req('ffmpeg-static')
    if (typeof p === 'string' && existsSync(p)) return p
  } catch {
    /* PATH 폴백 */
  }
  return 'ffmpeg'
}

const FFMPEG = ffmpegBin()

function encodeMp3(wavPath, mp3Path) {
  mkdirSync(dirname(mp3Path), { recursive: true })
  execFileSync(
    FFMPEG,
    [
      '-y', '-loglevel', 'error',
      '-i', wavPath,
      '-c:a', 'libmp3lame',
      '-b:a', `${KBPS}k`,
      '-ar', String(SR),
      '-ac', '2',
      // Xing/LAME 게이트리스 태그 — 브라우저 loop 재생의 인코더 지연 보정 근거가 된다.
      '-write_xing', '1',
      '-id3v2_version', '0', '-write_id3v1', '0', '-map_metadata', '-1',
      mp3Path,
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] }
  )
}

/** mp3 → s16le raw 디코드(ffmpeg 은 LAME 태그를 존중해 지연을 잘라낸다 = 게이트리스 디코더 기준). */
function decodeRaw(mp3Path, rawPath) {
  mkdirSync(dirname(rawPath), { recursive: true })
  execFileSync(
    FFMPEG,
    ['-y', '-loglevel', 'error', '-i', mp3Path, '-f', 's16le', '-acodec', 'pcm_s16le', '-ac', '2', '-ar', String(SR), rawPath],
    { stdio: ['ignore', 'ignore', 'inherit'] }
  )
  return readFileSync(rawPath)
}

// ─── 루프 이음새 검증 ─────────────────────────────────────────────────────────

/**
 * «이음새»를 절대 임계로 재면 안 된다(교훈: feedback_gate_measures_wrong_thing).
 * 이음새의 표본간 도약을 **그 트랙 자신의 표본간 도약 분포**와 비교한다 —
 * 이음새 도약이 p99.9 이하면 그 점프는 곡 안에서 늘 일어나는 움직임과 구별되지 않는다.
 * 추가로 앞뒤 100ms RMS 를 비교해 페이드 잔재(=이음새의 다른 얼굴)를 잡는다.
 */
function seamMetrics(buf) {
  const frames = Math.floor(buf.length / 4)
  const hist = new Uint32Array(65536)
  let maxStep = 0
  let sumStep = 0
  let sumSq = 0
  let peak = 0
  for (let c = 0; c < 2; c++) {
    let prev = buf.readInt16LE(2 * c)
    for (let i = 1; i < frames; i++) {
      const v = buf.readInt16LE(i * 4 + 2 * c)
      const d = Math.abs(v - prev)
      hist[d]++
      sumStep += d
      if (d > maxStep) maxStep = d
      sumSq += v * v
      if (Math.abs(v) > peak) peak = Math.abs(v)
      prev = v
    }
  }
  const total = 2 * (frames - 1)
  const pct = (q) => {
    const target = total * q
    let acc = 0
    for (let d = 0; d < hist.length; d++) {
      acc += hist[d]
      if (acc >= target) return d
    }
    return hist.length - 1
  }
  /** 도약 x 의 백분위 순위 — 이음새가 «곡 안에서 몇 %의 순간보다 얌전한가». */
  const rankOf = (x) => {
    let acc = 0
    for (let d = 0; d <= Math.min(x, 65535); d++) acc += hist[d]
    return acc / total
  }
  // 이음새 = 마지막 표본 → 첫 표본. 루프가 되감기는 바로 그 지점의 «한 표본 도약».
  const seamStep = Math.max(
    ...[0, 1].map((c) => Math.abs(buf.readInt16LE(2 * c) - buf.readInt16LE((frames - 1) * 4 + 2 * c)))
  )
  const win = Math.floor(SR * 0.1)
  const rmsOf = (from) => {
    let s = 0
    for (let i = from; i < from + win; i++) s += buf.readInt16LE(i * 4) ** 2 + buf.readInt16LE(i * 4 + 2) ** 2
    return Math.sqrt(s / (2 * win))
  }
  const headRms = rmsOf(0)
  const tailRms = rmsOf(frames - win)
  const rms = Math.sqrt(sumSq / total)
  return {
    frames,
    seconds: frames / SR,
    seamStep,
    seamRank: rankOf(seamStep),
    p50: pct(0.5),
    p999: pct(0.999),
    maxStep,
    rms: Math.round(rms),
    peak,
    // 밝기 대용치(스펙트럼 중심 프록시): 평균 표본간 도약 / RMS. 높을수록 고역이 많다 = bright 반영.
    hf: Number((sumStep / total / rms).toFixed(3)),
    headRms: Math.round(headRms),
    tailRms: Math.round(tailRms),
    envRatio: Number((tailRms > 0 ? headRms / tailRms : 0).toFixed(3)),
  }
}

/**
 * 코덱 경계 오차 — 회전으로 «속일 수 없는» 두 번째 게이트.
 * seamStep 만 보면 조용한 지점을 골라 시작했다는 이유로 무조건 통과한다(합격선==검출임계 함정).
 * 그래서 «mp3 가 원본에서 얼마나 벗어났나»를 **경계 1프레임 vs 파일 중간 8지점**으로 비교한다.
 * 비율 ≈ 1 이면 루프 지점이 곡의 다른 곳보다 나쁘지 않다는 뜻 = 코덱이 이음새를 만들지 않았다.
 */
function codecEdgeError(raw, wav) {
  const off = 44
  const frames = Math.min(Math.floor(raw.length / 4), Math.floor((wav.length - off) / 4))
  const meanAbs = (from, n) => {
    let s = 0
    for (let i = from; i < from + n; i++) {
      s += Math.abs(raw.readInt16LE(i * 4) - wav.readInt16LE(off + i * 4))
      s += Math.abs(raw.readInt16LE(i * 4 + 2) - wav.readInt16LE(off + i * 4 + 2))
    }
    return s / (2 * n)
  }
  const edge = Math.max(meanAbs(0, MP3_FRAME), meanAbs(frames - MP3_FRAME, MP3_FRAME))
  let mid = 0
  const pts = 8 // 한 지점만 재면 그 지점이 우연히 조용할 수 있다 → 여러 곳 평균
  for (let k = 1; k <= pts; k++) mid += meanAbs(Math.floor((frames * k) / (pts + 1)), MP3_FRAME)
  mid /= pts
  return { edgeErr: Math.round(edge), midErr: Math.round(mid), edgeRatio: Number((mid > 0 ? edge / mid : 0).toFixed(2)) }
}

// ─── 실행 ─────────────────────────────────────────────────────────────────────

const CODES = Object.keys(THEMES)

// --roots: useShrineAudio.ts 의 BGM_ROOT 에 붙일 파생표를 찍고 끝낸다(손으로 계산하지 말 것).
if (flags.roots) {
  for (const code of CODES) {
    const t = THEMES[code]
    console.log(
      `${(code + ':').padEnd(12)} ${String(themeRoot(code)).padStart(7)}, // ${t.ko} ` +
        `${t.el ?? '—'} ${DEGREE_NAME[themeDegree(code)]}${t.oct === 1 ? '' : ' ×1/2'}`
    )
  }
  process.exit(0)
}

const targets = flags.all || flags.check ? CODES : flags.theme ? [String(flags.theme)] : CODES
const rawTmp = join(WAV_DIR, 'verify', '_probe.raw')
const rows = []
let totalBytes = 0

for (const code of targets) {
  if (!THEMES[code]) throw new Error(`알 수 없는 테마: ${code} (가능: ${CODES.join(', ')})`)
  const wavPath = join(WAV_DIR, `bgm-${code}.wav`)
  const mp3Path = join(MP3_DIR, `bgm-${code}.mp3`)
  let meta = { code, ko: THEMES[code].ko, el: THEMES[code].el, root: themeRoot(code), hits: NaN, rot: NaN }

  if (!flags.check) {
    const t0 = Date.now()
    const r = renderTheme(code)
    meta = r.meta
    writeWav(wavPath, r.L, r.R)
    encodeMp3(wavPath, mp3Path)
    meta.ms = Date.now() - t0
  }

  const bytes = statSync(mp3Path).size
  totalBytes += bytes
  const raw = decodeRaw(mp3Path, rawTmp)
  const m = seamMetrics(raw)
  // 코덱 경계 오차는 원본 wav 가 있어야 잴 수 있다 → 검증 뒤에 지운다(--check 모드는 생략).
  const e = existsSync(wavPath) ? codecEdgeError(raw, readFileSync(wavPath)) : { edgeErr: NaN, midErr: NaN, edgeRatio: NaN }
  if (!flags.check && !flags.keepWav) rmSync(wavPath, { force: true })

  const okSeam = m.seamStep <= m.p999
  const okEdge = !(e.edgeRatio > 1.5) // 미측정(NaN)이면 판정에서 뺀다
  rows.push({ ...meta, bytes, kbps: Math.round((bytes * 8) / m.seconds / 1000), ...m, ...e, ok: okSeam && okEdge })
  const num = (v, w) => (Number.isFinite(v) ? String(v) : '—').padStart(w)
  console.log(
    `  ${code.padEnd(11)} ${String(meta.root).padStart(7)}Hz ${num(meta.hits, 2)}타  ` +
      `${(bytes / 1024).toFixed(0).padStart(4)}KB ${Math.round((bytes * 8) / m.seconds / 1000)}k ${m.seconds.toFixed(2)}s  ` +
      `이음새 ${num(m.seamStep, 4)}(p50 ${num(m.p50, 4)}·p99.9 ${num(m.p999, 4)})  ` +
      `경계오차 ${num(e.edgeErr, 3)}/중간 ${num(e.midErr, 3)}=${num(e.edgeRatio, 4)}배  ` +
      `hf ${m.hf.toFixed(3)} 포락 ${m.envRatio.toFixed(2)}  ${okSeam && okEdge ? 'OK' : '⚠'}`
  )
}
rmSync(join(WAV_DIR, 'verify'), { recursive: true, force: true })

console.log(`\n루프 ${N} 샘플(${(N / SR).toFixed(4)}s · mp3 프레임 ${N / MP3_FRAME}개) · ${KBPS}kbps · 시드 결정론`)
console.log(`합계 ${(totalBytes / 1024 / 1024).toFixed(2)} MB / ${rows.length} 트랙 · 최대 ${(Math.max(...rows.map((r) => r.bytes)) / 1024).toFixed(0)} KB`)
const bad = rows.filter((r) => !r.ok)
console.log(
  bad.length
    ? `⚠ 미달: ${bad.map((r) => `${r.code}(이음새 ${r.seamStep}/p99.9 ${r.p999} · 경계 ${r.edgeRatio}배)`).join(', ')}`
    : '✅ 전 트랙 — 이음새 도약 ≤ 자기 p99.9 且 코덱 경계오차 ≤ 중간부 1.5배 (루프 지점이 곡의 다른 곳보다 나쁘지 않음)'
)

if (flags.json) writeFileSync(String(flags.json), JSON.stringify(rows, null, 2))
