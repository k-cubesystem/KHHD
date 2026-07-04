/**
 * 디자인 토큰 가드 — 커밋되는 파일에서 하드코딩된 브랜드 컬러 rgba를 검출한다.
 *
 * 브랜드 골드/레드는 Tailwind 토큰이 존재하므로 inline rgba 대신 토큰+투명도를 쓴다:
 *   rgba(201,168,76,A) → gold-500/[A]   (#C9A84C)
 *   rgba(244,228,186,A) → gold-300/[A]   (#F4E4BA)
 *   rgba(226,213,181,A) → gold-400/[A]   (#E2D5B5)
 *   rgba(158,43,43,A)  → seal/[A]        (#9E2B2B)
 *
 * 예외(검출 제외): 그라디언트·box-shadow 내부 rgba, OG 이미지 라우트(Satori는 Tailwind 불가),
 * globals.css(CSS 유틸리티). 토큰이 없는 색(#D4AF37=212,175,55 등)은 대상 아님.
 *
 * 현재는 비차단 경고(전환기). 전체 마이그레이션 완료 후 process.exit(1)로 전환하면 재발 차단.
 * lint-staged가 스테이징된 파일 경로를 인자로 전달한다.
 */

import { readFileSync } from 'node:fs'

const BANNED = [
  { pattern: /rgba\(\s*201\s*,\s*168\s*,\s*76/, token: 'gold-500/[opacity]' },
  { pattern: /rgba\(\s*244\s*,\s*228\s*,\s*186/, token: 'gold-300/[opacity]' },
  { pattern: /rgba\(\s*226\s*,\s*213\s*,\s*181/, token: 'gold-400/[opacity]' },
  { pattern: /rgba\(\s*158\s*,\s*43\s*,\s*43/, token: 'seal/[opacity]' },
]

// Satori(next/og)·CSS 유틸리티는 Tailwind 토큰을 못 쓰므로 제외
const EXCLUDED_FILE = /(?:api[\\/]og[\\/]|opengraph-image|twitter-image|globals\.css)/i
// 그라디언트/그림자 내부 rgba는 정당한 inline 사용 → 스킵
const EXEMPT_LINE = /gradient|box-?shadow|shadow-\[|drop-shadow|filter\s*:/i

const files = process.argv.slice(2)
let totalHits = 0
const report = []

for (const file of files) {
  if (!/\.(tsx?|jsx?)$/.test(file)) continue
  if (EXCLUDED_FILE.test(file)) continue
  let content
  try {
    content = readFileSync(file, 'utf8')
  } catch {
    continue
  }
  content.split('\n').forEach((line, i) => {
    if (EXEMPT_LINE.test(line)) return
    for (const { pattern, token } of BANNED) {
      if (pattern.test(line)) {
        totalHits++
        report.push(`  ${file}:${i + 1} → use ${token}`)
      }
    }
  })
}

if (totalHits > 0) {
  console.warn('\n\x1b[33m⚠ [디자인 토큰] 하드코딩된 브랜드 컬러 %d건 (토큰 사용 권장):\x1b[0m', totalHits)
  console.warn(report.slice(0, 20).join('\n'))
  if (report.length > 20) console.warn(`  … 외 ${report.length - 20}건`)
  console.warn('\x1b[2m  gold-500/300/400·seal은 rgba 대신 Tailwind 토큰을 쓰세요. (경고 — 커밋은 계속됨)\x1b[0m\n')
}

// 전환기: 항상 통과. 전체 마이그레이션 후 상단 주석대로 exit(1)로 전환.
process.exit(0)
