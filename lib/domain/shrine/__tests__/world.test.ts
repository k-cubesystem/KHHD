import { parseStageSpec, type StageSpec } from '../stage'
import {
  PARALLAX,
  WORLD_DEFAULT_WIDTH,
  WORLD_VIEWPORT_PCT,
  ZONE_FLICK_MIN_PCT_PER_S,
  ZONE_SNAP_TOLERANCE_PCT,
  clampCamX,
  daecheongZone,
  parseWorld,
  toWorldX,
  zoneAlignCamX,
  zoneSnapTarget,
  type WorldSpec,
} from '../world'

// 반가 두루마리 표준 세트 — 마당 0~70 · 대청 70~170 · 후원 170~240 (논리 폭 240)
const SCROLL_RAW = {
  width: WORLD_DEFAULT_WIDTH,
  zones: [
    { code: 'madang', x0: 0, x1: 70, wallpaperUrl: '/shrine/banga/madang-sky.webp' },
    {
      code: 'daecheong',
      x0: 70,
      x1: 170,
      wallpaperUrl: '/shrine/banga/wall.webp',
      flooringUrl: '/shrine/banga/floor.webp',
      structures: [
        {
          code: 'altar',
          assetUrl: '/shrine/banga/altar.webp',
          x: 50,
          y: 52,
          w: 46,
          anchors: [{ id: 'altar-center', layer: 'altar', x: 50, y: 48, label: '제단 가운데' }],
        },
      ],
    },
    { code: 'huwon', x0: 170, x1: 240, wallpaperUrl: '/shrine/banga/huwon.webp' },
  ],
}

/** 기존 단일 무대 테마(v2 반가) — zones 이전 규격 */
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

describe('전제 상수', () => {
  it('뷰포트 100 · 표준 두루마리 폭 240 · 시차 3층', () => {
    expect(WORLD_VIEWPORT_PCT).toBe(100)
    expect(WORLD_DEFAULT_WIDTH).toBe(240)
    expect(PARALLAX).toEqual({ far: 0.3, stage: 1, near: 1.15 })
  })

  it('시차 계수는 원경 < 무대 < 전경 순서 (팬 할 때 깊이가 보인다)', () => {
    expect(PARALLAX.far).toBeLessThan(PARALLAX.stage)
    expect(PARALLAX.stage).toBeLessThan(PARALLAX.near)
  })
})

describe('parseWorld — 항등 폴백 (zones 없음)', () => {
  it('stage·raw 둘 다 없으면 폭 100 · 빈 대청 하나', () => {
    const world = parseWorld(null, null)
    expect(world.width).toBe(100)
    expect(world.zones).toHaveLength(1)
    expect(world.zones[0]).toEqual({
      code: 'daecheong',
      label: '대청',
      x0: 0,
      x1: 100,
      wallpaperUrl: null,
      flooringUrl: null,
      structures: [],
    })
  })

  it('zones 없는 기존 테마는 대청 한 구역이 무대(벽지·바닥·구조물)를 그대로 승계', () => {
    const stage = singleStage()
    const world = parseWorld(stage, SINGLE_RAW)
    expect(world.width).toBe(100)
    expect(world.zones).toHaveLength(1)
    const z = world.zones[0]
    expect([z.x0, z.x1]).toEqual([0, 100])
    expect(z.wallpaperUrl).toBe('/shrine/banga/wall.webp')
    expect(z.flooringUrl).toBe('/shrine/banga/floor.webp')
    expect(z.structures).toEqual(stage.structures)
  })

  it('승계한 structures 는 복사본 — world 를 만져도 원본 StageSpec 이 변하지 않는다', () => {
    const stage = singleStage()
    const world = parseWorld(stage, SINGLE_RAW)
    world.zones[0].structures.length = 0
    expect(stage.structures).toHaveLength(1)
  })

  it('raw 가 레코드가 아니면(undefined·숫자·문자열·배열) 폴백', () => {
    for (const raw of [undefined, null, 0, 'zones', [], [{ code: 'madang', x0: 0, x1: 70 }]]) {
      const world = parseWorld(null, raw)
      expect(world.zones.map((z) => z.code)).toEqual(['daecheong'])
      expect(world.width).toBe(100)
    }
  })
})

describe('parseWorld — 불량 zones 는 단일 폴백 (부분 채택 금지)', () => {
  const fallbackCases: [string, unknown][] = [
    ['① 빈 배열', { zones: [] }],
    ['② 배열이 아님', { zones: { madang: { x0: 0, x1: 70 } } }],
    ['③ code 없음', { zones: [{ x0: 0, x1: 70 }] }],
    ['④ 비유한 수치(NaN·문자열)', { zones: [{ code: 'madang', x0: 0, x1: Number.NaN }] }],
    [
      '⑤ 구역 겹침',
      {
        zones: [
          { code: 'madang', x0: 0, x1: 80 },
          { code: 'daecheong', x0: 70, x1: 170 },
        ],
      },
    ],
    [
      '⑥ x0 역순(정렬 위반)',
      {
        zones: [
          { code: 'daecheong', x0: 70, x1: 170 },
          { code: 'madang', x0: 0, x1: 70 },
        ],
      },
    ],
    [
      '⑦ code 중복',
      {
        zones: [
          { code: 'daecheong', x0: 0, x1: 70 },
          { code: 'daecheong', x0: 70, x1: 170 },
        ],
      },
    ],
    ['⑧ 폭이 구역 끝보다 좁음', { width: 100, zones: [{ code: 'daecheong', x0: 0, x1: 240 }] }],
    ['⑨ 퇴화 구역(폭 0)', { zones: [{ code: 'madang', x0: 30, x1: 30 }] }],
    ['⑩ 음수 시작', { zones: [{ code: 'madang', x0: -10, x1: 70 }] }],
    ['⑪ 상한 초과 폭', { zones: [{ code: 'madang', x0: 0, x1: 1200 }] }],
    [
      '⑫ 구역 수 초과',
      { zones: Array.from({ length: 9 }, (_, i) => ({ code: `z${i}`, x0: i * 10, x1: i * 10 + 10 })) },
    ],
    ['⑬ 폭이 비유한', { width: Number.POSITIVE_INFINITY, zones: [{ code: 'daecheong', x0: 0, x1: 240 }] }],
    ['⑭ 구역이 레코드가 아님', { zones: ['madang'] }],
  ]

  it.each(fallbackCases)('%s → 단일 대청(현행 화면)으로 되돌린다', (_label, raw) => {
    const world = parseWorld(singleStage(), raw)
    expect(world.width).toBe(100)
    expect(world.zones.map((z) => z.code)).toEqual(['daecheong'])
    // 폴백도 안전값이지 빈 화면이 아니다 — 기존 무대를 그대로 들고 있어야 한다
    expect(world.zones[0].wallpaperUrl).toBe('/shrine/banga/wall.webp')
  })

  it('한 구역만 깨져도 나머지를 살리지 않는다 (구멍 난 세계 금지)', () => {
    const world = parseWorld(null, {
      width: 240,
      zones: [
        { code: 'madang', x0: 0, x1: 70 },
        { code: 'daecheong', x0: 70, x1: 170 },
        { code: 'huwon', x0: 170 },
      ],
    })
    expect(world.zones).toHaveLength(1)
    expect(world.width).toBe(100)
  })
})

describe('parseWorld — 정상 채택', () => {
  it('폭·구역 3종을 x0 오름차순으로 채택', () => {
    const world = scrollWorld()
    expect(world.width).toBe(240)
    expect(world.zones.map((z) => [z.code, z.x0, z.x1])).toEqual([
      ['madang', 0, 70],
      ['daecheong', 70, 170],
      ['huwon', 170, 240],
    ])
  })

  it('구역별 벽지·바닥·구조물은 stage.ts 파싱 계약을 그대로 통과한다', () => {
    const [madang, daecheong, huwon] = scrollWorld().zones
    expect(madang.wallpaperUrl).toBe('/shrine/banga/madang-sky.webp')
    expect(madang.flooringUrl).toBeNull()
    expect(madang.structures).toEqual([])
    expect(daecheong.flooringUrl).toBe('/shrine/banga/floor.webp')
    expect(daecheong.structures).toHaveLength(1)
    expect(daecheong.structures[0].code).toBe('altar')
    expect(daecheong.structures[0].anchors.map((a) => a.id)).toEqual(['altar-center'])
    expect(huwon.wallpaperUrl).toBe('/shrine/banga/huwon.webp')
  })

  it('위험한 에셋 URL 은 구역째 버리지 않고 해당 레이어만 null', () => {
    const world = parseWorld(null, {
      zones: [{ code: 'daecheong', x0: 0, x1: 100, wallpaperUrl: 'javascript:alert(1)', flooringUrl: '/f.webp' }],
    })
    expect(world.zones).toHaveLength(1)
    expect(world.zones[0].wallpaperUrl).toBeNull()
    expect(world.zones[0].flooringUrl).toBe('/f.webp')
  })

  it('라벨: 명시값 우선 → 표준 코드 한국어 → 그 외는 코드 자체', () => {
    const world = parseWorld(null, {
      zones: [
        { code: 'madang', x0: 0, x1: 70, label: '앞뜰' },
        { code: 'daecheong', x0: 70, x1: 170 },
        { code: 'sarangbang', x0: 170, x1: 240 },
      ],
    })
    expect(world.zones.map((z) => z.label)).toEqual(['앞뜰', '대청', 'sarangbang'])
  })

  it('빈 문자열 라벨은 무시하고 표준 라벨로 되돌린다', () => {
    const world = parseWorld(null, { zones: [{ code: 'huwon', x0: 0, x1: 100, label: '   ' }] })
    expect(world.zones[0].label).toBe('후원')
  })

  it('width 생략 시 구역 우측 끝에서 유도 (빈 공간으로 팬 하지 않도록)', () => {
    const world = parseWorld(null, {
      zones: [
        { code: 'madang', x0: 0, x1: 60 },
        { code: 'daecheong', x0: 60, x1: 200 },
      ],
    })
    expect(world.width).toBe(200)
  })

  it('width 생략 + 좁은 구역이면 최소 뷰포트 폭(100)', () => {
    const world = parseWorld(null, { zones: [{ code: 'daecheong', x0: 0, x1: 40 }] })
    expect(world.width).toBe(100)
  })

  it('width 가 구역보다 넓은 것은 허용 (여백 있는 세계)', () => {
    const world = parseWorld(null, { width: 300, zones: [{ code: 'daecheong', x0: 0, x1: 240 }] })
    expect(world.width).toBe(300)
  })

  it('구역 사이 간격(정원 여백)은 허용한다', () => {
    const world = parseWorld(null, {
      width: 240,
      zones: [
        { code: 'madang', x0: 0, x1: 60 },
        { code: 'daecheong', x0: 80, x1: 180 },
      ],
    })
    expect(world.zones).toHaveLength(2)
  })

  it('결정론: 같은 입력 같은 결과', () => {
    expect(parseWorld(singleStage(), SCROLL_RAW)).toEqual(parseWorld(singleStage(), SCROLL_RAW))
  })
})

describe('daecheongZone — 기존 배치가 사는 구역', () => {
  it('3구역에서 대청을 고른다 (첫 구역이 아니어도)', () => {
    const zone = daecheongZone(scrollWorld())
    expect(zone.code).toBe('daecheong')
    expect([zone.x0, zone.x1]).toEqual([70, 170])
  })

  it('대청 코드가 없으면 첫 구역', () => {
    const world = parseWorld(null, {
      zones: [
        { code: 'madang', x0: 0, x1: 70 },
        { code: 'huwon', x0: 70, x1: 170 },
      ],
    })
    expect(daecheongZone(world).code).toBe('madang')
  })

  it('항등 폴백 세계에서도 대청을 돌려준다', () => {
    expect(daecheongZone(parseWorld(null, null)).code).toBe('daecheong')
  })

  it('손으로 만든 빈 zones 에도 크래시 없이 안전값', () => {
    const zone = daecheongZone({ width: 240, zones: [] })
    expect([zone.code, zone.x0, zone.x1]).toEqual(['daecheong', 0, 100])
  })
})

describe('toWorldX — 배치 좌표 재해석 (worldX = x0 + x·span/100)', () => {
  it('대청(70~170)에서 기존 좌표 0·50·100 이 70·120·170 으로', () => {
    const world = scrollWorld()
    const zone = daecheongZone(world)
    expect(toWorldX(world, zone, 0)).toBe(70)
    expect(toWorldX(world, zone, 50)).toBe(120)
    expect(toWorldX(world, zone, 100)).toBe(170)
  })

  it('폭이 다른 구역(마당 0~70)은 비율로 압축된다', () => {
    const world = scrollWorld()
    const madang = world.zones[0]
    expect(toWorldX(world, madang, 0)).toBe(0)
    expect(toWorldX(world, madang, 50)).toBe(35)
    expect(toWorldX(world, madang, 100)).toBe(70)
  })

  it('항등 세계(zones 없음)에서는 입력 좌표가 그대로 나온다 — 회귀 0', () => {
    const world = parseWorld(singleStage(), SINGLE_RAW)
    const zone = daecheongZone(world)
    for (const x of [0, 8, 24, 50, 76, 92, 100]) {
      expect(toWorldX(world, zone, x)).toBe(x)
    }
  })

  it('로컬 좌표 범위 밖은 구역 경계로 클램프', () => {
    const world = scrollWorld()
    const zone = daecheongZone(world)
    expect(toWorldX(world, zone, -40)).toBe(70)
    expect(toWorldX(world, zone, 180)).toBe(170)
  })

  it('비유한 로컬 좌표는 구역 왼쪽 끝(결정론)', () => {
    const world = scrollWorld()
    const zone = daecheongZone(world)
    expect(toWorldX(world, zone, Number.NaN)).toBe(70)
    expect(toWorldX(world, zone, Number.POSITIVE_INFINITY)).toBe(70)
  })

  it('구역 안에서 단조 증가하고 절대 세계 밖으로 나가지 않는다', () => {
    const world = scrollWorld()
    for (const zone of world.zones) {
      let prev = -Infinity
      for (let x = -10; x <= 110; x += 2.5) {
        const wx = toWorldX(world, zone, x)
        expect(wx).toBeGreaterThanOrEqual(prev)
        expect(wx).toBeGreaterThanOrEqual(0)
        expect(wx).toBeLessThanOrEqual(world.width)
        prev = wx
      }
    }
  })

  it('망가진 구역(역전 경계)에도 크래시 없이 왼쪽 끝', () => {
    const world = scrollWorld()
    const broken = { ...world.zones[0], x0: 90, x1: 20 }
    expect(toWorldX(world, broken, 50)).toBe(90)
  })
})

describe('clampCamX — 카메라 이동 범위', () => {
  it('폭 240 이면 0 ~ 140', () => {
    expect(clampCamX(-30, 240)).toBe(0)
    expect(clampCamX(0, 240)).toBe(0)
    expect(clampCamX(70, 240)).toBe(70)
    expect(clampCamX(140, 240)).toBe(140)
    expect(clampCamX(999, 240)).toBe(140)
  })

  it('단일 무대(폭 100 이하)는 카메라 고정', () => {
    expect(clampCamX(50, 100)).toBe(0)
    expect(clampCamX(50, 40)).toBe(0)
    expect(clampCamX(-50, 100)).toBe(0)
  })

  it('비유한 입력은 0 (NaN·Infinity 가 카메라를 날려버리지 않게)', () => {
    expect(clampCamX(Number.NaN, 240)).toBe(0)
    expect(clampCamX(Infinity, 240)).toBe(0)
    expect(clampCamX(70, Number.NaN)).toBe(0)
  })

  it('비정상 폭도 상한 안으로 (카메라 폭주 방지)', () => {
    expect(clampCamX(99999, 100000)).toBe(900)
  })
})

describe('zoneAlignCamX — 구역 정렬점', () => {
  it('중앙 구역은 뷰포트 정중앙에, 양끝 구역은 경계에서 멈춘다', () => {
    const world = scrollWorld()
    const [madang, daecheong, huwon] = world.zones
    expect(zoneAlignCamX(world, madang)).toBe(0) // 중심 35 → -15 → 클램프 0
    expect(zoneAlignCamX(world, daecheong)).toBe(70) // 중심 120 → 70
    expect(zoneAlignCamX(world, huwon)).toBe(140) // 중심 205 → 155 → 클램프 140
  })

  it('정렬점은 구역 순서대로 비감소', () => {
    const world = scrollWorld()
    const points = world.zones.map((z) => zoneAlignCamX(world, z))
    expect(points).toEqual([...points].sort((a, b) => a - b))
  })
})

describe('zoneSnapTarget — 팬 종료 스냅', () => {
  it('느리게 놓으면 최근접 구역 중심 정렬 (40 → 대청 70)', () => {
    expect(zoneSnapTarget(40, scrollWorld(), 0)).toBe(70)
  })

  it('허용 오차(±12%p) 안이면 사용자가 멈춘 자리를 유지', () => {
    const world = scrollWorld()
    expect(zoneSnapTarget(65, world, 0)).toBe(65)
    expect(zoneSnapTarget(78, world, 0)).toBe(78)
    expect(zoneSnapTarget(70 - ZONE_SNAP_TOLERANCE_PCT, world, 0)).toBe(58)
  })

  it('허용 오차 밖이면 끌어온다 (57.9 → 70)', () => {
    expect(zoneSnapTarget(57.9, scrollWorld(), 0)).toBe(70)
  })

  it('양끝 구역은 경계 클램프된 정렬점으로 (5 → 0, 135 → 140 은 오차 안이라 유지)', () => {
    const world = scrollWorld()
    expect(zoneSnapTarget(5, world, 0)).toBe(5) // |5-0| ≤ 12 → 유지
    expect(zoneSnapTarget(20, world, 0)).toBe(0) // 마당 정렬점으로 복귀
    expect(zoneSnapTarget(120, world, 0)).toBe(140) // 후원 정렬점(경계 클램프)
  })

  it('양수 속도(손가락을 왼쪽으로 튕김 = camX 증가)는 다음 정렬점 (0 → 70 → 140)', () => {
    const world = scrollWorld()
    expect(zoneSnapTarget(0, world, 200)).toBe(70)
    expect(zoneSnapTarget(70, world, 200)).toBe(140)
  })

  it('음수 속도는 이전 정렬점 (140 → 70 → 0)', () => {
    const world = scrollWorld()
    expect(zoneSnapTarget(140, world, -200)).toBe(70)
    expect(zoneSnapTarget(70, world, -200)).toBe(0)
  })

  it('플릭은 허용 오차를 건너뛰고 한 칸 페이징 (정렬점 코앞의 강한 튕김이 먹통이면 안 된다)', () => {
    const world = scrollWorld()
    // 대청 정렬점(70) 오차 안이지만 세게 튕겼다 → 다음 구역(후원)
    expect(zoneSnapTarget(65, world, 300)).toBe(140)
    expect(zoneSnapTarget(68, world, 300)).toBe(140)
    // 역방향도 대칭 → 이전 구역(마당)
    expect(zoneSnapTarget(75, world, -300)).toBe(0)
    expect(zoneSnapTarget(72, world, -300)).toBe(0)
  })

  it('끝 구역에서 바깥으로 튕기면 제자리 정렬 (세계 밖으로도, 오차 유지로도 새지 않는다)', () => {
    const world = scrollWorld()
    expect(zoneSnapTarget(140, world, 400)).toBe(140)
    expect(zoneSnapTarget(0, world, -400)).toBe(0)
    // 오차 안에서 멈춘 채 바깥으로 튕겨도 그 구역 정렬점에 붙는다(유지가 아니라 정렬)
    expect(zoneSnapTarget(135, world, 400)).toBe(140)
    expect(zoneSnapTarget(5, world, -400)).toBe(0)
  })

  it('플릭 기준(30%p/s) 경계: 미만은 기존 규칙(오차 유지), 이상은 다음 구역', () => {
    const world = scrollWorld()
    expect(zoneSnapTarget(0, world, ZONE_FLICK_MIN_PCT_PER_S - 0.1)).toBe(0)
    expect(zoneSnapTarget(0, world, ZONE_FLICK_MIN_PCT_PER_S)).toBe(70)
    expect(zoneSnapTarget(140, world, -ZONE_FLICK_MIN_PCT_PER_S)).toBe(70)
    // 같은 자리라도 임계 아래면 오차 유지, 임계 위면 페이징
    expect(zoneSnapTarget(65, world, ZONE_FLICK_MIN_PCT_PER_S - 0.1)).toBe(65)
    expect(zoneSnapTarget(65, world, ZONE_FLICK_MIN_PCT_PER_S)).toBe(140)
  })

  it('비플릭은 방향과 무관하게 불변 — 느린 손놓기는 부호가 결과를 바꾸지 않는다', () => {
    const world = scrollWorld()
    for (const camX of [0, 5, 20, 40, 57.9, 65, 78, 120, 140]) {
      const rest = zoneSnapTarget(camX, world, 0)
      expect(zoneSnapTarget(camX, world, 29)).toBe(rest)
      expect(zoneSnapTarget(camX, world, -29)).toBe(rest)
    }
  })

  it('클램프로 겹친 정렬점은 한 칸으로 접는다 (좁은 구역 둘이 모두 0 이어도 플릭이 움직인다)', () => {
    // 정렬점: 마당 0(중심 15) · 행랑 0(중심 45) · 대청 60 · 후원 140 → 중복 0 하나로
    const world = parseWorld(null, {
      width: 240,
      zones: [
        { code: 'madang', x0: 0, x1: 30 },
        { code: 'haengrang', x0: 30, x1: 60 },
        { code: 'daecheong', x0: 60, x1: 160 },
        { code: 'huwon', x0: 160, x1: 240 },
      ],
    })
    expect(world.zones.map((z) => zoneAlignCamX(world, z))).toEqual([0, 0, 60, 140])
    expect(zoneSnapTarget(0, world, 300)).toBe(60)
    expect(zoneSnapTarget(60, world, -300)).toBe(0)
  })

  it('단일 무대 세계는 언제나 0', () => {
    const world = parseWorld(singleStage(), SINGLE_RAW)
    for (const v of [-500, 0, 500]) {
      expect(zoneSnapTarget(80, world, v)).toBe(0)
    }
  })

  it('비유한 입력(camX·속도)도 범위 안 결과 — camX 는 0 으로 떨어진다', () => {
    const world = scrollWorld()
    expect(zoneSnapTarget(Number.NaN, world, Number.NaN)).toBe(0)
    expect(zoneSnapTarget(Infinity, world, 200)).toBe(70)
  })

  it('손으로 만든 빈 zones 세계도 크래시 없이 클램프값', () => {
    expect(zoneSnapTarget(500, { width: 240, zones: [] }, 0)).toBe(140)
  })

  it('결과는 항상 카메라 범위 안이고 결정론적', () => {
    const world = scrollWorld()
    for (let camX = -20; camX <= 160; camX += 4) {
      for (const v of [-300, -30, 0, 30, 300]) {
        const a = zoneSnapTarget(camX, world, v)
        expect(a).toBe(zoneSnapTarget(camX, world, v))
        expect(a).toBeGreaterThanOrEqual(0)
        expect(a).toBeLessThanOrEqual(world.width - WORLD_VIEWPORT_PCT)
      }
    }
  })
})
