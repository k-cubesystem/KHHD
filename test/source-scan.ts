/**
 * 소스 스캐너 — 「호출부가 규칙을 지키는가」를 타입이 아니라 **본문으로** 재는 게이트용.
 *
 * 타입으로 막을 수 없는 규칙이 있다(선택 인자를 안 넘기면 조용히 0 이 되는 것 따위).
 * 그런 규칙은 소스를 훑어서 막는다. 스캐너가 조용히 0건이 되면 게이트가 아니므로,
 * 쓰는 쪽에서 **대상 건수의 하한**도 함께 확인할 것.
 */
import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = join(__dirname, '..')
const SKIP_DIRS = new Set(['node_modules', '.next', '__tests__'])

export interface SourceFile {
  /** 저장소 기준 상대 경로 (구분자는 항상 `/`) */
  file: string
  src: string
}

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (/\.tsx?$/.test(full)) out.push(full)
  }
  return out
}

/** 스캔 대상 소스(기본: app·lib). 테스트 파일은 제외된다. */
export function sourceFiles(dirs: string[] = ['app', 'lib']): SourceFile[] {
  return dirs
    .flatMap((dir) => walk(join(ROOT, dir)))
    .map((file) => ({ file: relative(ROOT, file).replace(/\\/g, '/'), src: readFileSync(file, 'utf8') }))
}

/** 주석이 아닌 줄만 — 규칙을 «설명하는» 주석이 위반으로 잡히지 않게. */
export function codeLines(src: string): string[] {
  return src.split('\n').filter((line) => {
    const t = line.trim()
    return t.length > 0 && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
  })
}
