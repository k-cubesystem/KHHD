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
 *
 * ── 무대 기하 v4 「틀」 (2026-08-10) ─────────────────────────────────────────
 * 위 넷은 **v3(단상+상판) 계약**이고 그대로 산다 — 13테마가 여전히 그 기하를 쓰고, 20260807
 * 시드는 이미 적용된 이력이라 바이트가 동결이다. v4 는 아래 세 describe 가 따로 지킨다:
 *   ⑤ 밴드·마루선이 JSON 단일 출처에서 나오고 렌더가 그 값을 읽는다(하드코딩 회귀 금지).
 *   ⑥ 시범 3테마의 틀이 **접지 45.3 을 건드리지 않고** 위·옆·아래로만 커지고, 제단 앵커가
 *      **틀 상판 실폭 안에서 2열**로 앉는다(2026-08-10 정렬 패스 — J 합성판 실측).
 *   ⑦ v4 마이그레이션도 빌더 산출물이다(0807 과 같은 규율).
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

import { EL_COLOR, ELEMENTS } from '../energy'
import { FAMILY_SHELF_THEMES, FSHELF_ANCHOR_PREFIX, FSHELF_TIERS, FSHELF_UNIT } from '../family-shelf'
import { FIXTURE_DY_RANGE } from '../fixture-offsets'
import {
  DEITY_HEAD_ROOM_Y,
  PODIUM_TOP_Y,
  deityHeadRoomY,
  deityPodiumTopY,
  deityStandBox,
  depthScale,
  depthZ,
  parseStageSpec,
} from '../stage'
import {
  ALTAR_ANCHOR_X,
  ALTAR_ANCHOR_Y,
  GRAND_ALTAR_BOX_H,
  GRAND_ALTAR_CODE_PREFIX,
  GRAND_ALTAR_ANCHOR_X,
  GRAND_ALTAR_ANCHOR_Y,
  GRAND_ALTAR_ITEM_SCALE,
  GRAND_ALTAR_THEMES,
  NEUTRAL_LIGHT_COLOR,
  STAGE_BANDS,
  STAGE_FLOOR_LINE_Y,
  STAGE_GROUND_DROP,
  STAGE_GROUND_LINE_Y,
  STAGE_WALL_GROUND_DROP,
  STAGE_WALL_GROUND_LINE_Y,
  THEME_CODES,
  THEME_STAGE_WIDTH,
  THEME_STAGE_ZONE,
  buildThemeStage,
  buildThemeStageV4,
  grandAltarHeadRoomY,
  grandAltarStructures,
  hasGrandAltar,
  themeElement,
} from '../theme-stage'
import geometry from '../theme-stage-geometry.json'
import { WORLD_VIEWPORT_PCT, daecheongZone, parseWorld } from '../world'
import { zoneStage } from '../world-render'
import { KEEPER_POS, ZONES } from '../zones'

const ROOT = path.resolve(__dirname, '../../../..')
const BUILDER = path.join(ROOT, 'scripts', 'shrine-assets', 'build-theme-stage-seed.mjs')
const MIGRATION = path.join(ROOT, 'supabase', 'migrations', '20260807_theme_stage_wide_all.sql')
const PILOT_MIGRATION = path.join(ROOT, 'supabase', 'migrations', '20260810_theme_stage_v4_pilot.sql')
const STAGE_LAYERS = path.join(ROOT, 'components', 'shrine', 'scene', 'StageLayers.tsx')
const RITUAL_HALL = path.join(ROOT, 'components', 'shrine', 'scene', 'RitualHall.tsx')
const ROOM = path.join(ROOT, 'components', 'shrine', 'scene', 'ShrineRoomClient.tsx')
/** 틀 상판의 세계 x 실폭(스프라이트 실측 최솟값 70% × 틀 폭 60%) — 앵커·아이템이 앉을 수 있는 띠 */
const BOARD_SPAN: readonly [number, number] = [43.4, 56.6]
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

// ── ⑤ 밴드·마루선 (무대 기하 v4) ────────────────────────────────

describe('밴드 — 마루선은 JSON 한 곳에서만 정해진다', () => {
  it('★ 벽 75% · 바닥 27% · 마루선 y73 (CEO "마루바닥을 줄여 달라" 2회)', () => {
    expect(STAGE_BANDS).toEqual({ wall: 75, floor: 27 })
    expect(STAGE_FLOOR_LINE_Y).toBe(73)
    expect(geometry.bands).toEqual(STAGE_BANDS)
  })

  it('★ 두 밴드가 2%p 겹친다 — 겹침이 0 이면 실기기 반올림에서 이음새 틈이 한 줄 뜬다', () => {
    // 바닥재가 벽지 **위에** 그려지므로 보이는 선은 바닥 밴드의 천장이다(= 100 − floor).
    expect(STAGE_FLOOR_LINE_Y).toBe(100 - STAGE_BANDS.floor)
    expect(STAGE_BANDS.wall - STAGE_FLOOR_LINE_Y).toBe(2)
    expect(STAGE_BANDS.wall + STAGE_BANDS.floor).toBeGreaterThan(100)
  })

  it('★ StageLayers 가 밴드를 상수로 읽는다 — Tailwind 임의값 하드코딩 회귀 금지', () => {
    // `h-[62%]` 류는 문자열이 정적일 때만 클래스가 생성된다. 상수로 조립할 수 없으니 인라인 style 이
    // 유일한 단일 출처 경로다 — 옛 리터럴이 하나라도 남으면 밴드가 두 벌이 되어 조용히 갈라진다.
    const src = readFileSync(STAGE_LAYERS, 'utf8')
    expect(src).toContain('STAGE_BANDS')
    expect(src).toContain('STAGE_FLOOR_LINE_Y')
    // 주석은 옛 클래스명을 **기록으로** 인용한다 — 코드에만 없으면 된다
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    for (const dead of ['h-[62%]', 'h-[40%]', 'bottom-[40%]', 'top-[60%]']) expect(code).not.toContain(dead)
  })

  it('★ 거니는 신수 y 가 접지선 파생이다 — 제단과 같은 줄을 밟는다 (CEO 2026-08-25)', () => {
    // 하드코딩(61)이던 시절에는 마루선을 옮길 때마다 신수만 허공에 남았다 — 그래서 파생이다.
    // 🔴 기준이 마루선 → **접지선**으로 바뀌었다. 마루선은 벽과 바닥이 만나는 줄이라 신수가
    //    «방 안»이 아니라 벽 밑동에서 걸었고, 제단 틀은 그보다 9%p 앞에 나와 서 있어 둘이
    //    다른 바닥을 밟는 그림이 됐다(CEO 「자리가 애매해 · 제단 안에서 뛰게 해줘」).
    expect(KEEPER_POS.y).toBe(STAGE_GROUND_LINE_Y)
    expect(KEEPER_POS.y).toBe(82)
    expect(KEEPER_POS.x).toBe(12) // x 는 세로 줄과 무관 — 같이 옮기지 않는다
  })

  it('마루선이 바닥 존 안이다 — 신수가 밟을 마루가 실제로 있다', () => {
    expect(STAGE_FLOOR_LINE_Y).toBeGreaterThanOrEqual(ZONES.floor.y[0])
    expect(KEEPER_POS.y).toBeLessThanOrEqual(ZONES.floor.y[1])
  })

  /**
   * ★ 사방탁자 접지 — **접지선 파생**이다 (2026-08-10 · CEO 실기기 검수 2회)
   *
   * 1차 "틀과 선반들이 공중에 떠 있어. 마루 라인에 맞춰서 내려와야 해." → 밑동 62 → 마루선(73) 파생.
   * 2차 "선반과 틀 같은 건 마루 3/1은 자리를 잡아야 해." → 마루선에 발끝만 걸친 그림이 «벽에 기댄»
   *     것으로 읽혔다. 파생 기준을 **접지선**(마루선 + 바닥밴드/3 = 82)으로 한 칸 옮긴다.
   *
   * 3차 (2026-08-12) "틀 자리는 맞고, **선반과 간판은 좀 더 뒤로** 가야 해."
   *     틀과 사방탁자를 같은 줄에 세운 것이 v5 의 남은 오차였다 — 틀은 방에 나와 선 제단이고
   *     사방탁자는 벽에 붙여 두는 벽 살림인데 나란히 앞에 서니 벽 가구가 배경에서 떠 보인다.
   *     그래서 **벽 접지선**(마루선 + 바닥밴드/9 = 76)이 갈라져 나온다 — 여전히 파생이다.
   *
   * 처방은 셋을 함께 지킨다:
   *   · 밑동 = **파생**(신수 KEEPER_POS 와 같은 규약) — 다음 마루선 이동은 공짜다.
   *   · 상자 높이를 바꿀 때는 top·bottom 을 **한 상수(FSHELF_H)로** 묶는다 → 스프라이트 왜곡 0.
   *   · 진열 아이템 동반 이동은 v6 에서 **하지 않는다**(자유 배치는 사용자가 거기에 둔 물건이다).
   */
  it('★ 사방탁자 밑동이 벽 접지선 파생이다 — 마루가 움직이면 살림도 함께 움직인다', () => {
    expect(FSHELF_UNIT.bottom).toBe(STAGE_WALL_GROUND_LINE_Y)
    expect(FSHELF_UNIT.bottom).toBe(76)
    // 벽 접지선은 틀 접지선보다 **뒤**다 — 이 6%p 가 「선반은 좀 더 뒤로」의 좌표 몫이다
    expect(STAGE_WALL_GROUND_LINE_Y).toBeLessThan(STAGE_GROUND_LINE_Y)
    expect(STAGE_GROUND_LINE_Y - STAGE_WALL_GROUND_LINE_Y).toBe(6)
    expect(FSHELF_UNIT.bottom - FSHELF_UNIT.top).toBe(28)
    expect(FSHELF_UNIT.top).toBe(48)
    /**
     * ★ 의식각은 **자기 상수**를 든다 (v6 · PLAN-family-shelf-v2 §2-B 「착수 전 함정」①)
     * v5 까지는 `top: FSHELF_UNIT.top` 승계였다. 선반장이 B안으로 28%p 가 되는 순간 현판 4문이
     * 같이 찌그러지는 지뢰라, 승계를 끊고 벽 접지선 하나만 공유한다.
     */
    const hall = readFileSync(RITUAL_HALL, 'utf8')
    // import 를 본다 — 주석에는 «승계를 끊었다»는 이력이 남아 있어야 하므로 문자열 대조로는 못 잡는다
    expect(hall).not.toMatch(/^import .*family-shelf.*$/m)
    expect(hall).toContain('STAGE_WALL_GROUND_LINE_Y - RITUAL_HALL_H')
    expect(hall).toContain('bottom: STAGE_WALL_GROUND_LINE_Y')
    // 조절 손잡이는 «미세 조정»으로 남는다 — 덮어야 할 부양분이 0 이다
    expect(FIXTURE_DY_RANGE[1]).toBeGreaterThanOrEqual(STAGE_GROUND_LINE_Y - FSHELF_UNIT.bottom)
  })

  /**
   * ★ 진열 칸이 벽 존 안에 남는가 — 밑동을 내리는 한계선이 여기다.
   *
   * v6 의 진열 칸은 하나다: 앵커 = top + 0.8767·28 − 9.35(아이템 반높이) = **63.20**.
   * v4.1(밑동 73·3단)에서는 맨 아래 칸이 59.42 라 벽 존 상한 60 에 1%p 도 안 남아 있었고,
   * 그것이 「더 못 내린다」의 근거였다. 존을 70 까지 연 지금은 여유가 6.8%p 다.
   */
  it('★ 진열 칸이 벽 존 안에 남는다 — 벽걸이 신물이 칸에 설 수 있어야 한다', () => {
    const h = FSHELF_UNIT.bottom - FSHELF_UNIT.top
    const slotY = FSHELF_UNIT.top + FSHELF_TIERS.boards[0] * h - FSHELF_TIERS.itemLift
    expect(slotY).toBeCloseTo(63.2, 2)
    expect(slotY).toBeLessThanOrEqual(ZONES.wall.y[1])
    // 벽 존은 마루선 위에서 멈춘다 — 그 아래는 마루라 벽걸이가 걸릴 곳이 아니다
    expect(ZONES.wall.y[1]).toBeLessThan(STAGE_FLOOR_LINE_Y)
  })
})

// ── ⑧ 접지선 (무대 기하 v5 「마루 1/3 접지」) ────────────────────

/**
 * ★ 마루선과 접지선은 **다른 줄**이다 (2026-08-10 밤 · CEO "마루 3/1")
 *
 * 마루선(73)은 벽·바닥 뮤럴이 만나는 이음새고, 접지선(82)은 가구의 발이 앉는 자리다. v4.1 까지는
 * 둘이 같은 값이라 구분이 없었고, 그래서 가구가 마루에 발끝만 걸친 채 벽에 붙어 보였다.
 * 여기서 지키는 것은 «둘이 갈라졌다»는 사실과 «갈라진 몫이 파생이다»라는 규율 두 가지다 —
 * 상수 82 를 굽는 순간 다음 마루선 이동에서 가구만 제자리에 남는다(이미 두 번 겪었다).
 */
describe('접지선 — 살림은 마루 1/3 지점에 선다', () => {
  it('★ 접지선 = 마루선 + 바닥밴드/3 = 82 (파생 · 상수 굽기 금지)', () => {
    expect(STAGE_GROUND_DROP).toBe(9)
    expect(STAGE_GROUND_DROP).toBe(STAGE_BANDS.floor / 3)
    expect(STAGE_GROUND_LINE_Y).toBe(82)
    expect(STAGE_GROUND_LINE_Y).toBe(STAGE_FLOOR_LINE_Y + STAGE_GROUND_DROP)
    // 접지선은 마루 안쪽이다 — 마루선과 마루 끝(바닥 존 하한 96) 사이
    expect(STAGE_GROUND_LINE_Y).toBeGreaterThan(STAGE_FLOOR_LINE_Y)
    expect(STAGE_GROUND_LINE_Y).toBeLessThanOrEqual(ZONES.floor.y[1])
  })

  it('★ 마루선·밴드는 그대로 — 움직인 것은 「가구의 발」과, 그 뒤 신수다', () => {
    expect(STAGE_BANDS).toEqual({ wall: 75, floor: 27 })
    expect(STAGE_FLOOR_LINE_Y).toBe(73)
    // 🔴 v5 에서는 신수가 마루선에 남았지만(가구만 내려감), 2026-08-25 CEO 지시로 신수도
    //    가구와 **같은 줄**로 내려왔다 — 제단 앞마당에서 뛰노는 그림을 위해서다.
    expect(KEEPER_POS.y).toBe(STAGE_GROUND_LINE_Y)
    expect(KEEPER_POS.y).toBeGreaterThan(STAGE_FLOOR_LINE_Y)
    // 그래도 마루 안이다 — 바닥 존을 벗어나면 밟을 마루가 없다
    expect(KEEPER_POS.y).toBeLessThanOrEqual(ZONES.floor.y[1])
  })

  /**
   * ★ v5 는 **순수 평행이동**이다 — 크기가 변한 것이 하나도 없다.
   *
   * 이 신당의 사고는 늘 «맞추다가 다른 것이 늘어나는» 자리에서 났다(스프라이트 리패드·상자 높이).
   * v5 가 안전한 이유는 이동뿐이라는 것이고, 그 증거를 수치로 남긴다.
   */
  it('★ 크기 불변 — 틀 세로·신위 키가 v4.1 과 같다 (선반은 v6 에서 의도적으로 줄었다)', () => {
    expect(GRAND_ALTAR_BOX_H).toBe(71.56) // 틀 상자 세로 — CEO 「틀 자리는 맞고」라 손대지 않는다
    // ⚠️ 사방탁자 높이 42 는 v6 에서 **28** 이 됐다(가족선반 B안). 여기가 「크기 불변」의 예외이고,
    //    예외인 이유가 지시 그 자체다 — 「선반은 좀 더 뒤로」에서 뒤로 가는 방법이 작아지는 것이다.
    expect(FSHELF_UNIT.bottom - FSHELF_UNIT.top).toBe(28)
    for (const code of GRAND_ALTAR_THEMES) {
      const box = deityStandBox(deityPodiumTopY(code), deityHeadRoomY(code))
      // v4.1 의 신위 키 = 45.3 − (24.9/23.2/25.6). 발·머리가 같은 +9 라 높이가 그대로다.
      const v41 = PODIUM_TOP_Y - (deityHeadRoomY(code) - STAGE_GROUND_DROP)
      expect([code, box.height]).toEqual([code, `${Math.round(v41 * 1e4) / 1e4}%`])
    }
  })

  /**
   * ★ v6: 살림이 **두 줄**로 갈렸다 (CEO 2026-08-12 ①「틀 자리는 맞고, 선반과 간판은 좀 더 뒤로」)
   *
   * 틀은 접지선(82)에 그대로 서고, 벽 살림(가족 선반장·의식각)만 벽 접지선(76)으로 물러난다.
   * 지키는 것은 «둘이 갈라졌다»와 «둘 다 파생이다» 두 가지다 — 어느 한쪽이라도 리터럴로 굳으면
   * 다음 마루선 이동에서 그쪽만 제자리에 남는다(이미 두 번 겪었다).
   */
  it('★ 살림이 두 줄에 선다 — 틀은 접지선, 벽 살림은 벽 접지선 (둘 다 파생)', () => {
    const frame = grandAltarStructures('banga')[0]
    expect(frame.y + GRAND_ALTAR_BOX_H / 2).toBeCloseTo(STAGE_GROUND_LINE_Y, 6)
    expect(FSHELF_UNIT.bottom).toBe(STAGE_WALL_GROUND_LINE_Y)
    // 벽 접지 깊이 = 틀 접지 깊이의 1/3 — 파생이라 밴드가 움직이면 둘이 같은 비로 따라온다
    expect(STAGE_WALL_GROUND_DROP).toBe(3)
    expect(STAGE_WALL_GROUND_DROP * 3).toBe(STAGE_GROUND_DROP)
    expect(STAGE_WALL_GROUND_LINE_Y).toBe(STAGE_FLOOR_LINE_Y + STAGE_WALL_GROUND_DROP)
    // 의식각도 같은 줄에 선다 — 자기 상수를 들되 벽 접지선 하나만 공유한다(승계 폐지)
    const hall = readFileSync(RITUAL_HALL, 'utf8')
    expect(hall).toContain('const RITUAL_HALL_H = 36')
    expect(hall).toContain('bottom: STAGE_WALL_GROUND_LINE_Y')
  })
})

// ── ⑥ 틀(壇) 16테마 확산 ─────────────────────────────────────────

describe('틀 — 위·옆·아래로만 커진다 (상판면·접지 불변)', () => {
  /** 확산 완료(2026-08-10) — 시범 3테마가 16테마 전량이 됐다. 순서는 THEME_CODES 와 같다. */
  const NOT_A_THEME = 'no-such-theme'

  it('★ 확산 완료 — 16테마 전부가 틀을 든다 (혼재 상태 종료)', () => {
    expect([...GRAND_ALTAR_THEMES]).toEqual([...THEME_CODES])
    expect(GRAND_ALTAR_THEMES).toHaveLength(16)
    expect(GRAND_ALTAR_THEMES.every(hasGrandAltar)).toBe(true)
    // 모르는 코드는 여전히 v3 로 떨어진다 — 이 분기가 사라지면 원복 레버가 함께 사라진다
    expect(hasGrandAltar(NOT_A_THEME)).toBe(false)
    expect(hasGrandAltar('__proto__')).toBe(false)
  })

  /**
   * ★ v3 계보는 살아 있어야 한다 — 그것이 **원복 레버**다.
   *
   * 확산으로 「13테마는 v3 그대로」가 사라졌지만, 20260807 시드(단상+상판)는 여전히 적용된 이력이고
   * 되돌리기는 그 문장을 다시 실행하는 것이다. 그래서 buildThemeStage(v3)는 16테마 전부에서
   * **틀이 아닌** 살림을 계속 만들어야 하고, buildThemeStageV4 와 확실히 갈려야 한다.
   */
  it('★ v3 계보가 그대로 산다 — 16테마 모두 v3≠v4 이고 v3 에는 틀이 없다', () => {
    for (const code of THEME_CODES) {
      expect([code, buildThemeStageV4(code)]).not.toEqual([code, buildThemeStage(code)])
      const v3 = buildThemeStage(code).zones[0].structures
      expect([code, v3.map((s) => s.code)]).toEqual([code, [`platform-${code}`, `altar-${code}`]])
    }
    // 틀 밖 코드는 v3 와 같다(분기 자체가 코드 목록에 매여 있다는 증거)
    expect(buildThemeStageV4(NOT_A_THEME)).toEqual(buildThemeStage(NOT_A_THEME))
  })

  it.each(THEME_CODES)('%s — 틀 1구조물 · 테마별 자산 경로 (J 생성 계약)', (code) => {
    const s = grandAltarStructures(code)
    expect(s).toHaveLength(1)
    expect(s[0].code).toBe(`grand-altar-${code}`)
    // 살림 공용(반가 스프라이트)이 아니라 **테마마다 다른 틀**이다 — 여기가 v3 와 갈리는 지점이다.
    // `-v2` 는 접지 수복본이다(2026-08-10) — 같은 이름 덮어쓰기는 폰·엣지 캐시가 옛 그림을 재사용한다.
    expect(s[0].assetUrl).toBe(`/shrine/stage/${code}/grand-altar-v2.webp`)
    // v5: 시드 y 37.22 → 46.22 (접지선 파생 · 상자 세로 71.56 불변 = 평행이동 +9)
    expect(s[0]).toMatchObject({ x: 50, y: 46.22, w: 60 })
  })

  /**
   * ★ 신위 접지는 틀의 **감실 바닥**이다 — v5 에서 틀과 함께 내려앉는다.
   *
   * v4.1 까지 감실 바닥은 단상 상면(PODIUM_TOP_Y 45.3)과 같은 줄이라 "불변"으로 적혀 있었다.
   * 마루 1/3 접지가 틀을 통째로 9%p 내리면서 그 줄도 54.3 으로 따라갔고, 발만 45.3 에 두면
   * 신위가 감실 안에서 9%p 뜬다. 13테마(단상)는 그대로 45.3 — 분기의 단일 출처는 deityPodiumTopY 다.
   */
  it('★ 신위 접지 — 틀 테마 54.3(감실 바닥) · 틀 없는 무대는 45.3(단상 상면) 그대로', () => {
    expect(PODIUM_TOP_Y).toBe(45.3)
    for (const code of GRAND_ALTAR_THEMES) {
      expect([code, deityPodiumTopY(code)]).toEqual([code, 54.3])
      expect([code, deityPodiumTopY(code)]).toEqual([code, PODIUM_TOP_Y + STAGE_GROUND_DROP])
    }
    // 확산으로 「틀 없는 테마」는 0 이 됐지만 **분기는 살아 있어야** 한다 — 원복 레버(v3)의 착지점이고,
    // 목록을 지우면 라이브 신당의 신위가 한꺼번에 9%p 튄다.
    expect(deityPodiumTopY(NOT_A_THEME)).toBe(PODIUM_TOP_Y)
    // 프로토타입 오염 방어 — 모르는 코드는 단상 상면으로 떨어진다
    expect(deityPodiumTopY('__proto__')).toBe(PODIUM_TOP_Y)
    // 저장된 배치가 앵커를 따라가지 않는 근거는 «배치가 절대 좌표»라는 것이다 —
    // 앵커는 «다음에 놓을 자리»만 정하고, 이번 회차의 동반 이동은 마이그레이션이 맡는다.
    for (const code of GRAND_ALTAR_THEMES) {
      expect(grandAltarStructures(code)[0].anchors.every((a) => a.layer === 'altar')).toBe(true)
    }
  })

  /**
   * ★ 2열 5점 — 한 줄 5점이 왜 안 됐는지를 수치로 남긴다(J 합성판 실측).
   *
   * 틀은 w50 이고 상판은 그 72% 라 **세계 x 44.4~55.6** 뿐이다. 한 줄에 다섯을 세우면 간격이
   * 2.65%(폰 44px)라 아이템(0.88 배 = 82px)이 절반씩 겹치고, I 확정안의 바깥 두 점(38·62)은
   * 아예 상판 밖 허공이었다. 깊이 두 줄로 나누고 배율을 내리는 것이 그 처방이다.
   */
  it('★ 앵커가 틀 상판 실폭(43.4~56.6) 안에 2열로 앉는다 — 상판 밖 허공 금지', () => {
    // v5: y 만 +9(52.4/55 → 61.4/64). x 는 상판 실폭이 안 변했으므로 그대로다.
    expect([...GRAND_ALTAR_ANCHOR_X]).toEqual([45.7, 50, 54.3, 47.85, 52.15])
    expect([...GRAND_ALTAR_ANCHOR_Y]).toEqual([61.4, 61.4, 61.4, 64, 64])
    // 뒷줄 3점이 앞줄 2점보다 위(=뒤)에 있고, 앞줄은 뒷줄 사이 틈에 엇갈려 놓인다
    const rows = new Map<number, number[]>()
    for (const [i, y] of GRAND_ALTAR_ANCHOR_Y.entries()) rows.set(y, [...(rows.get(y) ?? []), GRAND_ALTAR_ANCHOR_X[i]])
    expect([...rows.keys()]).toEqual([61.4, 64])
    expect(rows.get(61.4)).toHaveLength(3)
    expect(rows.get(64)).toHaveLength(2)
    for (const x of rows.get(64) ?? []) {
      expect(x).toBeGreaterThan(Math.min(...(rows.get(61.4) ?? [])))
      expect(x).toBeLessThan(Math.max(...(rows.get(61.4) ?? [])))
    }
    /**
     * ★ 앞줄이 뒷줄을 덮는가 — 깊이 2열의 존재 이유. 제단 z 밴드가 셋뿐이라 v3 평면(53.5 한 줄)과
     * v5 틀 평면(61.4/64 두 줄)을 한 자로 동시에 가를 수 없다 — 그래서 자(ALTAR_DEPTH_REF)를 틀
     * 무대에서 접지 이동분만큼 통째로 내린다. 스위치를 안 주면 두 줄이 같은 z 로 합쳐져 앞뒤가
     * DOM 순서(배치를 만든 순서)로 넘어간다.
     */
    expect(depthZ('altar', 64, true)).toBeGreaterThan(depthZ('altar', 61.4, true))
    expect(depthZ('altar', 61.4, true)).toBe(depthZ('altar', 52.4))
    expect(depthZ('altar', 64, true)).toBe(depthZ('altar', 55))
    /**
     * 상판 실폭 — 앵커가 밖으로 나가면 «상판 밖 허공»이다(구안 38/62 회귀 금지).
     * v4.1 은 틀이 w50 → w60 이라 상판 세계 폭이 11.25% → **13.2%**(x43.4~56.6)로 넓어졌다.
     */
    for (const x of GRAND_ALTAR_ANCHOR_X) {
      expect(x).toBeGreaterThanOrEqual(BOARD_SPAN[0])
      expect(x).toBeLessThanOrEqual(BOARD_SPAN[1])
    }
  })

  /**
   * ★ 아이템 반폭이 상판을 넘는가 — **예산 게이트**로 남긴다 (2026-08-10 자석 폐지 이후)
   *
   * 종전에는 «앵커 ± 아이템 반폭이 상판 안» 이 강한 계약이었다. 스냅이 좌표를 앵커 값으로 복사했으니
   * 앵커가 곧 아이템 자리였기 때문이다. 자석이 사라진 지금 앵커는 아무것도 놓지 않는다 —
   * 시드에 남긴 **데이터 계약**이고, 후속 「진설 도우미」가 다시 쓸 자리다.
   * 그래서 계약을 «넘지 않는다»에서 «얼마나 넘는지 예산 안»으로 낮춘다. 예산이 터지면 그때는
   * 배율(altarItemScale)이나 앵커 x 를 다시 정할 때다 — 도우미를 되살리기 전에 반드시 본다.
   */
  it('★ 앵커에 아이템을 얹었을 때 상판 넘침이 예산(1%p) 안이다 — 진설 도우미 복원 전 점검선', () => {
    const room = readFileSync(ROOM, 'utf8')
    const mdPx = Number(/md:\s*'(\d+(?:\.\d+)?)px'/.exec(room)?.[1])
    const assetEm = Number(/const ASSET_EM = ([\d.]+)/.exec(room)?.[1])
    expect(Number.isFinite(mdPx) && Number.isFinite(assetEm)).toBe(true)
    // 가장 좁은 폰(360 → 방 352px)에서 세계 1% = 352 × 3.2 / 100 px. 아이템 상자는 CSS px 절대값이라
    // 좁은 기기일수록 «세계 %»로는 커진다 — 넘침이 가장 심한 경우를 기준으로 잰다.
    const worldPctPx = (352 * THEME_STAGE_WIDTH) / 100 / 100
    const halfItemPct = (assetEm * mdPx * GRAND_ALTAR_ITEM_SCALE) / 2 / worldPctPx
    const overhang = Math.max(
      BOARD_SPAN[0] - (Math.min(...GRAND_ALTAR_ANCHOR_X) - halfItemPct),
      Math.max(...GRAND_ALTAR_ANCHOR_X) + halfItemPct - BOARD_SPAN[1]
    )
    expect(overhang).toBeLessThanOrEqual(1)
  })

  it('★ 앵커가 전부 ZONES.altar 안이다 — 밖이면 드래그가 영영 닿지 못한다', () => {
    const [x0, x1] = ZONES.altar.x
    const [y0, y1] = ZONES.altar.y
    for (const x of GRAND_ALTAR_ANCHOR_X) {
      expect(x).toBeGreaterThanOrEqual(x0)
      expect(x).toBeLessThanOrEqual(x1)
    }
    for (const y of GRAND_ALTAR_ANCHOR_Y) {
      expect(y).toBeGreaterThanOrEqual(y0)
      expect(y).toBeLessThanOrEqual(y1)
    }
    // v3(13테마)의 한 줄은 그대로다 — 틀 정렬이 나머지 테마를 건드리지 않았다
    expect([...ALTAR_ANCHOR_X]).toEqual([45, 50, 55])
    expect(ALTAR_ANCHOR_Y).toBe(53.5)
  })

  it('★ 앵커 id 가 중복 없이 5개고 뒷줄 3점은 v3 id 를 승계한다', () => {
    // 중복이면 parseAnchorSpec 이 뒤엣것을 조용히 버려 자리가 사라진다.
    // 승계는 저장된 anchor_id 가 「모르는 자리」로 떨어지지 않게 하는 장치다(스냅 반응·진열 판정).
    const ids = grandAltarStructures('banga')[0].anchors.map((a) => a.id)
    expect(new Set(ids).size).toBe(5)
    expect(ids).toEqual(['altar-left', 'altar-center', 'altar-right', 'altar-front-left', 'altar-front-right'])
    const v3Ids =
      buildThemeStage('banga')
        .zones[0].structures.at(-1)
        ?.anchors.map((a) => a.id) ?? []
    expect(ids.slice(0, 3)).toEqual(v3Ids)
    // 배열 순서가 곧 뒤→앞이다(합성판이 그 순서로 제물을 깐다)
    expect(ids.slice(3).every((id) => id.startsWith('altar-front-'))).toBe(true)
  })

  it('★ 틀은 단상보다 넓고(44→60) 위로 더 뻗는다 — 「더 크고 웅장하게」의 수치', () => {
    const v3 = buildThemeStage('banga').zones[0].structures
    const platform = v3.find((s) => s.code === 'platform-banga')
    const frame = grandAltarStructures('banga')[0]
    expect(frame.w).toBeGreaterThan(Number(platform?.w))
    expect(frame.y).toBeLessThan(Number(platform?.y)) // 중심이 위로 = 닫집만큼 키가 컸다
  })

  /**
   * ★ I(기하)↔J(자산) 경계 게이트 — 여기서만 어긋남이 조용히 산다.
   *
   * 틀은 `w`(구역 폭 %)로만 크기가 정해지고 **세로는 스프라이트 종횡비가 결정한다**. 종횡비가
   * 계약과 다르면 닫집이 창방을 뚫거나(너무 큼) 접지가 마루선 위에 뜬다(너무 작음) — 타입도
   * 파서도 잡지 않고, 404 도 아니라 onError 조차 안 걸린다.
   *
   * 아직 없는 테마는 건너뛴다 — 자산보다 코드가 먼저 나가는 순서가 정상이다.
   *
   * ⚠️ 접지 수복(2026-08-10 · CEO "마루 라인에 맞춰서 내려와야 해") 이후로 이 게이트가 **조여졌다.**
   *    v4.1 은 «상자»만 마루선을 덮었을 뿐 스프라이트 하단에 투명 리패드 여백이 남아 **그려진 받침**은
   *    banga 3.22%p · daljip 1.79%p 위에서 끝나고 있었다(±2%p 허용이 그 어긋남을 통째로 삼켰다).
   *    수복본(`grand-altar-v2.webp`)은 세로 3구간 조각 늘림으로 **캔버스 하단 = 그려진 접지**이므로,
   *    이제 상자 하단이 곧 접지다 — 그래서 허용을 0.2%p 로 좁힌다. 이 등식이 깨지는 유일한 길은
   *    누군가 스프라이트를 다시 굽고 시드 y 를 안 고치는 것이고, 그 순간 여기서 멈춘다.
   *    (수복 도구: `node scripts/shrine-assets/stage-grand-altar-ground.mjs --compose` · API 0회)
   *
   * ⚠️ v5 「마루 1/3 접지」는 이 게이트의 **기준선만** 마루선 → 접지선으로 옮긴다. 상자 세로도
   *    스프라이트도 그대로다 — 세 줄(감실 45.3→54.3 · 상판 60.98→69.98 · 접지 73→82) 사이의 거리가
   *    안 변했으므로 그림을 다시 구울 이유가 없다(검증: `--verify` · 세 장 캔버스 크기 일치).
   */
  it.each(THEME_CODES)('%s — 틀 상자 하단이 접지선 y82 에 정확히 앉는다', (code) => {
    // 경로는 기하 정본에서 온다 — 파일명(-v2)을 테스트가 따로 들면 다음 세대에서 조용히 어긋난다
    const frame = grandAltarStructures(code)[0]
    const file = path.join(PUBLIC_DIR, frame.assetUrl.replace(/^\//, ''))
    if (!existsSync(file)) return
    const buf = readFileSync(file)
    const vp8x = buf.indexOf('VP8X', 12, 'ascii')
    expect(vp8x).toBeGreaterThan(0)
    const px = { w: 1 + buf.readUIntLE(vp8x + 12, 3), h: 1 + buf.readUIntLE(vp8x + 15, 3) }
    // 기준 방 520×620 (banga-wide-seed 의 apparentBand 와 같은 셈)
    const hPct = ((((520 * frame.w) / 100 / px.w) * px.h) / 620) * 100
    const box = { top: frame.y - hPct / 2, bottom: frame.y + hPct / 2 }
    expect([code, Math.abs(box.bottom - STAGE_GROUND_LINE_Y) <= 0.2]).toEqual([code, true])
    // 닫집 꼭대기는 방 안에 남는다 — 0 을 넘어가면 처마가 잘린다.
    // v5 에서 1.44 → 10.44 로 내려와 벽 상부가 9%p 더 열린다(뮤럴 상부 장식이 살 자리).
    expect([code, box.top > 0]).toEqual([code, true])
    expect([code, Math.abs(box.top - 10.44) <= 0.2]).toEqual([code, true])
    // 세 장이 **같은 종횡비**여야 시드 y 한 벌로 세 접지가 함께 마루선에 앉는다
    expect([code, Math.abs(hPct - GRAND_ALTAR_BOX_H) <= 0.2]).toEqual([code, true])
  })

  /**
   * ★ 틀은 **세로 기준**으로 그린다 — 실기기 부양의 진짜 지분이 여기였다 (2026-08-10 접지 수복).
   *
   * 구조물의 기본 규칙은 «폭(구역 폭 %)만 정하고 세로는 스프라이트 종횡비를 따른다» 인데, 그러면
   * 겉보기 세로가 **방의 종횡비**에 딸려 온다. 기준 방(520×620)에서 71.56% 인 틀이 390 폰(382×608)
   * 에서는 53.6% 로 줄어 접지가 마루선보다 **9%p(≈54px) 위**에 떴다 — 스프라이트를 아무리 잘 구워도
   * 실기기에서는 뜬 채로 보였다는 뜻이다. 틀의 계약은 전부 방 y(45.3 · 60.98 · 73)이므로 크기의
   * 기준도 방 세로여야 한다. 기준 방에서는 두 규칙의 결과가 같아 회귀가 0 이다.
   */
  it('★ 틀 상자 세로가 접지선 파생이고 렌더가 그 상수를 읽는다 — 폭 기준 회귀 금지', () => {
    const frame = grandAltarStructures('banga')[0]
    expect(GRAND_ALTAR_BOX_H).toBe(71.56)
    // 상자 하단 = 접지선. 이 등식이 기기와 무관해지는 것이 이 규칙의 전부다.
    expect(frame.y + GRAND_ALTAR_BOX_H / 2).toBeCloseTo(STAGE_GROUND_LINE_Y, 6)
    const src = readFileSync(STAGE_LAYERS, 'utf8')
    expect(src).toContain('GRAND_ALTAR_BOX_H')
    expect(src).toContain('GRAND_ALTAR_CODE_PREFIX')
    // 틀 구조물만 갈린다 — 접두사가 시드의 구조물 code 와 실제로 맞물려 있는가.
    // 확산 뒤에도 **v3 계보(원복 레버)** 는 접두사를 갖지 않아야 한다 — 되돌린 신당이 세로 기준으로
    // 그려지면 단상·상판이 방 높이의 71.56% 로 부풀어 오른다.
    expect(frame.code.startsWith(GRAND_ALTAR_CODE_PREFIX)).toBe(true)
    for (const code of THEME_CODES) {
      for (const s of buildThemeStage(code).zones[0].structures) {
        expect([code, s.code.startsWith(GRAND_ALTAR_CODE_PREFIX)]).toEqual([code, false])
      }
    }
    // 13테마는 종전대로 폭 기준이다 — 이 분기가 새면 라이브 살림 크기가 한꺼번에 변한다
    expect(src).toContain('widthScale')
  })

  /**
   * ★ 렌더 상수 — 밴드와 같은 성질이다(시드에 안 실린다 · 코드 배포가 정본).
   *
   * 배율과 머리 여백은 **틀을 든 테마에서만** 갈린다. 13테마에 새면 라이브 신당의 신물 크기와
   * 신위 키가 한꺼번에 변한다(무손실 위반) — 그 «새지 않음»을 여기서 못 박는다.
   */
  /**
   * ★ 배율의 근거가 바뀌었다 — «셋이 안 겹치는 한계»에서 «형태가 읽히는 크기»로.
   *
   * 자석 폐지(2026-08-10)로 5점 정렬 제약이 사라졌고, 같은 회차에 기본 아이템이 +25% 커졌다
   * (SIZE_PX.md 29 → 36.25, CEO "아이템이 너무 작아 잘 안 보여"). 배율을 그대로 두면 제단 제물만
   * 25% 커지므로 **겉보기 픽셀**을 기준으로 다시 정한다 — 아이템 상자는 CSS px 절대값이라
   * 기기와 무관하게 같은 크기로 그려진다.
   */
  it('★ 제단층 배율은 틀 무대 전용이고 겉보기 ≈70px 이다 — 13테마는 0.88 그대로', () => {
    expect(GRAND_ALTAR_ITEM_SCALE).toBe(0.6)
    expect(geometry.grandAltar.altarItemScale).toBe(GRAND_ALTAR_ITEM_SCALE)
    // 도메인의 유일한 소비처(분기 한 곳 원칙)
    expect(depthScale('altar', 61.4, true)).toBe(GRAND_ALTAR_ITEM_SCALE)
    expect(depthScale('altar', 61.4, false)).toBe(0.88)

    const room = readFileSync(ROOM, 'utf8')
    const mdPx = Number(/md:\s*'(\d+(?:\.\d+)?)px'/.exec(room)?.[1])
    const assetEm = Number(/const ASSET_EM = ([\d.]+)/.exec(room)?.[1])
    // 겉보기 폭 = ASSET_EM × SIZE_PX.md × 배율. 룸이 아이템 치수를 바꾸면 여기서 먼저 걸린다 —
    // 그때 배율' = 70 / (ASSET_EM × 새 md) 로 다시 정한다(theme-stage.ts 주석과 같은 식).
    const shownPx = assetEm * mdPx * GRAND_ALTAR_ITEM_SCALE
    expect(shownPx).toBeGreaterThanOrEqual(64)
    expect(shownPx).toBeLessThanOrEqual(76)
    // 가장 좁은 폰(360 → 방 352px)의 상판 실폭에 둘이 나란히 서고도 남는다
    const boardPx = 0.7 * 0.6 * 352
    expect(shownPx * 2).toBeLessThanOrEqual(boardPx)
  })

  it('★ 신위 머리 여백이 테마별이고 표에 빠진 테마가 없다 — 모르는 코드는 정본 상수(12)', () => {
    // 접지 수복(2026-08-10 낮)으로 틀이 1.28%p 내려앉고, v5 「마루 1/3 접지」에서 다시 9%p 내려왔다.
    // 확산 13종은 각 스프라이트의 **감실 윗턱 실측**에서 왔다(stage-grand-altar-ground.mjs 가 찍어 준다).
    expect(geometry.grandAltar.deityHeadRoomY).toEqual({
      banga: 33.9,
      choga: 36.1,
      yonggung: 31.7,
      dokkaebi: 33.2,
      seolbit: 34.6,
      daljip: 32.2,
      hongsal: 35.5,
      byeolbat: 32.3,
      dangsan: 36.1,
      yeondeung: 34.8,
      seonang: 39.6,
      jangdok: 34.4,
      daejanggan: 34.1,
      jonggak: 34.1,
      saemgut: 36.1,
      naru: 36.0,
    })
    const fromJson = new Map<string, number>(Object.entries(geometry.grandAltar.deityHeadRoomY))
    expect([...fromJson.keys()]).toEqual([...GRAND_ALTAR_THEMES]) // 표에 빠진 테마가 있으면 그 신위만 커진다
    for (const code of GRAND_ALTAR_THEMES) {
      const headRoom = grandAltarHeadRoomY(code)
      expect([code, headRoom]).toEqual([code, fromJson.get(code)])
      expect([code, deityHeadRoomY(code)]).toEqual([code, headRoom])
      // 머리·발이 한 쌍으로 움직인다 = 신위가 감실 «안»에 들어앉은 채 통째로 내려온다
      expect(Number(headRoom)).toBeGreaterThan(DEITY_HEAD_ROOM_Y)
      expect(Number(headRoom)).toBeLessThan(deityPodiumTopY(code))
      expect(deityStandBox(deityPodiumTopY(code), headRoom ?? undefined).groundY).toBe(deityPodiumTopY(code))
    }
    // 틀 밖 코드는 정본 상수로 떨어진다 — 확산 뒤 이 분기가 남아 있는지를 여기서만 지킨다
    expect(grandAltarHeadRoomY(NOT_A_THEME)).toBeNull()
    expect(deityHeadRoomY(NOT_A_THEME)).toBe(DEITY_HEAD_ROOM_Y)
    // 프로토타입 오염 방어 — Map 이라 '__proto__' 가 값으로 새지 않는다
    expect(grandAltarHeadRoomY('__proto__')).toBeNull()
    expect(deityHeadRoomY('__proto__')).toBe(DEITY_HEAD_ROOM_Y)
  })

  it('★ 파서를 통과한다 — 구조물 1종이어도 worldActive·구역 무대가 성립한다', () => {
    for (const code of GRAND_ALTAR_THEMES) {
      const raw = buildThemeStageV4(code)
      const spec = parseStageSpec(raw)
      expect(spec).not.toBeNull()
      const world = parseWorld(spec, raw)
      expect(world.width).toBe(THEME_STAGE_WIDTH)
      const stage = zoneStage(daecheongZone(world), spec)
      expect(stage.structures.map((s) => s.code)).toEqual([`grand-altar-${code}`])
      expect(stage.structures[0].anchors).toHaveLength(5)
    }
  })
})

// ── ⑦ v4 시드도 빌더 산출물이다 ──────────────────────────────────

describe('단일 출처 — v4 시드는 구역 structures 만 갈아끼운다', () => {
  const pilotSql = (): string => readFileSync(PILOT_MIGRATION, 'utf8')

  it('★ v4 마이그레이션이 빌더 재실행 산출과 바이트로 같다', () => {
    expect(existsSync(PILOT_MIGRATION)).toBe(true)
    expect(pilotSql()).toBe(execFileSync(process.execPath, [BUILDER, '--stdout', '--pilot'], { encoding: 'utf8' }))
  })

  it('★ 0807(v3) 시드는 동결이다 — v4 가 이미 적용된 이력을 다시 쓰지 않았다', () => {
    // 같은 빌더가 두 파일을 찍는다. --pilot 없는 산출이 예전 바이트 그대로여야 «13테마 무변경» 이 산다.
    expect(readFileSync(MIGRATION, 'utf8')).toBe(
      execFileSync(process.execPath, [BUILDER, '--stdout'], { encoding: 'utf8' })
    )
    expect(readFileSync(MIGRATION, 'utf8')).not.toContain('grand-altar')
  })

  it('★ 달러 인용 블록의 JSON 이 도메인 grandAltarStructures 와 값이 같다 (16테마)', () => {
    const parts = pilotSql().split('$grandaltar$')
    expect(parts).toHaveLength(2 * GRAND_ALTAR_THEMES.length + 1) // 16문장 × 구분자 2개 + 앞뒤
    const codes = [...GRAND_ALTAR_THEMES]
    for (const [i, code] of codes.entries()) {
      expect([code, JSON.parse(parts[i * 2 + 1])]).toEqual([
        code,
        JSON.parse(JSON.stringify(grandAltarStructures(code))),
      ])
    }
  })

  it('★ 최상위 structures 를 건드리지 않는다 — `stage - zones` 원복 레버의 착지점이다', () => {
    const sql = pilotSql()
    const n = GRAND_ALTAR_THEMES.length
    expect(sql.match(/^update public\.shrine_theme_packs$/gm) ?? []).toHaveLength(n)
    // set 은 zones[0] 스코프 세 자리(structures·wallpaperUrl·flooringUrl)뿐이다.
    // `set stage = '{...}'` 였다면 반가의 레거시 제단이 증발하고, '{structures}' 경로가 있다면
    // 원복 레버(`stage - 'zones'`)의 착지점이 오염된다.
    expect(sql.match(/^set stage = jsonb_set\(jsonb_set\(jsonb_set\(stage,$/gm) ?? []).toHaveLength(n)
    expect(sql.match(/'\{zones,0,structures\}'/g) ?? []).toHaveLength(n)
    expect(sql.match(/'\{zones,0,wallpaperUrl\}'/g) ?? []).toHaveLength(n)
    expect(sql.match(/'\{zones,0,flooringUrl\}'/g) ?? []).toHaveLength(n)
    expect(sql).not.toMatch(/'\{structures\}'/)
    expect(sql).not.toMatch(/^set stage = '/m)
  })

  it('★ 뮤럴은 -v3 파일명이다 — 같은 이름 덮어쓰기는 폰·엣지 캐시가 옛 그림을 재사용한다', () => {
    const sql = pilotSql()
    for (const code of GRAND_ALTAR_THEMES) {
      expect(sql).toContain(`'/shrine/stage/${code}/room-wall-mural-v3.webp'::text`)
      expect(sql).toContain(`'/shrine/stage/${code}/room-floor-mural-v3.webp'::text`)
    }
  })

  it('★ 두루마리가 아닌 행은 건드리지 않는다 — 부분 적용·재실행이 안전하다', () => {
    const guards = pilotSql().match(/jsonb_array_length\(coalesce\(stage -> 'zones', '\[\]'::jsonb\)\) = 1;/g) ?? []
    expect(guards).toHaveLength(GRAND_ALTAR_THEMES.length)
  })

  it('★ 16테마가 빠짐없이 대상이다 — 한 테마만 빠지면 그 신당만 옛 살림으로 남는다', () => {
    const sql = pilotSql()
    for (const code of THEME_CODES) {
      expect([code, sql.includes(`where code = '${code}'`)]).toEqual([code, hasGrandAltar(code)])
      // 확산의 실체 = 테마마다 **자기 틀**을 가리킨다(공용 반가 스프라이트가 아니다)
      expect(sql).toContain(`/shrine/stage/${code}/grand-altar-v2.webp`)
    }
  })
})

// ── ⑨ 배치 동반 이동 SQL (무대 기하 v5) ─────────────────────────

/**
 * ★ 「앵커가 내려가면 어제 놓아 둔 것은 어떻게 되나」 — 코드가 아니라 **마이그레이션**의 몫이다.
 *
 * 배치는 절대 좌표라 앵커를 옮겨도 따라오지 않는다(그것이 무손실의 근거이기도 하다). 그래서
 * 살림을 통째로 내리는 회차마다 «스냅해 둔 것»만 같은 delta 로 미는 SQL 이 한 번 나간다.
 * 여기서 지키는 것은 **그 SQL 에 구운 상수가 코드 상수에서 왔다**는 것과, **재실행이 무해**하다는
 * 것(신·구 값 교집합 ∅) 두 가지다 — 손으로 적은 숫자가 조용히 낡으면 남의 신당이 어긋난다.
 */
describe('동반 이동 SQL — 구운 좌표가 코드 상수와 같다', () => {
  const SHIFT_MIGRATION = path.join(ROOT, 'supabase', 'migrations', '20260810c_stage_ground_v5_shift.sql')
  const sql = (): string => readFileSync(SHIFT_MIGRATION, 'utf8')
  /** 소수 2자리 문자열 — SQL 리터럴과 같은 표기(52.40 처럼 0 이 붙는다) */
  const lit = (v: number): string => v.toFixed(2)

  it('★ 파일이 있고 이동량이 접지 이동분과 같다 (+9)', () => {
    expect(existsSync(SHIFT_MIGRATION)).toBe(true)
    // `p.y + 9` 문장 두 개(제단·선반) — delta 를 손으로 다르게 적으면 한쪽만 어긋난다
    const bumps = sql().match(/^\s+set y = round\(least\(100, greatest\(0, p\.y \+ 9\)\), 2\)$/gm) ?? []
    expect(bumps).toHaveLength(2)
    expect(STAGE_GROUND_DROP).toBe(9)
  })

  it('★ 제단 — 옛 앵커 y(52.40/55.00) = 새 앵커 − 이동분, 새 값과 교집합이 없다', () => {
    const s = sql()
    const nowY = [...new Set(GRAND_ALTAR_ANCHOR_Y)]
    const oldY = nowY.map((y) => Math.round((y - STAGE_GROUND_DROP) * 100) / 100)
    expect(oldY).toEqual([52.4, 55])
    for (const y of oldY) expect(s).toContain(lit(y))
    // 재실행 무해 — 새 값이 옛 집합에 없다(두 번째 실행은 0행)
    for (const y of nowY) expect(oldY).not.toContain(y)
    // v3 13테마의 같은 이름 앵커(53.5)는 어느 집합에도 없다 = 단상 무대는 한 건도 안 움직인다
    expect(oldY).not.toContain(ALTAR_ANCHOR_Y)
    expect(nowY).not.toContain(ALTAR_ANCHOR_Y)
    // 앵커 id 5개가 전부 조건에 실려 있어야 앞줄 2점이 조용히 빠지지 않는다
    for (const a of grandAltarStructures('banga')[0].anchors) expect(s).toContain(`'${a.id}'`)
  })

  /**
   * ★ 이 마이그레이션은 **역사**다 — 오늘의 상수에서 파생시키지 않는다 (2026-08-12 · v6)
   *
   * 20260810c 가 구워진 날의 선반 기하는 3단(널 0.31/0.55/0.76 · itemLift 3.5 · 높이 42)이었다.
   * v6(B안)에서 그 표가 통째로 바뀌었으므로, 여기서 «지금 상수로 그때 값을 다시 계산»하면
   * **구운 SQL 이 멀쩡한데도 테스트가 깨진다** — 그리고 더 나쁘게는, 다음에 상수가 또 바뀔 때
   * 옛 마이그레이션의 리터럴을 «고쳐 맞추고» 싶은 압력이 생긴다(이미 적용된 SQL 은 못 고친다).
   * 그래서 그때의 여섯 숫자를 **리터럴로 동결**하고, 검사 대상을 「SQL 이 그 값을 담고 있는가」와
   * 「+9 라는 이동분이 그때의 상수와 맞는가」로 좁힌다.
   */
  it('★ 선반 — 구운 칸 y(40.52/50.60/59.42 → 49.52/59.60/68.42)가 SQL 에 그대로 있다', () => {
    const s = sql()
    const V5_OLD_Y = [40.52, 50.6, 59.42] // 3단 기하 · 밑동 73
    const V5_NEW_Y = [49.52, 59.6, 68.42] // 같은 기하 · 밑동 82 (= 옛 값 + STAGE_GROUND_DROP)
    expect(V5_NEW_Y.map((y, i) => Math.round((y - V5_OLD_Y[i]) * 100) / 100)).toEqual([
      STAGE_GROUND_DROP,
      STAGE_GROUND_DROP,
      STAGE_GROUND_DROP,
    ])
    for (const y of V5_OLD_Y) expect(s).toContain(lit(y))
    for (const y of V5_NEW_Y) expect(V5_OLD_Y).not.toContain(y) // 재실행 무해
    expect(s).toContain("'seat:fshelf:%'")
    expect(s).toContain(FSHELF_ANCHOR_PREFIX.replace(/:$/, '')) // 프리픽스 오타 방어
    // v6 은 동반 이동 SQL 을 **새로 쓰지 않는다** — 새 칸 좌표가 여기 실려 있으면 안 된다
    const h = FSHELF_UNIT.bottom - FSHELF_UNIT.top
    const v6SlotY = Math.round((FSHELF_UNIT.top + FSHELF_TIERS.boards[0] * h - FSHELF_TIERS.itemLift) * 100) / 100
    expect(s).not.toContain(lit(v6SlotY))
  })

  it('★ 자유 배치는 건드리지 않는다 — anchor_id 없는 행을 잡는 update 가 없다', () => {
    const s = sql()
    // 문장(주석 아님)만 본다 — 확인 쿼리에는 anchor_id is null 카운트가 있어도 된다
    const statements = s
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('--'))
      .join('\n')
    expect(statements.match(/^update public\.shrine_placements p$/gm) ?? []).toHaveLength(2)
    expect(statements).not.toContain('anchor_id is null')
    // 「고정 살림 조절」 dy 를 뺀 값으로 판정한다 — 안 그러면 조절을 쓴 신당만 조용히 빠진다
    expect(statements).toContain("'deityStage' -> 'dy'")
    expect(statements).toContain("'familyShelf' -> 'dy'")
  })
})
