/**
 * 디자인 토큰 가드 — 커밋되는 파일에서 하드코딩된 브랜드 컬러 rgba를 검출한다.
 *
 * gold-500(#C9A84C=201,168,76)과 seal(#9E2B2B=158,43,43)은 Tailwind 토큰이 존재하므로
 * inline rgba 대신 `bg-gold-500/[0.03]`, `border-seal/[0.2]` 형태를 사용해야 한다.
 *
 * 현재는 비차단 경고(전환기). 전체 마이그레이션 완료 후 process.exit(1)로 전환하면
 * 재발을 완전히 차단할 수 있다.
 *
 * lint-staged가 스테이징된 파일 경로를 인자로 전달한다.
 */

import { readFileSync } from 'node:fs'

const BANNED = [
  { pattern: /rgba\(\s*201\s*,\s*168\s*,\s*76/g, token: 'gold-500/[opacity]' },
  { pattern: /rgba\(\s*158\s*,\s*43\s*,\s*43/g, token: 'seal/[opacity]' },
]

const files = process.argv.slice(2)
let totalHits = 0
const report = []

for (const file of files) {
  if (!/\.(tsx?|jsx?)$/.test(file)) continue
  let content
  try {
    content = readFileSync(file, 'utf8')
  } catch {
    continue
  }
  const lines = content.split('\n')
  lines.forEach((line, i) => {
    for (const { pattern, token } of BANNED) {
      pattern.lastIndex = 0
      if (pattern.test(line)) {
        totalHits++
        report.push(`  ${file}:${i + 1} → use ${token}`)
      }
    }
  })
}

if (totalHits > 0) {
  console.warn('\n\x1b[33m⚠ [디자인 토큰] 하드코딩된 브랜드 컬러 %d건 발견 (토큰 사용 권장):\x1b[0m', totalHits)
  console.warn(report.slice(0, 20).join('\n'))
  if (report.length > 20) console.warn(`  … 외 ${report.length - 20}건`)
  console.warn('\x1b[2m  gold-500(#C9A84C)·seal(#9E2B2B)는 rgba 대신 Tailwind 토큰을 사용하세요. (경고 — 커밋은 계속됨)\x1b[0m\n')
}

// 전환기: 항상 통과. 전체 마이그레이션 후 상단 주석대로 exit(1)로 전환.
process.exit(0)
