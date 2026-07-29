import {
  hallAvatar,
  hallLayout,
  hallSeatSizePct,
  hallSeatLine,
  hallDaysSince,
  HALL_ARC,
  HALL_LANTERN,
  HALL_MAX_SEATS,
  HALL_SEAT_MIN_PX,
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
