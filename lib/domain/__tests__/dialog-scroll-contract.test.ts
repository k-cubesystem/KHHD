/**
 * `DialogContent` 자체에 스크롤을 주지 못하게 막는 회귀선 (2026-09-28).
 *
 * ## 🔴 이 테스트가 막는 사고
 * 닫기 X 는 `DialogContent` 기준 `absolute top-4 right-4` 다. 그 DialogContent 에
 * `overflow-y-auto` 를 주면 **X 가 본문과 함께 밀려 올라간다** — 아래로 내려간 사용자는
 * 맨 위까지 되올라와야 닫을 수 있다. 배경화면 시트가 23장이 되며 드러났고(CEO 제보
 * 2026-08-25), 같은 구조가 만세력 7곳·결제 도우미·여정 보상에 그대로 남아 있었다.
 *
 * ## 🔴 고칠 때 함께 걸리는 두 번째 함정
 * 겉을 `overflow-hidden` 으로만 바꾸면 **스크롤이 통째로 죽는다**. `DialogContent` 는 기본이
 * `grid` 이고, grid 트랙은 내용 크기로 잡혀 자식의 `min-h-0` 만으로는 줄어들지 않는다.
 * 그래서 겉에 `flex flex-col` 을 함께 줘야 하고, 본문(`DialogBody`)은 `flex-1` 과 `min-h-0`
 * 이 **둘 다** 있어야 줄어든다. 1차 수정이 정확히 이걸 빠뜨려 화면이 통째로 굳었다.
 *
 * 처방은 `components/ui/dialog.tsx` 의 `DialogBody` 한 곳에 모여 있다.
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

/** `<DialogContent ...>` 여는 태그 한 덩어리씩. */
function dialogContentTags(source: string): string[] {
  return source.match(/<DialogContent\b[^>]*>/g) ?? []
}

const files = SCAN_DIRS.flatMap((d) => collectTsx(path.join(ROOT, d)))

describe('DialogContent 는 스스로 스크롤하지 않는다', () => {
  it('스캔 대상 파일이 실제로 잡힌다 (경로가 틀리면 테스트가 조용히 통과한다)', () => {
    expect(files.length).toBeGreaterThan(100)
    expect(files.some((f) => f.endsWith('dialog.tsx'))).toBe(true)
  })

  it('🔴 어느 DialogContent 에도 overflow-y-auto 가 없다 — 있으면 닫기 X 가 밀려 올라간다', () => {
    const offenders: string[] = []

    for (const file of files) {
      for (const tag of dialogContentTags(fs.readFileSync(file, 'utf8'))) {
        if (/overflow-y-auto|overflow-auto|overflow-y-scroll/.test(tag)) {
          offenders.push(`${path.relative(ROOT, file)} — ${tag.slice(0, 120)}`)
        }
      }
    }

    expect(offenders).toEqual([])
  })

  it('🔴 높이를 제한한 DialogContent 는 flex flex-col 이어야 한다 — grid 면 본문이 안 줄어 스크롤이 죽는다', () => {
    const offenders: string[] = []

    for (const file of files) {
      for (const tag of dialogContentTags(fs.readFileSync(file, 'utf8'))) {
        const capped = /max-h-\[/.test(tag)
        if (!capped) continue
        // 높이를 제한했다면 내용이 넘칠 수 있다는 뜻 → 본문이 줄어들 수 있어야 한다.
        if (!/\bflex\b/.test(tag) || !/\bflex-col\b/.test(tag)) {
          offenders.push(`${path.relative(ROOT, file)} — ${tag.slice(0, 120)}`)
        }
      }
    }

    expect(offenders).toEqual([])
  })

  it('DialogBody 는 flex-1 과 min-h-0 을 함께 준다 (하나만으로는 안 줄어든다)', () => {
    const dialog = fs.readFileSync(path.join(ROOT, 'components', 'ui', 'dialog.tsx'), 'utf8')
    const body = dialog.match(/function DialogBody[\s\S]*?\n}/)?.[0] ?? ''

    expect(body).toContain('flex-1')
    expect(body).toContain('min-h-0')
    expect(body).toContain('overflow-y-auto')
  })
})
