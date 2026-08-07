/**
 * 표준 와이드 무대 계약 — 「살림과 장소」(PLAN-theme-stage-common-v2 §2)
 *
 * 반가 하나에서 검증된 기하를 16테마 공통 상수로 못 박는다. 이 테스트가 지키는 것은 넷이다.
 *
 *   ① **표준 기하** — 폭 320 · 구역 하나 · 단상/상판 2종 · 앵커 45/50/55·53.5 · 문 없음.
 *      좌표가 테마마다 갈라지면 가족 선반장·의식각·앵커·저장된 배치가 전부 따라 갈라진다.
 *   ② **파서 통과** — parseStageSpec·parseWorld 가 산출물을 그대로 받아 worldActive 가 켜진다.
 *      시드가 어긋나면 parseWorld 는 **부분 채택 없이 항등 폴백**(폭 100)으로 조용히 되돌아간다.
 *   ③ **단일 출처** — 마이그레이션 SQL 이 빌더 재실행 산출과 바이트로 같고, 그 안의 JSON 이
 *      도메인 buildThemeStage 와 값으로 같다. 둘 중 하나만 고치는 길을 막는다.
 *   ④ **뮤럴 용량**(개선 E) — 테마당 벽+바닥 ≤ 1.5MB. 16테마 확산 뒤 LCP 방어.
 *
 * ⚠️ 반가는 시드 대상이 아니다(이미 라이브). 대신 buildThemeStage('banga') 의 구조물이
 *    **반가 라이브 시드와 값이 같은지**를 대조한다 — 표준 기하가 라이브에서 온 것임을 증명하는 자리다.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

import { EL_COLOR, ELEMENTS } from '../energy'
import { FAMILY_SHELF_THEMES } from '../family-shelf'
import { parseStageSpec } from '../stage'
import {
  ALTAR_ANCHOR_X,
  ALTAR_ANCHOR_Y,
  NEUTRAL_LIGHT_COLOR,
  THEME_CODES,
  THEME_STAGE_WIDTH,
  THEME_STAGE_ZONE,
  buildThemeStage,
  themeElement,
} from '../theme-stage'
import geometry from '../theme-stage-geometry.json'
import { WORLD_VIEWPORT_PCT, daecheongZone, parseWorld } from '../world'
import { zoneStage } from '../world-render'
import { ZONES } from '../zones'

const ROOT = path.resolve(__dirname, '../../../..')
const BUILDER = path.join(ROOT, 'scripts', 'shrine-assets', 'build-theme-stage-seed.mjs')
const MIGRATION = path.join(ROOT, 'supabase', 'migrations', '20260807_theme_stage_wide_all.sql')
const BANGA_SQL = path.join(ROOT, 'supabase', 'migrations', '20260806b_banga_remove_door.sql')
const SPEC_DATA = path.join(ROOT, 'scripts', 'shrine-assets', 'spec-data.mjs')
const PUBLIC_DIR = path.join(ROOT, 'public')

/** 시안 1테마 게이트(P2-b)의 대상 — 종각이 목록에 있는지까지 본다 */
const PILOT = 'jonggak'
/** 개선 E — 테마당 뮤럴 2장 합계 상한 */
const MURAL_BUDGET_BYTES = 1.5 * 1024 * 1024

describe('표준 기하 — 16테마가 같은 좌표를 쓴다', () => {
  it.each(THEME_CODES)('%s — 폭 320 · 대청 하나가 세계 전체를 덮는다', (code) => {
    const stage = buildThemeStage(code)
    expect(stage.width).toBe(320)
    expect(stage.width).toBe(THEME_STAGE_WIDTH)
    expect(stage.zones).toHaveLength(1)
    expect(stage.zones[0]).toMatchObject({ code: 'daecheong', x0: 0, x1: 320 })
    expect(THEME_STAGE_ZONE).toEqual({ code: 'daecheong', label: '대청', x0: 0, x1: THEME_STAGE_WIDTH })
  })

  it.each(THEME_CODES)('%s — 뮤럴 경로가 테마 폴더 규칙을 따른다 (장소만 테마별)', (code) => {
    const stage = buildThemeStage(code)
    expect(stage.zones[0].wallpaperUrl).toBe(`/shrine/stage/${code}/room-wall-mural.webp`)
    expect(stage.zones[0].flooringUrl).toBe(`/shrine/stage/${code}/room-floor-mural.webp`)
    // 최상위도 같은 장소를 든다 — zones 를 걷어내는 원복 레버가 백지 방이 되지 않게 한다
    expect(stage.wallpaperUrl).toBe(stage.zones[0].wallpaperUrl)
    expect(stage.flooringUrl).toBe(stage.zones[0].flooringUrl)
  })

  it.each(THEME_CODES)('%s — 살림(단상·상판)은 반가 스프라이트를 공용한다 · 문 구조물은 없다', (code) => {
    const zone = buildThemeStage(code).zones[0]
    // 배열 순서가 곧 그리는 순서(뒤→앞) — 뒤집히면 단상이 상판을 덮는다
    expect(zone.structures.map((s) => s.code)).toEqual([`platform-${code}`, `altar-${code}`])
    expect(zone.structures.map((s) => s.assetUrl)).toEqual([
      '/shrine/stage/banga/platform.webp',
      '/shrine/stage/banga/altar-top.webp',
    ])
    // 문·창문은 처음부터 없다 — 벽 전체가 가족 선반장 자리라는 전제가 전 테마에 같다
    expect(zone.structures.some((s) => s.code.includes('door'))).toBe(false)
    expect(zone.structures.find((s) => s.code === `platform-${code}`)).toMatchObject({ x: 50, y: 51, w: 44 })
    expect(zone.structures.find((s) => s.code === `altar-${code}`)).toMatchObject({ x: 50, y: 58, w: 58 })
  })

  it.each(THEME_CODES)('%s — 제단 앵커 45/50/55 · y 53.5 (34/66 회귀 금지)', (code) => {
    const zone = buildThemeStage(code).zones[0]
    const anchors = zone.structures.find((s) => s.code === `altar-${code}`)?.anchors ?? []
    expect(anchors.map((a) => a.id)).toEqual(['altar-left', 'altar-center', 'altar-right'])
    expect(anchors.map((a) => a.x)).toEqual([45, 50, 55])
    expect(anchors.map((a) => a.y)).toEqual([53.5, 53.5, 53.5])
    expect(anchors.every((a) => a.layer === 'altar')).toBe(true)
    // 단상은 신위가 서는 면이지 배치 지점이 아니다
    expect(zone.structures.find((s) => s.code === `platform-${code}`)?.anchors).toEqual([])
  })

  it('★ 앵커 y 가 ZONES.altar.y 안이다 — 밖이면 드래그 클램프에 막혀 영구 도달 불가', () => {
    const [lo, hi] = ZONES.altar.y
    expect(ALTAR_ANCHOR_Y).toBeGreaterThanOrEqual(lo)
    expect(ALTAR_ANCHOR_Y).toBeLessThanOrEqual(hi)
    expect([...ALTAR_ANCHOR_X]).toEqual([45, 50, 55])
  })

  it('★ 조명색은 오행에서 온다 — 색을 따로 정하지 않는다(EL_COLOR 재사용) · 무속성은 금색', () => {
    for (const code of THEME_CODES) {
      const el = themeElement(code)
      const expected = el === null ? NEUTRAL_LIGHT_COLOR : EL_COLOR[el]
      expect([code, buildThemeStage(code).light.color]).toEqual([code, expected])
    }
    expect(NEUTRAL_LIGHT_COLOR).toBe('#C9A84C')
    // 기하 JSON 의 색표는 EL_COLOR 의 사본이다(mjs 빌더가 TS 를 못 읽어서) — 어긋나면 시드 색이 갈라진다
    expect(geometry.light.elementColor).toEqual(EL_COLOR)
    expect(Object.keys(geometry.light.elementColor).sort()).toEqual([...ELEMENTS].sort())
  })

  it('★ buildThemeStage 는 결정론이다 — 같은 코드는 매번 같은 바이트', () => {
    for (const code of THEME_CODES) {
      expect(JSON.stringify(buildThemeStage(code))).toBe(JSON.stringify(buildThemeStage(code)))
    }
  })

  it('테마 코드 규격 밖이면 시드를 만들지 않는다 — 경로·SQL 리터럴에 그대로 들어가는 값이다', () => {
    expect(() => buildThemeStage("banga'; drop table")).toThrow()
    expect(() => buildThemeStage('../../etc')).toThrow()
  })
})

describe('모집단 — 16테마가 한 목록이다', () => {
  it('★ 확산 목록(FAMILY_SHELF_THEMES)과 기하 목록(THEME_CODES)이 같은 16종이다', () => {
    expect(THEME_CODES).toHaveLength(16)
    expect([...FAMILY_SHELF_THEMES].sort()).toEqual([...THEME_CODES].sort())
    expect(THEME_CODES).toContain(PILOT)
  })

  it('★ 테마 오행이 생성 스펙(spec-data.mjs)과 일치한다 — DB element_affinity 사본의 표류 방지', () => {
    const spec = readFileSync(SPEC_DATA, 'utf8')
    for (const code of THEME_CODES) {
      const line = new RegExp(`code: '${code}',[^\\n]*`).exec(spec)?.[0] ?? ''
      expect([code, line.length > 0]).toEqual([code, true])
      // spec 은 사람 말("목(wood)" · "무속성(기본)")로 적혀 있다 — 괄호 안 오행만 취한다
      const el = /\((wood|fire|earth|metal|water)\)/.exec(line)?.[1] ?? null
      expect([code, themeElement(code)]).toEqual([code, el])
    }
  })
})

describe('파서 통과 — 항등 폴백으로 떨어지지 않는다', () => {
  it.each(THEME_CODES)('%s — parseWorld 가 폭 320 을 채택하고 worldActive 조건을 넘는다', (code) => {
    const raw = buildThemeStage(code)
    const spec = parseStageSpec(raw)
    expect(spec).not.toBeNull()
    const world = parseWorld(spec, raw)
    expect(world.width).toBe(320)
    expect(world.width).toBeGreaterThan(WORLD_VIEWPORT_PCT) // ShrineRoomClient worldActive
    expect(world.zones).toHaveLength(1)
    expect(world.zones[0].label).toBe('대청')
  })

  it.each(THEME_CODES)('%s — 구역 무대가 뮤럴 2장과 구조물 2종을 직접 든다 (승계가 아니다)', (code) => {
    const raw = buildThemeStage(code)
    const spec = parseStageSpec(raw)
    const zone = daecheongZone(parseWorld(spec, raw))
    const stage = zoneStage(zone, spec)
    expect(stage.wallpaperUrl).toBe(`/shrine/stage/${code}/room-wall-mural.webp`)
    expect(stage.flooringUrl).toBe(`/shrine/stage/${code}/room-floor-mural.webp`)
    expect(stage.structures.map((s) => s.code)).toEqual([`platform-${code}`, `altar-${code}`])
    // 광원은 최상위에서 승계된다 — 방 전체가 같은 빛을 받는다
    expect(stage.light).toEqual(spec?.light)
    expect(stage.light?.intensity).toBe(0.5)
    expect(stage.light?.origin).toEqual({ x: 50, y: 52 })
  })

  it('★ tile 키가 없다 — 뮤럴은 반복 에셋이 아니다(repeat-x = 세로선 복귀)', () => {
    for (const code of THEME_CODES) {
      const zoneRaw = buildThemeStage(code).zones[0]
      expect(Object.keys(zoneRaw)).not.toContain('tile')
      expect(daecheongZone(parseWorld(null, buildThemeStage(code))).tile).toBeUndefined()
    }
  })
})

describe('반가 라이브 대조 — 표준 기하는 라이브에서 왔다', () => {
  /** 반가 구역 structures 의 현행 정본 = 문 제거 시드의 $structures2$ 달러 인용 블록 */
  function bangaLiveStructures(): unknown {
    const sql = readFileSync(BANGA_SQL, 'utf8')
    const parts = sql.split('$structures2$')
    if (parts.length !== 3) throw new Error('반가 시드 전제 붕괴: $structures2$ 구분자가 2개가 아니다')
    return JSON.parse(parts[1])
  }

  it('★ buildThemeStage("banga") 의 구조물이 반가 라이브 시드와 값이 같다', () => {
    // 이름(platform-banga / altar-banga)까지 같다 — 표준 기하가 라이브의 복제임을 여기서 못 박는다.
    // 어긋나면 "표준"이라 부르는 좌표가 실제 화면과 다른 것이므로 확산이 그 어긋남을 15배로 퍼뜨린다.
    expect(buildThemeStage('banga').zones[0].structures).toEqual(bangaLiveStructures())
  })

  it('반가는 시드 대상이 아니다 — 마이그레이션에 반가 문장이 없다', () => {
    // 반가 stage 를 다시 찍으면 문 제거·앵커 정정 이력을 덮어쓴다(where 조건도 이미 걸러 주지만
    // 문장 자체를 만들지 않는 것이 계약이다).
    expect(readFileSync(MIGRATION, 'utf8')).not.toContain("where code = 'banga'")
  })
})

describe('단일 출처 — 마이그레이션은 빌더 산출물이다', () => {
  /** 빌더를 그대로 다시 돌린다(파일은 쓰지 않는다) */
  function rebuild(): string {
    return execFileSync(process.execPath, [BUILDER, '--stdout'], { encoding: 'utf8' })
  }

  it('★ 마이그레이션 파일이 빌더 재실행 산출과 바이트로 같다 — 손으로 고쳤으면 여기서 죽는다', () => {
    expect(existsSync(MIGRATION)).toBe(true)
    expect(readFileSync(MIGRATION, 'utf8')).toBe(rebuild())
  })

  /** 마이그레이션 안의 `set stage = '...'::jsonb` 리터럴을 코드별로 뽑는다 */
  function seededStages(): Map<string, unknown> {
    const sql = readFileSync(MIGRATION, 'utf8')
    const re = /set stage = '(\{.*?\})'::jsonb\nwhere code = '([a-z0-9-]+)'/g
    const out = new Map<string, unknown>()
    for (const m of sql.matchAll(re)) out.set(m[2], JSON.parse(m[1]))
    return out
  }

  it('★ 시드 SQL 안의 JSON 이 도메인 buildThemeStage 와 값이 같다 (15테마)', () => {
    const seeded = seededStages()
    const expected = THEME_CODES.filter((c) => c !== 'banga')
    expect([...seeded.keys()]).toEqual(expected)
    for (const [code, stage] of seeded) {
      expect([code, stage]).toEqual([code, JSON.parse(JSON.stringify(buildThemeStage(code)))])
    }
  })

  it('★ 조건절이 이미 두루마리인 테마를 건드리지 않는다 — 재실행·부분 적용이 안전하다', () => {
    const sql = readFileSync(MIGRATION, 'utf8')
    const guards = sql.match(/\(stage -> 'zones'\) is null;/g) ?? []
    expect(guards).toHaveLength(15)
    // 줄 첫머리만 센다 — 주석(원복 레버)의 update 는 문장이 아니다
    expect(sql.match(/^update public\.shrine_theme_packs set stage = /gm) ?? []).toHaveLength(15)
  })

  it('SQL 문자열 리터럴을 끊는 작은따옴표가 JSON 안에 없다', () => {
    for (const code of THEME_CODES) expect(JSON.stringify(buildThemeStage(code))).not.toContain("'")
  })
})

describe('뮤럴 — 실재하는 테마만 재고, 용량은 상한 안이다 (개선 E)', () => {
  function muralBytes(code: string): number | null {
    const files = [`room-wall-mural.webp`, `room-floor-mural.webp`].map((f) =>
      path.join(PUBLIC_DIR, 'shrine', 'stage', code, f)
    )
    if (!files.every((f) => existsSync(f))) return null
    return files.reduce((sum, f) => sum + statSync(f).size, 0)
  }

  it.each(THEME_CODES)('%s — 벽+바닥 합계 ≤ 1.5MB (아직 없으면 건너뛴다)', (code) => {
    const bytes = muralBytes(code)
    if (bytes === null) return // 생성 전 테마 — 확산 전에는 그린 유지가 정상이다
    expect([code, bytes <= MURAL_BUDGET_BYTES]).toEqual([code, true])
  })

  it('★ 기준 테마(반가)의 뮤럴은 실재하고 예산 안이다 — 게이트가 통째로 건너뛰어지지 않았다는 증거', () => {
    const bytes = muralBytes('banga')
    expect(bytes).not.toBeNull()
    expect(Number(bytes)).toBeLessThanOrEqual(MURAL_BUDGET_BYTES)
  })
})
