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
import { FAMILY_SHELF_THEMES, FSHELF_UNIT } from '../family-shelf'
import { FIXTURE_DY_RANGE } from '../fixture-offsets'
import { DEITY_HEAD_ROOM_Y, PODIUM_TOP_Y, deityHeadRoomY, deityStandBox, depthScale, parseStageSpec } from '../stage'
import {
  ALTAR_ANCHOR_X,
  ALTAR_ANCHOR_Y,
  GRAND_ALTAR_ANCHOR_X,
  GRAND_ALTAR_ANCHOR_Y,
  GRAND_ALTAR_ITEM_SCALE,
  GRAND_ALTAR_THEMES,
  NEUTRAL_LIGHT_COLOR,
  STAGE_BANDS,
  STAGE_FLOOR_LINE_Y,
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

  it('★ 거니는 신수 y 가 마루선 파생이다 — 마루가 내려가면 신수도 따라 내려간다', () => {
    // 하드코딩(61)이던 시절에는 마루선을 옮길 때마다 신수만 허공에 남았다.
    expect(KEEPER_POS.y).toBe(STAGE_FLOOR_LINE_Y - 1)
    expect(KEEPER_POS.y).toBe(72)
    expect(KEEPER_POS.x).toBe(12) // x 는 마루선과 무관 — 같이 옮기지 않는다
  })

  it('마루선이 바닥 존 안이다 — 신수가 밟을 마루가 실제로 있다', () => {
    expect(STAGE_FLOOR_LINE_Y).toBeGreaterThanOrEqual(ZONES.floor.y[0])
    expect(KEEPER_POS.y).toBeLessThanOrEqual(ZONES.floor.y[1])
  })

  /**
   * ★ 마루선 이동의 **알려진 사각지대**를 계약으로 못 박는다.
   *
   * 사방탁자 두 벌(가족 선반장·의식각)은 밑동 y62 로 서 있다 — v3 마루선(60)보다 2%p 아래,
   * 즉 「마루에 발을 조금 묻고 선 가구」였다. 마루선이 73 으로 내려가면 그 관계가 깨져
   * 밑동이 마루선보다 **11%p 위**에 뜬다(v4 에서는 8%p 였다).
   *
   * 그런데도 62 를 **동결**한다. 옮기는 쪽이 더 비싸기 때문이다:
   *   · 진열 칸 앵커(`seat:fshelf:`)가 함께 내려가 **이미 진열해 둔 아이템이 널에서 떨어진다**
   *     (배치는 절대 좌표라 따라오지 않는다 — 무손실 계약 위반).
   *   · 스프라이트는 `objectFit:'fill'` 로 상자에 늘려 그린다 — 높이를 42→50 으로 키우면 가구가
   *     세로로 19% 늘어난다.
   *   · 뜬 자리는 사용자가 **꾸미기에서 조절**할 수 있다(fixtureOffsets.familyShelf.dy ±14 ⊇ 필요치 8).
   *     CEO 2차 지시("그림마다 맞추기 힘드니 꾸미기에서 조절하게 하자")가 만든 바로 그 손잡이다.
   * 이 단정은 «62 가 더 이상 마루선이 아니다»를 기록으로 남긴다 — 다음 사람이 마루선 파생으로
   * 착각해 «정리»하는 순간 여기서 멈춘다.
   */
  it('★ 사방탁자 밑동 62 는 동결이다 — 마루선 파생이 아니다 (진열 앵커 무손실 우선)', () => {
    expect(FSHELF_UNIT.bottom).toBe(62)
    expect(FSHELF_UNIT.bottom).not.toBe(STAGE_FLOOR_LINE_Y)
    // 의식각도 같은 상자다(사방탁자 한 좌) — 둘이 갈라지면 오른벽만 높이가 달라진다
    expect(readFileSync(RITUAL_HALL, 'utf8')).toContain('top: 20, bottom: 62')
    // 조절 손잡이가 뜬 만큼(8%p)을 덮는지 — 못 덮으면 사용자가 되돌릴 방법이 없다
    expect(FIXTURE_DY_RANGE[1]).toBeGreaterThanOrEqual(STAGE_FLOOR_LINE_Y - FSHELF_UNIT.bottom)
  })
})

// ── ⑥ 틀(壇) 시범 3테마 ─────────────────────────────────────────

describe('틀 — 위·옆·아래로만 커진다 (상판면·접지 불변)', () => {
  const PILOT_THEMES = ['banga', 'daljip', 'seolbit']

  it('★ 시범 목록이 3테마고 전부 실재하는 테마다', () => {
    expect([...GRAND_ALTAR_THEMES]).toEqual(PILOT_THEMES)
    for (const code of GRAND_ALTAR_THEMES) expect(THEME_CODES).toContain(code)
    expect(GRAND_ALTAR_THEMES.every(hasGrandAltar)).toBe(true)
  })

  it('★ 나머지 13테마는 v3(단상+상판) 그대로다 — 혼재가 정상 상태다', () => {
    for (const code of THEME_CODES.filter((c) => !hasGrandAltar(c))) {
      expect([code, buildThemeStageV4(code)]).toEqual([code, buildThemeStage(code)])
    }
  })

  it.each(['banga', 'daljip', 'seolbit'])('%s — 틀 1구조물 · 테마별 자산 경로 (J 생성 계약)', (code) => {
    const s = grandAltarStructures(code)
    expect(s).toHaveLength(1)
    expect(s[0].code).toBe(`grand-altar-${code}`)
    // 살림 공용(반가 스프라이트)이 아니라 **테마마다 다른 틀**이다 — 여기가 v3 와 갈리는 지점이다
    expect(s[0].assetUrl).toBe(`/shrine/stage/${code}/grand-altar.webp`)
    expect(s[0]).toMatchObject({ x: 50, y: 38.5, w: 60 })
  })

  it('★ 신위 접지 45.3 불변 — 틀이 감실을 품어도 신위는 어제 서 있던 높이에 선다', () => {
    expect(PODIUM_TOP_Y).toBe(45.3)
    // 저장된 배치가 안 움직이는 근거는 앵커 좌표가 아니라 «배치가 절대 좌표»라는 것이다.
    // 앵커는 «다음에 놓을 자리»만 정한다 — 그래서 아래 2열 재배치도 이동 0 이다.
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
    expect([...GRAND_ALTAR_ANCHOR_X]).toEqual([45.7, 50, 54.3, 47.85, 52.15])
    expect([...GRAND_ALTAR_ANCHOR_Y]).toEqual([52.4, 52.4, 52.4, 55, 55])
    // 뒷줄 3점이 앞줄 2점보다 위(=뒤)에 있고, 앞줄은 뒷줄 사이 틈에 엇갈려 놓인다
    const rows = new Map<number, number[]>()
    for (const [i, y] of GRAND_ALTAR_ANCHOR_Y.entries()) rows.set(y, [...(rows.get(y) ?? []), GRAND_ALTAR_ANCHOR_X[i]])
    expect([...rows.keys()]).toEqual([52.4, 55])
    expect(rows.get(52.4)).toHaveLength(3)
    expect(rows.get(55)).toHaveLength(2)
    for (const x of rows.get(55) ?? []) {
      expect(x).toBeGreaterThan(Math.min(...(rows.get(52.4) ?? [])))
      expect(x).toBeLessThan(Math.max(...(rows.get(52.4) ?? [])))
    }
    /**
     * 상판 실폭 — 밖으로 나가면 제물이 허공에 뜬다(구안 38/62 회귀 금지).
     * v4.1 은 틀이 w50 → w60 이라 상판 세계 폭이 11.25% → **13.2%**(x43.4~56.6)로 넓어졌다.
     * 여기에 아이템 반폭(가장 좁은 폰에서 2.2%)까지 얹어도 상판을 넘지 않아야 한다.
     */
    const HALF_ITEM = 2.23 // 360x800 폰에서 아이템(3.2em×29px×0.54)의 세계 반폭
    for (const x of GRAND_ALTAR_ANCHOR_X) {
      expect(x - HALF_ITEM).toBeGreaterThanOrEqual(43.4)
      expect(x + HALF_ITEM).toBeLessThanOrEqual(56.6)
    }
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
   * 허용 ±2%p 는 «기기마다 겉보기 세로가 달라지는» 성질(단상과 같다)을 흡수하는 폭이다.
   * 아직 없는 테마는 건너뛴다 — 자산보다 코드가 먼저 나가는 순서가 정상이다.
   *
   * ⚠️ 상자 높이(70)는 «정한» 값이 아니라 **재고 나서 적은** 값이다. 시드가 고정이고 두 생명선
   *    (감실 바닥 45.3 · 제물 밑변 60.98)을 지키면 상자 높이에는 자유도가 없다:
   *      상자 높이 = 15.68 / (그림 안 두 랜드마크 사이가 전체의 몇 할인가)
   *    r5 세 장이 0.221~0.225 로 나와 상자가 70 이 됐고, 그 덕에 **접지가 마루선(73)에 앉는다** —
   *    v4(접지 68 · 마루선 70)가 벽 속에 2%p 박혀 있던 것보다 옳다. 착수 때 어림한 65 는 폐기.
   */
  it.each(['banga', 'daljip', 'seolbit'])('%s — 틀 스프라이트 종횡비가 상단 y3.5·접지 y73.5 를 만든다', (code) => {
    const file = path.join(PUBLIC_DIR, 'shrine', 'stage', code, 'grand-altar.webp')
    if (!existsSync(file)) return
    const buf = readFileSync(file)
    const vp8x = buf.indexOf('VP8X', 12, 'ascii')
    expect(vp8x).toBeGreaterThan(0)
    const px = { w: 1 + buf.readUIntLE(vp8x + 12, 3), h: 1 + buf.readUIntLE(vp8x + 15, 3) }
    const frame = grandAltarStructures(code)[0]
    // 기준 방 520×620 (banga-wide-seed 의 apparentBand 와 같은 셈)
    const hPct = ((((520 * frame.w) / 100 / px.w) * px.h) / 620) * 100
    const box = { top: frame.y - hPct / 2, bottom: frame.y + hPct / 2 }
    const TOL = 2
    expect([code, Math.abs(box.top - 3.5) <= TOL, Math.abs(box.bottom - 73.5) <= TOL]).toEqual([code, true, true])
    // 접지가 마루선 언저리다 — 2%p 넘게 위로 뜨면 틀이 벽 속에 박힌 것으로 읽힌다
    expect([code, box.bottom >= STAGE_FLOOR_LINE_Y - 2]).toEqual([code, true])
  })

  /**
   * ★ 렌더 상수 — 밴드와 같은 성질이다(시드에 안 실린다 · 코드 배포가 정본).
   *
   * 배율과 머리 여백은 **틀을 든 테마에서만** 갈린다. 13테마에 새면 라이브 신당의 신물 크기와
   * 신위 키가 한꺼번에 변한다(무손실 위반) — 그 «새지 않음»을 여기서 못 박는다.
   */
  it('★ 제단층 배율 0.54 는 틀 무대 전용이다 — 13테마는 0.88 그대로', () => {
    expect(GRAND_ALTAR_ITEM_SCALE).toBe(0.54)
    expect(geometry.grandAltar.altarItemScale).toBe(GRAND_ALTAR_ITEM_SCALE)
    // 도메인의 유일한 소비처(분기 한 곳 원칙)
    expect(depthScale('altar', 53.5, true)).toBe(GRAND_ALTAR_ITEM_SCALE)
    expect(depthScale('altar', 53.5, false)).toBe(0.88)
    // 폰(390 → 방 382px) 상판 161px 에 뒷줄 셋이 «안쪽 여백 5%를 남기고» 실리는가 — 배율의 근거
    const boardPx = 0.7 * 0.6 * 382 // 상판 실측 최솟값 70% × 틀 폭 60%
    const itemPx = 3.2 * 29 * GRAND_ALTAR_ITEM_SCALE
    expect(itemPx).toBeLessThanOrEqual((boardPx * 0.95) / 3)
  })

  it('★ 신위 머리 여백이 테마별이고 틀 없는 테마는 정본 상수(12)로 떨어진다', () => {
    expect(geometry.grandAltar.deityHeadRoomY).toEqual({ banga: 25.3, daljip: 23.9, seolbit: 25.7 })
    const fromJson = new Map<string, number>(Object.entries(geometry.grandAltar.deityHeadRoomY))
    expect([...fromJson.keys()]).toEqual([...GRAND_ALTAR_THEMES]) // 표에 빠진 테마가 있으면 그 신위만 커진다
    for (const code of GRAND_ALTAR_THEMES) {
      const headRoom = grandAltarHeadRoomY(code)
      expect([code, headRoom]).toEqual([code, fromJson.get(code)])
      expect([code, deityHeadRoomY(code)]).toEqual([code, headRoom])
      // 발은 그대로 두고 머리만 내려온다 = 신위가 감실 «안»에 들어앉는다
      expect(Number(headRoom)).toBeGreaterThan(DEITY_HEAD_ROOM_Y)
      expect(Number(headRoom)).toBeLessThan(PODIUM_TOP_Y)
      expect(deityStandBox(PODIUM_TOP_Y, headRoom ?? undefined).groundY).toBe(PODIUM_TOP_Y)
    }
    for (const code of THEME_CODES.filter((c) => !hasGrandAltar(c))) {
      expect([code, grandAltarHeadRoomY(code)]).toEqual([code, null])
      expect([code, deityHeadRoomY(code)]).toEqual([code, DEITY_HEAD_ROOM_Y])
    }
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

  it('★ 달러 인용 블록의 JSON 이 도메인 grandAltarStructures 와 값이 같다 (3테마)', () => {
    const parts = pilotSql().split('$grandaltar$')
    expect(parts).toHaveLength(7) // 3문장 × 구분자 2개 + 앞뒤
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
    expect(sql.match(/^update public\.shrine_theme_packs$/gm) ?? []).toHaveLength(3)
    // set 은 zones[0] 스코프 세 자리(structures·wallpaperUrl·flooringUrl)뿐이다.
    // `set stage = '{...}'` 였다면 반가의 레거시 제단이 증발하고, '{structures}' 경로가 있다면
    // 원복 레버(`stage - 'zones'`)의 착지점이 오염된다.
    expect(sql.match(/^set stage = jsonb_set\(jsonb_set\(jsonb_set\(stage,$/gm) ?? []).toHaveLength(3)
    expect(sql.match(/'\{zones,0,structures\}'/g) ?? []).toHaveLength(3)
    expect(sql.match(/'\{zones,0,wallpaperUrl\}'/g) ?? []).toHaveLength(3)
    expect(sql.match(/'\{zones,0,flooringUrl\}'/g) ?? []).toHaveLength(3)
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
    expect(guards).toHaveLength(3)
  })

  it('시범 테마만 대상이다 — 13테마 update 문이 없다', () => {
    const sql = pilotSql()
    for (const code of THEME_CODES) {
      expect([code, sql.includes(`where code = '${code}'`)]).toEqual([code, hasGrandAltar(code)])
    }
  })
})
