/**
 * 신위 탭 회전 — 국면 표와 **그 표를 베낀 세 곳**의 정합 (안2.3 ④ / 4차 검수 9국면).
 *
 * 회전이 어긋나는 방식은 늘 같다. 도메인 표만 고치고 CSS 키프레임 %를 안 고치면 프레임과 몸통이
 * 따로 놀고, 겹을 늘리고 게이트 목록에 안 넣으면 배포 CSS 에 빠져도 아무도 모르며(styled-jsx 사고와
 * 같은 무증상), 생성 스크립트의 각 목록이 도메인 키와 갈리면 **굽지 않은 각을 CSS 가 기다린다**.
 * 셋 다 런타임 예외 없이 화면만 이상해지므로, DB·브라우저 없이 파일 그 자체를 읽어 미리 잡는다.
 *
 * 검사 대상
 *   1. 국면 표 자체 — 45°씩 아홉 국면 · 시각 단조증가 · 대칭 재사용 · 감속 곡선
 *   2. app/shrine-scene.css        — 겹 키프레임의 % 집합이 표에서 파생된 값과 **정확히** 같다
 *   3. scripts/shrine-assets/deity-turnaround.mjs — VIEWS 의 각 키가 BAKED_FRAME_KEYS 와 같다
 *   4. scripts/check-animation-css.mjs           — 겹 클래스·키프레임이 배포 게이트에 등록돼 있다
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import {
  BAKED_FRAME_KEYS,
  GHOST_LAG_MS,
  GHOST_LAYERS,
  LAND_PCT,
  LITE_LAYERS,
  SPIN_MS,
  SPIN_TOTAL_MS,
  TURN_LAYERS,
  TURN_PHASES,
  TURN_STEPS,
  TURN_STEP_DEG,
  layersForTier,
  turnShadowClass,
  turnSpinClass,
  turnTier,
  type TurnLayer,
  XFADE_PCT,
} from '../deity-turn'
import { deityTurnFrames } from '../deities'

const ROOT = path.resolve(__dirname, '../../../..')
const CSS = readFileSync(path.join(ROOT, 'app', 'shrine-scene.css'), 'utf8')
const GEN_SCRIPT = readFileSync(path.join(ROOT, 'scripts', 'shrine-assets', 'deity-turnaround.mjs'), 'utf8')
const GATE = readFileSync(path.join(ROOT, 'scripts', 'check-animation-css.mjs'), 'utf8')

/** 소수 둘째 자리 — CSS 에 적을 수 있는 정밀도(도메인과 같은 반올림). */
const round2 = (n: number): number => Math.round(n * 100) / 100

/** `@keyframes {name} { … }` 블록을 중괄호 균형으로 떼어 낸다(정규식만으로는 중첩을 못 센다). */
function keyframeBlock(name: string): string {
  const head = new RegExp(`@keyframes\\s+${name}\\s*\\{`).exec(CSS)
  expect(head).not.toBeNull()
  if (!head) throw new Error(`@keyframes ${name} 없음`)
  let depth = 0
  let i = head.index + head[0].length - 1
  const start = i
  for (; i < CSS.length; i += 1) {
    if (CSS[i] === '{') depth += 1
    else if (CSS[i] === '}') {
      depth -= 1
      if (depth === 0) return CSS.slice(start, i + 1)
    }
  }
  throw new Error(`@keyframes ${name} 블록이 닫히지 않음`)
}

/** 키프레임 블록 안의 정지점 %(오름차순·중복 제거). */
function keyframeStops(name: string): number[] {
  const stops = [...keyframeBlock(name).matchAll(/(\d+(?:\.\d+)?)%/g)].map((m) => Number(m[1]))
  return [...new Set(stops)].sort((a, b) => a - b)
}

/**
 * 겹 하나가 가져야 할 정지점 — **유니언 페이드** 계약 (7차 검수 ⓓ, 즉시 교체(−0.01) 폐기).
 * 들어오는 겹은 [진입−XFADE, 진입]에 페이드인, 나가는 겹은 [진입, 진입+XFADE]에 페이드아웃.
 * DOM 순서(늦은 겹이 위) 덕에 반투명 두 장이 배경을 비추는 구간이 없다(이중 노출·알파 구멍 방지).
 * index 0(정면)만 창이 둘이다 — 출발점이자 착지점이라 LAND_PCT 직전에 페이드인으로 되돌아온다.
 */
function expectedStops(layer: TurnLayer): number[] {
  const raw =
    layer.index === 0
      ? [0, layer.toPct, round2(layer.toPct + XFADE_PCT), round2(LAND_PCT - XFADE_PCT), LAND_PCT, 100]
      : [0, round2(layer.fromPct - XFADE_PCT), layer.fromPct, layer.toPct, round2(layer.toPct + XFADE_PCT), 100]
  return [...new Set(raw)].sort((a, b) => a - b)
}

describe('국면 표 — 45°씩 아홉 국면', () => {
  it('걸음 각·국면 수: 45° × 8 = 한 바퀴', () => {
    expect(TURN_STEP_DEG).toBe(45)
    expect(TURN_STEPS).toBe(8)
    expect(TURN_PHASES).toHaveLength(9)
    expect(TURN_PHASES.map((p) => p.deg)).toEqual([0, 45, 90, 135, 180, 225, 270, 315, 360])
  })

  it('굽는 프레임은 넷뿐 — 나머지 반 바퀴는 대칭각을 좌우 반전해 쓴다', () => {
    expect(BAKED_FRAME_KEYS).toEqual(['q45', 'side', 'q135', 'back'])
    expect(TURN_PHASES.map((p) => p.frame)).toEqual([
      'base',
      'q45',
      'side',
      'q135',
      'back',
      'q135',
      'side',
      'q45',
      'base',
    ])
    expect(TURN_PHASES.map((p) => p.mirrored)).toEqual([false, false, false, false, false, true, true, true, false])
    // 국면이 아홉이어도 실제 파일은 정면(DB) + 넷
    expect(new Set(TURN_PHASES.map((p) => p.frame)).size).toBe(BAKED_FRAME_KEYS.length + 1)
  })

  it('시각은 단조증가하고 한 바퀴는 착지 여운 앞에서 끝난다', () => {
    const ms = TURN_PHASES.map((p) => p.atMs)
    for (let i = 1; i < ms.length; i += 1) expect(ms[i]).toBeGreaterThan(ms[i - 1])
    expect(ms[0]).toBe(0)
    expect(ms[TURN_STEPS]).toBeLessThan(SPIN_MS)
    expect(LAND_PCT).toBeCloseTo((ms[TURN_STEPS] / SPIN_MS) * 100, 2)
  })

  it('감속 곡선 — 중반(뒷면)이 가장 빠르고 양끝이 가장 느리다(회전 관성)', () => {
    const gaps = TURN_PHASES.slice(1).map((p, i) => p.atMs - TURN_PHASES[i].atMs)
    const mid = Math.floor(gaps.length / 2)
    expect(Math.min(...gaps)).toBe(gaps[mid])
    expect(Math.max(...gaps)).toBe(gaps[0])
    // 대칭: 처음 걸음과 마지막 걸음이 같은 만큼 느리다
    expect(gaps[0]).toBe(gaps[gaps.length - 1])
    // 등간격(선형)이 아니다 — 등간격이면 모터가 도는 것처럼 보인다
    expect(new Set(gaps).size).toBeGreaterThan(1)
  })

  it('겹 수는 국면보다 하나 적다 — 정면 착지는 index 0 이 다시 드러나는 것이다', () => {
    expect(TURN_LAYERS).toHaveLength(TURN_STEPS)
    expect(TURN_LAYERS.map((l) => l.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(TURN_LAYERS[TURN_STEPS - 1].toPct).toBe(LAND_PCT)
    for (const l of TURN_LAYERS) expect(l.toPct).toBeGreaterThan(l.fromPct)
  })

  it('잠금 길이 = 애니메이션 길이 + 마지막 잔상 지연', () => {
    expect(SPIN_TOTAL_MS).toBe(SPIN_MS + GHOST_LAG_MS * GHOST_LAYERS)
  })
})

describe('등급 — 가진 프레임만큼 돈다', () => {
  it('넷 다 있으면 9국면', () => {
    expect(turnTier(new Set(BAKED_FRAME_KEYS))).toBe('full')
    expect(layersForTier('full')).toHaveLength(8)
    expect(turnSpinClass('full')).toBe('deity-turn-spin')
    expect(turnShadowClass('full')).toBe('deity-turn-shadow')
  })

  it('side·back 만 있으면 5국면으로 낮춘다 — 중간각을 굽기 전 배포에도 회귀가 없다', () => {
    expect(turnTier(new Set(['side', 'back']))).toBe('lite')
    expect(layersForTier('lite')).toHaveLength(4)
    expect(LITE_LAYERS.map((l) => l.deg)).toEqual([0, 90, 180, 270])
    expect(LITE_LAYERS.map((l) => l.frame)).toEqual(['base', 'side', 'back', 'side'])
    expect(LITE_LAYERS.map((l) => l.mirrored)).toEqual([false, false, false, true])
    expect(turnSpinClass('lite')).toBe('deity-turn-spin-lite')
  })

  it('한 각이라도 빠지면 그 아래 등급으로 — 부분 보유가 깨지지 않는다', () => {
    expect(turnTier(new Set(['q45', 'side', 'back']))).toBe('lite') // q135 없음
    expect(turnTier(new Set(['q45', 'q135', 'side']))).toBe('none') // back 없음
    expect(turnTier(new Set(['side']))).toBe('none')
    expect(turnTier(new Set())).toBe('none')
  })

  it('폴백은 정면 한 장만 깐다 — rotateY 가 돌 대상이다', () => {
    expect(layersForTier('none')).toEqual([
      { index: 0, frame: 'base', mirrored: false, deg: 0, fromPct: 0, toPct: 100 },
    ])
    expect(turnSpinClass('none')).toBe('deity-turn-flip')
    // 폴백의 90°·270° 는 5국면 표와 같은 자리라 접지 그림자 곡선을 공유한다
    expect(turnShadowClass('none')).toBe('deity-turn-shadow-lite')
  })
})

describe('경로 규약 — deityTurnFrames', () => {
  it('굽는 키 전부를 경로로 만든다', () => {
    expect(deityTurnFrames('seonnyeo')).toEqual({
      q45: '/shrine/deities/seonnyeo/q45.webp',
      side: '/shrine/deities/seonnyeo/side.webp',
      q135: '/shrine/deities/seonnyeo/q135.webp',
      back: '/shrine/deities/seonnyeo/back.webp',
    })
  })

  it('키 목록은 도메인 단일 출처를 따른다 — 각을 늘려도 이 함수는 고칠 데가 없다', () => {
    const frames = deityTurnFrames('yongwang')
    expect(frames).not.toBeNull()
    expect(Object.keys(frames ?? {}).sort()).toEqual([...BAKED_FRAME_KEYS].sort())
  })

  it('규약 밖 코드는 null — 경로 탈출(../)·대문자·공백·빈값 차단', () => {
    for (const bad of ['../../etc/passwd', 'Seonnyeo', 'seon nyeo', '', '_lead', 'a'.repeat(32), null, undefined])
      expect(deityTurnFrames(bad)).toBeNull()
  })
})

describe('app/shrine-scene.css — 키프레임 %가 국면 표에서 나왔는가', () => {
  it.each(TURN_LAYERS.map((l) => [l.index, l.deg, l] as const))(
    '9국면 겹 %i (%i°) — deityTurnStep 창이 표와 일치',
    (index, _deg, layer) => {
      expect(keyframeStops(`deityTurnStep${index}`)).toEqual(expectedStops(layer))
    }
  )

  it.each(LITE_LAYERS.map((l) => [l.index, l.deg, l] as const))(
    '5국면 겹 %i (%i°) — deityTurnLite 창이 표와 일치',
    (index, _deg, layer) => {
      expect(keyframeStops(`deityTurnLite${index}`)).toEqual(expectedStops(layer))
    }
  )

  it('몸통 스쿼시는 모든 국면에서 자세를 잡는다(빠진 국면 = 그 각에서 폭이 튄다)', () => {
    const stops = keyframeStops('deityTurnBody')
    for (const p of TURN_PHASES) expect(stops).toContain(p.atPct)
    expect(stops).toContain(100)
  })

  it('접지 그림자도 같은 표를 따른다 — 어긋나면 발밑이 몸보다 늦게 좁아진다', () => {
    const stops = keyframeStops('deityTurnShadow')
    for (const p of TURN_PHASES) expect(stops).toContain(p.atPct)
    const lite = keyframeStops('deityTurnShadowLite')
    for (const p of LITE_LAYERS) expect(lite).toContain(p.fromPct)
    expect(lite).toContain(LAND_PCT)
  })

  it('발광은 착지 시점에 완전히 꺼진다 — 멎은 신위가 빛나고 있으면 안 된다', () => {
    const glow = keyframeBlock('deityTurnGlow')
    expect(glow).toContain(`${LAND_PCT}%`)
    // filter 함수 구성이 모든 정지점에서 같아야 보간된다(하나라도 빠지면 툭 끊긴다)
    const dropShadows = glow.match(/drop-shadow\(/g) ?? []
    const brightness = glow.match(/brightness\(/g) ?? []
    expect(dropShadows).toHaveLength(brightness.length)
  })

  it('겹 클래스가 CSS 에 실제로 배선돼 있다 — 겹만 늘리고 규칙을 안 늘리면 그 각이 안 뜬다', () => {
    for (const l of TURN_LAYERS) expect(CSS).toContain(`.deity-turn-spin .deity-turn-step-${l.index}`)
    for (const l of LITE_LAYERS) expect(CSS).toContain(`.deity-turn-spin-lite .deity-turn-step-${l.index}`)
    expect(CSS).toContain('.deity-turn-mirror')
  })

  it('styled-jsx 로 되돌아가지 않았다 — App Router 산출물에 CSS 를 한 줄도 남기지 않는다', () => {
    const tsx = readFileSync(path.join(ROOT, 'components', 'shrine', 'scene', 'DeityTurn.tsx'), 'utf8')
    expect(tsx).not.toMatch(/<style\s+jsx/)
  })
})

describe('scripts/shrine-assets/deity-turnaround.mjs — 굽는 각 목록', () => {
  it('VIEWS 의 키가 BAKED_FRAME_KEYS 와 같다(순서까지)', () => {
    const keys = [...GEN_SCRIPT.matchAll(/^\s{4}key: '([a-z0-9]+)',$/gm)].map((m) => m[1])
    expect(keys).toEqual([...BAKED_FRAME_KEYS])
  })

  it('굽는 각은 0°~180° 뿐 — 그 위는 반전 재사용이라 구우면 돈만 나간다', () => {
    const degs = [...GEN_SCRIPT.matchAll(/^\s{4}deg: (\d+),$/gm)].map((m) => Number(m[1]))
    expect(degs).toEqual(TURN_PHASES.slice(1, TURN_STEPS / 2 + 1).map((p) => p.deg))
  })

  it('회전 방향을 프롬프트가 못 박는다 — 한 각만 반대로 돌면 반전 재사용이 통째로 어긋난다', () => {
    expect(GEN_SCRIPT).toContain('TURN_DIRECTION')
    expect(GEN_SCRIPT).toMatch(/same rotation direction for every frame/)
  })

  it('시범 신위의 정면 스프라이트가 실재한다 — 참조·정렬 기준이 없으면 굽지 못한다', () => {
    for (const code of ['seonnyeo', 'yongwang'])
      expect(existsSync(path.join(ROOT, 'public', 'shrine', 'deities', code, 'base.webp'))).toBe(true)
  })
})

describe('scripts/check-animation-css.mjs — 배포 게이트 등록', () => {
  it('9국면 겹 클래스·키프레임이 전부 등록돼 있다', () => {
    for (const l of TURN_LAYERS) {
      expect(GATE).toContain(`'.deity-turn-step-${l.index}'`)
      expect(GATE).toContain(`'deityTurnStep${l.index}'`)
    }
  })

  it('5국면 하위 등급과 발광도 등록돼 있다', () => {
    for (const l of LITE_LAYERS) expect(GATE).toContain(`'deityTurnLite${l.index}'`)
    for (const name of ['deityTurnBodyLite', 'deityTurnShadowLite', 'deityTurnGlow'])
      expect(GATE).toContain(`'${name}'`)
    for (const sel of ['.deity-turn-spin-lite', '.deity-turn-shadow-lite', '.deity-turn-mirror'])
      expect(GATE).toContain(`'${sel}'`)
  })

  it('사라진 클래스·키프레임은 목록에서도 빠졌다 — 남으면 게이트가 항상 실패한다', () => {
    for (const dead of ['deityTurnBase', 'deityTurnSideFlip', '.deity-turn-side-flip', '.deity-turn-base'])
      expect(GATE).not.toContain(`'${dead}'`)
  })
})
