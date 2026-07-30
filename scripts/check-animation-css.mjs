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
  // 신당 밖에서 같은 이유로 죽어 있던 것들 (app/globals.css 이관)
  '.review-marquee-track',
  '.animate-spin-slow',
  '.animate-spin-reverse-slow',
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
  'review-marquee-scroll',
  'spin-slow',
  'spin-reverse-slow',
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
