#!/usr/bin/env node

/**
 * 애니메이션 CSS 실재 검증 게이트 — 신당 연출이 "코드엔 있는데 배포엔 없는" 사고 재발 차단.
 *
 * 사고 이력(2026-07-30): 신당 게임필 CSS 를 styled-jsx(<style jsx global>)로 넣었더니
 * App Router 에서는 서버 렌더 산출물에도, 빌드 CSS 청크에도 한 줄도 실리지 않았다.
 * DOM 에는 클래스가 붙고 콘솔 에러도 없어 **무증상**으로 배포 내내 죽어 있었다.
 *
 * 이 스크립트는 두 가지를 본다.
 *   1) 프로덕션 빌드 산출물(.next/**.css)에 필수 클래스·키프레임이 실제로 있는지
 *   2) 신당 씬 소스에 <style jsx> 가 되살아나지 않았는지
 * 하나라도 어긋나면 종료코드 1.
 *
 * 실행: node scripts/check-animation-css.mjs   (npm run build 이후)
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// ── 단일 출처: 산출물에 반드시 존재해야 하는 선택자·키프레임 ──────────────
/** 클래스 선택자 (app/shrine-scene.css · app/globals.css) */
const REQUIRED_CLASSES = [
  // 게임필 v1 상시 idle · 탭 · 카메라
  '.shrine-idle-sway',
  '.shrine-idle-wallsway',
  '.shrine-idle-breathe',
  '.shrine-idle-glow',
  '.shrine-glow-breathe',
  '.shrine-tap-squash',
  '.shrine-cam-shake',
  // 거니는 신당지기
  '.shrine-keeper-track',
  '.shrine-keeper-arrive',
  '.shrine-keeper-wander',
  '.shrine-keeper-face',
  '.shrine-keeper-bob',
  '.shrine-keeper-tread',
  '.shrine-keeper-pop',
  // 가족 사랑방
  '.fh-seat',
  '.fh-flicker',
  '.fh-bloom',
  '.fh-bubble',
  // 무대 물리 · 좌정 신위 · 기원 시트
  '.shrine-anchor-ring',
  '.shrine-item-wiggle',
  '.shrine-light-overlay',
  '.deity-stand',
  // 신위 탭 한 바퀴 회전 (안2.3 ④ — 9국면 + 5국면 하위 등급 + rotateY 폴백)
  // 겹 클래스 .deity-turn-step-N 은 lib/domain/shrine/deity-turn.ts 의 겹 수와 같아야 한다
  // (그 대조는 lib/domain/shrine/__tests__/deity-turn.test.ts 가 한다)
  '.deity-turn-body',
  '.deity-turn-ghost',
  '.deity-turn-mirror',
  '.deity-turn-spin',
  '.deity-turn-spin-lite',
  '.deity-turn-flip',
  '.deity-turn-step-0',
  '.deity-turn-step-1',
  '.deity-turn-step-2',
  '.deity-turn-step-3',
  '.deity-turn-step-4',
  '.deity-turn-step-5',
  '.deity-turn-step-6',
  '.deity-turn-step-7',
  '.deity-turn-shadow',
  '.deity-turn-shadow-lite',
  '.deity-turn-sweep',
  '.shrine-ring',
  '.devotion-sheet',
  '.no-scrollbar',
  // 액막이 의식 — 부적 태우기 (R-1). 연소는 mask-position 진행이라 CSS 가 없으면
  // 부적이 그대로 남아 국면 전환(animationend)조차 오지 않는다 = 의식이 통째로 멎는다
  '.ritual-sheet',
  '.ritual-paper',
  // 부적 본문 세로쓰기(CEO 7차 — 읽히는 한글). 구 '.ritual-sigil'(자모 주문양)을 대체
  '.ritual-writ',
  '.ritual-writ-col',
  '.ritual-burn',
  '.ritual-char',
  '.ritual-glow',
  '.ritual-ember',
  '.ritual-settle',
  '.ritual-cup',
  // 오방기 점괘 (R-2). 셔플·뽑기 애니메이션의 animationend 가 국면을 몰기 때문에
  // CSS 가 없으면 셔플에서 화면이 멎어 뽑기 자체가 불가능해진다(액막이와 같은 급의 파손)
  '.obangki-bell',
  '.obangki-shuffle',
  '.obangki-unfurl',
  '.obangki-pullout',
  '.obangki-flutter',
  '.obangki-samgi',
  '.obangki-purified',
  '.chuljeon-coin',
  '.chuljeon-seal',
  '.obangki-burst',
  '.obangki-bubble',
  // 창방 팻말 (의식 전용 페이지 진입점) — 벽 무라 cover 배율 재현이 여기 걸려 있다
  '.shrine-plaque-band',
  '.shrine-plaque',
  '.shrine-plaque-glow',
  // 신당 밖에서 같은 이유로 죽어 있던 것들 (app/globals.css 이관)
  '.review-marquee-track',
  '.animate-spin-slow',
  '.animate-spin-reverse-slow',
  // 의례 전환 — 클래스가 아니라 의사요소다. 산출물에서 사라지면 이동이 툭 끊긴다
  // (연출만 빠지고 기능은 살아 있어서, 이 게이트가 없으면 아무도 모른다)
  '::view-transition-old(root)',
  '::view-transition-new(root)',
  // 스크롤 구동 읽기 막대 (A-3) — 감춤 규칙이 사라지면 미지원 브라우저가 "항상 다 읽음"을 본다
  '.scroll-progress-track',
  '.scroll-progress',
  // 시렁(선반) — 이름표·축복 · 팻말 처마 등
  '.shelf-tag',
  '.shelf-blessed-aura',
  '.shrine-plaque-ember',
  // 앰비언트 — 시간대 틴트(전 테마). 그라디언트가 산출물에서 사라지면 방이 하루를 살지 않는다
  // (인라인은 opacity 하나뿐이라 **아무 색도 안 남는다** = 무증상 사망)
  '.shrine-tint-dawn',
  '.shrine-tint-dusk',
  '.shrine-tint-night',
  // 앰비언트 — 테마의 숨결(원경광·글로우·CSS 파티클 5종) + 백그라운드 일괄 정지
  '.shrine-amb-back',
  '.shrine-amb-glow',
  '.shrine-amb-mote',
  '.shrine-amb-firefly',
  '.shrine-amb-ember',
  '.shrine-amb-leaf',
  '.shrine-amb-petal',
  '.shrine-amb-paused',
]

/** @keyframes 이름 */
const REQUIRED_KEYFRAMES = [
  'shrineIdleSway',
  'shrineIdleWallsway',
  'shrineIdleBreathe',
  'shrineIdleGlow',
  'shrineGlowBreathe',
  'shrineTapSquash',
  'shrineCamShake',
  'shrineKeeperWander',
  'shrineKeeperArrive',
  'shrineKeeperFace',
  'shrineKeeperBob',
  'shrineKeeperTread',
  'shrineKeeperPop',
  'fhSeatIn',
  'fhFlicker',
  'fhBloom',
  'fhBubbleIn',
  'shrineAnchorPulse',
  'shrineWiggle',
  'deityBreathe',
  // 신위 탭 한 바퀴 회전 (안2.3 ④ — 9국면 프레임 교체 + 5국면 하위 등급 + 폴백 rotateY)
  'deityTurnBody',
  'deityTurnStep0',
  'deityTurnStep1',
  'deityTurnStep2',
  'deityTurnStep3',
  'deityTurnStep4',
  'deityTurnStep5',
  'deityTurnStep6',
  'deityTurnStep7',
  'deityTurnBodyLite',
  'deityTurnLite0',
  'deityTurnLite1',
  'deityTurnLite2',
  'deityTurnLite3',
  'deityTurnGlow',
  'deityTurnFlip',
  'deityTurnShadow',
  'deityTurnShadowLite',
  'deityTurnSweep',
  'shrineRing',
  'devotionSheetUp',
  // 액막이 의식 (R-1)
  'ritualSheetUp',
  'ritualPaperIn',
  'ritualWritIn',
  'ritualBurn',
  'ritualCurl',
  'ritualChar',
  'ritualEmber',
  'ritualSettleIn',
  'ritualCupIn',
  // 오방기 점괘 (R-2)
  'obangkiBell',
  'obangkiShuffle',
  'obangkiUnfurl',
  'obangkiPullout',
  'obangkiFlutter',
  'obangkiSamgiRise',
  'obangkiPurify',
  'chuljeonCoin',
  'chuljeonSeal',
  'obangkiBurst',
  'obangkiBubbleIn',
  // 창방 팻말
  'shrinePlaqueGlow',
  'review-marquee-scroll',
  'spin-slow',
  'spin-reverse-slow',
  // 의례 전환 (A-1)
  'shrineRitualOut',
  'shrineRitualIn',
  // 스크롤 구동 (A-3)
  'scrollProgress',
  // 시렁 축복 · 팻말 처마 등
  'shelfBlessed',
  'shrinePlaqueEmber',
  // 앰비언트 — 테마의 숨결
  'shrineAmbBack',
  'shrineAmbGlow',
  'shrineAmbMote',
  'shrineAmbFirefly',
  'shrineAmbEmber',
  'shrineAmbLeaf',
  'shrineAmbPetal',
]

/** styled-jsx 금지 구역 — 여기 CSS 는 정적 파일(app/shrine-scene.css)에만 둔다 */
const NO_STYLED_JSX_DIRS = ['components/shrine']

const BUILD_DIR = '.next/static'

function collectCss(dir) {
  const out = []
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...collectCss(p))
    else if (name.endsWith('.css')) out.push(p)
  }
  return out
}

function collectTsx(dir) {
  const out = []
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...collectTsx(p))
    else if (name.endsWith('.tsx') || name.endsWith('.ts')) out.push(p)
  }
  return out
}

const files = collectCss(BUILD_DIR)

if (files.length === 0) {
  console.error(`\n\x1b[31m✗ [애니메이션 CSS] ${BUILD_DIR} 에 CSS 산출물이 없습니다.\x1b[0m`)
  console.error('  먼저 `npm run build` 를 실행하세요.\n')
  process.exit(1)
}

const css = files.map((f) => readFileSync(f, 'utf8')).join('\n')

// 모션 최소화 블록 안에만 남은 클래스(= animation:none 만 있고 본 선언이 사라진 상태)를
// "있다"로 세면 게이트가 무력해진다 — @media 블록을 걷어낸 본문에서만 찾는다
const baseCss = css.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '')

const missingClasses = REQUIRED_CLASSES.filter((sel) => !baseCss.includes(sel))
// 산출물은 minify 되어 `@keyframes name{` 형태다 — 공백 유무를 모두 허용한다
const missingKeyframes = REQUIRED_KEYFRAMES.filter((name) => !new RegExp(`@keyframes\\s*${name}[\\s{]`).test(css))

const styledJsxHits = []
for (const dir of NO_STYLED_JSX_DIRS) {
  for (const f of collectTsx(dir)) {
    const src = readFileSync(f, 'utf8')
    if (/<style\s+jsx/.test(src)) styledJsxHits.push(f)
  }
}

const failed = missingClasses.length > 0 || missingKeyframes.length > 0 || styledJsxHits.length > 0

if (missingClasses.length > 0) {
  console.error(`\n\x1b[31m✗ [애니메이션 CSS] 빌드 산출물에 없는 클래스 ${missingClasses.length}건:\x1b[0m`)
  console.error('  ' + missingClasses.join(', '))
}
if (missingKeyframes.length > 0) {
  console.error(`\n\x1b[31m✗ [애니메이션 CSS] 빌드 산출물에 없는 @keyframes ${missingKeyframes.length}건:\x1b[0m`)
  console.error('  ' + missingKeyframes.join(', '))
}
if (styledJsxHits.length > 0) {
  console.error(
    `\n\x1b[31m✗ [애니메이션 CSS] 신당 씬에 <style jsx> 가 있습니다 (${styledJsxHits.length}개 파일):\x1b[0m`
  )
  console.error('  ' + styledJsxHits.join('\n  '))
}

if (failed) {
  console.error('\n\x1b[33m  styled-jsx 는 App Router 산출물에 CSS 를 남기지 않습니다.')
  console.error('  연출 CSS 는 app/shrine-scene.css(또는 app/globals.css)에 넣고 컴포넌트에서 import 하세요.\x1b[0m\n')
  process.exit(1)
}

console.log(
  `\x1b[32m✓ [애니메이션 CSS] 클래스 ${REQUIRED_CLASSES.length}종 · @keyframes ${REQUIRED_KEYFRAMES.length}종 실재 확인 ` +
    `(CSS 청크 ${files.length}개)\x1b[0m`
)
process.exit(0)
