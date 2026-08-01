import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fireEvent, render } from '@testing-library/react'
import { SAMGI_LAST_INDEX, SamgiRow, purifyLeadMs } from '../SamgiRow'
import { OBANGKI_MS, OBANGKI_SAMGI_STEP_MS, OBANGKI_COLOR_INFO } from '@/lib/domain/ritual/obangki'
import { drawSamgi, readSamgi, type SamgiReading } from '@/lib/domain/ritual/obangki-reading'

/**
 * 삼기 앞줄의 **구조 불변식** 회귀 방지.
 *
 * 이 파일이 있는 이유: 처음 구현에서 물린 기(.obangki-purified)를 .obangki-samgi 안에 넣었다.
 * 타입도 통과하고 테스트도 초록이고 콘솔도 조용했지만, .obangki-samgi 가 `both` 채우기라
 * 지연 구간 내내 opacity:0 을 유지하는 탓에 **부정풀이 연출만 통째로 투명**했다 —
 * 사용자에게는 "물리는 장면이 없다"로 보인다. 눈으로만 지킬 수 있는 규칙은 다음 판에 또 깨진다.
 */

/**
 * jsdom 에는 AnimationEvent 생성자가 없다. 없으면 testing-library 가 일반 Event 로 떨어뜨리는데,
 * 그러면 **animationName 이 사라져** 핸들러의 이름 판별을 시험하지 못한다(검사는 초록인데 실제로는
 * 아무것도 확인하지 않는 상태가 된다). 최소 구현을 깔아 그 판별까지 실제로 태운다.
 */
class TestAnimationEvent extends Event {
  animationName: string
  constructor(type: string, init: EventInit & { animationName?: string } = {}) {
    super(type, init)
    this.animationName = init.animationName ?? ''
  }
}
beforeAll(() => {
  Object.defineProperty(window, 'AnimationEvent', { value: TestAnimationEvent, configurable: true, writable: true })
})

/** 시드를 훑어 원하는 조건의 회차를 찾는다(결정론이라 난수가 필요 없다). */
function findSeed(match: (r: SamgiReading) => boolean): number {
  for (let i = 0; i < 20_000; i += 1) {
    const seed = (i * 2654435761) >>> 0
    if (match(readSamgi(seed, null, 'sinsu'))) return seed
  }
  throw new Error('조건에 맞는 회차를 찾지 못했습니다')
}

const purifiedSeed = findSeed((r) => r.draw.purified !== null)
const plainSeed = findSeed((r) => r.draw.purified === null)

describe('SamgiRow — 세 기가 차례로 선다', () => {
  it('세 칸이 서고 각 칸에 자리 이름이 붙는다', () => {
    const { container, getByText } = render(<SamgiRow reading={readSamgi(plainSeed, null, 'sinsu')} />)
    expect(container.querySelectorAll('.obangki-samgi')).toHaveLength(3)
    for (const title of ['자리', '뿌리', '향방']) expect(getByText(title)).not.toBeNull()
  })

  it('칸마다 지연이 한 걸음씩 늘어난다 — 순서를 CSS 지연이 준다', () => {
    const { container } = render(<SamgiRow reading={readSamgi(plainSeed, null, 'sinsu')} />)
    const delays = [...container.querySelectorAll<HTMLElement>('.obangki-samgi')].map((el) =>
      el.style.getPropertyValue('--ob-delay')
    )
    expect(delays).toEqual([`0ms`, `${OBANGKI_SAMGI_STEP_MS}ms`, `${OBANGKI_SAMGI_STEP_MS * 2}ms`])
  })

  it('뽑힌 색이 그대로 그려진다 (기 이름 라벨)', () => {
    const reading = readSamgi(plainSeed, null, 'sinsu')
    const { container } = render(<SamgiRow reading={reading} />)
    const labels = [...container.querySelectorAll('.obangki-samgi')].map((el) => el.textContent ?? '')
    const expected = [reading.draw.seat, reading.draw.root, reading.draw.way].map((c) => OBANGKI_COLOR_INFO[c].label)
    expected.forEach((label, i) => expect(labels[i]).toContain(label))
  })
})

describe('부정풀이 — 물린 기가 실제로 보이는 자리에 있다', () => {
  it('★ 물린 기가 .obangki-samgi 의 자손이 아니다 (자손이면 지연 내내 투명해 연출이 죽는다)', () => {
    const { container } = render(<SamgiRow reading={readSamgi(purifiedSeed, null, 'sinsu')} />)
    const purified = container.querySelector('[data-purified]')
    expect(purified).not.toBeNull()
    expect(purified?.className).toContain('obangki-purified')
    expect(purified?.closest('.obangki-samgi')).toBeNull()
  })

  it('물린 기는 첫 칸(자리)에만 온다 — 뿌리·향방의 녹기는 제 뜻이 있어 물리지 않는다', () => {
    const { container } = render(<SamgiRow reading={readSamgi(purifiedSeed, null, 'sinsu')} />)
    const columns = [...container.querySelectorAll<HTMLElement>('[data-samgi-row] > span')]
    expect(columns).toHaveLength(3)
    expect(columns[0].querySelector('[data-purified]')).not.toBeNull()
    expect(columns[1].querySelector('[data-purified]')).toBeNull()
    expect(columns[2].querySelector('[data-purified]')).toBeNull()
  })

  it('물림이 없는 회차에는 물린 기가 아예 없다', () => {
    const { container } = render(<SamgiRow reading={readSamgi(plainSeed, null, 'sinsu')} />)
    expect(container.querySelector('[data-purified]')).toBeNull()
  })

  it('물림이 있으면 세 칸 전부가 물림 시간만큼 뒤로 밀린다 (겹쳐 보이지 않게)', () => {
    const reading = readSamgi(purifiedSeed, null, 'sinsu')
    const { container } = render(<SamgiRow reading={reading} />)
    const delays = [...container.querySelectorAll<HTMLElement>('.obangki-samgi')].map((el) =>
      el.style.getPropertyValue('--ob-delay')
    )
    expect(delays[0]).toBe(`${OBANGKI_MS.purify}ms`)
    expect(purifyLeadMs(reading)).toBe(OBANGKI_MS.purify)
    expect(purifyLeadMs(readSamgi(plainSeed, null, 'sinsu'))).toBe(0)
  })
})

describe('두루마리 등장 — 지연이 아니라 **마운트**로 몬다 (튕김 근본 수복)', () => {
  it('마지막 기의 번호가 칸 수와 맞는다 — 이 기의 animationend 가 두루마리를 세운다', () => {
    const { container } = render(<SamgiRow reading={readSamgi(plainSeed, null, 'sinsu')} />)
    expect(container.querySelectorAll('.obangki-samgi')).toHaveLength(SAMGI_LAST_INDEX + 1)
  })

  /**
   * 🔴 「오방기 튕김」의 정체: 두루마리를 셔플 직후 DOM 에 넣고 animation-delay 로 늦게 보이게 하면,
   *    지연 구간 동안 그 카드는 opacity:0 인 채 **레이아웃을 차지하고 클릭도 받는다**.
   *    안에는 /protected/shrine 로 가는 링크가 둘(해 볼 일·신당) 있어, 아무것도 보이지 않는 자리를
   *    탭하면 신당으로 튕겼다. 지연으로 띄우는 방식이 되살아나면 그 순간 버그도 되살아난다.
   */
  it('★ 시트가 두루마리에 animation-delay 를 얹지 않는다 — 보이지 않는 것은 눌리지도 않아야 한다', () => {
    const sheet = readFileSync(path.join(process.cwd(), 'components/shrine/scene/ObangkiSheet.tsx'), 'utf8')
    expect(sheet).toContain('{revealed && scrollReady && (')
    expect(sheet).toContain('if (i === SAMGI_LAST_INDEX) onLastFlag()')
    expect(sheet).toContain('onLastFlag={() => setScrollReady(true)}')
    // 두루마리 컨테이너에 인라인 지연이 다시 붙으면 실패한다
    expect(sheet).not.toMatch(/obangki-bubble[^>]*animationDelay/)
    expect(sheet).not.toContain('scrollDelayMs')
  })
})

describe('연출 순서 통지 — 파티클도 타이머가 아니라 연출이 몬다', () => {
  it('obangkiSamgiRise 가 끝난 칸의 번호를 그대로 알린다', () => {
    const seen: number[] = []
    const { container } = render(
      <SamgiRow reading={readSamgi(plainSeed, null, 'sinsu')} onFlagShown={(i) => seen.push(i)} />
    )
    const cols = [...container.querySelectorAll<HTMLElement>('.obangki-samgi')]
    cols.forEach((el) => fireEvent.animationEnd(el, { animationName: 'obangkiSamgiRise' }))
    expect(seen).toEqual([0, 1, 2])
  })

  it('다른 애니메이션이 끝난 것은 무시한다 (안쪽 펼침이 파티클을 두 번 터뜨리지 않게)', () => {
    const seen: number[] = []
    const { container } = render(
      <SamgiRow reading={readSamgi(plainSeed, null, 'sinsu')} onFlagShown={(i) => seen.push(i)} />
    )
    const first = container.querySelector<HTMLElement>('.obangki-samgi')
    if (first) fireEvent.animationEnd(first, { animationName: 'obangkiUnfurl' })
    expect(seen).toEqual([])
  })
})

describe('시드 표본 — 어떤 회차에도 구조가 무너지지 않는다', () => {
  it('200 회차를 렌더해도 칸 3개·물린 기 위치 규칙이 유지된다', () => {
    for (let i = 0; i < 200; i += 1) {
      const seed = (i * 40503) >>> 0
      const reading = readSamgi(seed, null, 'sinsu')
      const { container, unmount } = render(<SamgiRow reading={reading} />)
      expect(container.querySelectorAll('.obangki-samgi')).toHaveLength(3)
      const purified = container.querySelector('[data-purified]')
      expect(purified === null).toBe(drawSamgi(seed).purified === null)
      if (purified) expect(purified.closest('.obangki-samgi')).toBeNull()
      unmount()
    }
  })
})
