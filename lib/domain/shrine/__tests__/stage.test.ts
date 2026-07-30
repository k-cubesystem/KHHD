import {
  DEFAULT_ANCHORS,
  DEFAULT_SNAP_RADIUS_PCT,
  DEITY_HEAD_ROOM_Y,
  PODIUM_TOP_Y,
  LIT_BOOST_MAX,
  deityStandBox,
  depthScale,
  depthZ,
  groundShadow,
  isCatalogKind,
  lightingOverlayStyle,
  litBoost,
  nearestAnchor,
  parseAnchorSpec,
  parseStageSpec,
  type StageAnchor,
  type StageLight,
} from '../stage'
import { ZONES } from '../zones'

// 존 실측(zones.ts) — 계약의 상수(floor 64~90)가 존과 일치하는지 먼저 고정한다.
const [FY0, FY1] = ZONES.floor.y

describe('depthScale — 원근 스케일', () => {
  it('존 상수 전제: floor 존 y 는 64~90', () => {
    expect([FY0, FY1]).toEqual([64, 90])
  })

  it('floor: 뒤(64)=0.72 · 앞(90)=1.28 · 중앙(77)=1.0', () => {
    expect(depthScale('floor', 64)).toBe(0.72)
    expect(depthScale('floor', 90)).toBe(1.28)
    expect(depthScale('floor', 77)).toBe(1)
  })

  it('floor: 범위 밖 y 는 존 경계로 클램프', () => {
    expect(depthScale('floor', 0)).toBe(0.72)
    expect(depthScale('floor', 63.9)).toBe(0.72)
    expect(depthScale('floor', -999)).toBe(0.72)
    expect(depthScale('floor', 90.1)).toBe(1.28)
    expect(depthScale('floor', 10000)).toBe(1.28)
  })

  it('floor: 비유한 입력도 크래시 없이 하한', () => {
    expect(depthScale('floor', Number.NaN)).toBe(0.72)
    expect(depthScale('floor', Infinity)).toBe(0.72)
  })

  it('floor: y 에 대해 단조 증가 (뒤일수록 작다)', () => {
    let prev = -Infinity
    for (let y = 60; y <= 95; y += 0.5) {
      const s = depthScale('floor', y)
      expect(s).toBeGreaterThanOrEqual(prev)
      expect(s).toBeGreaterThanOrEqual(0.72)
      expect(s).toBeLessThanOrEqual(1.28)
      prev = s
    }
  })

  it('altar 는 0.88 고정, wall/hanging 은 1.0 (y 무관)', () => {
    for (const y of [0, 42, 48, 54, 90, Number.NaN]) {
      expect(depthScale('altar', y)).toBe(0.88)
      expect(depthScale('wall', y)).toBe(1)
      expect(depthScale('hanging', y)).toBe(1)
    }
  })

  it('결정론: 같은 입력 같은 결과', () => {
    expect(depthScale('floor', 71.3)).toBe(depthScale('floor', 71.3))
  })
})

describe('depthZ — 깊이 정렬', () => {
  it('레이어 기본값: hanging 10 · wall 11 · altar 14', () => {
    expect(depthZ('hanging', 15)).toBe(10)
    expect(depthZ('wall', 30)).toBe(11)
    expect(depthZ('altar', 48)).toBe(14)
  })

  it('floor: 64→16 · 77→22 · 90→28', () => {
    expect(depthZ('floor', 64)).toBe(16)
    expect(depthZ('floor', 77)).toBe(22)
    expect(depthZ('floor', 90)).toBe(28)
  })

  it('floor: 범위 밖·비유한 입력도 16~28 안에 클램프', () => {
    expect(depthZ('floor', -50)).toBe(16)
    expect(depthZ('floor', 9999)).toBe(28)
    expect(depthZ('floor', Number.NaN)).toBe(16)
  })

  it('모든 레이어·y 에서 밴드 10~29 를 벗어나지 않는다', () => {
    for (const layer of ['hanging', 'wall', 'altar', 'floor'] as const) {
      for (let y = -20; y <= 120; y += 3.5) {
        const z = depthZ(layer, y)
        expect(Number.isInteger(z)).toBe(true)
        expect(z).toBeGreaterThanOrEqual(10)
        expect(z).toBeLessThanOrEqual(29)
      }
    }
  })

  it('floor 는 뒤→앞으로 단조 증가하고, 항상 altar 보다 앞에 온다', () => {
    let prev = -Infinity
    for (let y = 64; y <= 90; y += 1) {
      const z = depthZ('floor', y)
      expect(z).toBeGreaterThanOrEqual(prev)
      expect(z).toBeGreaterThan(depthZ('altar', 48))
      prev = z
    }
  })
})

describe('groundShadow — 접지 그림자', () => {
  it('floor: 뒤(64)는 작고 옅게, 앞(90)은 크고 진하게', () => {
    expect(groundShadow('floor', 64)).toEqual({ width: 2, height: 0.6, opacity: 0.22 })
    expect(groundShadow('floor', 90)).toEqual({ width: 3, height: 0.9, opacity: 0.42 })
    expect(groundShadow('floor', 77)).toEqual({ width: 2.5, height: 0.75, opacity: 0.32 })
  })

  it('floor: 범위 밖 y 클램프', () => {
    expect(groundShadow('floor', 0)).toEqual(groundShadow('floor', 64))
    expect(groundShadow('floor', 500)).toEqual(groundShadow('floor', 90))
  })

  it('altar: 고정값 (width 2.2 · opacity 0.3)', () => {
    const s = groundShadow('altar', 48)
    expect(s).toEqual({ width: 2.2, height: 0.66, opacity: 0.3 })
    expect(groundShadow('altar', 42)).toEqual(s)
    expect(groundShadow('altar', 54)).toEqual(s)
  })

  it('wall·hanging 은 그림자 없음(null)', () => {
    expect(groundShadow('wall', 30)).toBeNull()
    expect(groundShadow('hanging', 12)).toBeNull()
    expect(groundShadow('wall', 90)).toBeNull()
    expect(groundShadow('hanging', 64)).toBeNull()
  })

  it('floor 는 y 증가에 따라 width·opacity 가 단조 증가', () => {
    let pw = -Infinity
    let po = -Infinity
    for (let y = 64; y <= 90; y += 2) {
      const s = groundShadow('floor', y)
      expect(s).not.toBeNull()
      expect(s!.width).toBeGreaterThanOrEqual(pw)
      expect(s!.opacity).toBeGreaterThanOrEqual(po)
      expect(s!.opacity).toBeLessThanOrEqual(0.42)
      pw = s!.width
      po = s!.opacity
    }
  })
})

describe('litBoost — 촛불 점화 기여', () => {
  it('0~3개에서 선형 증가하고 3개에서 포화', () => {
    expect(litBoost(0)).toBe(0)
    expect(litBoost(1)).toBe(0.1)
    expect(litBoost(2)).toBe(0.2)
    expect(litBoost(3)).toBe(LIT_BOOST_MAX)
    expect(litBoost(4)).toBe(LIT_BOOST_MAX)
    expect(litBoost(999)).toBe(LIT_BOOST_MAX)
  })

  it('음수·소수·비유한 입력 방어 (비유한은 0 — devotion.ts 와 같은 관례)', () => {
    expect(litBoost(-1)).toBe(0)
    expect(litBoost(2.9)).toBe(0.2) // floor
    expect(litBoost(Number.NaN)).toBe(0)
    expect(litBoost(Infinity)).toBe(0)
  })

  it('상한은 0.3 을 넘지 않는다', () => {
    for (let n = 0; n <= 20; n++) {
      expect(litBoost(n)).toBeLessThanOrEqual(0.3)
      expect(litBoost(n)).toBeGreaterThanOrEqual(0)
    }
  })
})

describe('lightingOverlayStyle — 조명 오버레이', () => {
  const light: StageLight = { color: '#ffd9a0', intensity: 0.4, origin: { x: 50, y: 20 } }

  it('광원 원점·색이 radial-gradient 에 반영된다', () => {
    const s = lightingOverlayStyle(light, 0)
    expect(s.backgroundImage).toContain('radial-gradient')
    expect(s.backgroundImage).toContain('at 50% 20%')
    expect(s.backgroundImage).toContain('#ffd9a0')
    expect(s.opacity).toBe(0.4)
  })

  it('litBoost 가 강도에 더해진다', () => {
    expect(lightingOverlayStyle(light, litBoost(3)).opacity).toBe(0.7)
    expect(lightingOverlayStyle(light, litBoost(1)).opacity).toBe(0.5)
  })

  it('강도는 0~1 로 클램프, 깨진 강도는 기본값(0.5)으로 — 방이 캄캄해지지 않게', () => {
    expect(lightingOverlayStyle({ ...light, intensity: 5 }, 0.3).opacity).toBe(1)
    expect(lightingOverlayStyle({ ...light, intensity: -3 }, 0).opacity).toBe(0)
    expect(lightingOverlayStyle({ ...light, intensity: Number.NaN }, 0).opacity).toBe(0.5)
    expect(lightingOverlayStyle(light, Number.NaN).opacity).toBe(0.4)
  })

  it('원점은 0~100 으로 클램프', () => {
    const s = lightingOverlayStyle({ ...light, origin: { x: -20, y: 300 } }, 0)
    expect(s.backgroundImage).toContain('at 0% 100%')
  })

  it('CSS 주입 방어: 허용 형식 밖 색은 기본 촛불색으로 대체', () => {
    const evil = 'red); background-image: url(https://evil.example/x.png'
    const s = lightingOverlayStyle({ ...light, color: evil }, 0)
    expect(s.backgroundImage).not.toContain('evil.example')
    expect(s.backgroundImage).not.toContain('url(')
    expect(s.backgroundImage).toContain('rgba(255,214,160,0.55)')
  })

  it('정상 색 형식(hex·rgba·이름)은 그대로 통과', () => {
    expect(lightingOverlayStyle({ ...light, color: 'rgba(255,0,0,0.5)' }, 0).backgroundImage).toContain(
      'rgba(255,0,0,0.5)'
    )
    expect(lightingOverlayStyle({ ...light, color: 'gold' }, 0).backgroundImage).toContain('gold')
    expect(lightingOverlayStyle({ ...light, color: '#abc' }, 0).backgroundImage).toContain('#abc')
  })

  it('mixBlendMode 는 반환하지 않는다 (렌더 책임)', () => {
    expect(Object.keys(lightingOverlayStyle(light, 0)).sort()).toEqual(['backgroundImage', 'opacity'])
  })
})

describe('DEFAULT_ANCHORS — 레거시 테마 폴백 앵커', () => {
  it('제단 3점 · 벽 2점 · 바닥 1점', () => {
    expect(DEFAULT_ANCHORS).toHaveLength(6)
    const byLayer = (l: string) => DEFAULT_ANCHORS.filter((a) => a.layer === l).length
    expect(byLayer('altar')).toBe(3)
    expect(byLayer('wall')).toBe(2)
    expect(byLayer('floor')).toBe(1)
    expect(byLayer('hanging')).toBe(0)
  })

  it('ZONES 파생 좌표 — 제단 상판 37/50/63 @48, 벽 36/64 @32.5, 신위 곁 88@66', () => {
    expect(DEFAULT_ANCHORS.map((a) => [a.id, a.x, a.y])).toEqual([
      ['altar-left', 37, 48],
      ['altar-center', 50, 48],
      ['altar-right', 63, 48],
      ['wall-left', 36, 32.5],
      ['wall-right', 64, 32.5],
      ['deity-side', 88, 66],
    ])
  })

  it('모든 앵커는 자기 존 범위 안에 있다', () => {
    for (const a of DEFAULT_ANCHORS) {
      const z = ZONES[a.layer]
      expect(a.x).toBeGreaterThanOrEqual(z.x[0])
      expect(a.x).toBeLessThanOrEqual(z.x[1])
      expect(a.y).toBeGreaterThanOrEqual(z.y[0])
      expect(a.y).toBeLessThanOrEqual(z.y[1])
    }
  })

  it('id 는 유일하고 label 은 비어있지 않다', () => {
    const ids = DEFAULT_ANCHORS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const a of DEFAULT_ANCHORS) expect(a.label.length).toBeGreaterThan(0)
  })

  it('신위 곁 앵커는 신당지기(x=12) 반대편이다', () => {
    const side = DEFAULT_ANCHORS.find((a) => a.id === 'deity-side')
    expect(side!.x).toBeGreaterThan(50)
  })
})

describe('nearestAnchor — 앵커 스냅', () => {
  it('반경 안이면 가장 가까운 같은 layer 앵커', () => {
    expect(nearestAnchor(DEFAULT_ANCHORS, 'altar', 39, 48)?.id).toBe('altar-left')
    expect(nearestAnchor(DEFAULT_ANCHORS, 'altar', 50, 48)?.id).toBe('altar-center')
    expect(nearestAnchor(DEFAULT_ANCHORS, 'altar', 61, 50)?.id).toBe('altar-right')
    expect(nearestAnchor(DEFAULT_ANCHORS, 'wall', 35, 31)?.id).toBe('wall-left')
  })

  it('반경 밖이면 null (경계 6% 는 포함)', () => {
    // (56,48) → altar-center 까지 정확히 6.0
    expect(nearestAnchor(DEFAULT_ANCHORS, 'altar', 56, 48)?.id).toBe('altar-center')
    // (56.1,48) → 6.1 > 6
    expect(nearestAnchor(DEFAULT_ANCHORS, 'altar', 56.1, 48)).toBeNull()
    expect(nearestAnchor(DEFAULT_ANCHORS, 'floor', 20, 80)).toBeNull()
  })

  it('layer 가 다르면 좌표가 같아도 잡히지 않는다', () => {
    // altar-left 와 좌표가 정확히 같지만 layer 가 wall
    expect(nearestAnchor(DEFAULT_ANCHORS, 'wall', 37, 48)).toBeNull()
    expect(nearestAnchor(DEFAULT_ANCHORS, 'hanging', 50, 48)).toBeNull()
  })

  it('동률이면 배열에서 먼저 나온 앵커 (결정론)', () => {
    // 37 과 50 의 중점 43.5 — 양쪽 거리 6.5 동일. 반경 7 로 둘 다 후보.
    expect(nearestAnchor(DEFAULT_ANCHORS, 'altar', 43.5, 48, 7)?.id).toBe('altar-left')

    const tie: StageAnchor[] = [
      { id: 'a', layer: 'floor', x: 70, y: 70, label: 'A' },
      { id: 'b', layer: 'floor', x: 70, y: 70, label: 'B' },
    ]
    expect(nearestAnchor(tie, 'floor', 70, 70)?.id).toBe('a')
    expect(nearestAnchor([...tie].reverse(), 'floor', 70, 70)?.id).toBe('b')
  })

  it('반경 인자 — 0 은 정확 일치만, 큰 값은 존 전체', () => {
    expect(nearestAnchor(DEFAULT_ANCHORS, 'altar', 50, 48, 0)?.id).toBe('altar-center')
    expect(nearestAnchor(DEFAULT_ANCHORS, 'altar', 51, 48, 0)).toBeNull()
    expect(nearestAnchor(DEFAULT_ANCHORS, 'altar', 24, 42, 100)?.id).toBe('altar-left')
  })

  it('기본 반경은 6%', () => {
    expect(DEFAULT_SNAP_RADIUS_PCT).toBe(6)
    expect(nearestAnchor(DEFAULT_ANCHORS, 'altar', 55, 48)).toEqual(
      nearestAnchor(DEFAULT_ANCHORS, 'altar', 55, 48, DEFAULT_SNAP_RADIUS_PCT)
    )
  })

  it('빈 배열·비유한 좌표·깨진 앵커 방어', () => {
    expect(nearestAnchor([], 'altar', 50, 48)).toBeNull()
    expect(nearestAnchor(DEFAULT_ANCHORS, 'altar', Number.NaN, 48)).toBeNull()
    expect(nearestAnchor(DEFAULT_ANCHORS, 'altar', 50, Infinity)).toBeNull()
    const broken = [
      { id: 'x', layer: 'altar', x: Number.NaN, y: 48, label: 'X' },
      { id: 'y', layer: 'altar', x: 50, y: 48, label: 'Y' },
    ] as StageAnchor[]
    expect(nearestAnchor(broken, 'altar', 50, 48)?.id).toBe('y')
  })
})

describe('parseStageSpec — 테마 stage jsonb 방어 파싱', () => {
  it('쓰레기 입력은 전부 null (크래시 금지)', () => {
    const garbage: unknown[] = [
      null,
      undefined,
      42,
      'stage',
      true,
      [],
      [{ wallpaper: '/a.webp' }], // 배열은 스펙이 아니다
      {}, // 렌더할 게 하나도 없음
      { structures: 'not-an-array' },
      { light: 'warm' },
      { wallpaper: 123, flooring: null },
      { wallpaper: 'javascript:alert(1)' }, // 위험한 URL → 폐기 → 남는 것 없음
      { wallpaper: 'http://cdn.example/x.webp' }, // https/루트상대/data 만 허용
    ]
    for (const g of garbage) expect(parseStageSpec(g)).toBeNull()
  })

  it('정상 스펙 파싱', () => {
    const spec = parseStageSpec({
      wallpaper: '/shrine/stage/banga-wall.webp',
      flooring: 'https://cdn.example.com/banga-floor.webp',
      structures: [
        {
          code: 'banga-altar',
          asset_url: '/shrine/stage/banga-altar.webp',
          x: 50,
          y: 47,
          w: 62,
          anchors: [{ id: 'altar-c', layer: 'altar', x: 50, y: 46, label: '제단 가운데' }],
        },
      ],
      light: { color: '#ffd9a0', intensity: 0.42, origin: { x: 48, y: 18 } },
      preset: [{ item: '기본 촛불', x: 38, y: 48 }], // 계약 밖 필드는 무시
    })
    expect(spec).not.toBeNull()
    expect(spec!.wallpaperUrl).toBe('/shrine/stage/banga-wall.webp')
    expect(spec!.flooringUrl).toBe('https://cdn.example.com/banga-floor.webp')
    expect(spec!.structures).toHaveLength(1)
    expect(spec!.structures[0]).toEqual({
      code: 'banga-altar',
      assetUrl: '/shrine/stage/banga-altar.webp',
      x: 50,
      y: 47,
      w: 62,
      anchors: [{ id: 'altar-c', layer: 'altar', x: 50, y: 46, label: '제단 가운데' }],
    })
    expect(spec!.light).toEqual({ color: '#ffd9a0', intensity: 0.42, origin: { x: 48, y: 18 } })
    expect(spec).not.toHaveProperty('preset')
  })

  it('부분 유효는 관대하게 — 깨진 구조물만 버리고 나머지는 산다', () => {
    const spec = parseStageSpec({
      wallpaper: '/w.webp',
      structures: [
        { code: 'no-asset' }, // 그림 없음 → 폐기
        { asset_url: '/a.webp' }, // code 없음 → 폐기
        { code: 'ok', assetUrl: '/ok.webp' }, // 좌표 없음 → 기본값
        'garbage',
        null,
      ],
      light: { intensity: 0.9 }, // color 없음 → 광원 없음
    })
    expect(spec).not.toBeNull()
    expect(spec!.wallpaperUrl).toBe('/w.webp')
    expect(spec!.flooringUrl).toBeNull()
    expect(spec!.light).toBeNull()
    expect(spec!.structures).toEqual([{ code: 'ok', assetUrl: '/ok.webp', x: 50, y: 50, w: 40, anchors: [] }])
  })

  it('좌표·강도는 범위로 클램프하고 위험한 색은 대체', () => {
    const spec = parseStageSpec({
      structures: [{ code: 's', assetUrl: '/s.webp', x: -40, y: 999, w: 5000 }],
      light: { color: 'url(https://evil.example/x)', intensity: 12, origin: { x: -5, y: 400 } },
    })
    expect(spec!.structures[0]).toMatchObject({ x: 0, y: 100, w: 200 })
    expect(spec!.light).toEqual({ color: 'rgba(255,214,160,0.55)', intensity: 1, origin: { x: 0, y: 100 } })
  })

  it('data:image URL 허용, 그 외 data URL 차단', () => {
    const ok = parseStageSpec({ wallpaper: 'data:image/webp;base64,UklGRg==' })
    expect(ok!.wallpaperUrl).toBe('data:image/webp;base64,UklGRg==')
    expect(parseStageSpec({ wallpaper: 'data:text/html;base64,PHNjcmlwdD4=' })).toBeNull()
  })

  it('결정론: 같은 입력 같은 결과', () => {
    const input = { wallpaper: '/w.webp', light: { color: 'gold' } }
    expect(parseStageSpec(input)).toEqual(parseStageSpec(input))
  })
})

describe('parseAnchorSpec — 구조물 앵커 배열 파싱', () => {
  it('배열·{anchors:[]} 두 형태 모두 허용', () => {
    const arr = [{ id: 'a1', layer: 'altar', x: 40, y: 48, label: '왼편' }]
    expect(parseAnchorSpec(arr)).toEqual(arr)
    expect(parseAnchorSpec({ anchors: arr })).toEqual(arr)
  })

  it('쓰레기 입력은 빈 배열', () => {
    for (const g of [null, undefined, 0, 'x', true, {}, { anchors: 'nope' }]) {
      expect(parseAnchorSpec(g)).toEqual([])
    }
  })

  it('깨진 항목만 버린다 (id 없음·layer 불량·비객체)', () => {
    const out = parseAnchorSpec([
      { layer: 'altar', x: 1, y: 2 }, // id 없음
      { id: 'ok', layer: 'nowhere', x: 1, y: 2 }, // layer 불량
      { id: 'ok', layer: 'floor', x: 70, y: 80 }, // label 없음 → 존 라벨
      'garbage',
      { id: '   ', layer: 'floor', x: 1, y: 2 }, // 공백 id
    ])
    expect(out).toEqual([{ id: 'ok', layer: 'floor', x: 70, y: 80, label: '바닥' }])
  })

  it('id 중복은 첫 항목만 채택 (스냅 결과 결정론)', () => {
    const out = parseAnchorSpec([
      { id: 'dup', layer: 'altar', x: 30, y: 48, label: '첫번째' },
      { id: 'dup', layer: 'altar', x: 60, y: 48, label: '두번째' },
    ])
    expect(out).toHaveLength(1)
    expect(out[0].label).toBe('첫번째')
  })

  it('과도하게 긴 id·label 방어', () => {
    const longId = 'x'.repeat(63)
    expect(parseAnchorSpec([{ id: longId, layer: 'altar', x: 1, y: 2 }])).toEqual([])
    const out = parseAnchorSpec([{ id: 'ok', layer: 'altar', x: 1, y: 2, label: '라'.repeat(100) }])
    expect(out[0].label.length).toBe(40)
  })

  it('파싱된 앵커는 nearestAnchor 에 그대로 쓸 수 있다', () => {
    const anchors = parseAnchorSpec([
      { id: 'a', layer: 'altar', x: 40, y: 48 },
      { id: 'b', layer: 'altar', x: 60, y: 48 },
    ])
    expect(nearestAnchor(anchors, 'altar', 42, 47)?.id).toBe('a')
    expect(nearestAnchor(anchors, 'altar', 50, 48)).toBeNull()
  })
})

describe('반가(banga) 시범 무대 시드 — 실제 jsonb 형태 계약 고정', () => {
  // TEAM_G_DESIGN/prd/banga-stage-seed.sql §1 의 jsonb_build_object 산출물과 동일.
  // 시드가 바뀌면 이 픽스처도 함께 갱신할 것 — 파서가 조용히 레거시로 폴백하면 무대가 통째로 안 보인다.
  const BANGA_STAGE = {
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
  }

  it('시드가 손실 없이 파싱된다 (레거시 폴백으로 새지 않음)', () => {
    const spec = parseStageSpec(BANGA_STAGE)
    expect(spec).not.toBeNull()
    expect(spec!.wallpaperUrl).toBe('/shrine/stage/banga/wallpaper.webp')
    expect(spec!.flooringUrl).toBe('/shrine/stage/banga/flooring.webp')
    expect(spec!.structures).toHaveLength(1)
    expect(spec!.structures[0].anchors).toHaveLength(3)
    expect(spec!.light).toEqual({ color: '#C9A84C', intensity: 0.5, origin: { x: 50, y: 52 } })
  })

  it('대문자 hex 광원색이 주입 방어에 걸려 대체되지 않는다', () => {
    expect(parseStageSpec(BANGA_STAGE)!.light!.color).toBe('#C9A84C')
  })

  it('시드 앵커 id 는 DEFAULT_ANCHORS 의 altar id 와 동일 — 테마 전환 시 스냅 유지', () => {
    const seedIds = parseStageSpec(BANGA_STAGE)!.structures[0].anchors.map((a) => a.id)
    const defaultAltarIds = DEFAULT_ANCHORS.filter((a) => a.layer === 'altar').map((a) => a.id)
    expect(seedIds).toEqual(defaultAltarIds)
  })

  it('파싱된 무대 앵커로 스냅이 동작한다', () => {
    const anchors = parseStageSpec(BANGA_STAGE)!.structures[0].anchors
    expect(nearestAnchor(anchors, 'altar', 36, 47)?.id).toBe('altar-left')
    expect(nearestAnchor(anchors, 'altar', 50, 46)?.id).toBe('altar-center')
    expect(nearestAnchor(anchors, 'altar', 50, 70)).toBeNull()
  })
})

describe('isCatalogKind — 카탈로그 품목 종류 가드', () => {
  it('4종만 통과', () => {
    for (const k of ['wallpaper', 'flooring', 'structure', 'prop']) expect(isCatalogKind(k)).toBe(true)
    for (const k of ['Prop', '', 'item', null, undefined, 3, {}]) expect(isCatalogKind(k)).toBe(false)
  })
})

describe('deityStandBox — 신위 접지 계약 (안2.3 ③ 제단·단상 정립)', () => {
  it('발은 단상 상면에 닿고 머리는 여백 선에 선다 (bottom = 100 - 상면)', () => {
    // 시드 [계약 3]: 접지선 방 y 45.3% → 신위 래퍼 bottom 54.7%
    expect(deityStandBox()).toEqual({ bottom: '54.7%', height: '33.3%', groundY: PODIUM_TOP_Y })
  })

  it('상면은 단상 상면 밴드의 기기 교집합(y44.70~45.87) 안이다 — 폰·데스크톱 모두 접지', () => {
    expect(PODIUM_TOP_Y).toBeGreaterThanOrEqual(44.7)
    expect(PODIUM_TOP_Y).toBeLessThanOrEqual(45.87)
  })

  it('상판(altar-top) 상단 y49.4 보다 위 — 신위(z-3)가 공물상을 덮지 않는다 (시드 경고)', () => {
    expect(deityStandBox().groundY).toBeLessThan(49.4)
  })

  it('상면 y 하나만 바꾸면 스탠드 전체가 따라온다 — 시드 좌표 갈아끼우기 지점', () => {
    expect(deityStandBox(40)).toEqual({ bottom: '60%', height: '28%', groundY: 40 })
    expect(deityStandBox(52)).toEqual({ bottom: '48%', height: '40%', groundY: 52 })
  })

  it('상면이 올라가면 신위가 작아지고 내려가면 커진다 (머리 여백 고정 = 위계 유지)', () => {
    const high = deityStandBox(PODIUM_TOP_Y - 6)
    const low = deityStandBox(PODIUM_TOP_Y + 6)
    expect(Number.parseFloat(high.height)).toBeLessThan(Number.parseFloat(low.height))
  })

  it('머리 여백은 종전 스탠드(bottom 50% · height 38%) 상단과 같은 줄이다 — 여백 회귀 0', () => {
    expect(DEITY_HEAD_ROOM_Y).toBe(50 - 38)
    expect(Number.parseFloat(deityStandBox().height)).toBe(PODIUM_TOP_Y - DEITY_HEAD_ROOM_Y)
  })

  it('종전 하드코딩(y50)보다 위 — 상판 앞 허공에 발이 떠 있던 기하를 되돌린다', () => {
    expect(deityStandBox().groundY).toBeLessThan(50)
  })

  it('잘못된 시드값에도 스탠드가 사라지지 않는다 (높이 ≥ 1%p · NaN 방어)', () => {
    expect(Number.parseFloat(deityStandBox(5, 40).height)).toBeGreaterThanOrEqual(1)
    expect(deityStandBox(Number.NaN).groundY).toBe(1)
    expect(deityStandBox(500).groundY).toBe(100)
  })
})
