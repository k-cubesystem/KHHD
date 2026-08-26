/**
 * 정규화 우회 금지 — 「고쳐놓고 새 코드가 우회하는」 드리프트를 막는 잠금.
 *
 * 실제 사고(2026-08-26 발견): 개행 정규화(getSiteUrl)를 2026-08-16 에 만들어 놓고
 * 그 커밋이 10일간 미배포로 떠 있는 사이, 새 코드 5곳이 다시
 * `process.env.NEXT_PUBLIC_SITE_URL` 을 직접 읽었다. 그 중 2곳은 Threads 게시글·댓글
 * 본문에 링크를 문자열로 이어 붙이는 자리라 URL 한가운데에 개행이 들어가 링크가 끊겼다.
 *
 * 이 테스트는 «정규화 함수가 맞게 동작하는가»가 아니라 «아무도 우회하지 않았는가»를 본다.
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname, '..', '..', '..')
const SCAN_DIRS = ['app', 'lib', 'components']
const ALLOWED = [join('lib', 'utils', 'site-url.ts')]
const ENV_READ = 'process.env.NEXT_PUBLIC_SITE_URL'

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '__tests__') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full)
  }
  return out
}

describe('사이트 URL 정규화 우회 금지', () => {
  it(`${ENV_READ} 을 직접 읽는 곳은 site-url.ts 하나뿐이다`, () => {
    const offenders: string[] = []
    for (const dir of SCAN_DIRS) {
      for (const file of walk(join(ROOT, dir))) {
        const rel = file.slice(ROOT.length + 1)
        if (ALLOWED.some((a) => rel === a)) continue
        if (readFileSync(file, 'utf8').includes(ENV_READ)) offenders.push(rel)
      }
    }
    expect(offenders).toEqual([])
  })
})
