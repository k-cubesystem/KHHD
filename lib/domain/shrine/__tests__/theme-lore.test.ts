import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { OBANGKI_MATTERS } from '@/lib/domain/ritual/obangki'
import { DEITY_AVATARS } from '@/lib/domain/family/avatars'

/**
 * 테마 16종 로어 계약 — 문자열이 네 곳에 산다: 마이그레이션(DB)·spec-data(생성 프롬프트)·
 * 로더 둘(scene.ts / deities.ts). 어긋나면 화면은 조용히 빈 줄이 된다.
 */

const read = (rel: string): string => readFileSync(path.join(process.cwd(), rel), 'utf8')
const MIGRATION = read('supabase/migrations/20260805b_shrine_themes_16.sql')
const SPEC = read('scripts/shrine-assets/spec-data.mjs')
const SCENE = read('app/actions/shrine/scene.ts')
const DEITIES_ACTION = read('app/actions/shrine/deities.ts')
const GRID = read('components/store/ThemeShopGrid.tsx')

const EXISTING = ['choga', 'banga', 'yonggung', 'dokkaebi', 'seolbit', 'daljip', 'hongsal', 'byeolbat']
const NEW = ['dangsan', 'yeondeung', 'seonang', 'jangdok', 'daejanggan', 'jonggak', 'saemgut', 'naru']
const ALL16 = [...EXISTING, ...NEW]

describe('테마 16종 — 코드·이미지·스펙이 한 벌이다', () => {
  it('★ 마이그레이션이 16종 전부를 다룬다 (기존 8 소급 + 신규 8)', () => {
    for (const code of ALL16) expect([code, MIGRATION.includes(`'${code}'`)]).toEqual([code, true])
  })

  it('★ 방 그림(room.webp)이 16종 전부 실재한다 — 카드가 실그림을 쓰기 시작했다', () => {
    for (const code of ALL16) {
      const p = path.join(process.cwd(), 'public', 'shrine', 'themes', code, 'room.webp')
      expect([code, existsSync(p)]).toEqual([code, true])
    }
  })

  it('생성 스펙(spec-data)에도 16종이 있다 — 재생성 시 누락되지 않는다', () => {
    for (const code of ALL16) expect([code, SPEC.includes(`code: '${code}'`)]).toEqual([code, true])
  })
})

describe('테마 로어 — 갈래·신위가 실재하는 것만 가리킨다', () => {
  const deityIds = new Set(DEITY_AVATARS.map((d) => d.id))

  it('★ matters 는 오방기 문복 7종 안에서만 논다 (DB CHECK 와 같은 목록)', () => {
    const check = /matters <@ array\[([^\]]+)\]/.exec(MIGRATION)?.[1] ?? ''
    const inSql = check
      .split(',')
      .map((s) => s.trim().replace(/^'|'$/g, ''))
      .filter(Boolean)
      .sort()
    expect(inSql).toEqual([...OBANGKI_MATTERS].sort())
  })

  it('★ 궁합 신위 코드가 전부 17신위 카탈로그에 실재한다 — 없는 신을 가리키면 빈 칩이 된다', () => {
    // migration 안의 deity 배열 리터럴만 골라 본다: array['sansin','seongju']::text[] 꼴 중 신위 목록
    const arrays = [...MIGRATION.matchAll(/array\[([^\]]+)\]::text\[\]/g)].map((m) =>
      m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, ''))
    )
    const deityArrays = arrays.filter((a) => a.every((v) => !OBANGKI_MATTERS.includes(v as never)))
    expect(deityArrays.length).toBeGreaterThanOrEqual(16)
    for (const arr of deityArrays) {
      for (const code of arr) expect([code, deityIds.has(code)]).toEqual([code, true])
    }
  })

  it('오행 분포 — 어느 기운이 마른 사주든 갈 자리가 있다 (木2 火3 土3 金3 水3)', () => {
    const count = (el: string) => [...MIGRATION.matchAll(new RegExp(`'${el}', 0, 0, 1`, 'g'))].length
    // 신규 8종만 이 마이그레이션에서 오행을 선언한다 (기존 8은 element_affinity 기왕값)
    expect(count('wood')).toBe(1)
    expect(count('fire')).toBe(1)
    expect(count('earth')).toBe(2)
    expect(count('metal')).toBe(2)
    expect(count('water')).toBe(2)
  })

  it('★ 스토리·사주 노트가 신규 8종 전부에 있다 — 빈 로어는 빈 카드다', () => {
    // 신규 행은 (code, name, ...) values 블록에 스토리 두 문장이 따른다
    const inserts = MIGRATION.slice(MIGRATION.indexOf('insert into public.shrine_theme_packs'))
    for (const code of NEW) {
      const at = inserts.indexOf(`('${code}'`)
      expect([code, at >= 0]).toEqual([code, true])
      // 다음 신규 행 시작(또는 on conflict) 전까지가 이 테마의 블록이다 —
      // '),' 로 끊으면 assets jsonb 안의 ')' 에 걸려 스토리 줄까지 못 간다
      const nextStarts = NEW.map((c) => inserts.indexOf(`('${c}'`)).filter((i) => i > at)
      const end = Math.min(...nextStarts, inserts.indexOf('on conflict'))
      const block = inserts.slice(at, end)
      // 스토리(마침표 2+)와 사주 노트(— 문장) 실재
      expect([code, (block.match(/\./g) ?? []).length >= 3]).toEqual([code, true])
      expect([code, block.includes('사주') || block.includes('명식')]).toEqual([code, true])
    }
  })
})

describe('테마 로어 — 로더와 화면이 실어 나른다', () => {
  it('★ 두 로더가 같은 필드를 매핑한다 (scene.loadThemes · deities.listThemePacks)', () => {
    for (const src of [SCENE, DEITIES_ACTION]) {
      expect(src).toContain('sajuNote')
      expect(src).toContain('deityCodes')
      expect(src).toContain('parseMatters(p.matters)')
    }
  })

  it('★ 카드가 로어 넉 줄을 그린다 — 스토리·기운·궁합 신·기도·사주', () => {
    expect(GRID).toContain('pack.story')
    expect(GRID).toContain('pack.sajuNote')
    expect(GRID).toContain('deityNames(pack.deityCodes)')
    expect(GRID).toContain('mattersLabel(pack.matters)')
    expect(GRID).toContain('room.webp')
  })
})
