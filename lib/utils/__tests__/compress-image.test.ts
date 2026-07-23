import { fitWithin, base64Bytes } from '../compress-image'

describe('fitWithin — 압축 목표 치수', () => {
  it('최대 변보다 작으면 원본 유지', () => {
    expect(fitWithin(800, 600, 1280)).toEqual({ width: 800, height: 600 })
  })

  it('가로가 긴 이미지는 가로를 max로 축소', () => {
    expect(fitWithin(4032, 3024, 1280)).toEqual({ width: 1280, height: 960 })
  })

  it('세로가 긴 이미지는 세로를 max로 축소', () => {
    expect(fitWithin(3024, 4032, 1280)).toEqual({ width: 960, height: 1280 })
  })

  it('정사각형은 양변 모두 max', () => {
    expect(fitWithin(5000, 5000, 1280)).toEqual({ width: 1280, height: 1280 })
  })

  it('0·음수 치수는 1x1로 방어', () => {
    expect(fitWithin(0, 100, 1280)).toEqual({ width: 1, height: 1 })
    expect(fitWithin(-5, -5, 1280)).toEqual({ width: 1, height: 1 })
  })

  it('극단 비율에서도 최소 1px 보장', () => {
    const r = fitWithin(100000, 10, 1280)
    expect(r.width).toBe(1280)
    expect(r.height).toBeGreaterThanOrEqual(1)
  })
})

describe('base64Bytes — 크기 역산', () => {
  it('4자 base64 = 3바이트', () => {
    expect(base64Bytes('AAAA')).toBe(3)
  })

  it('빈 문자열 = 0', () => {
    expect(base64Bytes('')).toBe(0)
  })

  it('1MB급 문자열 근사치', () => {
    const oneMbBase64 = 'A'.repeat(Math.ceil((1024 * 1024 * 4) / 3))
    const bytes = base64Bytes(oneMbBase64)
    expect(bytes).toBeGreaterThanOrEqual(1024 * 1024 - 2)
    expect(bytes).toBeLessThanOrEqual(1024 * 1024 + 2)
  })
})
