/**
 * 반가 「큰 방 v2 — 와이드 무라 + 문간」 시드 정합
 * — supabase/migrations/20260730_shrine_banga_mural_320.sql
 *
 * 안2.2 확정안(PRD-shrine-gamefeel-v1 부록 B): 폭 240 → **320**, 벽지·바닥은 타일 repeat-x 대신
 * **미리 이어붙여 구운 와이드 무라 1장**, 좌측에 **문간(분합문)** 랜드마크 신설.
 *
 * 세로선의 원인은 픽셀 값이 아니라 **반복 렌더**였다 — 타일 폭이 소수점이라 `repeat-x` 경계마다
 * 서브픽셀 재샘플링 선이 남는다. 그래서 이 시드의 핵심은 이미지 교체가 아니라 `tile` 필드를 **없애서**
 * StageLayers 를 단일 이미지 경로(`<img class="w-full object-cover">`)로 되돌리는 것이다.
 *
 * 시드가 잘못되면 parseWorld 가 **부분 채택 없이 항등 폴백**(폭 100·구역 하나)으로 되돌아간다.
 * 예외도 로그도 없이 두루마리만 조용히 사라지므로 DB 에 적용하고 나서는 눈으로만 알 수 있다 →
 * DB 없이, 시드 파일 그 자체를 읽어서 미리 잡는다.
 *
 * 이 테스트가 검사하는 것
 *   1. 시드 SQL 의 JSON 이 parseWorld 를 **통과**한다 (폭 320 · 구역 1 · 0~320).
 *   2. `(stage - 'zones') || …` 병합이 기존 최상위 무대(벽지/바닥/구조물/광원)를 지우지 않는다.
 *   3. `tile` 필드가 **없다** — 있으면 repeat-x = 세로선 복귀.
 *   4. 구역이 제 무라 2장과 구조물 2개(제단·문)를 직접 든다. zoneStage 가 최상위를 **대체**하므로
 *      제단이 구역 배열에 없으면 증발한다 — 그 계약을 여기서 못 박는다.
 *   5. 전폭 재해석의 겉보기 환산 계수(zoneWidthScale) — 배선 담당이 놓치면 제단이 2화면짜리가 된다.
 *   6. 시드가 가리키는 에셋 파일이 public/ 에 실재한다.
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { parseStageSpec, type StageSpec } from '../stage'
import { WORLD_VIEWPORT_PCT, daecheongZone, parseWorld, toWorldX, type WorldSpec } from '../world'
import { zoneStage, zoneWidthScale } from '../world-render'

const ROOT = path.resolve(__dirname, '../../../..')
const SEED_SQL = path.join(ROOT, 'supabase', 'migrations', '20260730_shrine_banga_mural_320.sql')
const PUBLIC_DIR = path.join(ROOT, 'public')

/** 안2.2 논리 폭. world.ts WORLD_DEFAULT_WIDTH(240)의 후속이지만 상수를 고치지는 않았다 —
 *  그 값은 기본값일 뿐이고 상한은 MAX_WORLD_WIDTH(1000)라 320 도 그대로 통과한다. */
const SEED_WIDTH = 320

const WALL_MURAL = '/shrine/stage/banga/room-wall-mural.webp'
const FLOOR_MURAL = '/shrine/stage/banga/room-floor-mural.webp'
const DOOR_SPRITE = '/shrine/stage/banga/room-door.webp'

/** 시드 SQL 안에서 순수 JSON 을 감싸는 달러 인용 구분자 (Postgres dollar-quoting) */
const DOLLAR_TAG = '$world$'

/**
 * 시드 SQL → 구역 JSON.
 *
 * 정규식으로 긁지 않는다 — 구분자 두 개 사이를 그대로 잘라 JSON.parse 한다.
 * 그래서 SQL 쪽은 그 블록 안에 SQL 문법(주석·함수 호출·트레일링 콤마)을 넣을 수 없고,
 * 넣는 순간 이 테스트가 파싱 단계에서 깨진다 — 그게 의도한 계약이다.
 * (§3 원복 주석의 직전 240% JSON 이 다른 달러 태그를 쓰는 이유도 이것이다.)
 */
function readSeedWorldJson(): unknown {
  const sql = readFileSync(SEED_SQL, 'utf8')
  const parts = sql.split(DOLLAR_TAG)
  if (parts.length !== 3) {
    throw new Error(`시드 전제 붕괴: ${DOLLAR_TAG} 구분자가 정확히 2개여야 한다 (발견 ${parts.length - 1}개)`)
  }
  const parsed: unknown = JSON.parse(parts[1])
  return parsed
}

/**
 * 병합 대상인 **현행 반가 단일 무대** (프로덕션 shrine_theme_packs.stage 실값, 2026-07-30 조회).
 * 이 시드는 `(stage - 'zones') || {...}` 라서 아래 필드가 그대로 남아야 한다 — §3(a) 원복의 근거다.
 * 제단 정의는 §1 구역 structures 가 손으로 복제하는 원본이기도 하다(시드 §0 이 드리프트를 가드한다).
 */
const BANGA_STAGE_RAW = {
  wallpaperUrl: '/shrine/stage/banga/wallpaper.webp',
  flooringUrl: '/shrine/stage/banga/flooring.webp',
  structures: [
    {
      code: 'altar-banga',
      assetUrl: '/shrine/stage/banga/altar.webp',
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
 * DB 의 `(stage - 'zones') || <시드 JSON>` 을 JS 로 재현.
 * jsonb `||` 는 최상위 키 단위 덮어쓰기이고, `- 'zones'` 는 그 앞에서 구 240% 구역을 걷어낸다 —
 * 여기서는 BANGA_STAGE_RAW 에 zones 가 애초에 없으므로 전개 순서만으로 같은 결과가 된다.
 */
function mergedStageRaw(): Record<string, unknown> {
  const seed = readSeedWorldJson()
  if (typeof seed !== 'object' || seed === null || Array.isArray(seed)) {
    throw new Error('시드 전제 붕괴: 최상위가 JSON 객체가 아니다')
  }
  return { ...BANGA_STAGE_RAW, ...seed }
}

function bangaStage(): StageSpec {
  const spec = parseStageSpec(BANGA_STAGE_RAW)
  if (!spec) throw new Error('테스트 전제 붕괴: 반가 단일 무대 파싱 실패')
  return spec
}

/** 시드가 적용된 뒤 클라이언트가 실제로 만드는 세계 = parseWorld(StageSpec, stage 원본) */
function seededWorld(): WorldSpec {
  return parseWorld(bangaStage(), mergedStageRaw())
}

/** 시드 JSON 의 유일 구역 원본(파서를 통과하기 **전**) — 미지 필드까지 그대로 본다 */
function seededZoneRaw(): Record<string, unknown> {
  const seed = readSeedWorldJson() as { zones?: unknown }
  const zones = seed.zones
  if (!Array.isArray(zones) || zones.length !== 1) throw new Error('시드 전제 붕괴: 구역이 1개가 아니다')
  return zones[0] as Record<string, unknown>
}

describe('시드 SQL 파싱', () => {
  it('달러 인용 블록이 그대로 JSON 으로 읽힌다', () => {
    expect(() => readSeedWorldJson()).not.toThrow()
  })

  it('병합해도 기존 최상위 무대가 한 필드도 사라지지 않는다 (|| 는 최상위 키 단위)', () => {
    const merged = mergedStageRaw()
    const base = bangaStage()
    const after = parseStageSpec(merged)
    expect(after).toEqual(base)
    // 원본 stage 를 통째로 갈아끼우는 사고(SET stage = '{...}')였다면 여기서 죽는다
    expect(after?.structures.map((s) => s.code)).toEqual(['altar-banga'])
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

  it('구역 structures 가 제단·문간 2개다 — zoneStage 가 최상위를 **대체**하므로 제단이 여기 있어야 산다', () => {
    // world-render.ts zoneStage: structures.length > 0 ? zone.structures : base.structures
    // 문만 넣었다면 제단이 예외도 로그도 없이 사라진다. 그 함정을 이 단정이 막는다.
    const base = bangaStage()
    const stage = zoneStage(daecheongZone(seededWorld()), base)
    expect(stage.structures.map((s) => s.code)).toEqual(['altar-banga', 'door-banga'])
    expect(stage.structures).not.toEqual(base.structures) // 승계가 아니라 구역 정의가 이겼다
  })

  it('구역이 복제한 제단이 최상위 제단과 완전히 같다 (좌표·앵커까지)', () => {
    const stage = zoneStage(daecheongZone(seededWorld()), bangaStage())
    const seedAltar = stage.structures.find((s) => s.code === 'altar-banga')
    expect(seedAltar).toEqual(bangaStage().structures[0])
  })

  it('문간은 좌측 입장 시작점에 앵커 없이 선다 (배치 지점이 아니다)', () => {
    const stage = zoneStage(daecheongZone(seededWorld()), bangaStage())
    const door = stage.structures.find((s) => s.code === 'door-banga')
    expect(door).toEqual({ code: 'door-banga', assetUrl: DOOR_SPRITE, x: 10, y: 37, w: 36, anchors: [] })
  })

  it('광원은 최상위에서 승계된다 — 방 전체가 같은 빛을 받는다', () => {
    const base = bangaStage()
    expect(zoneStage(daecheongZone(seededWorld()), base).light).toEqual(base.light)
  })
})

describe('전폭 재해석 — 배선 담당이 놓치면 안 되는 환산', () => {
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

  it('구조물 w 는 구역 폭 대비 %라 겉보기 보존에 ×100/320 환산이 필요하다 (제단 62 → 19.375)', () => {
    const zone = daecheongZone(seededWorld())
    const span = zone.x1 - zone.x0
    expect(span).toBe(SEED_WIDTH)
    const stage = zoneStage(zone, bangaStage())
    const altar = stage.structures.find((s) => s.code === 'altar-banga')
    expect(altar?.w).toBe(62)
    // 그대로 두면 3.2화면의 62% = 1.98화면짜리 제단이 된다
    const keepApparent = Math.round(Number(altar?.w) * zoneWidthScale(zone) * 1e4) / 1e4
    expect(keepApparent).toBeCloseTo(19.375, 4)
  })

  it('문간 w 36 → 11.25 (= 화면 폭의 36%). 이 값이 「입장 시작점이 보인다」의 크기 근거다', () => {
    // 14 로는 등롱만 한 크기라 입장 시작점으로 읽히지 않았다(A파 조립 검수).
    // 36 이면 스프라이트 종횡비(512:768)상 높이가 벽 밴드(62%)에 거의 꽉 차 문으로 읽힌다.
    const zone = daecheongZone(seededWorld())
    const door = zoneStage(zone, bangaStage()).structures.find((s) => s.code === 'door-banga')
    expect(door?.w).toBe(36)
    expect(Math.round(Number(door?.w) * zoneWidthScale(zone) * 1e4) / 1e4).toBeCloseTo(11.25, 4)
  })

  it('문간의 world x — 방 왼쪽 끝 근처에서 시작한다 (카메라 0 에서 보이는 자리)', () => {
    const world = seededWorld()
    const zone = daecheongZone(world)
    // 구조물 x 에는 스케일이 붙지 않는다(위치는 비율 그대로) → world 좌표로 8% × 320 = 25.6
    expect(toWorldX(world, zone, 8)).toBeCloseTo(25.6, 4)
    expect(toWorldX(world, zone, 8)).toBeLessThan(WORLD_VIEWPORT_PCT) // 카메라 0(입장 시점)에서 화면 안
  })

  it("사랑방 구역('huwon')은 여전히 구역이 아니다 — 좌표로 앉는다", () => {
    expect(seededWorld().zones.find((z) => z.code === 'huwon')).toBeUndefined()
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

  it('무라 2장 + 제단 + 문간이 전부 시드에 실려 있다', () => {
    expect(seededAssetUrls().sort()).toEqual(
      ['/shrine/stage/banga/altar.webp', FLOOR_MURAL, DOOR_SPRITE, WALL_MURAL].sort()
    )
  })

  it.each(seededAssetUrls())('%s 가 public/ 에 실재한다', (url) => {
    // 404 는 StageLayers 의 onError 가 조용히 숨긴다 — 화면에서 알아채기 어려우니 여기서 잡는다
    expect(existsSync(path.join(PUBLIC_DIR, url))).toBe(true)
  })

  it('최상위가 물려주는 제단·벽지·바닥도 실재한다 (zones 를 걷어낸 §3(a) 원복 경로의 안전망)', () => {
    const base = bangaStage()
    for (const url of [base.wallpaperUrl, base.flooringUrl, ...base.structures.map((s) => s.assetUrl)]) {
      expect(url).not.toBeNull()
      expect(existsSync(path.join(PUBLIC_DIR, String(url)))).toBe(true)
    }
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
})
