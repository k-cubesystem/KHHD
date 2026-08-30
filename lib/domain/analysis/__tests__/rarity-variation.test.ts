import { deriveRarityDirective, RARITY_ANGLE_HINTS, RARITY_SCALE_SIGNATURES } from '../rarity-variation'

/** 실제 팔자 형태의 시드 — 간지 8자. */
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

function makeSeed(n: number): string {
  let seed = ''
  for (let pillar = 0; pillar < 4; pillar += 1) {
    seed += GAN[(n * 7 + pillar * 3) % 10] + ZHI[(n * 5 + pillar * 7) % 12]
  }
  return seed
}

const SEEDS = Array.from({ length: 120 }, (_, i) => makeSeed(i))

describe('deriveRarityDirective', () => {
  it('같은 명식은 항상 같은 문구를 준다 (캐시·재열람 일관성)', () => {
    for (const seed of SEEDS.slice(0, 20)) {
      const first = deriveRarityDirective(seed)
      const second = deriveRarityDirective(seed)
      expect(second).toEqual(first)
    }
  })

  it('스케일 틀이 실제로 분산된다 (6종 중 3종 이상 등장)', () => {
    const used = new Set<string>()
    for (const seed of SEEDS) {
      const { scaleLine } = deriveRarityDirective(seed)
      const signature = RARITY_SCALE_SIGNATURES.find((s) => scaleLine.includes(s))
      expect(signature).toBeDefined()
      if (signature) used.add(signature)
    }
    expect(used.size).toBeGreaterThanOrEqual(3)
  })

  it('서술 각도도 분산되고, 항상 정의된 목록 안의 값이다', () => {
    const used = new Set<string>()
    for (const seed of SEEDS) {
      const { angleHint } = deriveRarityDirective(seed)
      expect(RARITY_ANGLE_HINTS).toContain(angleHint)
      used.add(angleHint)
    }
    expect(used.size).toBeGreaterThanOrEqual(3)
  })

  it('숫자가 들어가는 틀의 수치가 범위를 벗어나지 않는다', () => {
    for (const seed of SEEDS) {
      const { scaleLine } = deriveRarityDirective(seed)
      const match = scaleLine.match(/(\d+)명/)
      if (!match) continue

      const value = Number(match[1])
      if (scaleLine.includes('백 명 가운데')) {
        expect(value).toBeGreaterThanOrEqual(2)
        expect(value).toBeLessThanOrEqual(7)
      } else if (scaleLine.includes('천 명을 살펴도')) {
        expect(value).toBeGreaterThanOrEqual(8)
        expect(value).toBeLessThanOrEqual(30)
      } else {
        throw new Error(`숫자가 예정에 없던 틀에 들어갔다: ${scaleLine}`)
      }
    }
  })

  it('빈 시드에도 유효한 문구를 준다', () => {
    const { scaleLine, angleHint } = deriveRarityDirective('')
    expect(scaleLine.length).toBeGreaterThan(0)
    expect(RARITY_ANGLE_HINTS).toContain(angleHint)
  })
})
