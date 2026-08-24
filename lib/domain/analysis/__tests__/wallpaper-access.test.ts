/**
 * 복 배경화면 **접근 모델**(2026-08-22 확장) — 다섯 경로의 OR.
 *
 * 이 테스트가 지키는 것은 넷이다.
 * ① **공짜가 새지 않는가** — 아무 자격 없는 사람에게 열리는 건 흙 한 장뿐이다.
 * ② **산 것이 사라지지 않는가** — 구매·광고 해금은 멤버십·여정과 무관하게 그 장을 연다.
 * ③ **여정 서사가 살아 있는가** — 사주 1회 → 오행 5장, 완주 → 이달의 복. 과금이 이걸 지우지 않는다.
 * ④ **값이 흔들리지 않는가** — 가격은 도메인 상수에서만 온다(서버가 이 값으로 차감한다).
 */
import {
  FREE_WALLPAPER_ELEMENT,
  MONTHLY_WALLPAPER_ID,
  WALLPAPER_ACCESS_LABEL,
  WALLPAPER_ELEMENT_ORDER,
  WALLPAPER_LOCK_REASON,
  WALLPAPER_PRICE_ELEMENT,
  WALLPAPER_PRICE_MONTHLY,
  WALLPAPER_SET,
  buildWallpaperDisplaySet,
  findWallpaperById,
  kstDateKey,
  kstYearMonth,
  monthlyWallpaperIdForYm,
  monthlyWallpaperObject,
  monthlyWallpaperTitle,
  orderWallpapersByElement,
  resolveWallpaperAccess,
  wallpaperDownloadHref,
  wallpaperPath,
  wallpaperPrice,
  type WallpaperAccess,
  type WallpaperItem,
} from '../wallpaper'

/** 아무 자격도 없는 사람 — 기본선. */
const NOBODY: WallpaperAccess = { hasSaju: false, journeyComplete: false, isMember: false, unlocks: [] }

function withUnlocks(unlocks: WallpaperAccess['unlocks']): WallpaperAccess {
  return { ...NOBODY, unlocks }
}

function itemById(id: string): WallpaperItem {
  const found = WALLPAPER_SET.find((w) => w.id === id)
  if (!found) throw new Error(`배경화면 없음: ${id}`)
  return found
}

const FREE = itemById(`element-${FREE_WALLPAPER_ELEMENT}`)
const MONTHLY = itemById(MONTHLY_WALLPAPER_ID)

/**
 * 🔴 2026-08-24 부터 배포된 여섯 장은 **전부 무료**다. 그래도 잠금·구매·광고 기계장치는
 * 앞으로 나올 **프리미엄 세트**가 그대로 쓰므로, 여기서는 «잠긴 장» 표본을 손으로 세워
 * 그 기계를 계속 지킨다 — 세트를 다시 유료로 되돌리지 않고도 회귀를 잡는다.
 */
const PAID_ELEMENT: WallpaperItem = {
  id: 'premium-water',
  title: '프리미엄 물',
  subtitle: '표본',
  lock: 'saju',
  element: 'water',
}
const PAID_OTHER: WallpaperItem = { ...PAID_ELEMENT, id: 'premium-fire', element: 'fire' }
const PAID_MONTHLY: WallpaperItem = {
  id: 'premium-limited',
  title: '프리미엄 한정',
  subtitle: '표본',
  lock: 'journey',
  element: null,
}

describe('접근 판정 — 다섯 경로가 각자 독립으로 문을 연다', () => {
  it('① 기본 무료 한 장은 아무 자격 없이 열린다', () => {
    expect(resolveWallpaperAccess(FREE, NOBODY)).toEqual({ unlocked: true, via: 'free', reason: null })
  })

  it('① 자격이 없어도 배포된 여섯 장은 전부 열린다 (2026-08-24 전면 무료)', () => {
    for (const item of WALLPAPER_SET) {
      expect(resolveWallpaperAccess(item, NOBODY)).toEqual({ unlocked: true, via: 'free', reason: null })
    }
  })

  it('① 잠긴 장(프리미엄 표본)은 자격이 없으면 사유가 붙고 근거가 비어 있다', () => {
    for (const item of [PAID_ELEMENT, PAID_MONTHLY]) {
      const state = resolveWallpaperAccess(item, NOBODY)

      expect(state.unlocked).toBe(false)
      expect(state.via).toBeNull()
      expect(state.reason).toBe(WALLPAPER_LOCK_REASON[item.lock as 'saju' | 'journey'])
    }
  })

  it('② 멤버십(ACTIVE)이면 여섯 장이 전부 열린다', () => {
    const member: WallpaperAccess = { ...NOBODY, isMember: true }

    for (const item of WALLPAPER_SET) {
      expect(resolveWallpaperAccess(item, member).unlocked).toBe(true)
    }
  })

  it('③ 구매한 장은 그 장만 열린다 (다른 장에 번지지 않는다)', () => {
    const bought = withUnlocks([{ wallpaperId: PAID_ELEMENT.id, source: 'purchase' }])

    expect(resolveWallpaperAccess(PAID_ELEMENT, bought)).toEqual({ unlocked: true, via: 'purchase', reason: null })
    expect(resolveWallpaperAccess(PAID_OTHER, bought).unlocked).toBe(false)
    expect(resolveWallpaperAccess(PAID_MONTHLY, bought).unlocked).toBe(false)
  })

  it('④ 광고 해금도 그 장만 열고, 근거를 광고로 적는다', () => {
    const adUnlocked = withUnlocks([{ wallpaperId: PAID_ELEMENT.id, source: 'ad' }])

    expect(resolveWallpaperAccess(PAID_ELEMENT, adUnlocked)).toEqual({ unlocked: true, via: 'ad', reason: null })
    expect(resolveWallpaperAccess(PAID_OTHER, adUnlocked).unlocked).toBe(false)
  })

  it('⑤ 사주 1회는 saju 장을 열고 journey 장은 못 연다 (여정 보너스 보존)', () => {
    const saju: WallpaperAccess = { ...NOBODY, hasSaju: true }

    expect(resolveWallpaperAccess(PAID_ELEMENT, saju)).toEqual({ unlocked: true, via: 'saju', reason: null })
    expect(resolveWallpaperAccess(PAID_MONTHLY, saju)).toEqual({
      unlocked: false,
      via: null,
      reason: WALLPAPER_LOCK_REASON.journey,
    })
  })

  it('⑤ 복주머니를 완주하면 journey 장까지 열린다', () => {
    const complete: WallpaperAccess = { ...NOBODY, hasSaju: true, journeyComplete: true }

    for (const item of [...WALLPAPER_SET, PAID_ELEMENT, PAID_MONTHLY]) {
      expect(resolveWallpaperAccess(item, complete).unlocked).toBe(true)
    }
    expect(resolveWallpaperAccess(PAID_MONTHLY, complete).via).toBe('journey')
  })

  it('경로가 겹쳐도 판정은 OR 이고, 표기는 «소유가 먼저»다', () => {
    const both: WallpaperAccess = {
      hasSaju: true,
      journeyComplete: true,
      isMember: true,
      unlocks: [{ wallpaperId: PAID_ELEMENT.id, source: 'purchase' }],
    }

    // 멤버십이 끝나도 산 장은 남는다 — 화면이 「멤버십」이라 적으면 해지 뒤 사라질 것처럼 읽힌다.
    expect(resolveWallpaperAccess(PAID_ELEMENT, both).via).toBe('purchase')
    // 사지 않은 장은 멤버십이 먼저 잡는다(여정 보너스보다 앞).
    expect(resolveWallpaperAccess(PAID_OTHER, both).via).toBe('member')
  })

  it('멤버십이 끝나도 (isMember=false) 산 장은 그대로 열려 있다', () => {
    const expired = withUnlocks([{ wallpaperId: PAID_MONTHLY.id, source: 'purchase' }])

    expect(resolveWallpaperAccess(PAID_MONTHLY, expired)).toEqual({ unlocked: true, via: 'purchase', reason: null })
  })

  it('열린 장에는 사유가 없고 잠긴 장에는 근거가 없다 (둘이 동시에 서지 않는다)', () => {
    const samples: WallpaperAccess[] = [
      NOBODY,
      { ...NOBODY, isMember: true },
      { ...NOBODY, hasSaju: true },
      { ...NOBODY, hasSaju: true, journeyComplete: true },
      withUnlocks([{ wallpaperId: PAID_ELEMENT.id, source: 'purchase' }]),
      withUnlocks([{ wallpaperId: PAID_MONTHLY.id, source: 'ad' }]),
    ]

    for (const access of samples) {
      for (const item of [...WALLPAPER_SET, PAID_ELEMENT, PAID_OTHER, PAID_MONTHLY]) {
        const state = resolveWallpaperAccess(item, access)

        expect(state.reason === null).toBe(state.unlocked)
        expect(state.via === null).toBe(!state.unlocked)
      }
    }
  })

  it('모든 근거에 화면 문구가 있고, 한자를 노출하지 않는다', () => {
    for (const label of Object.values(WALLPAPER_ACCESS_LABEL)) {
      expect(label.length).toBeGreaterThan(0)
      expect(label).not.toMatch(/[一-鿿]/)
    }
  })
})

describe('값(복채) — 가격은 도메인에서만 온다', () => {
  it('오행 한 장 1만냥 · 이달의 복 2만냥(한정판)', () => {
    expect(WALLPAPER_PRICE_ELEMENT).toBe(1)
    expect(WALLPAPER_PRICE_MONTHLY).toBe(2)
  })

  it('오행 다섯 장은 전부 같은 값이다', () => {
    for (const element of WALLPAPER_ELEMENT_ORDER) {
      expect(wallpaperPrice(itemById(`element-${element}`))).toBe(WALLPAPER_PRICE_ELEMENT)
    }
  })

  it('이달의 복만 한정판 가격을 받는다', () => {
    expect(wallpaperPrice(MONTHLY)).toBe(WALLPAPER_PRICE_MONTHLY)
  })

  it('무료 장에도 값이 있다 — 잠기지 않을 뿐, 0원 결제 경로가 생기지 않는다', () => {
    expect(wallpaperPrice(FREE)).toBe(WALLPAPER_PRICE_ELEMENT)
  })
})

describe('KST 시간 — 크론과 하루 1장 상한이 같은 달·같은 날을 본다', () => {
  it('UTC 자정 직후는 이미 서울에서 그날 오전이다', () => {
    expect(kstDateKey(new Date('2026-09-01T00:30:00Z'))).toBe('2026-09-01')
  })

  it('UTC 로 전날 15시 이후는 서울에서 이미 다음 날이다 (하루 1장 상한이 어긋나던 자리)', () => {
    expect(kstDateKey(new Date('2026-08-31T15:00:00Z'))).toBe('2026-09-01')
    expect(kstDateKey(new Date('2026-08-31T14:59:00Z'))).toBe('2026-08-31')
  })

  it('달 경계도 서울 기준으로 넘어간다', () => {
    expect(kstYearMonth(new Date('2026-08-31T14:59:00Z'))).toBe('202608')
    expect(kstYearMonth(new Date('2026-08-31T15:00:00Z'))).toBe('202609')
    expect(kstYearMonth(new Date('2026-12-31T15:00:00Z'))).toBe('202701')
  })
})

describe('이달의 복 — 달마다 갈리는 판(版)', () => {
  it('판 id·오브젝트 이름·제목이 ym 하나에서 파생된다', () => {
    expect(monthlyWallpaperIdForYm('202609')).toBe('monthly-202609')
    expect(monthlyWallpaperObject('202609')).toBe('monthly-202609.webp')
    expect(monthlyWallpaperTitle('202609')).toBe('이달의 복 (9월)')
  })

  it('제목에 한자를 쓰지 않는다', () => {
    for (let m = 1; m <= 12; m += 1) {
      expect(monthlyWallpaperTitle(`2026${String(m).padStart(2, '0')}`)).not.toMatch(/[一-鿿]/)
    }
  })

  it('망가진 ym 이 와도 빈 제목을 만들지 않는다', () => {
    expect(monthlyWallpaperTitle('rubbish')).toBe('이달의 복')
  })

  it('DB 행이 있으면 그 판을 세운다 (id·제목·주소가 함께 간다)', () => {
    const set = buildWallpaperDisplaySet({ ym: '202609', url: 'https://cdn.example.com/monthly-202609.webp' })
    const monthly = set.find((w) => w.element === null)

    expect(monthly?.id).toBe('monthly-202609')
    expect(monthly?.title).toBe('이달의 복 (9월)')
    expect(monthly?.href).toBe('https://cdn.example.com/monthly-202609.webp')
  })

  it('DB 행이 없으면 번들 폴백으로 선다 — 빈 자리를 남기지 않는다', () => {
    const monthly = buildWallpaperDisplaySet(null).find((w) => w.element === null)

    expect(monthly?.id).toBe(MONTHLY_WALLPAPER_ID)
    expect(monthly?.href).toBe(wallpaperPath(MONTHLY_WALLPAPER_ID))
  })

  it('오행 다섯 장은 DB 판과 무관하게 번들 경로 그대로다', () => {
    const set = buildWallpaperDisplaySet({ ym: '202612', url: 'https://cdn.example.com/x.webp' })

    for (const item of set.filter((w) => w.element !== null)) {
      expect(item.href).toBe(wallpaperPath(item.id))
    }
    expect(set).toHaveLength(6)
  })

  it('교차 출처(Storage)는 저장 질의를 달고, 같은 출처는 손대지 않는다', () => {
    expect(wallpaperDownloadHref('/wallpapers/element-water.webp')).toBe('/wallpapers/element-water.webp')
    expect(wallpaperDownloadHref('https://cdn.example.com/a.webp')).toBe('https://cdn.example.com/a.webp?download')
    expect(wallpaperDownloadHref('https://cdn.example.com/a.webp?v=2')).toBe(
      'https://cdn.example.com/a.webp?v=2&download'
    )
  })
})

describe('id 검증 — 서버가 클라가 보낸 id 를 믿지 않는다', () => {
  it('세트에 있는 id 만 찾아준다', () => {
    expect(findWallpaperById('element-water', null)?.id).toBe('element-water')
    expect(findWallpaperById('element-plastic', null)).toBeNull()
    expect(findWallpaperById('', null)).toBeNull()
  })

  it('이달의 복은 지금 서 있는 판의 id 로만 찾힌다 (지난 달 판을 새로 사지 못한다)', () => {
    const monthly = { ym: '202609', url: 'https://cdn.example.com/monthly-202609.webp' }

    expect(findWallpaperById('monthly-202609', monthly)?.title).toBe('이달의 복 (9월)')
    expect(findWallpaperById('monthly-202608', monthly)).toBeNull()
  })
})

describe('정렬 — 내 오행이 맨 앞', () => {
  it('용신 장을 앞으로 끌어올리고 나머지 순서는 유지한다', () => {
    const set = buildWallpaperDisplaySet(null)

    expect(orderWallpapersByElement(set, 'metal')[0]?.id).toBe('element-metal')
    expect(orderWallpapersByElement(set, null).map((w) => w.id)).toEqual(set.map((w) => w.id))
  })
})
