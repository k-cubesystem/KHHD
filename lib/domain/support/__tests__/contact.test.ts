/**
 * 「1:1 문의」 이름 통일 — 회귀 방지 (2026-08-26).
 *
 * 같은 창구를 화면마다 다르게 부르고 있었다(푸터 「고객센터」 · 결제 오류 「고객센터로 문의해주세요」 ·
 * 취소 화면 「고객센터로 문의하기」). 정작 그 셋이 가리키는 곳은 하나였고, 이름이 물건을 감춰서
 * CEO 조차 «1:1 문의 게시판을 넣어 달라»고 했다 — 이미 있었는데도.
 *
 * 이 테스트가 지키는 것 둘:
 *  ① 화면 문구에 「고객센터」가 **다시 나타나지 않는다** (없는 물건을 가리키는 이름이다).
 *  ② 창구의 이름·주소가 코드와 번역 양쪽에서 **한 값**이다.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { SUPPORT_ASK, SUPPORT_ASK_REPEAT, SUPPORT_CTA, SUPPORT_HREF, SUPPORT_LABEL } from '../contact'

const ROOT = process.cwd()
const BANNED = '고객센터'

/**
 * 이력을 적어 둔 곳은 예외다 — 「되돌리지 말 것」을 적으려면 옛 이름을 불러야 한다.
 * 🔴 이 목록을 늘려서 테스트를 통과시키지 말 것. 화면 문구는 여기 들어올 일이 없다.
 */
const HISTORY_ALLOWED = new Set([
  path.join('components', 'site-footer.tsx'),
  path.join('lib', 'domain', 'support', 'contact.ts'),
])

const SCAN_DIRS = ['app', 'components', 'lib', 'messages']
const SCAN_EXT = new Set(['.ts', '.tsx', '.json'])

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '__tests__' || name.startsWith('.')) continue
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (SCAN_EXT.has(path.extname(name))) out.push(full)
  }
  return out
}

describe('창구 이름 — 「고객센터」는 화면에 없다', () => {
  const files = SCAN_DIRS.flatMap((d) => walk(path.join(ROOT, d))).map((f) => path.relative(ROOT, f))

  it('훑을 파일을 실제로 모았다 (0건이면 이 테스트가 무의미해진다)', () => {
    expect(files.length).toBeGreaterThan(200)
  })

  it('🔴 이력 주석 두 곳 말고는 어디에도 「고객센터」가 없다', () => {
    const hits = files.filter((f) => readFileSync(path.join(ROOT, f), 'utf8').includes(BANNED))
    expect(hits.filter((f) => !HISTORY_ALLOWED.has(f))).toEqual([])
  })

  it('번역(ko·en)에도 옛 이름이 남지 않았다', () => {
    for (const locale of ['ko.json', 'en.json']) {
      const raw = readFileSync(path.join(ROOT, 'messages', locale), 'utf8')
      expect(raw).not.toContain(BANNED)
      expect(raw).not.toContain('contact support')
    }
  })
})

describe('창구의 이름·주소가 한 값이다', () => {
  it('이름은 「1:1 문의」, 주소는 문의 게시판', () => {
    expect(SUPPORT_LABEL).toBe('1:1 문의')
    expect(SUPPORT_HREF).toBe('/protected/support')
  })

  it('파생 문구가 전부 그 이름을 쓴다 — 이름만 바꾸면 전부 따라온다', () => {
    for (const line of [SUPPORT_ASK, SUPPORT_ASK_REPEAT, SUPPORT_CTA]) {
      expect(line).toContain(SUPPORT_LABEL)
    }
  })

  it('겹말을 쓰지 않는다 — 게시판에는 «남기는» 것이지 «문의로 문의»하는 것이 아니다', () => {
    expect(SUPPORT_ASK).not.toContain('문의를 문의')
    expect(SUPPORT_ASK).not.toContain('문의로 문의')
    expect(SUPPORT_ASK).toContain('남겨주세요')
  })

  it('푸터가 이 주소를 가리킨다', () => {
    const footer = readFileSync(path.join(ROOT, 'components', 'site-footer.tsx'), 'utf8')
    expect(footer).toContain(SUPPORT_HREF)
  })
})
