/**
 * 신당 BGM 계약 게이트.
 *
 * 여기서 막는 회귀는 «조용한» 것들이다: 테마가 하나 늘었는데 BGM_ROOT·음원을 안 채우면
 * 앱은 에러 없이 그냥 다른 테마 소리를 내거나(startBgm 의 choga 폴백) 합성음으로 내려간다.
 * 화면에도 로그에도 안 남으므로 테스트가 유일한 감지기다.
 */

import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { BGM_ROOT, PENTA } from '../useShrineAudio'
import geometryJson from '@/lib/domain/shrine/theme-stage-geometry.json'

/** 오행-오음 정통 대응: 宮=土 · 商=金 · 角=木 · 徵=火 · 羽=水 (BGM_ROOT 주석의 파생 규칙) */
const ELEMENT_DEGREE: Record<string, number> = { earth: 0, metal: 1, wood: 2, fire: 3, water: 4 }
/** 黃鍾 = F3 */
const HWANG = 174.61
const BGM_DIR = join(process.cwd(), 'public', 'sounds', 'shrine')
/** 트랙당 상한 — 96kbps·60초면 약 704KB. 넘어가면 모바일 첫 진입이 무거워진다. */
const MAX_TRACK_BYTES = 800 * 1024

const THEME_CODES = Object.keys(geometryJson.themeElements)
const ELEMENTS = geometryJson.themeElements as Record<string, string | null>

describe('BGM_ROOT — 16테마 완전성', () => {
  it('키 집합이 theme-stage-geometry.json themeElements 와 diff 0', () => {
    expect(Object.keys(BGM_ROOT).sort()).toEqual(THEME_CODES.slice().sort())
    expect(THEME_CODES).toHaveLength(16)
  })

  it('전 루트가 유한 양수이고 사람이 듣는 저역대(80~320Hz) 안에 있다', () => {
    for (const hz of Object.values(BGM_ROOT)) {
      expect(Number.isFinite(hz)).toBe(true)
      expect(hz).toBeGreaterThanOrEqual(80)
      expect(hz).toBeLessThanOrEqual(320)
    }
  })

  it('전 루트가 «오행→평조 도수» 파생값이다 (옥타브만 무드 자유)', () => {
    // 손으로 고쳐 넣은 임의 주파수를 잡는 게 목적이다. 도수는 오행이 정하고,
    // ×1 / ×1/2 옥타브만 무드가 고른다 — 그래서 두 배수만 허용한다.
    for (const code of THEME_CODES) {
      const el = ELEMENTS[code]
      // 오행 없는 테마(초가·별밭)는 살림의 기본인 宮.
      const expected = HWANG * PENTA[el === null ? 0 : ELEMENT_DEGREE[el]]
      const octaves = [1, 0.5].map((o) => Math.round(expected * o * 100) / 100)
      expect(octaves).toContain(BGM_ROOT[code])
    }
  })

  it('평조 5음이다 — 서양 장음계(5/4·5/3)가 섞이면 국악풍이 죽는다', () => {
    expect(PENTA).toEqual([1, 9 / 8, 4 / 3, 3 / 2, 27 / 16])
  })
})

describe('BGM 실음원 — 배포 파일', () => {
  it('16테마 bgm-{theme}.mp3 가 전부 상주한다', () => {
    const missing = THEME_CODES.filter((code) => !existsSync(join(BGM_DIR, `bgm-${code}.mp3`)))
    expect(missing).toEqual([])
  })

  it('트랙마다 800KB 이하다', () => {
    const over = THEME_CODES.map((code) => ({ code, bytes: statSync(join(BGM_DIR, `bgm-${code}.mp3`)).size })).filter(
      (t) => t.bytes > MAX_TRACK_BYTES
    )
    expect(over).toEqual([])
  })

  it('BGM_ROOT 에 없는 고아 bgm 파일이 없다', () => {
    // 테마를 지웠는데 음원만 남으면 용량만 먹고 아무도 안 튼다.
    const orphans = readdirSync(BGM_DIR)
      .filter((f) => f.startsWith('bgm-') && f.endsWith('.mp3'))
      .map((f) => f.slice(4, -4))
      .filter((code) => !(code in BGM_ROOT))
    expect(orphans).toEqual([])
  })
})
