/**
 * 애드센스가 쓰는 호스트가 CSP 에 전부 들어 있는가.
 *
 * 실제 사고(2026-09-01 프로덕션 실측): 20개 페이지 로드 **전부**에서
 *   "Connecting to 'https://ep1.adtrafficquality.google/getconfig/sodar…' violates … connect-src"
 * 가 찍혔다. Sodar 는 애드센스의 무효 트래픽 판정 신호라, 막히면 광고는 그려지지만
 * 트래픽 품질 신호가 구글에 닿지 않는다.
 *
 * 🔴 후속 실측(같은 날 배포 직후): connect-src **만** 열었더니 getconfig 는 통과하고
 * 그다음 sodar2.js 로드가 script-src 에 막혀, 이번엔 «Uncaught (in promise) undefined» 가
 * 전 페이지에 떴다. 부분적으로 여는 것이 아무것도 안 여는 것보다 나쁠 수 있다 —
 * 그래서 이 잠금은 세 지시문을 **함께** 잰다.
 *
 * 재는 것은 「CSP 가 있는가」가 아니라 「애드센스가 실제로 부르는 호스트가 지시문에 있는가」다.
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

  it.each([
    ['pagead2.googlesyndication.com'],
    ['tpc.googlesyndication.com'],
    ['googleads.g.doubleclick.net'],
    ['*.adtrafficquality.google'],
  ])('script-src 에 %s 이 있다', (host) => {
    expect(directive('script-src')).toContain(host)
  })

  it('광고 본문 iframe(safeframe)이 frame-src 에 있다', () => {
    const frame = directive('frame-src')
    expect(frame).toContain('tpc.googlesyndication.com')
    expect(frame).toContain('googleads.g.doubleclick.net')
    expect(frame).toContain('*.adtrafficquality.google')
  })

  it('Sodar 호스트는 세 지시문에 모두 있다 — 하나만 열면 실패 지점만 뒤로 밀린다', () => {
    const missing = (['connect-src', 'script-src', 'frame-src'] as const).filter(
      (d) => !directive(d).includes('*.adtrafficquality.google')
    )
    expect(`빠진 지시문: ${missing.join(', ')}`).toBe('빠진 지시문: ')
  })

  it("default-src 를 넓혀서 통과시키지 않았다 — 'self' 그대로", () => {
    expect(directive('default-src')).toBe("'self'")
  })
})
