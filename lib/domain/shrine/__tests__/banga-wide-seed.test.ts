/**
 * 반가 와이드 구역 시드 정합 — supabase/migrations/20260729_shrine_banga_wide_zones.sql
 *
 * 시드가 잘못되면 parseWorld 가 **부분 채택 없이 항등 폴백**(폭 100·대청 하나)으로 되돌아간다.
 * 예외도 로그도 없이 두루마리만 조용히 사라지므로 DB 에 적용하고 나서는 눈으로만 알 수 있다 →
 * DB 없이, 시드 파일 그 자체를 읽어서 미리 잡는다.
 *
 * 이 테스트가 검사하는 것
 *   1. 시드 SQL 의 JSON 이 parseWorld 를 **통과**한다 (폭 240 · 구역 3).
 *   2. `||` 병합이 기존 최상위 무대(벽지/바닥/구조물/광원)를 지우지 않는다.
 *   3. 대청은 필드가 비어 최상위를 승계하고, 마당·후원은 제 에셋을 직접 든다.
 *   4. 시드가 가리키는 에셋 파일이 public/ 에 실재한다.
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { parseStageSpec, type StageSpec } from '../stage'
import { WORLD_DEFAULT_WIDTH, WORLD_VIEWPORT_PCT, daecheongZone, parseWorld, type WorldSpec } from '../world'
import { zoneStage } from '../world-render'

const ROOT = path.resolve(__dirname, '../../../..')
const SEED_SQL = path.join(ROOT, 'supabase', 'migrations', '20260729_shrine_banga_wide_zones.sql')
const PUBLIC_DIR = path.join(ROOT, 'public')

/** 시드 SQL 안에서 순수 JSON 을 감싸는 달러 인용 구분자 (Postgres dollar-quoting) */
const DOLLAR_TAG = '$world$'

/**
 * 시드 SQL → 두루마리 JSON.
 *
 * 정규식으로 긁지 않는다 — 구분자 두 개 사이를 그대로 잘라 JSON.parse 한다.
 * 그래서 SQL 쪽은 그 블록 안에 SQL 문법(주석·함수 호출·트레일링 콤마)을 넣을 수 없고,
 * 넣는 순간 이 테스트가 파싱 단계에서 깨진다 — 그게 의도한 계약이다.
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
 * 이 시드는 `stage || {...}` 라서 아래 필드가 그대로 남아야 한다 — 대청 화면 회귀 0 의 근거다.
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

/** DB 의 `stage || <시드 JSON>` 을 JS 로 재현 — jsonb `||` 는 최상위 키 단위 덮어쓰기다. */
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

function zoneOf(world: WorldSpec, code: string) {
  const zone = world.zones.find((z) => z.code === code)
  if (!zone) throw new Error(`구역 없음: ${code}`)
  return zone
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
  it('논리 폭 240 · 구역 3개', () => {
    const world = seededWorld()
    expect(world.width).toBe(WORLD_DEFAULT_WIDTH)
    expect(world.width).toBe(240)
    expect(world.zones).toHaveLength(3)
  })

  it('폴백이었다면 나왔을 값(폭 100·구역 1)이 아니다 — 검증 실패는 조용하므로 명시로 못 박는다', () => {
    const world = seededWorld()
    expect(world.width).toBeGreaterThan(WORLD_VIEWPORT_PCT) // ShrineRoomClient 의 worldActive 조건
    expect(world.zones.length).toBeGreaterThan(1)
  })

  it('구역 경계가 마당 0~70 · 대청 70~170 · 후원 170~240 (정렬·비중첩·폭 정합)', () => {
    const world = seededWorld()
    expect(world.zones.map((z) => [z.code, z.x0, z.x1])).toEqual([
      ['madang', 0, 70],
      ['daecheong', 70, 170],
      ['huwon', 170, 240],
    ])
    // 마지막 구역의 오른쪽 끝이 곧 논리 폭 — 어긋나면 카메라가 빈 공간으로 팬 한다
    expect(world.zones[world.zones.length - 1].x1).toBe(world.width)
  })

  it('구역 라벨은 world.ts 단일 출처에서 온다 (시드가 문구를 복제하지 않는다)', () => {
    const world = seededWorld()
    expect(world.zones.map((z) => z.label)).toEqual(['마당', '대청', '후원'])
  })
})

describe('구역별 무대 사양', () => {
  it('대청은 필드를 비워 최상위 무대를 그대로 승계한다 (대청 화면 회귀 0)', () => {
    const world = seededWorld()
    const base = bangaStage()
    const daecheong = daecheongZone(world)

    // 시드 자체에는 아무 에셋도 없어야 한다 — 여기에 값이 생기면 최상위와 두 벌 관리가 된다
    expect(daecheong.wallpaperUrl).toBeNull()
    expect(daecheong.flooringUrl).toBeNull()
    expect(daecheong.structures).toEqual([])

    // 렌더 시점에 base 를 물려받아 지금 화면과 같아진다
    const stage = zoneStage(daecheong, base)
    expect(stage.wallpaperUrl).toBe(base.wallpaperUrl)
    expect(stage.flooringUrl).toBe(base.flooringUrl)
    expect(stage.structures).toEqual(base.structures)
    expect(stage.light).toEqual(base.light)
  })

  it('마당·후원은 제 벽지·바닥을 직접 든다 — 렌더가 base 를 안 물려주기 때문', () => {
    const world = seededWorld()
    // ShrineRoomClient 는 대청 밖 구역에 zoneStage(z, null) 로 base 를 끊는다
    for (const code of ['madang', 'huwon']) {
      const stage = zoneStage(zoneOf(world, code), null)
      expect(stage.wallpaperUrl).not.toBeNull()
      expect(stage.flooringUrl).not.toBeNull()
    }
  })

  it('마당 구조물은 대문·석등 2종이고 좌표가 구역 로컬 %로 살아 있다', () => {
    const madang = zoneOf(seededWorld(), 'madang')
    expect(madang.structures.map((s) => [s.code, s.x, s.y, s.w])).toEqual([
      ['gate-banga', 24, 52, 52],
      ['seokdeung-banga', 72, 66, 14],
    ])
  })

  it('후원에는 구조물을 두지 않는다 (에셋 없는 구조물은 조용히 버려지므로 아예 넣지 않는다)', () => {
    expect(zoneOf(seededWorld(), 'huwon').structures).toEqual([])
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

  it('구역 에셋 6장이 전부 시드에 실려 있다', () => {
    expect(seededAssetUrls().sort()).toEqual([
      '/shrine/stage/banga/gate.webp',
      '/shrine/stage/banga/huwon-floor.webp',
      '/shrine/stage/banga/huwon-wall.webp',
      '/shrine/stage/banga/madang-floor.webp',
      '/shrine/stage/banga/madang-wall.webp',
      '/shrine/stage/banga/seokdeung.webp',
    ])
  })

  it.each(seededAssetUrls())('%s 가 public/ 에 실재한다', (url) => {
    // 404 는 StageLayers 의 onError 가 조용히 숨긴다 — 화면에서 알아채기 어려우니 여기서 잡는다
    expect(existsSync(path.join(PUBLIC_DIR, url))).toBe(true)
  })

  it('대청이 승계하는 최상위 에셋도 실재한다', () => {
    const base = bangaStage()
    for (const url of [base.wallpaperUrl, base.flooringUrl, ...base.structures.map((s) => s.assetUrl)]) {
      expect(url).not.toBeNull()
      expect(existsSync(path.join(PUBLIC_DIR, String(url)))).toBe(true)
    }
  })
})
