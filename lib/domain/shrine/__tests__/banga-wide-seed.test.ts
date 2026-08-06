/**
 * 반가 「큰 방 — 와이드 무라 + 제단·단상 정립」 시드 정합
 * — supabase/migrations/20260730_shrine_banga_mural_320.sql        (안2.2: 폭 320 · 무라 2장 · 문간)
 * — supabase/migrations/20260730_shrine_banga_altar_platform.sql   (안2.3: 구조물 3종 재구성)
 *
 * 안2.2 는 세로선의 원인이 픽셀 값이 아니라 **반복 렌더**라는 판정에서 나왔다 — 타일 폭이 소수점이라
 * `repeat-x` 경계마다 서브픽셀 재샘플링 선이 남는다. 그래서 그 시드의 핵심은 이미지 교체가 아니라
 * `tile` 필드를 **없애서** StageLayers 를 단일 이미지 경로로 되돌리는 것이었다.
 *
 * 안2.3 은 위계를 세운다(부록 C ③). 제단 한 장으로는 신위가 설 면이 없어 "떠 보인다" →
 * **단상(뒤·위·좁다) + 제단 상판(앞·아래·넓다) + 문간** 3종으로 갈아끼우고, 신위 발끝을
 * 단상 상면에 맞춘다. 배열 순서가 곧 그리는 순서(뒤→앞)라 **순서 자체가 계약**이다.
 *
 * 시드가 잘못되면 parseWorld 가 **부분 채택 없이 항등 폴백**(폭 100·구역 하나)으로 되돌아가고,
 * parseStageSpec 은 assetUrl 없는 구조물을 **조용히 버린다**. 예외도 로그도 없이 화면만 달라지므로
 * DB 에 적용하고 나서는 눈으로만 알 수 있다 → DB 없이, 시드 파일 그 자체를 읽어서 미리 잡는다.
 *
 * 이 테스트가 검사하는 것
 *   1. 두 시드 SQL 의 JSON 이 parseWorld·parseStageSpec 을 **통과**한다 (폭 320 · 구역 1 · 0~320).
 *   2. `(stage - 'zones') || …` 병합이 기존 최상위 무대(벽지/바닥/구조물/광원)를 지우지 않는다.
 *   3. `tile` 필드가 **없다** — 있으면 repeat-x = 세로선 복귀.
 *   4. 구역이 무라 2장과 구조물 **3종**을 직접 든다. zoneStage 가 최상위를 **대체**하므로
 *      제단이 구역 배열에 없으면 증발한다 — 그 계약을 여기서 못 박는다.
 *   5. 뒤→앞 순서 · 앵커는 상판에만 3점 · 앵커 y 가 ZONES.altar.y 안(드래그 도달 가능).
 *   6. 겉보기 환산(zoneWidthScale)과 **신위 접지선**(기준 방 520×620 → y 45.1%) 산술.
 *   7. 시드가 가리키는 에셋 파일이 public/ 에 실재한다.
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { HALL_BAND, HALL_SEAT_ZONE, hallSeatWorldX } from '../family-hall-layout'
import { PODIUM_TOP_Y, parseStageSpec, type StageSpec } from '../stage'
import { WORLD_VIEWPORT_PCT, daecheongZone, parseWorld, toWorldX, type WorldSpec } from '../world'
import { zoneStage, zoneWidthScale } from '../world-render'
import { ZONES } from '../zones'

const ROOT = path.resolve(__dirname, '../../../..')
const SEED_SQL = path.join(ROOT, 'supabase', 'migrations', '20260730_shrine_banga_mural_320.sql')
const ALTAR_SQL = path.join(ROOT, 'supabase', 'migrations', '20260730_shrine_banga_altar_platform.sql')
/** 2026-08-06 문 제거 — 구역 structures 의 **현행 정본**은 이 파일의 $structures2$ 블록이다 */
const FINAL_SQL = path.join(ROOT, 'supabase', 'migrations', '20260806b_banga_remove_door.sql')
const PUBLIC_DIR = path.join(ROOT, 'public')

/** 안2.2 논리 폭. world.ts WORLD_DEFAULT_WIDTH(240)의 후속이지만 상수를 고치지는 않았다 —
 *  그 값은 기본값일 뿐이고 상한은 MAX_WORLD_WIDTH(1000)라 320 도 그대로 통과한다. */
const SEED_WIDTH = 320

const WALL_MURAL = '/shrine/stage/banga/room-wall-mural.webp'
const FLOOR_MURAL = '/shrine/stage/banga/room-floor-mural.webp'
const DOOR_SPRITE = '/shrine/stage/banga/room-door.webp'
const PLATFORM_SPRITE = '/shrine/stage/banga/platform.webp'
const ALTAR_TOP_SPRITE = '/shrine/stage/banga/altar-top.webp'
/** 레거시 제단 — 안2.3 이 대체하지만 §3 원복 경로가 다시 가리키므로 **삭제 금지** */
const LEGACY_ALTAR_SPRITE = '/shrine/stage/banga/altar.webp'

/**
 * 렌더 기준 방 — ShrineRoomClient 실측: 컨테이너 `max-w-[520px]`, 높이 `min(72vh, 620px)`(안2.3).
 * w 는 뷰포트 폭 %, y 는 방 높이 % 라서 겉보기 세로 비율은 이 종횡비에 딸린다.
 */
const ROOM_REF_W = 520
const ROOM_REF_H = 620
/** 좁은 쪽 극단 — 세로 긴 폰(방 폭 380px · 높이 상한은 같은 620) */
const ROOM_NARROW_W = 380
/** 단상 스프라이트 실측 (scripts/shrine-assets/stage-banga-altar.mjs 산출) */
const PLATFORM_PX = { w: 640, h: 299 }
/** 상면 앞턱 = 스프라이트 높이의 이 비율 지점(같은 스크립트의 행 휘도 하강 검출값) */
const PLATFORM_SURFACE_FRAC = 0.2027
/**
 * ★ 배선 계약: 신위 발끝 y(방 높이 %) = 두 기준 방 상면 밴드 **교집합의 가운데**.
 * stage.ts PODIUM_TOP_Y 는 밴드(44.70~45.87) 안이면 되고 이 값과 똑같을 필요는 없다 — 시드 [계약 3].
 */
const DEITY_CONTACT_Y = 45.3
/** 상판 앵커 y — 상판 면(57.2%) − 아이템 반높이(3.6%p) */
const ALTAR_ANCHOR_Y = 53.5

/** 시드 SQL 안에서 순수 JSON 을 감싸는 달러 인용 구분자 (Postgres dollar-quoting) */
const DOLLAR_TAG = '$world$'
const ALTAR_DOLLAR_TAG = '$structures$'
const FINAL_DOLLAR_TAG = '$structures2$'

/**
 * 시드 SQL → JSON.
 *
 * 정규식으로 긁지 않는다 — 구분자 두 개 사이를 그대로 잘라 JSON.parse 한다.
 * 그래서 SQL 쪽은 그 블록 안에 SQL 문법(주석·함수 호출·트레일링 콤마)을 넣을 수 없고,
 * 넣는 순간 이 테스트가 파싱 단계에서 깨진다 — 그게 의도한 계약이다.
 * (§3 원복 주석의 직전 JSON 이 다른 달러 태그를 쓰는 이유도 이것이다.)
 */
function readDollarJson(file: string, tag: string): unknown {
  const sql = readFileSync(file, 'utf8')
  const parts = sql.split(tag)
  if (parts.length !== 3) {
    throw new Error(
      `시드 전제 붕괴: ${path.basename(file)} 의 ${tag} 구분자가 정확히 2개여야 한다 (발견 ${parts.length - 1}개)`
    )
  }
  const parsed: unknown = JSON.parse(parts[1])
  return parsed
}

const readSeedWorldJson = (): unknown => readDollarJson(SEED_SQL, DOLLAR_TAG)

/** 안2.3 시드의 structures 배열 원본 (파서를 통과하기 **전** — 순서·미지 필드까지 그대로 본다) */
function readAltarStructuresRaw(): Record<string, unknown>[] {
  const parsed = readDollarJson(ALTAR_SQL, ALTAR_DOLLAR_TAG)
  if (!Array.isArray(parsed)) throw new Error('시드 전제 붕괴: 안2.3 블록 최상위가 배열이 아니다')
  return parsed as Record<string, unknown>[]
}

/** 문 제거(2026-08-06) 이후의 **현행** structures 원본 — 마이그레이션 체인의 마지막 승자다 */
function readFinalStructuresRaw(): Record<string, unknown>[] {
  const parsed = readDollarJson(FINAL_SQL, FINAL_DOLLAR_TAG)
  if (!Array.isArray(parsed)) throw new Error('시드 전제 붕괴: 문 제거 블록 최상위가 배열이 아니다')
  return parsed as Record<string, unknown>[]
}

/**
 * 병합 대상인 **현행 반가 단일 무대** (프로덕션 shrine_theme_packs.stage 실값, 2026-07-30 조회).
 * 안2.2 시드는 `(stage - 'zones') || {...}` 라서 아래 필드가 그대로 남아야 한다 — §3(a) 원복의 근거다.
 * 안2.3 시드의 §0 가드도 이 최상위 제단(altar.webp)이 살아 있는지를 확인한다.
 */
const BANGA_STAGE_RAW = {
  wallpaperUrl: '/shrine/stage/banga/wallpaper.webp',
  flooringUrl: '/shrine/stage/banga/flooring.webp',
  structures: [
    {
      code: 'altar-banga',
      assetUrl: LEGACY_ALTAR_SPRITE,
      x: 50,
      y: 47,
      w: 62,
      anchors: [
        { id: 'altar-left', layer: 'altar', x: 34, y: 46, label: '제단 왼편' },
        { id: 'altar-center', layer: 'altar', x: 50, y: 46, label: '제단 가운데' },
        { id: 'altar-right', layer: 'altar', x: 66, y: 46, label: '제단 오른편' },
      ],
    },
  ],
  light: { color: '#C9A84C', intensity: 0.5, origin: { x: 50, y: 52 } },
} as const

/**
 * DB 의 `(stage - 'zones') || <안2.2 JSON>` → `jsonb_set(…,'{zones,0,structures}', <안2.3 JSON>)`
 * 두 마이그레이션을 순서대로 적용한 결과를 JS 로 재현한다.
 * jsonb `||` 는 최상위 키 단위 덮어쓰기이고, jsonb_set 은 구역의 structures 만 갈아끼운다.
 */
function mergedStageRaw(): Record<string, unknown> {
  const seed = readSeedWorldJson()
  if (typeof seed !== 'object' || seed === null || Array.isArray(seed)) {
    throw new Error('시드 전제 붕괴: 최상위가 JSON 객체가 아니다')
  }
  const merged = { ...BANGA_STAGE_RAW, ...seed } as Record<string, unknown>
  const zones = merged.zones
  if (!Array.isArray(zones) || zones.length !== 1) throw new Error('시드 전제 붕괴: 구역이 1개가 아니다')
  // 구조물은 마이그레이션 체인의 마지막 승자(문 제거 시드)가 정본이다 — 안2.3 원본은 역사로만 남는다
  const zone = { ...(zones[0] as Record<string, unknown>), structures: readFinalStructuresRaw() }
  return { ...merged, zones: [zone] }
}

function bangaStage(): StageSpec {
  const spec = parseStageSpec(BANGA_STAGE_RAW)
  if (!spec) throw new Error('테스트 전제 붕괴: 반가 단일 무대 파싱 실패')
  return spec
}

/** 두 시드가 적용된 뒤 클라이언트가 실제로 만드는 세계 = parseWorld(StageSpec, stage 원본) */
function seededWorld(): WorldSpec {
  return parseWorld(bangaStage(), mergedStageRaw())
}

/** 유일 구역 원본(파서 통과 전) */
function seededZoneRaw(): Record<string, unknown> {
  const zones = (mergedStageRaw() as { zones?: unknown }).zones
  if (!Array.isArray(zones) || zones.length !== 1) throw new Error('시드 전제 붕괴: 구역이 1개가 아니다')
  return zones[0] as Record<string, unknown>
}

/** 구조물 겉보기 기하 — w(뷰포트 폭 %)·스프라이트 종횡비 → 방에서의 세로 범위(방 높이 %) */
function apparentBand(wPct: number, yPct: number, px: { w: number; h: number }, roomW: number = ROOM_REF_W) {
  const pxW = (roomW * wPct) / 100
  const hPct = (((pxW / px.w) * px.h) / ROOM_REF_H) * 100
  return { hPct, top: yPct - hPct / 2, bottom: yPct + hPct / 2 }
}

/**
 * 단상 **상면 밴드**(스프라이트 상단 ~ 상면 앞턱)를 두 기준 방에서 구해 교집합을 낸다.
 * w 는 뷰포트 폭 %, y 는 방 높이 % 라 겉보기 세로가 방 종횡비에 딸린다 → 한 상수로 모든 기기를
 * 맞출 수 없다. 그래서 넓은 방·좁은 방의 밴드가 **겹치는 구간**이 접지 계약의 정의다.
 * (같은 계산이 scripts/shrine-assets/stage-banga-altar.mjs 에도 있다 — 그쪽이 스프라이트에서 앞턱
 *  비율을 **측정**하고, 여기서는 그 측정값을 상수로 받아 시드 좌표와 맞물리는지 확인한다.)
 */
function platformSurfaceOverlap() {
  const platform = zoneStage(daecheongZone(seededWorld()), bangaStage()).structures.find(
    (s) => s.code === 'platform-banga'
  )
  const bands = [ROOM_REF_W, ROOM_NARROW_W].map((roomW) => {
    const b = apparentBand(Number(platform?.w), Number(platform?.y), PLATFORM_PX, roomW)
    return { from: b.top, to: b.top + b.hPct * PLATFORM_SURFACE_FRAC }
  })
  return {
    bands,
    from: Math.max(...bands.map((b) => b.from)),
    to: Math.min(...bands.map((b) => b.to)),
  }
}

describe('시드 SQL 파싱', () => {
  it('두 시드의 달러 인용 블록이 그대로 JSON 으로 읽힌다', () => {
    expect(() => readSeedWorldJson()).not.toThrow()
    expect(() => readAltarStructuresRaw()).not.toThrow()
  })

  it('병합해도 기존 최상위 무대가 한 필드도 사라지지 않는다 (|| 는 최상위 키 단위)', () => {
    const merged = mergedStageRaw()
    const base = bangaStage()
    const after = parseStageSpec(merged)
    expect(after).toEqual(base)
    // 원본 stage 를 통째로 갈아끼우는 사고(SET stage = '{...}')였다면 여기서 죽는다
    expect(after?.structures.map((s) => s.code)).toEqual(['altar-banga'])
    expect(after?.structures[0].assetUrl).toBe(LEGACY_ALTAR_SPRITE)
    expect(after?.light?.color).toBe('#C9A84C')
  })
})

describe('parseWorld 통과 — 항등 폴백으로 떨어지지 않는다', () => {
  it('논리 폭 320 · 구역 1개', () => {
    const world = seededWorld()
    expect(world.width).toBe(SEED_WIDTH)
    expect(world.zones).toHaveLength(1)
  })

  it('폴백이었다면 나왔을 값(폭 100)이 아니다 — 검증 실패는 조용하므로 명시로 못 박는다', () => {
    // 구역이 1개라 개수로는 폴백과 구분되지 않는다. 폭이 유일한 판별점이다.
    expect(seededWorld().width).toBeGreaterThan(WORLD_VIEWPORT_PCT) // ShrineRoomClient 의 worldActive 조건
  })

  it('유일 구역이 세계 전체를 덮는다 — 대청 0~320 (경계 자체가 없다 = 구역 이음새 0)', () => {
    const world = seededWorld()
    expect(world.zones.map((z) => [z.code, z.x0, z.x1])).toEqual([['daecheong', 0, SEED_WIDTH]])
    expect(world.zones[0].x0).toBe(0)
    expect(world.zones[0].x1).toBe(world.width)
  })

  it('구역 라벨은 world.ts 단일 출처에서 온다 (시드가 문구를 복제하지 않는다)', () => {
    expect(seededWorld().zones.map((z) => z.label)).toEqual(['대청'])
  })
})

describe('세로선 원천 제거 — tile 필드가 없다', () => {
  it('시드 JSON 에 tile 키가 아예 없다 (false 도 아니고 부재)', () => {
    const zone = seededZoneRaw()
    expect(Object.keys(zone)).not.toContain('tile')
    expect(zone.tile).toBeUndefined()
  })

  it('parseWorld 결과에도 tile 이 실리지 않는다 → StageLayers 는 단일 이미지 stretch 경로', () => {
    // world.ts parseZone 은 `tile === true` 일 때만 키를 싣는다. 없으면 repeat-x 분기가 죽고
    // `<img class="h-[62%] w-full object-cover">` 로 그려진다 — 반복이 없으니 반복 경계도 없다.
    expect(daecheongZone(seededWorld()).tile).toBeUndefined()
  })

  it('무라는 반복용 타일이 아니다 — 직전 시드의 타일 URL 을 다시 가리키지 않는다', () => {
    const zone = daecheongZone(seededWorld())
    expect(zone.wallpaperUrl).not.toBe('/shrine/stage/banga/room-wall-tile.webp')
    expect(zone.flooringUrl).not.toBe('/shrine/stage/banga/room-floor-tile.webp')
  })
})

describe('무대 사양 — 무라·구조물을 구역이 직접 든다', () => {
  it('유일 구역이 제 와이드 무라 2장을 직접 든다 (최상위 벽지/바닥은 승계하지 않는다)', () => {
    const zone = daecheongZone(seededWorld())
    expect(zone.wallpaperUrl).toBe(WALL_MURAL)
    expect(zone.flooringUrl).toBe(FLOOR_MURAL)
    expect(zone.wallpaperUrl).not.toBe(bangaStage().wallpaperUrl)
  })

  it('구역 structures 가 단상·상판 2종이다 — 문간은 2026-08-06 걷었다(왼벽=가족 선반장 자리)', () => {
    // world-render.ts zoneStage: structures.length > 0 ? zone.structures : base.structures
    // 상판만 넣었다면 단상이 예외도 로그도 없이 사라진다. 그 함정을 이 단정이 막는다.
    const base = bangaStage()
    const stage = zoneStage(daecheongZone(seededWorld()), base)
    expect(stage.structures.map((s) => s.code)).toEqual(['platform-banga', 'altar-banga'])
    expect(stage.structures).not.toEqual(base.structures) // 승계가 아니라 구역 정의가 이겼다
  })

  it('배열 순서가 곧 그리는 순서(뒤→앞) — 단상이 상판보다 먼저다', () => {
    // StageLayers 는 structures 를 순서대로 절대배치한다(z-index 미지정) → 나중 것이 위에 그려진다.
    // 순서가 뒤집히면 단상이 상판을 덮어 "제단이 신 뒤로 가는" 그림이 된다.
    const raw = readFinalStructuresRaw()
    expect(raw.map((s) => s.code)).toEqual(['platform-banga', 'altar-banga'])
  })

  it('제단 상판이 레거시 altar.webp 가 아니라 새 상판 스프라이트를 든다', () => {
    const stage = zoneStage(daecheongZone(seededWorld()), bangaStage())
    const altar = stage.structures.find((s) => s.code === 'altar-banga')
    expect(altar?.assetUrl).toBe(ALTAR_TOP_SPRITE)
    expect(altar?.assetUrl).not.toBe(LEGACY_ALTAR_SPRITE)
    expect(altar).toMatchObject({ x: 50, y: 58, w: 58 })
  })

  it('단상은 앵커 없이 뒤에 선다 (신위가 서는 면 — 배치 지점이 아니다)', () => {
    const stage = zoneStage(daecheongZone(seededWorld()), bangaStage())
    const platform = stage.structures.find((s) => s.code === 'platform-banga')
    expect(platform).toEqual({
      code: 'platform-banga',
      assetUrl: PLATFORM_SPRITE,
      x: 50,
      y: 51,
      w: 44,
      anchors: [],
    })
  })

  it('★ 문간이 없다 — 왼벽은 가족 선반장 자리다(2026-08-06). 자산(room-door.webp)은 원복용으로 남긴다', () => {
    const stage = zoneStage(daecheongZone(seededWorld()), bangaStage())
    expect(stage.structures.find((s) => s.code === 'door-banga')).toBeUndefined()
    expect(stage.structures.some((s) => s.assetUrl === DOOR_SPRITE)).toBe(false)
    // 안2.3 시드(역사)에는 문간이 있었다 — 제거는 새 마이그레이션의 몫이지 역사 편집이 아니다
    expect(readAltarStructuresRaw().map((s) => s.code)).toContain('door-banga')
  })

  it('광원은 최상위에서 승계된다 — 방 전체가 같은 빛을 받는다', () => {
    const base = bangaStage()
    expect(zoneStage(daecheongZone(seededWorld()), base).light).toEqual(base.light)
  })
})

describe('앵커 — 기존 3점 승계, y 만 새 상판 면으로', () => {
  it('앵커는 상판에만 3점 있고 id 는 altar-left/center/right 를 그대로 쓴다', () => {
    const stage = zoneStage(daecheongZone(seededWorld()), bangaStage())
    const byCode = new Map(stage.structures.map((s) => [s.code, s]))
    expect(byCode.get('altar-banga')?.anchors.map((a) => a.id)).toEqual(['altar-left', 'altar-center', 'altar-right'])
    expect(byCode.get('platform-banga')?.anchors).toEqual([])
  })

  it('앵커 x 는 45/50/55 (부록 P-2 시드 정정 라이브값) · y 는 53.5 (상판 면)', () => {
    // 안2.3 원본의 34/66 으로 되돌리면 와이드 룸 "상 밖 허공" 스냅이 재발한다 — 라이브값이 정본.
    const stage = zoneStage(daecheongZone(seededWorld()), bangaStage())
    const anchors = stage.structures.find((s) => s.code === 'altar-banga')?.anchors ?? []
    expect(anchors.map((a) => a.x)).toEqual([45, 50, 55])
    expect(anchors.map((a) => a.y)).toEqual([ALTAR_ANCHOR_Y, ALTAR_ANCHOR_Y, ALTAR_ANCHOR_Y])
    expect(anchors.every((a) => a.layer === 'altar')).toBe(true)
  })

  it('앵커 y 가 ZONES.altar.y 안이다 — 밖이면 드래그 클램프에 막혀 **영구 도달 불가**', () => {
    // 안2.5 에서 상한을 54→56 으로 넓혀 여유가 0.4 → 2.4%p 가 됐다(종전에는 상판을 조금만
    // 더 내려도 앵커가 존 밖으로 나가 영구 도달 불가가 됐다). 여유값 자체는 단정하지 않는다 —
    // 넓히는 것은 개선이므로 범위 안에 있는지만 본다.
    const [lo, hi] = ZONES.altar.y
    expect(ALTAR_ANCHOR_Y).toBeGreaterThanOrEqual(lo)
    expect(ALTAR_ANCHOR_Y).toBeLessThanOrEqual(hi)
  })
})

describe('전폭 재해석 · 겉보기 환산 — 배선 담당이 놓치면 안 되는 산술', () => {
  it('배치 x 는 방 전폭으로 퍼진다 (PRD "방 전폭 꾸미기" — 의도된 동작)', () => {
    const world = seededWorld()
    const zone = daecheongZone(world)
    // 기존 대청 로컬 x 가 그대로 world x × 3.2 가 된다. 마이그레이션 UPDATE 는 0건.
    expect(toWorldX(world, zone, 0)).toBe(0)
    expect(toWorldX(world, zone, 50)).toBe(160)
    expect(toWorldX(world, zone, 100)).toBe(320)
  })

  it('겉보기 보존 계수는 100/320 = 0.3125', () => {
    expect(zoneWidthScale(daecheongZone(seededWorld()))).toBeCloseTo(WORLD_VIEWPORT_PCT / SEED_WIDTH, 6)
    expect(zoneWidthScale(daecheongZone(seededWorld()))).toBeCloseTo(0.3125, 6)
  })

  it('구조물 w 는 구역 폭 대비 %라 겉보기 보존에 ×100/320 환산이 필요하다 (상판 58 → 18.125)', () => {
    const zone = daecheongZone(seededWorld())
    expect(zone.x1 - zone.x0).toBe(SEED_WIDTH)
    const altar = zoneStage(zone, bangaStage()).structures.find((s) => s.code === 'altar-banga')
    expect(altar?.w).toBe(58)
    // 그대로 두면 3.2화면의 58% = 1.86화면짜리 제단이 된다
    expect(Math.round(Number(altar?.w) * zoneWidthScale(zone) * 1e4) / 1e4).toBeCloseTo(18.125, 4)
  })

  it('위계가 성립한다 — 상판(앞)이 단상(뒤)보다 넓고, 단상 밑동을 가린다', () => {
    const stage = zoneStage(daecheongZone(seededWorld()), bangaStage())
    const platform = stage.structures.find((s) => s.code === 'platform-banga')
    const altar = stage.structures.find((s) => s.code === 'altar-banga')
    expect(Number(altar?.w)).toBeGreaterThan(Number(platform?.w)) // 앞이 넓다
    const pb = apparentBand(Number(platform?.w), Number(platform?.y), PLATFORM_PX)
    // 상판 top(49.4%)이 단상 bottom(60.1%)보다 위 = 겹친다 → 단상 밑동이 가려져 깊이가 생긴다
    expect(pb.bottom).toBeGreaterThan(49.4)
    expect(pb.top).toBeLessThan(49.4) // 그래도 단상 상단은 상판 위로 보인다(단이 보인다)
  })

  it('★ 신위 접지선 — 두 기준 방의 상면 밴드에 교집합이 있고 그 가운데가 권장값이다', () => {
    const ov = platformSurfaceOverlap()
    expect(ov.to).toBeGreaterThan(ov.from) // 교집합이 없으면 어떤 상수로도 두 기기를 만족시킬 수 없다
    expect((ov.from + ov.to) / 2).toBeCloseTo(DEITY_CONTACT_Y, 1)
    // 권장값이 두 방 **모두**의 상면 밴드 안에 있다 = 어느 기기에서도 발이 허공에 뜨지 않는다
    for (const b of ov.bands) {
      expect(DEITY_CONTACT_Y).toBeGreaterThanOrEqual(b.from)
      expect(DEITY_CONTACT_Y).toBeLessThanOrEqual(b.to)
    }
    // 밴드 폭 — 에셋↔배선의 반올림·판단 차이를 흡수할 여유가 있어야 한다(단상 y 를 51 로 고른 이유)
    expect(ov.to - ov.from).toBeGreaterThan(1)
  })

  it('★ 배선(stage.ts PODIUM_TOP_Y)이 단상 상면 밴드 안을 본다 — 시드↔코드 드리프트 방지', () => {
    // 에셋·시드(이 파일)와 배선(stage.ts)이 서로 다른 기하를 들고 있으면 신위가 다시 뜬다.
    // **정확히 같은 값**은 요구하지 않는다 — 두 기기 극단의 교집합 안이면 발은 상면에 놓인다.
    // (그래서 45.1·45.3·45.8 은 전부 합격이고, 상면을 벗어난 값만 떨어진다.)
    const band = platformSurfaceOverlap()
    expect(PODIUM_TOP_Y).toBeGreaterThanOrEqual(band.from)
    expect(PODIUM_TOP_Y).toBeLessThanOrEqual(band.to)
  })

  it('접지선이 상판 top 보다 위다 — 신위(z-3)가 상판을 덮지 않는다', () => {
    const stage = zoneStage(daecheongZone(seededWorld()), bangaStage())
    const altar = stage.structures.find((s) => s.code === 'altar-banga')
    // 상판 스프라이트 768×270 → w58 에서 세로 17.1%, y58 중심 → top 49.4%
    const ab = apparentBand(Number(altar?.w), Number(altar?.y), { w: 768, h: 270 })
    expect(ab.top).toBeGreaterThan(DEITY_CONTACT_Y)
    expect(ab.top - DEITY_CONTACT_Y).toBeGreaterThan(2) // 최소 2%p 여유(발이 상 위에 겹치지 않게)
  })

  it('문간의 world x — 방 왼쪽 끝 근처에서 시작한다 (카메라 0 에서 보이는 자리)', () => {
    const world = seededWorld()
    const zone = daecheongZone(world)
    // 구조물 x 에는 스케일이 붙지 않는다(위치는 비율 그대로) → world 좌표로 10% × 320 = 32
    expect(toWorldX(world, zone, 10)).toBeCloseTo(32, 4)
    expect(toWorldX(world, zone, 10)).toBeLessThan(WORLD_VIEWPORT_PCT) // 카메라 0(입장 시점)에서 화면 안
  })

  it("사랑방 구역('huwon')은 여전히 구역이 아니다 — 좌표로 앉는다", () => {
    expect(seededWorld().zones.find((z) => z.code === 'huwon')).toBeUndefined()
  })

  it('★ 사랑방 띠가 이 시드의 world 폭을 기준으로 잡혀 있다 — 시드↔좌석 범위 드리프트 방지', () => {
    // 좌석 이동 범위(HALL_SEAT_ZONE)는 띠가 world 어디에 얹히는지에서 파생된다. 시드 폭이 바뀌면
    // 좌석이 방을 다 덮지 못하거나(좁아지면) 카메라로 되찾을 수 없는 방 밖으로 나간다(넓어지면).
    expect(HALL_BAND.worldWidth).toBe(seededWorld().width)
  })

  it('★ 좌석이 방 전 구역에 닿는다 — 양 끝이 방 안이면서 world 0·320 에 스프라이트 여백만 남긴다', () => {
    const world = seededWorld()
    const left = hallSeatWorldX(HALL_SEAT_ZONE.x[0])
    const right = hallSeatWorldX(HALL_SEAT_ZONE.x[1])
    expect(left).toBeGreaterThan(0)
    expect(right).toBeLessThan(world.width)
    expect(left).toBeLessThan(10)
    expect(world.width - right).toBeLessThan(10)
  })
})

describe('에셋 실재', () => {
  /** 시드가 실제로 렌더에 넘기는 URL 만 모은다 — parseWorld 를 통과한 값이라 오탈자가 걸러진 뒤다 */
  function seededAssetUrls(): string[] {
    const world = seededWorld()
    const urls: string[] = []
    for (const zone of world.zones) {
      if (zone.wallpaperUrl) urls.push(zone.wallpaperUrl)
      if (zone.flooringUrl) urls.push(zone.flooringUrl)
      for (const s of zone.structures) urls.push(s.assetUrl)
    }
    return urls
  }

  it('무라 2장 + 단상 + 상판이 전부 시드에 실려 있다 — 문간은 2026-08-06 걷었다', () => {
    expect(seededAssetUrls().sort()).toEqual([WALL_MURAL, FLOOR_MURAL, PLATFORM_SPRITE, ALTAR_TOP_SPRITE].sort())
  })

  it.each(seededAssetUrls())('%s 가 public/ 에 실재한다', (url) => {
    // 404 는 StageLayers 의 onError 가 조용히 숨긴다 — 화면에서 알아채기 어려우니 여기서 잡는다
    expect(existsSync(path.join(PUBLIC_DIR, url))).toBe(true)
  })

  it('최상위가 물려주는 레거시 제단·벽지·바닥도 실재한다 (zones 를 걷어낸 §3(a) 원복 경로의 안전망)', () => {
    const base = bangaStage()
    for (const url of [base.wallpaperUrl, base.flooringUrl, ...base.structures.map((s) => s.assetUrl)]) {
      expect(url).not.toBeNull()
      expect(existsSync(path.join(PUBLIC_DIR, String(url)))).toBe(true)
    }
    // 안2.3 이 대체했어도 삭제하지 않는다 — §3(b) 원복이 이 한 장을 다시 가리킨다
    expect(existsSync(path.join(PUBLIC_DIR, LEGACY_ALTAR_SPRITE))).toBe(true)
  })

  it('무라의 입력 타일 2장은 삭제하지 않고 보관한다 (§3(b) 원복 + 재굽기 입력)', () => {
    for (const f of ['room-wall-tile.webp', 'room-floor-tile.webp']) {
      expect(existsSync(path.join(PUBLIC_DIR, 'shrine', 'stage', 'banga', f))).toBe(true)
    }
  })

  it('마당·후원 실외 에셋도 보관한다 (후속 앞마당 씬 재론용 — 시드에서만 제외)', () => {
    for (const f of [
      'gate.webp',
      'seokdeung.webp',
      'madang-wall.webp',
      'madang-floor.webp',
      'huwon-wall.webp',
      'huwon-floor.webp',
    ]) {
      expect(existsSync(path.join(PUBLIC_DIR, 'shrine', 'stage', 'banga', f))).toBe(true)
    }
  })

  it('단상 스프라이트가 실측 규격(640×299, 레터박스 0)이다 — 접지선 산술의 전제', () => {
    // 캔버스 ≠ 내용물이면(투명 여백) 시드 y 와 실제 접지선이 어긋난다. 재굽기가 규격을 바꿨는지 잡는다.
    const buf = readFileSync(path.join(PUBLIC_DIR, PLATFORM_SPRITE))
    // webp VP8L/VP8X 헤더에서 폭·높이를 읽는다(라이브러리 없이 — 테스트는 sharp 를 쓰지 않는다)
    expect(buf.subarray(0, 4).toString('ascii')).toBe('RIFF')
    expect(buf.subarray(8, 12).toString('ascii')).toBe('WEBP')
    const vp8x = buf.indexOf('VP8X', 12, 'ascii')
    expect(vp8x).toBeGreaterThan(0)
    const w = 1 + buf.readUIntLE(vp8x + 12, 3)
    const h = 1 + buf.readUIntLE(vp8x + 15, 3)
    expect({ w, h }).toEqual(PLATFORM_PX)
  })
})

describe('ZONES.altar — 제단 존 계약 (안2.5)', () => {
  /** 상판 겉보기 상단(방 높이 %) — stage-banga-mural 검수 산출 y49.4~66.6 의 위쪽 */
  const ALTAR_TOP_Y = 49.4

  it('하한이 상판 상단 부근이다 — 더 낮으면 공물이 상 뒤 허공에 놓인다', () => {
    // 라이브 실측(2026-07-30): 종전 하한 42 에서 altar 배치 14건 중 3건이 42~48 구간에 있었고
    // 전부 상판에 가려 보이지 않았다. 하한을 다시 낮추는 변경은 그 결함을 되살린다.
    const [lo] = ZONES.altar.y
    expect(lo).toBeGreaterThanOrEqual(48)
    expect(lo).toBeLessThanOrEqual(ALTAR_TOP_Y)
  })

  it('상한이 시드 상판 앵커보다 위다 — 여유가 0 이면 상판을 더 못 내린다', () => {
    const [, hi] = ZONES.altar.y
    expect(hi).toBeGreaterThan(ALTAR_ANCHOR_Y)
  })
})
