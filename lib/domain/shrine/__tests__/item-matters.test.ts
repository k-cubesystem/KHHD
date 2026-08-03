import { readFileSync } from 'node:fs'
import path from 'node:path'
import { isObangkiMatter, mattersLabel, parseMatters, suitsMatter } from '../item-matters'
import { OBANGKI_MATTERS } from '@/lib/domain/ritual/obangki'

const read = (rel: string): string => readFileSync(path.join(process.cwd(), rel), 'utf8')
const MIGRATION = read('supabase/migrations/20260803_shrine_items_expand.sql')

describe('신물 갈래 — 문복과 같은 말을 쓴다', () => {
  it('★ DB CHECK 의 갈래 목록이 오방기 문복 7종과 정확히 같다', () => {
    const check = /matters <@ array\[([^\]]+)\]/.exec(MIGRATION)?.[1] ?? ''
    const inSql = check
      .split(',')
      .map((s) => s.trim().replace(/^'|'$/g, ''))
      .filter(Boolean)
      .sort()
    expect(inSql).toEqual([...OBANGKI_MATTERS].sort())
  })

  it('아는 갈래만 통과시킨다', () => {
    for (const m of OBANGKI_MATTERS) expect(isObangkiMatter(m)).toBe(true)
    for (const v of ['jesu', '재수', '', null, undefined, 3, {}]) expect(isObangkiMatter(v)).toBe(false)
  })

  it('모르는 값은 버리고, 중복은 한 번만 남긴다', () => {
    expect(parseMatters(['jaesu', 'nope', 'jaesu', 'teo'])).toEqual(['jaesu', 'teo'])
    expect(parseMatters(null)).toEqual([])
    expect(parseMatters('jaesu')).toEqual([])
  })

  it('갈래를 우리말 한 줄로 적는다', () => {
    expect(mattersLabel(['jaesu', 'teo'])).toBe('재수 · 터')
    expect(mattersLabel([])).toBe('두루')
  })

  it('★ 갈래가 빈 물건은 어느 갈래에도 걸린다 — 두루 쓰는 물건이 상점에서 사라지면 안 된다', () => {
    for (const m of OBANGKI_MATTERS) expect(suitsMatter([], m)).toBe(true)
    expect(suitsMatter(['jaesu'], 'jaesu')).toBe(true)
    expect(suitsMatter(['jaesu'], 'mom')).toBe(false)
  })
})

describe('신물 카탈로그 — 늘린 만큼 값이 채워져 있다', () => {
  // ⚠️ 한 항목이 세 줄에 걸쳐 있다 — 줄 단위로 자르면 이름만 잡히고 오행·전거를 놓친다.
  //    새 항목은 줄머리 '(' 에서 시작하므로 거기서 끊는다.
  const items = MIGRATION.slice(MIGRATION.indexOf("('신칼'"), MIGRATION.indexOf('on conflict (name) do update'))
    .split(/\n(?=\()/)
    .map((s) => s.trim())
    .filter((s) => s.startsWith("('"))

  /** (이름, 설명, 전거, 종류, 오행) 다섯 칸을 한 번에 본다 */
  const SHAPE = /^\('([^']+)',\s*'[^']+',\s*'([^']+)',\s*'([a-z_]+)',\s*'(wood|fire|earth|metal|water)'/

  it('신규 32종이 오행 다섯을 고루 채운다 (용신은 사람마다 다르다)', () => {
    expect(items).toHaveLength(32)
    const tally: Record<string, number> = {}
    for (const it of items) {
      const el = SHAPE.exec(it)?.[4]
      if (el) tally[el] = (tally[el] ?? 0) + 1
    }
    for (const el of ['wood', 'fire', 'earth', 'metal', 'water']) {
      // 한 오행이 비면 그 기운이 모자란 사람은 채울 물건이 없다
      expect([el, (tally[el] ?? 0) >= 5]).toEqual([el, true])
    }
  })

  it('★ 모든 신물에 이름·설명·전거·종류·오행이 다 있다 — 지어낸 물건을 팔지 않는다', () => {
    for (const it of items) {
      const m = SHAPE.exec(it)
      const head = it.slice(0, it.indexOf(',') + 1)
      expect([head, m !== null]).toEqual([head, true])
      // 전거가 빈 문자열이면 형태만 맞고 출처는 없는 것이다
      expect([head, (m?.[2] ?? '').trim().length > 5]).toEqual([head, true])
    }
  })

  it('무구 분류가 카테고리 축에 들어와 있다 (도검·명경·무선·신대·무악기·지물)', () => {
    for (const t of ['blade', 'mirror', 'fan', 'pole', 'drum', 'paper', 'cloth', 'screen']) {
      expect([t, MIGRATION.includes(`'${t}'`)]).toEqual([t, true])
    }
  })
})
