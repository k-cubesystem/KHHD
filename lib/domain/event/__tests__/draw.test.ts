import { candidateWeight, drawWinners, makeDrawSeed, type DrawCandidate } from '../draw'

function mk(n: number, q = '사주 봐주세요'): DrawCandidate[] {
  return Array.from({ length: n }, (_, i) => ({ id: `e${String(i).padStart(3, '0')}`, question: q }))
}

describe('drawWinners — 결정론·재현', () => {
  it('같은 seed·후보면 같은 결과', () => {
    const c = mk(50)
    const a = drawWinners(c, 5, 'seed-A')
    const b = drawWinners(c, 5, 'seed-A')
    expect(a.winners).toEqual(b.winners)
  })
  it('후보 순서를 섞어도 결과가 같다(id 정렬로 고정)', () => {
    const c = mk(50)
    const shuffled = [...c].reverse()
    expect(drawWinners(c, 5, 's').winners).toEqual(drawWinners(shuffled, 5, 's').winners)
  })
  it('seed 가 다르면 결과가 달라진다', () => {
    const c = mk(50)
    const a = drawWinners(c, 5, 'seed-A').winners.map((w) => w.id)
    const b = drawWinners(c, 5, 'seed-B').winners.map((w) => w.id)
    expect(a).not.toEqual(b)
  })
  it('중복 없이 count 명, rank 1..N', () => {
    const r = drawWinners(mk(30), 5, 's')
    expect(r.winners).toHaveLength(5)
    expect(new Set(r.winners.map((w) => w.id)).size).toBe(5)
    expect(r.winners.map((w) => w.rank)).toEqual([1, 2, 3, 4, 5])
  })
  it('후보가 count 보다 적으면 전원', () => {
    expect(drawWinners(mk(3), 5, 's').winners).toHaveLength(3)
    expect(drawWinners([], 5, 's').winners).toHaveLength(0)
  })
})

describe('candidateWeight — 공정성 상한', () => {
  it('기본 1.0, 최대 2.55 를 넘지 않는다', () => {
    expect(candidateWeight({ id: 'a', question: '봐주세요' })).toBe(1)
    const heavy = candidateWeight({
      id: 'b',
      isMember: true,
      question:
        '2026년 하반기에 이직을 고민 중입니다. 남편은 반대하고 부모님은 찬성이라 결정을 못 하고 있어요. ' +
        '지금 회사에서 승진 기회도 있는데 이걸 잡아야 할지, 새 사업을 시작해야 할지 갈림길입니다. '.repeat(3),
    })
    expect(heavy).toBeLessThanOrEqual(2.55)
    expect(heavy).toBeGreaterThan(2)
  })
  it('구체성 표지가 가중치를 올린다', () => {
    const plain = candidateWeight({ id: 'a', question: '그냥 궁금해서요 아무거나 봐주세요 감사합니다' })
    const specific = candidateWeight({ id: 'b', question: '올해 이직할까 고민이에요 남편은 반대해요' })
    expect(specific).toBeGreaterThan(plain)
  })
})

describe('공정성 — 가중치가 통계적으로 반영되되 독점하지 않는다', () => {
  it('가중 2.5 후보의 당첨률이 1.0 후보의 2~3배 안에 든다 (1,000 시드)', () => {
    const light = mk(20, '봐주세요')
    const heavy: DrawCandidate[] = Array.from({ length: 20 }, (_, i) => ({
      id: `h${String(i).padStart(3, '0')}`,
      isMember: true,
      question:
        '2026년 이직 고민이에요. 남편은 반대하고 부모님은 찬성. 승진 기회를 잡을지 창업할지 갈림길입니다.'.repeat(2),
    }))
    const all = [...light, ...heavy]
    let lightWins = 0
    let heavyWins = 0
    for (let s = 0; s < 1000; s++) {
      for (const w of drawWinners(all, 5, `seed-${s}`).winners) {
        if (w.id.startsWith('h')) heavyWins++
        else lightWins++
      }
    }
    const ratio = heavyWins / lightWins
    expect(ratio).toBeGreaterThan(1.8)
    expect(ratio).toBeLessThan(3.2)
  })
})

describe('makeDrawSeed', () => {
  it('라운드 id·마감시각으로만 만든다(운영자 임의값 없음)', () => {
    expect(makeDrawSeed('r1', '2026-08-23T15:00:00Z')).toBe('r1:2026-08-23T15:00:00Z')
  })
})
