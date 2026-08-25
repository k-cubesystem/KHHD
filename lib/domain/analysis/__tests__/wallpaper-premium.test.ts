/**
 * 「채운(彩運)」 프리미엄 17장 — 세트 불변식 · 접근 · 값 · 팩 · 표시.
 *
 * 이 테스트가 지키는 것:
 * ① 세트가 Storage·썸네일과 1:1 이라는 가정(17장 · id 유일 · 과별 구성)
 * ② 프리미엄은 멤버십/구매/용신 선물로만 열린다 — 여정 보너스(사주·완주)가 새지 않는다
 * ③ 🔴 값 회귀 — element 가 null 인 프리미엄 장이 «이달의 복 2만냥»으로 오판되지 않는다
 * ④ 잠긴 장의 원본 주소가 표시 세트에 실리지 않는다(서명 URL 이 유일한 통로)
 */
import {
  PREMIUM_CATEGORY_ORDER,
  PREMIUM_PRICE_SINGLE,
  PREMIUM_WALLPAPER_SET,
  WALLPAPER_LOCK_REASON,
  WALLPAPER_PACKS,
  buildPremiumDisplaySet,
  findPremiumWallpaperById,
  findWallpaperPack,
  premiumThumbPath,
  resolveWallpaperAccess,
  wallpaperPrice,
  type WallpaperAccess,
} from '../wallpaper'

const NOBODY: WallpaperAccess = { hasSaju: false, journeyComplete: false, isMember: false, unlocks: [] }

const GI_WATER = PREMIUM_WALLPAPER_SET.find((w) => w.id === 'gi-water')!
const JAE_KOI = PREMIUM_WALLPAPER_SET.find((w) => w.id === 'jae-koi')!

describe('세트 불변식 — 17장이 Storage·썸네일과 1:1', () => {
  it('17장, id 유일, 전부 premium 잠금', () => {
    expect(PREMIUM_WALLPAPER_SET).toHaveLength(17)
    expect(new Set(PREMIUM_WALLPAPER_SET.map((w) => w.id)).size).toBe(17)
    for (const item of PREMIUM_WALLPAPER_SET) expect(item.lock).toBe('premium')
  })

  it('과별 구성 — 기운 5 · 재물 3 · 가족 3 · 연애 3 · 성공 3', () => {
    const count = (c: string) => PREMIUM_WALLPAPER_SET.filter((w) => w.category === c).length

    expect(PREMIUM_CATEGORY_ORDER).toEqual(['gi', 'jae', 'ga', 'yeon', 'seong'])
    expect(count('gi')).toBe(5)
    for (const c of ['jae', 'ga', 'yeon', 'seong']) expect(count(c)).toBe(3)
  })

  it('오행은 기운 과에만 있다 — 용신 배지·선물 판정의 전제', () => {
    for (const item of PREMIUM_WALLPAPER_SET) {
      if (item.category === 'gi') expect(item.element).not.toBeNull()
      else expect(item.element).toBeNull()
    }
    // 기운 5장이 오행 다섯을 정확히 한 번씩 덮는다
    const elements = PREMIUM_WALLPAPER_SET.filter((w) => w.category === 'gi').map((w) => w.element)
    expect(new Set(elements).size).toBe(5)
  })

  it('id 로 찾기 — 무료 세트와 겹치지 않는다', () => {
    expect(findPremiumWallpaperById('gi-water')?.title).toBe('달빛 물결')
    expect(findPremiumWallpaperById('element-water')).toBeNull()
    expect(findPremiumWallpaperById('없는-장')).toBeNull()
  })
})

describe('값 — 프리미엄 낱장은 균일가다', () => {
  it('🔴 element 가 null 이어도 이달의 복(2만냥)이 아니라 프리미엄 가격을 받는다', () => {
    for (const item of PREMIUM_WALLPAPER_SET) {
      expect(wallpaperPrice(item)).toBe(PREMIUM_PRICE_SINGLE)
    }
  })
})

describe('접근 — 멤버십·구매·용신 선물로만 열린다', () => {
  it('자격이 없으면 17장 전부 잠기고 멤버십 사유가 붙는다', () => {
    for (const item of PREMIUM_WALLPAPER_SET) {
      expect(resolveWallpaperAccess(item, NOBODY)).toEqual({
        unlocked: false,
        via: null,
        reason: WALLPAPER_LOCK_REASON.premium,
      })
    }
  })

  it('멤버십이면 17장이 전부 열린다', () => {
    for (const item of PREMIUM_WALLPAPER_SET) {
      expect(resolveWallpaperAccess(item, { ...NOBODY, isMember: true }).unlocked).toBe(true)
    }
  })

  it('🔴 여정 보너스(사주·완주)로는 프리미엄이 열리지 않는다 — 무료 세트와의 결정적 차이', () => {
    const veteran: WallpaperAccess = { ...NOBODY, hasSaju: true, journeyComplete: true }

    for (const item of PREMIUM_WALLPAPER_SET) {
      expect(resolveWallpaperAccess(item, veteran).unlocked).toBe(false)
    }
  })

  it('«내게 필요한 기운» 선물 — 사주를 마친 사람의 용신 장 «하나»만 사주 선물로 열린다', () => {
    const withYongsin: WallpaperAccess = { ...NOBODY, hasSaju: true, myElement: 'water' }

    expect(resolveWallpaperAccess(GI_WATER, withYongsin)).toEqual({ unlocked: true, via: 'saju', reason: null })
    // 다른 기운 장·다른 과는 그대로 잠긴다
    const others = PREMIUM_WALLPAPER_SET.filter((w) => w.id !== 'gi-water')
    for (const item of others) expect(resolveWallpaperAccess(item, withYongsin).unlocked).toBe(false)
  })

  it('용신이 있어도 사주를 안 마쳤으면 선물은 없다 (풀이가 처방하는 구조)', () => {
    expect(resolveWallpaperAccess(GI_WATER, { ...NOBODY, myElement: 'water' }).unlocked).toBe(false)
  })

  it('구매한 장은 그 장만 열리고 «소유가 먼저»로 적힌다', () => {
    const bought: WallpaperAccess = {
      ...NOBODY,
      isMember: true,
      unlocks: [{ wallpaperId: 'jae-koi', source: 'purchase' }],
    }

    expect(resolveWallpaperAccess(JAE_KOI, bought).via).toBe('purchase')
    expect(resolveWallpaperAccess(GI_WATER, bought).via).toBe('member')
  })
})

describe('팩 — 멤버십 다음의 세트 구매 경로', () => {
  it('기운 5장 3만냥 · 복 12장 3만냥 · 전체 17장 5만냥', () => {
    expect(findWallpaperPack('pack-gi')).toMatchObject({ price: 3 })
    expect(findWallpaperPack('pack-gi')?.itemIds).toHaveLength(5)
    expect(findWallpaperPack('pack-bok')).toMatchObject({ price: 3 })
    expect(findWallpaperPack('pack-bok')?.itemIds).toHaveLength(12)
    expect(findWallpaperPack('pack-all')).toMatchObject({ price: 5 })
    expect(findWallpaperPack('pack-all')?.itemIds).toHaveLength(17)
    expect(findWallpaperPack('없는-팩')).toBeNull()
  })

  it('팩 구성은 세트 id 의 부분집합이고, 기운+복 두 팩이 전체를 겹침 없이 덮는다', () => {
    const setIds = new Set(PREMIUM_WALLPAPER_SET.map((w) => w.id))
    for (const pack of WALLPAPER_PACKS) {
      for (const id of pack.itemIds) expect(setIds.has(id)).toBe(true)
      expect(new Set(pack.itemIds).size).toBe(pack.itemIds.length)
    }
    const gi = findWallpaperPack('pack-gi')!.itemIds
    const bok = findWallpaperPack('pack-bok')!.itemIds
    expect(gi.length + bok.length).toBe(17)
    expect(gi.some((id) => bok.includes(id))).toBe(false)
  })
})

describe('표시 — 잠긴 장의 원본 주소는 어디에도 없다', () => {
  it('서명 URL 이 온 장만 원본·받기 링크가 서고, 나머지는 썸네일에 받기 없음', () => {
    const signed = { 'jae-koi': 'https://signed.example/jae-koi.webp?token=abc' }
    const display = buildPremiumDisplaySet(signed)

    const koi = display.find((d) => d.id === 'jae-koi')!
    expect(koi.href).toBe(signed['jae-koi'])
    expect(koi.downloadHref).toBe(`${signed['jae-koi']}&download`)

    for (const d of display.filter((x) => x.id !== 'jae-koi')) {
      expect(d.href).toBe(premiumThumbPath(d.id))
      expect(d.downloadHref).toBeNull()
    }
  })
})
