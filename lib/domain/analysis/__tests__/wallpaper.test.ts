/**
 * 복 배경화면 도메인 — 세트 불변식과 잠금 규칙.
 *
 * 이 테스트가 지키는 것은 셋이다.
 * ① **세트가 갈라지지 않는가** — 6장·id 중복 없음·파일 경로 규칙. id 는 곧 `public/wallpapers/`
 *    파일명이라, 여기가 흔들리면 화면에 깨진 그림이 뜬다.
 * ② **공짜가 새지 않는가** — 무료는 흙 한 장뿐. 나머지 넷은 사주, 이달의 복은 완주.
 * ③ **완주자가 막히지 않는가** — 완주는 사주를 포함하므로 완주자에겐 6장이 전부 열린다.
 */
import {
  FREE_WALLPAPER_ELEMENT,
  MONTHLY_WALLPAPER_ID,
  WALLPAPER_ELEMENT_ORDER,
  WALLPAPER_LOCK_REASON,
  WALLPAPER_SET,
  isMonthlyWallpaperCurrent,
  isMyElement,
  monthlyWallpaperId,
  resolveWallpaperUnlock,
  wallpaperPath,
  wallpaperPreview,
  type WallpaperEntitlement,
} from '../wallpaper'

const NOBODY: WallpaperEntitlement = { hasSaju: false, journeyComplete: false }
const SAJU_ONLY: WallpaperEntitlement = { hasSaju: true, journeyComplete: false }
const COMPLETE: WallpaperEntitlement = { hasSaju: true, journeyComplete: true }

function itemById(id: string) {
  const found = WALLPAPER_SET.find((w) => w.id === id)
  if (!found) throw new Error(`배경화면 없음: ${id}`)
  return found
}

describe('세트 불변식 — 6장이 파일과 1:1이다', () => {
  it('오행 5장 + 이달의 복 1장 = 6장이다', () => {
    expect(WALLPAPER_SET).toHaveLength(6)
    expect(WALLPAPER_SET.filter((w) => w.element !== null)).toHaveLength(5)
    expect(WALLPAPER_SET.filter((w) => w.element === null)).toHaveLength(1)
  })

  it('id 가 중복되지 않는다', () => {
    const ids = WALLPAPER_SET.map((w) => w.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('오행 장 id 는 `element-{오행}` 규칙을 따르고 상생 순서로 선다', () => {
    expect(WALLPAPER_SET.filter((w) => w.element !== null).map((w) => w.id)).toEqual(
      WALLPAPER_ELEMENT_ORDER.map((e) => `element-${e}`)
    )
  })

  it('오행 다섯이 하나씩만 있다 (빠지거나 겹치지 않는다)', () => {
    expect(WALLPAPER_SET.map((w) => w.element).filter((e) => e !== null)).toEqual([...WALLPAPER_ELEMENT_ORDER])
  })

  it('이달의 복은 `monthly-YYYYMM` 이고 오행이 없다', () => {
    const monthly = itemById(MONTHLY_WALLPAPER_ID)

    expect(MONTHLY_WALLPAPER_ID).toMatch(/^monthly-\d{6}$/)
    expect(monthly.element).toBeNull()
    expect(monthly.lock).toBe('journey')
  })

  it('파일 경로는 `/wallpapers/{id}.webp` 다', () => {
    for (const item of WALLPAPER_SET) {
      expect(wallpaperPath(item.id)).toBe(`/wallpapers/${item.id}.webp`)
    }
  })

  it('제목·설명이 빈 문자열이 아니다 (시트에 빈 칸이 서지 않는다)', () => {
    for (const item of WALLPAPER_SET) {
      expect(item.title.length).toBeGreaterThan(0)
      expect(item.subtitle.length).toBeGreaterThan(0)
    }
  })

  it('🔴 화면 문자열에 한자를 노출하지 않는다 (디자인 규율 — 한글, 필요 시 괄호)', () => {
    for (const item of WALLPAPER_SET) {
      expect(`${item.title}${item.subtitle}`).not.toMatch(/[一-鿿]/)
    }
    for (const reason of Object.values(WALLPAPER_LOCK_REASON)) {
      expect(reason).not.toMatch(/[一-鿿]/)
    }
  })
})

describe('잠금 규칙 — 무료는 한 장뿐이다', () => {
  it('무료는 흙 한 장이고, 나머지 오행 넷은 사주를 요구한다', () => {
    const free = WALLPAPER_SET.filter((w) => w.lock === 'free')

    expect(free).toHaveLength(1)
    expect(free[0]!.element).toBe(FREE_WALLPAPER_ELEMENT)
    expect(WALLPAPER_SET.filter((w) => w.lock === 'saju')).toHaveLength(4)
    expect(WALLPAPER_SET.filter((w) => w.lock === 'journey')).toHaveLength(1)
  })

  it('아무 자격이 없어도 무료 한 장은 열린다', () => {
    const free = itemById(`element-${FREE_WALLPAPER_ELEMENT}`)

    expect(resolveWallpaperUnlock(free, NOBODY)).toEqual({ unlocked: true, reason: null })
  })

  it('자격이 없으면 무료 외 다섯 장이 전부 잠기고 사유가 붙는다', () => {
    const locked = WALLPAPER_SET.filter((w) => !resolveWallpaperUnlock(w, NOBODY).unlocked)

    expect(locked).toHaveLength(5)
    for (const item of locked) {
      expect(resolveWallpaperUnlock(item, NOBODY).reason).toBe(WALLPAPER_LOCK_REASON[item.lock as 'saju' | 'journey'])
    }
  })

  it('사주만 있으면 오행 다섯이 열리고 이달의 복만 잠긴다', () => {
    const open = WALLPAPER_SET.filter((w) => resolveWallpaperUnlock(w, SAJU_ONLY).unlocked)

    expect(open.map((w) => w.id)).toEqual(WALLPAPER_ELEMENT_ORDER.map((e) => `element-${e}`))
    expect(resolveWallpaperUnlock(itemById(MONTHLY_WALLPAPER_ID), SAJU_ONLY)).toEqual({
      unlocked: false,
      reason: WALLPAPER_LOCK_REASON.journey,
    })
  })

  it('완주하면 여섯 장이 전부 열린다', () => {
    for (const item of WALLPAPER_SET) {
      expect(resolveWallpaperUnlock(item, COMPLETE)).toEqual({ unlocked: true, reason: null })
    }
  })

  it('잠금 사유 문구는 잠긴 장에만 붙는다 (열린 장은 늘 null)', () => {
    for (const entitlement of [NOBODY, SAJU_ONLY, COMPLETE]) {
      for (const item of WALLPAPER_SET) {
        const state = resolveWallpaperUnlock(item, entitlement)

        expect(state.reason === null).toBe(state.unlocked)
      }
    }
  })
})

describe('이달의 복 — 판(版) 갱신 감지', () => {
  it('연월을 두 자리로 채운 id 를 만든다', () => {
    expect(monthlyWallpaperId(new Date('2026-08-22T00:00:00Z'))).toBe('monthly-202608')
    expect(monthlyWallpaperId(new Date('2026-01-05T00:00:00Z'))).toBe('monthly-202601')
    expect(monthlyWallpaperId(new Date('2026-12-31T00:00:00Z'))).toBe('monthly-202612')
  })

  it('배포된 판과 같은 달이면 current 다', () => {
    expect(isMonthlyWallpaperCurrent(new Date('2026-08-01T00:00:00Z'))).toBe(true)
    expect(isMonthlyWallpaperCurrent(new Date('2026-09-01T00:00:00Z'))).toBe(false)
  })
})

describe('내 오행 — 추천 배지와 미리보기 순서', () => {
  it('용신과 같은 오행 장에만 배지가 붙는다', () => {
    expect(isMyElement(itemById('element-water'), 'water')).toBe(true)
    expect(isMyElement(itemById('element-wood'), 'water')).toBe(false)
  })

  it('용신이 없으면 어느 장도 「내 오행」이 아니다', () => {
    for (const item of WALLPAPER_SET) {
      expect(isMyElement(item, null)).toBe(false)
    }
  })

  it('이달의 복은 오행이 없어 배지 대상이 아니다', () => {
    for (const element of WALLPAPER_ELEMENT_ORDER) {
      expect(isMyElement(itemById(MONTHLY_WALLPAPER_ID), element)).toBe(false)
    }
  })

  it('미리보기는 내 오행 장을 맨 앞에 세운 세 장이다', () => {
    const preview = wallpaperPreview('water')

    expect(preview).toHaveLength(3)
    expect(preview[0]!.id).toBe('element-water')
    expect(new Set(preview.map((w) => w.id)).size).toBe(3)
  })

  it('용신이 없으면 세트 앞 세 장을 그대로 쓴다', () => {
    expect(wallpaperPreview(null).map((w) => w.id)).toEqual(WALLPAPER_SET.slice(0, 3).map((w) => w.id))
  })
})
