import { parseStageSpec, type StageSpec } from '../stage'
import { PARALLAX, WORLD_DEFAULT_WIDTH, parseWorld, daecheongZone, type WorldSpec } from '../world'
import { parallaxShiftPct, zoneBox, zoneCodeAt, zoneStage, zoneWidthScale } from '../world-render'

// 3파가 시드할 반가 두루마리 규격 — 마당 0~70 · 대청 70~170 · 후원 170~240 (논리 폭 240)
const SCROLL_RAW = {
  width: WORLD_DEFAULT_WIDTH,
  zones: [
    { code: 'madang', x0: 0, x1: 70, wallpaper: '/shrine/banga/madang.webp' },
    { code: 'daecheong', x0: 70, x1: 170 },
    { code: 'huwon', x0: 170, x1: 240, flooring: '/shrine/banga/huwon-floor.webp' },
  ],
}

/** 기존 단일 무대(v2 반가) — zones 이전 규격 */
const SINGLE_RAW = {
  wallpaper: '/shrine/banga/wall.webp',
  flooring: '/shrine/banga/floor.webp',
  structures: [{ code: 'altar', assetUrl: '/shrine/banga/altar.webp', x: 50, y: 52, w: 46 }],
  light: { color: 'rgba(255,214,160,0.55)', intensity: 0.5, origin: { x: 50, y: 18 } },
}

function singleStage(): StageSpec {
  const spec = parseStageSpec(SINGLE_RAW)
  if (!spec) throw new Error('테스트 전제 붕괴: 단일 무대 파싱 실패')
  return spec
}

function scrollWorld(): WorldSpec {
  return parseWorld(singleStage(), SCROLL_RAW)
}

function zoneOf(world: WorldSpec, code: string) {
  const z = world.zones.find((k) => k.code === code)
  if (!z) throw new Error(`테스트 전제 붕괴: ${code} 구역 없음`)
  return z
}

describe('zoneBox — 구역 컨테이너 기하', () => {
  it('단일 무대는 대청 하나가 방 전체를 덮는다 (배치 % 좌표 무손실의 근거)', () => {
    const world = parseWorld(singleStage(), null)
    expect(zoneBox(world, daecheongZone(world))).toEqual({ left: '0%', width: '100%' })
  })

  it('두루마리 구역은 world 폭 기준 백분율로 나뉜다', () => {
    const world = scrollWorld()
    expect(zoneBox(world, zoneOf(world, 'madang'))).toEqual({ left: '0%', width: '29.1667%' })
    expect(zoneBox(world, zoneOf(world, 'daecheong'))).toEqual({ left: '29.1667%', width: '41.6667%' })
    expect(zoneBox(world, zoneOf(world, 'huwon'))).toEqual({ left: '70.8333%', width: '29.1667%' })
  })

  it('대청 박스의 실폭은 뷰포트와 같다 — 캔버스·배치가 확대되지 않는다', () => {
    const world = scrollWorld()
    const box = zoneBox(world, daecheongZone(world))
    // world 컨테이너가 방의 240% 이므로 그 41.6667% = 방의 100%
    expect((parseFloat(box.width) * world.width) / 100).toBeCloseTo(100, 3)
  })

  it('범위를 벗어난 구역도 방 밖으로 튀지 않는다', () => {
    const broken: WorldSpec = {
      width: 240,
      zones: [{ code: 'x', label: 'x', x0: -50, x1: 900, wallpaperUrl: null, flooringUrl: null, structures: [] }],
    }
    expect(zoneBox(broken, broken.zones[0])).toEqual({ left: '0%', width: '100%' })
  })
})

describe('zoneWidthScale — 넓은 구역의 겉보기 폭 보정', () => {
  it('뷰포트 이하 구역은 1 — 현행 3구역(마당 70·대청 100·후원 70)에 아무 영향이 없다', () => {
    const world = scrollWorld()
    expect(zoneWidthScale(zoneOf(world, 'madang'))).toBe(1)
    expect(zoneWidthScale(zoneOf(world, 'daecheong'))).toBe(1)
    expect(zoneWidthScale(zoneOf(world, 'huwon'))).toBe(1)
    expect(zoneWidthScale(daecheongZone(parseWorld(singleStage(), null)))).toBe(1)
  })

  it('큰 방 하나(0~240)는 100/240 — 제단 w 62 가 겉보기 25.83 으로 유지된다', () => {
    const world = parseWorld(null, { width: 240, zones: [{ code: 'daecheong', x0: 0, x1: 240 }] })
    const scale = zoneWidthScale(daecheongZone(world))
    expect(scale).toBeCloseTo(0.416667, 6)
    // 환산을 빼먹으면 62%×2.4화면 = 1.49화면짜리 제단이 된다(시드 SQL §전폭 재해석 경고)
    expect(Math.round(62 * scale * 100) / 100).toBeCloseTo(25.83, 2)
  })

  it('망가진 구역(역전·비유한 경계)도 1 로 떨어져 렌더가 죽지 않는다', () => {
    const base = { code: 'x', label: 'x', wallpaperUrl: null, flooringUrl: null, structures: [] }
    expect(zoneWidthScale({ ...base, x0: 200, x1: 40 })).toBe(1)
    expect(zoneWidthScale({ ...base, x0: Number.NaN, x1: 240 })).toBeCloseTo(0.416667, 6)
    expect(zoneWidthScale({ ...base, x0: 0, x1: Number.NaN })).toBe(1)
  })
})

describe('zoneStage — 구역 무대 사양', () => {
  it('구역이 제 에셋을 들고 있으면 그것을 쓴다', () => {
    const world = scrollWorld()
    expect(zoneStage(zoneOf(world, 'madang'), null).wallpaperUrl).toBe('/shrine/banga/madang.webp')
  })

  it('구역에 없는 에셋은 테마 단일 무대를 물려받는다 (zones 만 얹는 무해한 세대교체)', () => {
    const world = scrollWorld()
    const base = singleStage()
    const daecheong = zoneStage(daecheongZone(world), base)
    expect(daecheong.wallpaperUrl).toBe(base.wallpaperUrl)
    expect(daecheong.flooringUrl).toBe(base.flooringUrl)
    expect(daecheong.structures).toEqual(base.structures)
    expect(daecheong.light).toEqual(base.light)
  })

  it('base 가 없으면 없는 대로 — 벽·바닥 없는 구역은 CSS 폴백에 맡긴다', () => {
    const world = scrollWorld()
    const madang = zoneStage(zoneOf(world, 'madang'), null)
    expect(madang.flooringUrl).toBeNull()
    expect(madang.structures).toEqual([])
    expect(madang.light).toBeNull()
  })

  it('구역 에셋이 테마 에셋을 덮어쓴다', () => {
    const world = scrollWorld()
    const huwon = zoneStage(zoneOf(world, 'huwon'), singleStage())
    expect(huwon.flooringUrl).toBe('/shrine/banga/huwon-floor.webp')
  })
})

describe('zoneCodeAt — 카메라가 선 구역 (GA4 라벨)', () => {
  it('양 끝과 가운데를 각각 제 구역으로 읽는다', () => {
    const world = scrollWorld()
    expect(zoneCodeAt(world, 0)).toBe('madang')
    expect(zoneCodeAt(world, 70)).toBe('daecheong')
    // 후원 정렬점은 경계 클램프로 width-100 = 140 이다
    expect(zoneCodeAt(world, 140)).toBe('huwon')
  })

  it('단일 무대는 언제나 대청이다', () => {
    const world = parseWorld(singleStage(), null)
    expect(zoneCodeAt(world, 0)).toBe('daecheong')
    expect(zoneCodeAt(world, 999)).toBe('daecheong')
  })

  it('구역이 없거나 좌표가 깨져도 던지지 않는다', () => {
    expect(zoneCodeAt({ width: 100, zones: [] }, 0)).toBe('')
    expect(zoneCodeAt(scrollWorld(), Number.NaN)).toBe('madang')
  })
})

describe('parallaxShiftPct — 시차 계수', () => {
  it('층 폭(=world 폭) 배율을 미리 나눠 둔다', () => {
    const world = scrollWorld()
    expect(parallaxShiftPct(world, PARALLAX.far)).toBe('-0.125%')
    expect(parallaxShiftPct(world, PARALLAX.stage)).toBe('-0.41667%')
  })

  it('CSS 가 계산할 실제 이동량이 camX × 계수와 일치한다', () => {
    const world = scrollWorld()
    const camX = 140 // 후원 정렬점(= width - 100)
    for (const factor of [PARALLAX.far, PARALLAX.stage, PARALLAX.near]) {
      // translate 의 %는 자기 폭(world.width%) 기준 → 뷰포트-% 로 환산해 비교
      const shift = ((parseFloat(parallaxShiftPct(world, factor)) * camX) / 100) * world.width
      expect(shift).toBeCloseTo(-factor * camX, 2)
    }
  })

  it('무대층 계수는 CameraRig 의 worldStyle 과 같은 식이다', () => {
    const world = scrollWorld()
    const camX = 55
    const rig = ((-camX * PARALLAX.stage) / world.width) * 100
    expect(parseFloat(parallaxShiftPct(world, PARALLAX.stage)) * camX).toBeCloseTo(rig, 3)
  })

  it('단일 무대는 계수가 있어도 camX 가 0 이라 움직이지 않는다', () => {
    const world = parseWorld(singleStage(), null)
    expect(parallaxShiftPct(world, PARALLAX.far)).toBe('-0.3%')
  })
})
