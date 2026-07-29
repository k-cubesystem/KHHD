/**
 * 반가 「큰 방 하나」 시드 정합 — supabase/migrations/20260729_shrine_banga_one_room.sql
 *
 * 안2.1 확정안: 구역 3개(마당·대청·후원) → **단일 구역(대청 0~240)**.
 * 경계를 없애고 벽지·바닥을 가로 타일 repeat-x 로 반복해 "같은 방이 끝까지 이어지게" 한다.
 *
 * 시드가 잘못되면 parseWorld 가 **부분 채택 없이 항등 폴백**(폭 100·구역 하나)으로 되돌아간다.
 * 예외도 로그도 없이 두루마리만 조용히 사라지므로 DB 에 적용하고 나서는 눈으로만 알 수 있다 →
 * DB 없이, 시드 파일 그 자체를 읽어서 미리 잡는다.
 *
 * 이 테스트가 검사하는 것
 *   1. 시드 SQL 의 JSON 이 parseWorld 를 **통과**한다 (폭 240 · 구역 1 · 0~240).
 *   2. `(stage - 'zones') || …` 병합이 기존 최상위 무대(벽지/바닥/구조물/광원)를 지우지 않는다.
 *   3. 유일 구역이 **제 타일을 직접** 들고, 구조물·광원은 최상위에서 승계한다.
 *   4. `tile` 렌더 신호가 시드에 실려 있고, parseWorld 가 그 신호를 렌더까지 넘긴다(C파 배선 완료).
 *   5. 전폭 재해석의 환산 계수 — 배선 담당이 놓치면 제단이 1.5화면짜리가 된다.
 *   6. 시드가 가리키는 에셋 파일이 public/ 에 실재한다.
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { parseStageSpec, type StageSpec } from '../stage'
import { WORLD_DEFAULT_WIDTH, WORLD_VIEWPORT_PCT, daecheongZone, parseWorld, toWorldX, type WorldSpec } from '../world'
import { zoneStage } from '../world-render'

const ROOT = path.resolve(__dirname, '../../../..')
const SEED_SQL = path.join(ROOT, 'supabase', 'migrations', '20260729_shrine_banga_one_room.sql')
const PUBLIC_DIR = path.join(ROOT, 'public')

/** 시드 SQL 안에서 순수 JSON 을 감싸는 달러 인용 구분자 (Postgres dollar-quoting) */
const DOLLAR_TAG = '$world$'

/**
 * 시드 SQL → 구역 JSON.
 *
 * 정규식으로 긁지 않는다 — 구분자 두 개 사이를 그대로 잘라 JSON.parse 한다.
 * 그래서 SQL 쪽은 그 블록 안에 SQL 문법(주석·함수 호출·트레일링 콤마)을 넣을 수 없고,
 * 넣는 순간 이 테스트가 파싱 단계에서 깨진다 — 그게 의도한 계약이다.
 * (원복 주석의 직전 3구역 JSON 이 다른 달러 태그를 쓰는 이유도 이것이다.)
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
 * 병합 대상인 **현행 반가 단일 무대** (프로덕션 shrine_theme_packs.stage 실값, 2026-07-29 조회).
 * 이 시드는 `(stage - 'zones') || {...}` 라서 아래 필드가 그대로 남아야 한다 — 제단·광원 회귀 0 의 근거다.
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
 * jsonb `||` 는 최상위 키 단위 덮어쓰기이고, `- 'zones'` 는 그 앞에서 구 3구역을 걷어낸다 —
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
  it('논리 폭 240 · 구역 1개', () => {
    const world = seededWorld()
    expect(world.width).toBe(WORLD_DEFAULT_WIDTH)
    expect(world.width).toBe(240)
    expect(world.zones).toHaveLength(1)
  })

  it('폴백이었다면 나왔을 값(폭 100)이 아니다 — 검증 실패는 조용하므로 명시로 못 박는다', () => {
    // 구역이 1개라 개수로는 폴백과 구분되지 않는다. 폭이 유일한 판별점이다.
    expect(seededWorld().width).toBeGreaterThan(WORLD_VIEWPORT_PCT) // ShrineRoomClient 의 worldActive 조건
  })

  it('유일 구역이 세계 전체를 덮는다 — 대청 0~240 (경계 자체가 없다 = 이음새 0)', () => {
    const world = seededWorld()
    expect(world.zones.map((z) => [z.code, z.x0, z.x1])).toEqual([['daecheong', 0, 240]])
    expect(world.zones[0].x1).toBe(world.width)
    expect(world.zones[0].x0).toBe(0)
  })

  it('구역 라벨은 world.ts 단일 출처에서 온다 (시드가 문구를 복제하지 않는다)', () => {
    expect(seededWorld().zones.map((z) => z.label)).toEqual(['대청'])
  })
})

describe('무대 사양 — 타일은 구역이, 구조물·광원은 최상위가', () => {
  it('유일 구역이 제 가로 타일을 직접 든다 (최상위 벽지/바닥은 승계하지 않는다)', () => {
    const zone = daecheongZone(seededWorld())
    expect(zone.wallpaperUrl).toBe('/shrine/stage/banga/room-wall-tile.webp')
    expect(zone.flooringUrl).toBe('/shrine/stage/banga/room-floor-tile.webp')
    // 늘려 쓰는 단일 배경판(wallpaper.webp)이 다시 들어오면 큰 방에서 벽 리듬이 뭉개진다
    expect(zone.wallpaperUrl).not.toBe(bangaStage().wallpaperUrl)
  })

  it('구조물·광원은 최상위에서 승계된다 — 제단이 사라지지 않는다', () => {
    const base = bangaStage()
    // ShrineRoomClient: daecheongStage = zoneStage(daecheong, activeStage)
    const stage = zoneStage(daecheongZone(seededWorld()), base)
    expect(stage.structures).toEqual(base.structures)
    expect(stage.light).toEqual(base.light)
    expect(stage.wallpaperUrl).toBe('/shrine/stage/banga/room-wall-tile.webp')
  })
})

describe('tile 렌더 계약 (배선 완료 — C파)', () => {
  it('시드 JSON 에 tile: true 가 실려 있다 — repeat-x 로 그리라는 신호', () => {
    expect(seededZoneRaw().tile).toBe(true)
  })

  it('parseWorld 가 tile 을 구역에 실어 렌더까지 넘긴다 (StageLayers repeat-x 분기의 입력)', () => {
    // B파 시점에는 parseWorld 가 이 필드를 버렸고, 그 사실 자체가 배선 계약이었다.
    // C파에서 WorldZone.tile 파싱이 붙어 신호가 끝까지 이어진다 — 여기가 그 연결의 증거다.
    expect(daecheongZone(seededWorld()).tile).toBe(true)
    expect(seededWorld().zones).toHaveLength(1)
  })
})

describe('전폭 재해석 — 배선 담당이 놓치면 안 되는 환산', () => {
  it('배치 x 는 방 전폭으로 퍼진다 (PRD 부록 A "방 전폭 꾸미기" — 의도된 동작)', () => {
    const world = seededWorld()
    const zone = daecheongZone(world)
    // 기존 대청 로컬 x 가 그대로 world x × 2.4 가 된다. 마이그레이션 UPDATE 는 0건.
    expect(toWorldX(world, zone, 0)).toBe(0)
    expect(toWorldX(world, zone, 50)).toBe(120)
    expect(toWorldX(world, zone, 100)).toBe(240)
  })

  it('구조물 w 는 구역 폭 대비 %라 겉보기 보존에 ×100/240 환산이 필요하다', () => {
    const zone = daecheongZone(seededWorld())
    const span = zone.x1 - zone.x0
    expect(span).toBe(240)
    const altar = bangaStage().structures[0]
    expect(altar.w).toBe(62)
    // 그대로 두면 2.4화면의 62% = 1.49화면짜리 제단이 된다
    const keepApparent = Math.round(((altar.w * WORLD_VIEWPORT_PCT) / span) * 100) / 100
    expect(keepApparent).toBeCloseTo(25.83, 2)
  })

  it("사랑방 구역('huwon')이 사라진다 — 그래서 사랑방은 구역이 아니라 좌표로 앉는다", () => {
    // 구 배선(world.zones.find(z => z.code === 'huwon'))이었다면 hallBox = null → 예외도 로그도 없이 증발했다.
    // C파에서 ShrineRoomClient 가 world 우측 영역([width-68, width-4])으로 옮겨 구역 구성과 무관해졌다.
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

  it('가로 타일 2장이 전부 시드에 실려 있다', () => {
    expect(seededAssetUrls().sort()).toEqual([
      '/shrine/stage/banga/room-floor-tile.webp',
      '/shrine/stage/banga/room-wall-tile.webp',
    ])
  })

  it.each(seededAssetUrls())('%s 가 public/ 에 실재한다', (url) => {
    // 404 는 StageLayers 의 onError 가 조용히 숨긴다 — 화면에서 알아채기 어려우니 여기서 잡는다
    expect(existsSync(path.join(PUBLIC_DIR, url))).toBe(true)
  })

  it('최상위가 물려주는 제단·벽지·바닥도 실재한다 (zones 를 걷어낸 원복 경로의 안전망)', () => {
    const base = bangaStage()
    for (const url of [base.wallpaperUrl, base.flooringUrl, ...base.structures.map((s) => s.assetUrl)]) {
      expect(url).not.toBeNull()
      expect(existsSync(path.join(PUBLIC_DIR, String(url)))).toBe(true)
    }
  })

  it('마당·후원 실외 에셋은 삭제하지 않고 보관한다 (후속 앞마당 씬 재론용 — 시드에서만 제외)', () => {
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
