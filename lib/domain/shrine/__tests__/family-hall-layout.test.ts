import {
  applyHallSeats,
  hallAvatar,
  hallLayout,
  hallSeatDepth,
  hallSeatKey,
  hallSeatScale,
  hallSeatSizePct,
  hallSeatLine,
  hallSeatWorldX,
  hallSeatZ,
  hallDaysSince,
  parseHallSeats,
  HALL_ARC,
  HALL_BAND,
  HALL_LANTERN,
  HALL_MAX_SEATS,
  HALL_SEAT_MIN_PX,
  HALL_SEAT_ZONE,
  HALL_SELF_SEAT_KEY,
  HALL_ALL_PRAYED_LINE,
  HALL_EMPTY_LINE,
} from '../family-hall-layout'
import { DEITY_AVATARS, ELEMENT_AVATARS } from '@/lib/domain/family/avatars'

describe('hallLayout — 방석 반원 배치', () => {
  it('인원 수만큼 좌석을 만든다 (1~8)', () => {
    for (let n = 1; n <= HALL_MAX_SEATS; n += 1) {
      expect(hallLayout(n).seats).toHaveLength(n)
      expect(hallLayout(n).overflow).toBe(0)
    }
  })

  it('0명이면 좌석 없이 등불만 — 호출부가 빈 상태 카피를 얹는다', () => {
    const layout = hallLayout(0)
    expect(layout.seats).toHaveLength(0)
    expect(layout.overflow).toBe(0)
    expect(layout.lantern).toEqual({ x: HALL_LANTERN.x, y: HALL_LANTERN.y })
  })

  it('상한을 넘으면 8석만 앉히고 나머지는 overflow 로 센다', () => {
    const layout = hallLayout(11)
    expect(layout.seats).toHaveLength(HALL_MAX_SEATS)
    expect(layout.overflow).toBe(3)
  })

  it('비유한·음수 인원은 0석으로 떨어진다 (결정론 방어)', () => {
    for (const bad of [-1, 0, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(hallLayout(bad).seats).toHaveLength(0)
    }
  })

  it('좌석은 등불 중심선 기준 좌우 대칭이다', () => {
    for (const n of [2, 3, 5, 8]) {
      const { seats } = hallLayout(n)
      for (let i = 0; i < seats.length; i += 1) {
        const mirrored = seats[seats.length - 1 - i]
        // 좌표는 소수 2자리로 반올림되므로 0.05 이내면 대칭으로 본다
        expect(seats[i].x + mirrored.x).toBeCloseTo(2 * HALL_ARC.cx, 1)
        expect(seats[i].y).toBeCloseTo(mirrored.y, 1)
      }
    }
  })

  it('방석은 부모 박스 안에 완전히 들어온다 (좌석 폭 포함)', () => {
    for (let n = 1; n <= HALL_MAX_SEATS; n += 1) {
      const { seats, seatSizePct } = hallLayout(n)
      for (const s of seats) {
        const half = (seatSizePct * s.scale) / 2
        expect(s.x - half).toBeGreaterThanOrEqual(0)
        expect(s.x + half).toBeLessThanOrEqual(100)
        expect(s.y).toBeGreaterThan(0)
        expect(s.y).toBeLessThan(100)
      }
    }
  })

  it('뒤(호 꼭대기) 좌석일수록 작고, 앞 좌석이 위에 그려진다', () => {
    const { seats } = hallLayout(3)
    const [left, back, right] = seats
    expect(back.scale).toBeLessThan(left.scale)
    expect(back.scale).toBeLessThan(right.scale)
    expect(back.y).toBeLessThan(left.y) // 뒤일수록 화면 위
    expect(back.z).toBeLessThan(left.z) // 앞 좌석이 겹칠 때 위
    expect(left.scale).toBeCloseTo(right.scale, 5)
  })

  it('한 명이면 등불 뒤 가운데 한 자리', () => {
    const [only] = hallLayout(1).seats
    expect(only.x).toBeCloseTo(HALL_ARC.cx, 5)
    expect(only.y).toBeCloseTo(HALL_ARC.cy - HALL_ARC.ry, 5)
  })

  it('두 명 이상이면 호 양 끝까지 균등 분할한다 (끝 좌석이 가장 앞)', () => {
    const { seats } = hallLayout(4)
    expect(seats[0].x).toBeCloseTo(HALL_ARC.cx - HALL_ARC.rx, 5)
    expect(seats[3].x).toBeCloseTo(HALL_ARC.cx + HALL_ARC.rx, 5)
    expect(seats[0].scale).toBeCloseTo(1, 5)
    expect(seats[0].y).toBeCloseTo(HALL_ARC.cy, 5)
  })

  it('같은 입력이면 항상 같은 배치 — 결정론(하이드레이션 규율)', () => {
    expect(hallLayout(6)).toEqual(hallLayout(6))
  })
})

describe('hallSeatSizePct — 인원이 늘수록 방석이 작아진다', () => {
  it('단조 감소하고 하한 아래로 내려가지 않는다', () => {
    let prev = Number.POSITIVE_INFINITY
    for (let n = 1; n <= HALL_MAX_SEATS; n += 1) {
      const size = hallSeatSizePct(n)
      expect(size).toBeLessThanOrEqual(prev)
      expect(size).toBeGreaterThanOrEqual(13)
      prev = size
    }
  })

  it('상한 초과 인원도 8석 기준 크기를 쓴다', () => {
    expect(hallSeatSizePct(30)).toBe(hallSeatSizePct(HALL_MAX_SEATS))
  })
})

describe('hallSeatKey — 좌석 저장 키', () => {
  it('본인 좌석(memberId null)은 self 로 모인다', () => {
    expect(hallSeatKey(null)).toBe(HALL_SELF_SEAT_KEY)
    expect(hallSeatKey(undefined)).toBe(HALL_SELF_SEAT_KEY)
    expect(hallSeatKey('')).toBe(HALL_SELF_SEAT_KEY)
  })

  it('가족은 family_members.id 를 그대로 쓴다', () => {
    expect(hallSeatKey('4a3f-uuid')).toBe('4a3f-uuid')
  })
})

describe('HALL_SEAT_ZONE — 드래그 범위', () => {
  it('자동 배치 반원을 완전히 품는다 — 저장 이력이 없는 화면이 흔들리지 않는다', () => {
    for (let n = 1; n <= HALL_MAX_SEATS; n += 1) {
      for (const s of hallLayout(n).seats) {
        expect(s.x).toBeGreaterThanOrEqual(HALL_SEAT_ZONE.x[0])
        expect(s.x).toBeLessThanOrEqual(HALL_SEAT_ZONE.x[1])
        expect(s.y).toBeGreaterThanOrEqual(HALL_SEAT_ZONE.y[0])
        expect(s.y).toBeLessThanOrEqual(HALL_SEAT_ZONE.y[1])
      }
    }
  })

  it('방 전 구역이 범위다 — 좌우 끝이 world 양 끝에 스프라이트 여백만 남기고 닿는다', () => {
    const left = hallSeatWorldX(HALL_SEAT_ZONE.x[0])
    const right = hallSeatWorldX(HALL_SEAT_ZONE.x[1])
    // 방 밖으로는 못 나간다 — 나가면 카메라를 끝까지 밀어도 되찾을 수 없는 자리가 생긴다
    expect(left).toBeGreaterThan(0)
    expect(right).toBeLessThan(HALL_BAND.worldWidth)
    // 그러면서 양 끝까지 닿는다. 여백은 좌석 스프라이트 반폭(띠 15% = world 9.6%p) 뿐이다
    expect(left).toBeLessThan(10)
    expect(HALL_BAND.worldWidth - right).toBeLessThan(10)
  })

  it('띠는 자(尺)일 뿐이라 좌석 좌표가 띠 밖으로 나간다 — 왼쪽은 음수가 정상이다', () => {
    // 띠 왼쪽에는 방이 3화면 가까이 남아 있다 → 좌표가 크게 음수로 간다
    expect(HALL_SEAT_ZONE.x[0]).toBeLessThan(0)
    // 오른쪽은 띠 끝(100)과 방 끝 사이가 world 4%p 뿐이라 스프라이트 여백이 먼저 걸린다 —
    // 띠 안에서 멈추지만 구 범위(86)보다는 넓다
    expect(HALL_SEAT_ZONE.x[1]).toBeGreaterThan(86)
    expect(HALL_SEAT_ZONE.x[1]).toBeLessThan(100)
    // 띠 안(0~100)은 여전히 방 오른편이다 — 자동 반원이 있던 자리가 그대로다
    expect(hallSeatWorldX(0)).toBe(HALL_BAND.worldWidth - HALL_BAND.rightInset - HALL_BAND.width)
    expect(hallSeatWorldX(100)).toBe(HALL_BAND.worldWidth - HALL_BAND.rightInset)
  })

  it('이미 저장된 좌표(구 범위 x 14~86 · y 30~86)는 한 톨도 움직이지 않는다', () => {
    // 범위를 넓히는 방향이라 클램프에 걸릴 값이 없다 — 마이그레이션 없이 기존 배치가 그대로여야 한다
    const saved = { a: { x: 14, y: 30 }, b: { x: 86, y: 86 }, c: { x: 50, y: 63 } }
    expect(parseHallSeats(saved)).toEqual(saved)
  })
})

describe('hallSeatDepth / Scale / Z — 끌어 놓은 좌석의 원근', () => {
  it('아래로 내려올수록 앞이다 — 커지고 위에 그려진다', () => {
    expect(hallSeatScale(80)).toBeGreaterThan(hallSeatScale(40))
    expect(hallSeatZ(80)).toBeGreaterThan(hallSeatZ(40))
  })

  it('호 범위 밖은 0~1 로 잘린다 (스케일 폭주 방지)', () => {
    expect(hallSeatDepth(-999)).toBe(1)
    expect(hallSeatDepth(999)).toBe(0)
    expect(hallSeatDepth(Number.NaN)).toBe(0)
    expect(hallSeatScale(999)).toBe(1)
  })

  it('넓어진 y 전 구간에서 스케일·겹침이 극단으로 가지 않는다 (아바타가 콩알·거인이 되지 않는다)', () => {
    const [lo, hi] = HALL_SEAT_ZONE.y
    for (let y = lo; y <= hi; y += 0.5) {
      expect(hallSeatScale(y)).toBeGreaterThanOrEqual(0.86)
      expect(hallSeatScale(y)).toBeLessThanOrEqual(1)
      expect(hallSeatZ(y)).toBeGreaterThanOrEqual(0)
      expect(hallSeatZ(y)).toBeLessThanOrEqual(100)
    }
    // 사랑방 바닥면(호) 밖은 양끝 값으로 눕는다 — 천장에 붙여도 더 작아지지 않는다
    expect(hallSeatScale(lo)).toBe(hallSeatScale(HALL_ARC.cy - HALL_ARC.ry))
    expect(hallSeatScale(hi)).toBe(hallSeatScale(HALL_ARC.cy))
  })

  it('자동 배치와 같은 축이다 — 자동 좌석 y 를 넣으면 그 좌석과 같은 스케일이 나온다', () => {
    for (const s of hallLayout(5).seats) {
      expect(hallSeatScale(s.y)).toBeCloseTo(s.scale, 2)
      expect(hallSeatZ(s.y)).toBeCloseTo(s.z, 0)
    }
  })

  it('같은 입력이면 항상 같은 값 — 결정론(하이드레이션 규율)', () => {
    expect(hallSeatScale(57.3)).toBe(hallSeatScale(57.3))
    expect(hallSeatZ(57.3)).toBe(hallSeatZ(57.3))
  })
})

describe('parseHallSeats — DB·클라 입력의 단일 관문', () => {
  it('정상 맵은 소수 2자리로 접어 통과시킨다', () => {
    expect(parseHallSeats({ self: { x: 40.123, y: 70.567 } })).toEqual({ self: { x: 40.12, y: 70.57 } })
  })

  it('범위를 벗어난 좌표는 존 안으로 클램프한다', () => {
    expect(parseHallSeats({ self: { x: -1000, y: 1000 } })).toEqual({
      self: { x: HALL_SEAT_ZONE.x[0], y: HALL_SEAT_ZONE.y[1] },
    })
  })

  it('맵이 아닌 값(배열·스칼라·null·undefined)은 빈 배치로 흡수한다', () => {
    for (const bad of [null, undefined, 0, 'nope', [{ x: 1, y: 2 }], true]) {
      expect(parseHallSeats(bad)).toEqual({})
    }
  })

  it('형태가 어긋난 항목만 버리고 성한 좌석은 살린다', () => {
    const parsed = parseHallSeats({
      ok: { x: 50, y: 60 },
      noNumber: { x: '50', y: 60 },
      nan: { x: Number.NaN, y: 60 },
      infinite: { x: 50, y: Number.POSITIVE_INFINITY },
      notObject: 7,
      nullValue: null,
      missingY: { x: 50 },
    })
    expect(parsed).toEqual({ ok: { x: 50, y: 60 } })
  })

  it('프로토타입 오염 키는 저장하지 않는다', () => {
    const parsed = parseHallSeats({ __proto__: { x: 50, y: 60 }, constructor: { x: 50, y: 60 } })
    expect(Object.keys(parsed)).toEqual([])
    expect(({} as Record<string, unknown>).x).toBeUndefined()
  })

  it('빈 키·과도하게 긴 키는 버린다', () => {
    expect(parseHallSeats({ '': { x: 50, y: 60 }, ['k'.repeat(65)]: { x: 50, y: 60 } })).toEqual({})
  })

  it('렌더되는 좌석 수를 넘는 항목은 받지 않는다 (페이로드 상한)', () => {
    const many: Record<string, { x: number; y: number }> = {}
    for (let i = 0; i < HALL_MAX_SEATS + 5; i += 1) many[`m-${i}`] = { x: 50, y: 60 }
    expect(Object.keys(parseHallSeats(many))).toHaveLength(HALL_MAX_SEATS)
  })

  it('같은 입력이면 항상 같은 결과 — 서버·클라가 같은 좌표를 본다', () => {
    const raw = { self: { x: 33.333, y: 66.666 } }
    expect(parseHallSeats(raw)).toEqual(parseHallSeats(raw))
  })
})

describe('applyHallSeats — 저장 좌표를 자동 배치 위에 덮는다', () => {
  const keysOf = (n: number) => Array.from({ length: n }, (_, i) => (i === 0 ? HALL_SELF_SEAT_KEY : `fm-${i}`))

  it('저장이 없으면 자동 배치를 **참조까지 그대로** 돌려준다 (기존 사용자 화면 회귀 0)', () => {
    const base = hallLayout(4)
    expect(applyHallSeats(base, keysOf(4), null)).toBe(base)
    expect(applyHallSeats(base, keysOf(4), undefined)).toBe(base)
    expect(applyHallSeats(base, keysOf(4), {})).toBe(base)
  })

  it('내 좌석과 무관한 키만 저장돼 있어도 자동 배치가 유지된다', () => {
    const base = hallLayout(3)
    expect(applyHallSeats(base, keysOf(3), { 'someone-else': { x: 20, y: 80 } })).toBe(base)
  })

  it('저장된 좌석만 옮기고 나머지는 자동 좌표를 손대지 않는다', () => {
    const base = hallLayout(3)
    const moved = applyHallSeats(base, keysOf(3), { 'fm-1': { x: 22, y: 80 } })

    expect(moved.seats[1]).toEqual({ x: 22, y: 80, scale: hallSeatScale(80), z: hallSeatZ(80) })
    expect(moved.seats[0]).toEqual(base.seats[0])
    expect(moved.seats[2]).toEqual(base.seats[2])
    // 등불·좌석 크기·overflow 는 자동 배치 계약 그대로
    expect(moved.lantern).toEqual(base.lantern)
    expect(moved.seatSizePct).toBe(base.seatSizePct)
    expect(moved.overflow).toBe(base.overflow)
  })

  it('저장 좌표도 존 안으로 클램프한다 — DB 에 남은 옛 값이 화면 밖으로 나가지 않는다', () => {
    const moved = applyHallSeats(hallLayout(1), [HALL_SELF_SEAT_KEY], { [HALL_SELF_SEAT_KEY]: { x: 999, y: -999 } })
    expect(moved.seats[0].x).toBe(HALL_SEAT_ZONE.x[1])
    expect(moved.seats[0].y).toBe(HALL_SEAT_ZONE.y[0])
  })

  it('키 개수가 좌석보다 적어도 터지지 않는다', () => {
    const base = hallLayout(3)
    expect(applyHallSeats(base, [HALL_SELF_SEAT_KEY], { [HALL_SELF_SEAT_KEY]: { x: 30, y: 70 } }).seats).toHaveLength(3)
  })

  it('같은 입력이면 항상 같은 배치 — 결정론(하이드레이션 규율)', () => {
    const base = hallLayout(6)
    const saved = { 'fm-2': { x: 41.5, y: 77.25 } }
    expect(applyHallSeats(base, keysOf(6), saved)).toEqual(applyHallSeats(base, keysOf(6), saved))
  })
})

describe('hallAvatar — 어떤 avatar_id 여도 시각 실체가 나온다', () => {
  it('오행 정령 id(레거시 …_dokkaebi 포함)는 초상 경로로 해석된다', () => {
    const spirit = ELEMENT_AVATARS[0]
    const a = hallAvatar(spirit.id, '어머니')
    expect(a.resolved).toBe(true)
    expect(a.src).toBe(spirit.src)
    expect(a.color).toBe(spirit.color)
  })

  it('신위 id 도 초상 경로로 해석된다', () => {
    const deity = DEITY_AVATARS[0]
    const a = hallAvatar(deity.id, '아버지')
    expect(a.resolved).toBe(true)
    expect(a.src).toBe(deity.src)
  })

  it('미해석 avatar_id 는 이니셜 오브로 떨어진다 — 이름만 남는 좌석이 생기지 않는다', () => {
    for (const bad of [null, undefined, '', '   ', 'legacy_ghost', '__proto__', 'water_dokkaebi ']) {
      const a = hallAvatar(bad, '막내')
      expect(a.resolved).toBe(false)
      expect(a.src).toBeNull()
      expect(a.initial).toBe('막')
      expect(a.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('본인 좌석(get_family_hall_presence 가 avatar_id 를 NULL 로 고정 발급)도 오브가 나온다', () => {
    const a = hallAvatar(null, '나')
    expect(a.src).toBeNull()
    expect(a.initial).toBe('나')
    expect(a.color.length).toBeGreaterThan(0)
  })

  it('이름이 비어도 오브에 새길 글자가 남는다', () => {
    expect(hallAvatar(null, '').initial.length).toBeGreaterThan(0)
    expect(hallAvatar(null, '   ').initial.length).toBeGreaterThan(0)
  })

  it('이모지 이름도 서로게이트 페어가 쪼개지지 않는다', () => {
    expect(hallAvatar(null, '🐯막내').initial).toBe('🐯')
  })

  it('같은 입력이면 항상 같은 오브 — 결정론(하이드레이션 규율)', () => {
    expect(hallAvatar(null, '할머니')).toEqual(hallAvatar(null, '할머니'))
    expect(hallAvatar('fire_dokkaebi', '삼촌')).toEqual(hallAvatar('fire_dokkaebi', '삼촌'))
  })

  it('폴백 색은 오행 정령 팔레트에서 고르고 식구끼리 한 색으로 뭉치지 않는다', () => {
    const palette = ELEMENT_AVATARS.map((a) => a.color)
    const colors = ['나', '아버지', '어머니', '누나', '동생', '할머니', '삼촌', '막내'].map(
      (n) => hallAvatar(null, n).color
    )
    for (const c of colors) expect(palette).toContain(c)
    expect(new Set(colors).size).toBeGreaterThan(1)
  })
})

describe('HALL_SEAT_MIN_PX — 좌석 터치 타깃 하한', () => {
  it('44px 접근성 규율을 넘는다', () => {
    expect(HALL_SEAT_MIN_PX).toBeGreaterThanOrEqual(44)
  })
})

describe('hallSeatLine — 아바타 탭 말풍선', () => {
  it('이름으로 시작하고 seed 가 같으면 항상 같은 문장 (결정론)', () => {
    expect(hallSeatLine('어머니', true, 2)).toBe(hallSeatLine('어머니', true, 2))
    expect(hallSeatLine('어머니', true, 2).startsWith('어머니')).toBe(true)
  })

  it('오늘 기도 여부에 따라 문장이 갈린다', () => {
    expect(hallSeatLine('아버지', true, 0)).not.toBe(hallSeatLine('아버지', false, 0))
  })

  it('빈 방석 문구는 재촉·죄책감 표현을 쓰지 않는다 (PRD 검수 포인트 ②)', () => {
    const forbidden = ['안 했', '못 했', '아직도', '빠졌', '게을']
    for (let seed = 0; seed < 6; seed += 1) {
      const line = hallSeatLine('막내', false, seed)
      for (const word of forbidden) expect(line).not.toContain(word)
    }
  })

  it('이름이 비어도 문장이 깨지지 않는다', () => {
    expect(hallSeatLine('   ', false, 1).length).toBeGreaterThan(0)
  })

  it('seed 가 음수·비유한이어도 문장을 고른다', () => {
    expect(hallSeatLine('나', true, -3).length).toBeGreaterThan(0)
    expect(hallSeatLine('나', true, Number.NaN).length).toBeGreaterThan(0)
  })

  it('만개·빈 방 문구는 상수로 고정된다', () => {
    expect(HALL_ALL_PRAYED_LINE.length).toBeGreaterThan(0)
    expect(HALL_EMPTY_LINE.length).toBeGreaterThan(0)
  })
})

describe('hallDaysSince — 마지막 기도로부터 지난 날(KST)', () => {
  // 2026-07-29 01:00 KST = 2026-07-28T16:00:00Z
  const nowMs = Date.parse('2026-07-28T16:00:00Z')

  it('같은 KST 날이면 0일', () => {
    expect(hallDaysSince('2026-07-28T15:30:00Z', nowMs)).toBe(0)
  })

  it('KST 자정을 넘기면 1일 — UTC 기준이 아니다', () => {
    // 2026-07-28T14:00Z = 2026-07-28 23:00 KST (전날)
    expect(hallDaysSince('2026-07-28T14:00:00Z', nowMs)).toBe(1)
  })

  it('여러 날 전도 KST 일 단위로 센다', () => {
    expect(hallDaysSince('2026-07-25T05:00:00Z', nowMs)).toBe(4)
  })

  it('기록 없음·파싱 실패·미래 시각은 null', () => {
    expect(hallDaysSince(null, nowMs)).toBeNull()
    expect(hallDaysSince(undefined, nowMs)).toBeNull()
    expect(hallDaysSince('not-a-date', nowMs)).toBeNull()
    expect(hallDaysSince('2026-07-30T00:00:00Z', nowMs)).toBeNull()
    expect(hallDaysSince('2026-07-28T15:30:00Z', Number.NaN)).toBeNull()
  })
})
