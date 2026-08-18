/**
 * 어드민 팔레트 회귀선 (2026-08-19).
 *
 * ## 🔴 「디자인이 뒤죽박죽」의 뿌리
 * 어드민만 제품과 **다른 팔레트**를 쓰고 있었다 — 회색조 `stone-*` 742곳
 * (제품은 오방색, `DESIGN.md`). 같은 서비스인데 다른 앱처럼 보인 이유가 이것이었다.
 * 카드 스타일도 세 갈래로 갈라져 있었다.
 *
 * 🔴 어드민 화면을 새로 만들 때 `stone-*` 을 쓰면 다시 갈라진다. 여기서 막는다.
 *    (어드민 **밖**은 대상이 아니다 — 랜딩·로그인은 별개 결이라 그대로 둔다.)
 */
import fs from 'fs'
import path from 'path'

const ROOT = path.join(__dirname, '..', '..', '..')

function adminTsx(): string[] {
  const out: string[] = []
  const walk = (rel: string) => {
    const dir = path.join(ROOT, rel)
    if (!fs.existsSync(dir)) return
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const next = `${rel}/${e.name}`
      if (e.isDirectory()) walk(next)
      else if (e.name.endsWith('.tsx')) out.push(next)
    }
  }
  walk('app/admin')
  walk('components/admin')
  return out
}

/** 주석은 «왜 바꿨나»의 기록이라 옛 클래스 이름이 남아 있어도 된다. 코드 줄만 본다. */
function codeLines(source: string): string[] {
  return source.split('\n').filter((line) => {
    const t = line.trim()
    return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
  })
}

describe('🔴 어드민은 오방색 팔레트를 쓴다', () => {
  const files = adminTsx()

  it('스캔이 실제로 파일을 찾는다 (게이트가 헛돌지 않는지)', () => {
    expect(files.length).toBeGreaterThan(20)
    expect(files).toContain('components/admin/ui/admin-card.tsx')
  })

  it.each(adminTsx())('%s 에 stone-* 회색조가 없다', (file) => {
    const offending = codeLines(fs.readFileSync(path.join(ROOT, file), 'utf8')).filter((l) => /stone-\d/.test(l))

    expect(`${file}: ${offending.length}`).toBe(`${file}: 0`)
  })

  it('게이트가 실제로 위반을 잡는다 (자가검증)', () => {
    const violating = ['  <div className="text-stone-500" />']
    expect(violating.filter((l) => /stone-\d/.test(l)).length).toBe(1)
  })
})

describe('🔴 공용 부품이 존재한다', () => {
  it.each([
    'components/admin/ui/admin-card.tsx',
    'components/admin/ui/page-header.tsx',
    'components/admin/ui/stat-tile.tsx',
  ])('%s 가 있다', (file) => {
    expect(fs.existsSync(path.join(ROOT, file))).toBe(true)
  })

  it('카드에 「세부내용」 토글이 있다 (모든 카드가 상세를 펼칠 수 있어야 한다)', () => {
    const source = fs.readFileSync(path.join(ROOT, 'components/admin/ui/admin-card.tsx'), 'utf8')

    expect(source).toContain('details')
    expect(source).toContain('aria-expanded')
  })

  it('통계 타일이 숫자 자리를 고정한다 (값이 바뀔 때 폭이 흔들리면 깜빡여 보인다)', () => {
    const source = fs.readFileSync(path.join(ROOT, 'components/admin/ui/stat-tile.tsx'), 'utf8')

    expect(source).toContain('tabular-nums')
  })
})
