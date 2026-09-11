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
const VERCEL_URL_READ = 'process.env.VERCEL_URL'

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

  /**
   * 실제 사고(2026-09-01 프로덕션 실측): app/layout.tsx 의 metadataBase 가
   * `https://${process.env.VERCEL_URL}` 이었다. VERCEL_URL 은 배포마다 바뀌는 호스트이고
   * 배포 보호가 걸려 있어 크롤러에게 302 를 돌려준다 — og:image 가 그 주소로 나가
   * 카카오톡·페이스북 공유 미리보기가 전부 빈칸이었다.
   *
   * 링크·이미지 주소로 쓸 origin 은 언제나 정본 도메인이어야 한다. VERCEL_URL 은
   * «이 배포 인스턴스»의 주소일 뿐 «이 서비스»의 주소가 아니다.
   */
  it(`${VERCEL_URL_READ} 을 읽는 곳은 없다 — origin 은 언제나 정본 도메인`, () => {
    const offenders: string[] = []
    for (const dir of SCAN_DIRS) {
      for (const file of walk(join(ROOT, dir))) {
        const rel = file.slice(ROOT.length + 1)
        if (readFileSync(file, 'utf8').includes(VERCEL_URL_READ)) offenders.push(rel)
      }
    }
    expect(offenders).toEqual([])
  })
})
