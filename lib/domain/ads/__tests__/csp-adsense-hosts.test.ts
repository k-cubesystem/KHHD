/**
 * 애드센스가 쓰는 호스트가 CSP 에 전부 들어 있는가.
 *
 * 실제 사고(2026-09-01 프로덕션 실측): 20개 페이지 로드 **전부**에서
 *   "Connecting to 'https://ep1.adtrafficquality.google/getconfig/sodar…' violates … connect-src"
 * 가 찍혔다. Sodar 는 애드센스의 무효 트래픽 판정 신호라, 막히면 광고는 그려지지만
 * 트래픽 품질 신호가 구글에 닿지 않는다.
 *
 * 이 잠금이 재는 것은 「CSP 가 있는가」가 아니라 「애드센스가 실제로 부르는 호스트가
 * 지시문에 있는가」다. 도메인을 하나 추가할 때마다 여기 한 줄을 더한다.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

const CONFIG = readFileSync(join(__dirname, '..', '..', '..', '..', 'next.config.ts'), 'utf8')

function directive(name: string): string {
  const m = new RegExp(`"${name} ([^"]+)"`).exec(CONFIG)
  if (!m) throw new Error(`CSP 지시문 ${name} 이 없다`)
  return m[1]
}

describe('CSP — 애드센스 호스트', () => {
  it.each([
    ['pagead2.googlesyndication.com', '광고 요청'],
    ['*.doubleclick.net', '광고 서빙'],
    ['*.adtrafficquality.google', '무효 트래픽 판정(Sodar)'],
  ])('connect-src 에 %s 이 있다 (%s)', (host) => {
    expect(directive('connect-src')).toContain(host)
  })

  it.each([['pagead2.googlesyndication.com'], ['tpc.googlesyndication.com'], ['googleads.g.doubleclick.net']])(
    'script-src 에 %s 이 있다',
    (host) => {
      expect(directive('script-src')).toContain(host)
    }
  )

  it('광고 본문 iframe(safeframe)이 frame-src 에 있다', () => {
    const frame = directive('frame-src')
    expect(frame).toContain('tpc.googlesyndication.com')
    expect(frame).toContain('googleads.g.doubleclick.net')
  })

  it("default-src 를 넓혀서 통과시키지 않았다 — 'self' 그대로", () => {
    expect(directive('default-src')).toBe("'self'")
  })
})
