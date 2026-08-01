/**
 * 창방 팻말(懸板) 기하 계약 — 도메인 상수 ↔ CSS ↔ 벽 무라의 삼각 대조.
 *
 * 팻말이 창을 벗어나는 사고는 **조용히** 일어난다. 배율식이 어긋나도 널은 그려지고, 다만
 * 벽의 엉뚱한 자리에 앉을 뿐이라 에러도 로그도 없다. 그래서 눈으로 보는 검수
 * (assets-src/shrine/ritual-plaque-check.webp) 와 별개로, 어긋나면 **깨지는** 지점을 여기 못박는다.
 *
 * 검사하는 것
 *   1. CSS 의 cover 배율 계수가 무라 규격(4096×640)에서 나온 값 그대로다.
 *   2. CSS 가 세로 오프셋·널 크기를 **리터럴이 아니라 변수로** 받고, 그 변수의 값이 PLAQUE_BOX 다.
 *   3. 세 팻말이 **가장 좁은 기기**에서도 화면 안이고, 서로 겹치지 않는다.
 *   4. 배포 게이트에 클래스·키프레임이 등록돼 있다(styled-jsx 사고 재발 방지).
 *   5. 널 스프라이트가 public/ 에 실재한다.
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import {
  PLAQUE_BOX,
  PLAQUE_SPRITE_URL,
  PLAQUE_WALL_PX,
  PLAQUE_WALL_URL,
  SHRINE_PLAQUES,
  hasPlaqueWall,
  plaqueBandVars,
  plaqueOffsetX,
} from '../plaque'

const read = (rel: string): string => readFileSync(path.join(process.cwd(), rel), 'utf8')
const css = read('app/shrine-scene.css')
const gate = read('scripts/check-animation-css.mjs')

/** `.shrine-plaque { … }` 본문 — 배율식·좌표가 전부 여기 있다 */
const plaqueBlock = /\.shrine-plaque\s*\{[^}]*\}/.exec(css)?.[0] ?? ''

describe('cover 배율식 — CSS 계수가 무라 규격에서 나온다', () => {
  it('블록이 실재한다 (선택자가 사라지면 팻말이 통째로 어긋난다)', () => {
    expect(plaqueBlock).not.toBe('')
  })

  it('--plq-s 가 max(100cqw/폭, 100cqh/높이) 다 — object-fit:cover 의 배율 그 자체', () => {
    const cqw = /([\d.]+)cqw/.exec(plaqueBlock)?.[1]
    const cqh = /([\d.]+)cqh/.exec(plaqueBlock)?.[1]
    expect(plaqueBlock).toContain('max(')
    // 소수 6자리 반올림 표기 — CSS 리터럴과 규격 계산이 같은 값인지만 본다
    expect(Number(cqw)).toBeCloseTo(100 / PLAQUE_WALL_PX.w, 6)
    expect(Number(cqh)).toBeCloseTo(100 / PLAQUE_WALL_PX.h, 6)
  })

  /**
   * 널 크기·세로 위치는 CSS 리터럴이 아니라 **띠가 얹는 변수**다(plaqueBandVars).
   * 종전에는 175/70/189 가 CSS 에 박혀 있어 PLAQUE_BOX 와 두 벌이었고, 팻말이 3개가 되며
   * 크기를 줄이는 순간 곧바로 어긋났다 — 어긋나도 널은 그려지므로 조용히 창방을 벗어난다.
   */
  it('CSS 는 숫자를 들지 않는다 — 크기·세로는 변수로 받는다', () => {
    expect(plaqueBlock).toContain('var(--plq-dy)')
    expect(plaqueBlock).toContain('var(--plq-w)')
    expect(plaqueBlock).toContain('var(--plq-h)')
    // 배율에 곱해지는 값은 전부 변수다 — `189 * var(--plq-s)` 같은 리터럴이 남아 있으면 안 된다
    expect(plaqueBlock).not.toMatch(/\d+\s*\*\s*var\(--plq-s\)/)
  })

  it('띠가 얹는 변수 값이 PLAQUE_BOX 와 무라 규격에서 나온다', () => {
    const vars = plaqueBandVars()
    expect(vars['--plq-w']).toBe(PLAQUE_BOX.w)
    expect(vars['--plq-h']).toBe(PLAQUE_BOX.h)
    // 무라 중심(320) 기준 오프셋 — 음수면 중심보다 위
    expect(vars['--plq-dy']).toBe(PLAQUE_BOX.cy - PLAQUE_WALL_PX.h / 2)
  })

  it('널 비율은 스프라이트가 굽힌 2.5:1 그대로다 — 늘려 쓰므로 비율이 바뀌면 몰딩이 찌그러진다', () => {
    expect(PLAQUE_BOX.w / PLAQUE_BOX.h).toBeCloseTo(2.5, 6)
  })

  it('가로 오프셋은 CSS 에 하드코딩하지 않고 --plq-dx 로 받는다 (팻말마다 다르다)', () => {
    expect(plaqueBlock).toContain('var(--plq-dx)')
  })

  it('컨테이너 질의 단위가 없으면 띠를 아예 감춘다 — 배율을 모른 채 걸지 않는다', () => {
    expect(css).toMatch(/\.shrine-plaque-band\s*\{[^}]*display:\s*none/)
    expect(css).toMatch(/@supports\s*\(height:\s*1cqh\)/)
    expect(css).toMatch(/@supports[^{]*\{[^}]*\.shrine-plaque-band\s*\{[^}]*container-type:\s*size/)
  })
})

describe('팻말 자리 — 가장 좁은 기기에서도 화면 안', () => {
  /**
   * 방 종횡비별로 화면이 덮는 **무라 x 범위**(중심 2048 기준 반폭).
   *   배율 s   = max(3.2·W/4096, 0.62·H/640)          (StageLayers object-cover)
   *   반폭     = 0.5·W / s                             (화면 폭 W 를 무라 px 로 환산)
   * 세로 긴 폰이 가장 좁다 — 방이 좁을수록 s 가 높이에 끌려 커지고, 그만큼 확대되어 덜 보인다.
   */
  const halfSpan = (w: number, h: number): number => {
    const s = Math.max((3.2 * w) / PLAQUE_WALL_PX.w, (0.62 * h) / PLAQUE_WALL_PX.h)
    return (0.5 * w) / s
  }

  /** 실기기 극단 — 아이폰 14 Pro(가장 좁다) · 기준 방 · 짧은 데스크톱 창 */
  const ROOMS: Array<[string, number, number]> = [
    ['아이폰 385×613', 385, 613],
    ['기준 방 520×620', 520, 620],
    ['짧은 창 520×420', 520, 420],
  ]

  it.each(ROOMS)('%s — 네 팻말이 온전히 화면 안이다', (_label, w, h) => {
    const half = halfSpan(w, h)
    for (const p of SHRINE_PLAQUES) {
      const dx = plaqueOffsetX(p.cx)
      // 널 반폭까지 포함해 양끝이 화면 안 (잘리면 CEO 가 보는 첫 화면에서 글자가 잘린다)
      expect(Math.abs(dx) + PLAQUE_BOX.w / 2).toBeLessThanOrEqual(half)
    }
  })

  it('네 팻말이 겹치지 않고 균등 간격이다 (칸 격자 대신 방 중심 균등 배치, 2026-08-01)', () => {
    const xs = SHRINE_PLAQUES.map((p) => p.cx).sort((a, b) => a - b)
    expect(xs).toHaveLength(4)
    // 균등 — 간격이 전부 같아야 띠 위에서 리듬으로 읽힌다
    const gaps = xs.slice(1).map((x, i) => x - xs[i])
    expect(new Set(gaps).size).toBe(1)
    for (let i = 1; i < xs.length; i += 1) expect(xs[i] - xs[i - 1]).toBeGreaterThan(PLAQUE_BOX.w)
  })

  it('널이 창방(윗인방 y94 ~ 아랫인방 y168) 안에 앉는다 — 창을 가리지 않고 그 위에 걸린다', () => {
    // 창살은 y205 부터다. 널 아래턱이 그보다 위여야 "창 위"가 성립한다.
    const top = PLAQUE_BOX.cy - PLAQUE_BOX.h / 2
    const bottom = PLAQUE_BOX.cy + PLAQUE_BOX.h / 2
    expect(top).toBeGreaterThanOrEqual(94)
    expect(bottom).toBeLessThanOrEqual(168)
  })
})

describe('벽 판정 · 목록', () => {
  it('좌표를 아는 벽에서만 참이다', () => {
    expect(hasPlaqueWall(PLAQUE_WALL_URL)).toBe(true)
    expect(hasPlaqueWall('/shrine/stage/banga/wallpaper.webp')).toBe(false)
    expect(hasPlaqueWall(null)).toBe(false)
    expect(hasPlaqueWall(undefined)).toBe(false)
  })

  it('페이지 팻말은 서로 다른 전용 페이지를 가리킨다', () => {
    const hrefs = SHRINE_PLAQUES.filter((p) => p.kind === 'page').map((p) => p.href)
    expect(hrefs).toEqual(['/protected/shrine/chuljeon', '/protected/shrine/obangki', '/protected/shrine/baekil'])
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  /**
   * 액막이는 팻말이 되었지만(CEO 6차 지시 ⑦) **페이지로 나가지는 않는다** —
   * 촛불에서 불을 받아 부적을 태우는 의식이라 방을 떠나면 행위 자체가 성립하지 않는다.
   * 그래서 kind='sheet' 다. 여기가 'page' 로 바뀌면 불 없는 곳에서 부적을 태우게 된다.
   */
  it('액막이 팻말은 방을 떠나지 않는다 — 시트를 여는 팻말이다', () => {
    const aekmak = SHRINE_PLAQUES.find((p) => p.key === 'aekmak')
    expect(aekmak).toBeDefined()
    expect(aekmak?.kind).toBe('sheet')
    expect(SHRINE_PLAQUES.filter((p) => p.kind === 'page').every((p) => !p.href.includes('aekmak'))).toBe(true)
  })

  it('키가 유일하다 — 팻말 키는 GA4 라벨이자 시트 배선의 이름이다', () => {
    const keys = SHRINE_PLAQUES.map((p) => p.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('에셋 · 배포 게이트', () => {
  it('널 스프라이트와 벽 무라가 public/ 에 실재한다', () => {
    for (const url of [PLAQUE_SPRITE_URL, PLAQUE_WALL_URL]) {
      expect(existsSync(path.join(process.cwd(), 'public', url))).toBe(true)
    }
  })

  it.each(['.shrine-plaque-band', '.shrine-plaque', '.shrine-plaque-glow'])(
    '%s 가 CSS 와 배포 게이트에 함께 있다',
    (cls) => {
      expect(css).toContain(`${cls} {`)
      expect(gate).toContain(`'${cls}'`)
    }
  )

  it('shrinePlaqueGlow 키프레임이 CSS 와 게이트에 함께 있다', () => {
    expect(css).toMatch(/@keyframes\s+shrinePlaqueGlow\b/)
    expect(gate).toContain("'shrinePlaqueGlow'")
  })

  it('오버레이 컴포넌트에 styled-jsx 가 없다', () => {
    expect(read('components/shrine/scene/WindowPlaques.tsx')).not.toMatch(/<style\s+jsx/)
  })
})

describe('액막이 팻말 → 시트 배선 (6차)', () => {
  const ROOT = path.resolve(__dirname, '../../../..')
  const sheetSrc = readFileSync(path.join(ROOT, 'components/shrine/scene/AekmakSheet.tsx'), 'utf8')
  const roomSrc = readFileSync(path.join(ROOT, 'components/shrine/scene/ShrineRoomClient.tsx'), 'utf8')

  /**
   * 액막이는 페이지가 아니라 방 안 시트라 팻말이 "이동"이 아니라 "열기"를 해야 한다.
   * 그 연결이 DOM 질의라 타입이 못 잡는다 — 이름표 양쪽을 문자열로 못 박는다.
   * (첫 버튼을 잡는 방식은 스트립에 버튼이 하나만 더 생겨도 조용히 깨진다.)
   */
  it('여는 버튼의 이름표와 룸의 질의가 같은 문자열이다', () => {
    expect(sheetSrc).toMatch(/data-aekmak-open/)
    expect(roomSrc).toMatch(/querySelector<HTMLButtonElement>\('\[data-aekmak-open\]'\)/)
  })

  it('룸이 첫 버튼을 잡는 방식으로 되돌아가지 않았다', () => {
    expect(roomSrc).not.toMatch(/querySelector<HTMLButtonElement>\('button'\)/)
  })
})
