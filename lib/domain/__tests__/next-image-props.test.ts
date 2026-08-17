/**
 * `next/image` 에 `priority` 와 `loading` 을 **함께** 주지 못하게 막는 회귀선 (2026-08-17).
 *
 * ## 🔴 이 테스트가 막는 사고
 * 랜딩 히어로가 두 속성을 같이 넘기고 있었다:
 *
 *   priority={index === 0}
 *   loading={index === 0 ? 'eager' : 'lazy'}
 *
 * 서로 같은 것을 말하는 듯 보이지만, next/image 가 서버와 클라이언트에서 `<img>` 속성을
 * **다르게** 만들어 랜딩 전체가 하이드레이션에 실패했다(React #418). 프로덕션 첫 화면에서
 * 방문자 전원이 겪고 있었는데, 화면은 그럭저럭 그려져서 아무도 신고하지 않았다.
 *
 * 🔴 `priority` 하나면 충분하다 — true 면 즉시 로드, 없으면 next/image 가 lazy 를 붙인다.
 *
 * DOM 중첩 게이트(`jest.setup.js`)와 짝이다: 둘 다 «조용히 깨지는» 부류를 소리 나게 만든다.
 */
import fs from 'fs'
import path from 'path'

const ROOT = path.join(__dirname, '..', '..', '..')
const SCAN_DIRS = ['components', 'app']

function collectTsx(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue
      collectTsx(full, out)
    } else if (entry.name.endsWith('.tsx')) {
      out.push(full)
    }
  }
  return out
}

/** `<Image ... />` 한 덩어리씩. 자식을 갖지 않는 self-closing 사용만 대상으로 한다. */
function imageTags(source: string): string[] {
  return source.match(/<Image\b[\s\S]*?\/>/g) ?? []
}

describe('🔴 next/image 속성 규율', () => {
  const files = SCAN_DIRS.flatMap((d) => collectTsx(path.join(ROOT, d)))

  it('스캔 대상 파일이 실제로 잡힌다 (게이트가 헛돌지 않는지)', () => {
    expect(files.length).toBeGreaterThan(50)
    expect(files.some((f) => f.endsWith('HeroCarousel.tsx'))).toBe(true)
  })

  it('priority 와 loading 을 함께 주지 않는다 (React #418 재발 방지)', () => {
    const offenders: string[] = []

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8')
      for (const tag of imageTags(source)) {
        const hasPriority = /(?<![\w-])priority(?![\w-])/.test(tag)
        const hasLoading = /(?<![\w-])loading\s*=/.test(tag)
        if (hasPriority && hasLoading) {
          offenders.push(path.relative(ROOT, file))
        }
      }
    }

    expect(offenders).toEqual([])
  })

  it('게이트가 실제로 위반을 잡는다 (자가검증)', () => {
    const violating = `<Image src="/a.jpg" fill priority loading="eager" />`
    const [tag] = imageTags(violating)

    expect(/(?<![\w-])priority(?![\w-])/.test(tag)).toBe(true)
    expect(/(?<![\w-])loading\s*=/.test(tag)).toBe(true)
  })
})
