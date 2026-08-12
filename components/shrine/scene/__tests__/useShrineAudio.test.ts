/**
 * 신당 BGM 계약 게이트.
 *
 * 여기서 막는 회귀는 «조용한» 것들이다: 테마가 하나 늘었는데 BGM_ROOT·음원을 안 채우면
 * 앱은 에러 없이 그냥 다른 테마 소리를 내거나(startBgm 의 choga 폴백) 합성음으로 내려간다.
 * 화면에도 로그에도 안 남으므로 테스트가 유일한 감지기다.
 */

import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { act, renderHook } from '@testing-library/react'
import { BGM_ROOT, PENTA, resolveMuted, useShrineAudio } from '../useShrineAudio'
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

describe('resolveMuted — 저장값 판정표', () => {
  it('저장값이 없으면 음소거가 기본이다 (CEO 지시: 시작 시 음소거)', () => {
    expect(resolveMuted(null)).toBe(true)
  })

  it("'0' 만이 «사용자가 켠» 상태다 — 기존 선택은 존중한다", () => {
    expect(resolveMuted('0')).toBe(false)
  })

  it("'1' 과 알 수 없는 값은 음소거로 본다", () => {
    expect(resolveMuted('1')).toBe(true)
    expect(resolveMuted('')).toBe(true)
    expect(resolveMuted('true')).toBe(true)
  })
})

describe('useShrineAudio — 기본 음소거 계약', () => {
  /** jsdom 에는 재생 가능한 Audio 가 없다. 만들어진 element 의 src 를 관찰하려고 가짜를 세운다. */
  class FakeAudio {
    static created: FakeAudio[] = []
    loop = false
    volume = 1
    paused = false
    onerror: (() => void) | null = null
    constructor(public readonly src: string) {
      FakeAudio.created.push(this)
    }
    play(): Promise<void> {
      return Promise.resolve()
    }
    pause(): void {
      this.paused = true
    }
  }

  const globalWithAudio = globalThis as unknown as { Audio?: unknown }
  const originalAudio = globalWithAudio.Audio

  beforeEach(() => {
    FakeAudio.created = []
    globalWithAudio.Audio = FakeAudio
    window.localStorage.clear()
  })

  afterEach(() => {
    globalWithAudio.Audio = originalAudio
    window.localStorage.clear()
  })

  it('저장값이 없으면 muted 로 시작하고 진입 호출이 소리를 내지 않는다', async () => {
    const { result } = renderHook(() => useShrineAudio())
    expect(result.current.muted).toBe(true)

    await act(async () => {
      result.current.startBgm('yonggung')
    })

    expect(FakeAudio.created).toHaveLength(0)
    expect(result.current.bgmOn).toBe(false)
  })

  it("이미 «켬»을 고른 사용자('0')는 그대로 소리가 난다", async () => {
    window.localStorage.setItem('hhd_shrine_muted', '0')
    const { result } = renderHook(() => useShrineAudio())
    expect(result.current.muted).toBe(false)

    await act(async () => {
      result.current.startBgm('yonggung')
    })

    expect(FakeAudio.created.map((a) => a.src)).toEqual(['/sounds/shrine/bgm-yonggung.mp3'])
  })

  it("«끔»을 고른 사용자('1')도 그대로 음소거다", () => {
    window.localStorage.setItem('hhd_shrine_muted', '1')
    const { result } = renderHook(() => useShrineAudio())
    expect(result.current.muted).toBe(true)
  })

  it('음소거 중 진입한 테마를 기억한다 — 소리를 켜면 그 테마가 난다 (choga 폴백 금지)', async () => {
    // 이 회귀가 나면 16트랙이 조용히 1트랙(choga)으로 무너진다. 화면에도 로그에도 안 남는다.
    const { result } = renderHook(() => useShrineAudio())

    await act(async () => {
      result.current.startBgm('daejanggan') // 진입 — 음소거라 소리는 안 난다
    })
    expect(FakeAudio.created).toHaveLength(0)

    await act(async () => {
      result.current.toggleMute() // 사용자가 스피커를 켠다
    })

    expect(result.current.muted).toBe(false)
    expect(FakeAudio.created.map((a) => a.src)).toEqual(['/sounds/shrine/bgm-daejanggan.mp3'])
    expect(window.localStorage.getItem('hhd_shrine_muted')).toBe('0')
  })

  it('다시 끄면 재생이 멈추고 저장값이 남는다', async () => {
    const { result } = renderHook(() => useShrineAudio())

    await act(async () => {
      result.current.startBgm('naru')
    })
    await act(async () => {
      result.current.toggleMute()
    })
    await act(async () => {
      result.current.toggleMute()
    })

    expect(result.current.muted).toBe(true)
    expect(FakeAudio.created[0]?.paused).toBe(true)
    expect(window.localStorage.getItem('hhd_shrine_muted')).toBe('1')
  })
})
