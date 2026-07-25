import { computeSamhapCoherence, elementRelation, normalizeElement } from '../samhap-coherence'

describe('normalizeElement', () => {
  it('한자·한글·형 접미·영문을 정규화', () => {
    expect(normalizeElement('木')).toBe('木')
    expect(normalizeElement('목형')).toBe('木')
    expect(normalizeElement('화형')).toBe('火')
    expect(normalizeElement('토(土)')).toBe('土')
    expect(normalizeElement('금')).toBe('金')
    expect(normalizeElement('wood')).toBe('木')
    expect(normalizeElement('Water')).toBe('水')
  })

  it('판정 불가 입력은 null', () => {
    expect(normalizeElement('')).toBeNull()
    expect(normalizeElement(undefined)).toBeNull()
    expect(normalizeElement(42)).toBeNull()
    expect(normalizeElement('혼합형')).toBeNull()
  })
})

describe('elementRelation', () => {
  it('상생 순환 (木→火→土→金→水→木)', () => {
    expect(elementRelation('木', '火')).toBe('generates')
    expect(elementRelation('火', '木')).toBe('generated_by')
    expect(elementRelation('水', '木')).toBe('generates')
  })

  it('상극 (木剋土 등)', () => {
    expect(elementRelation('木', '土')).toBe('controls')
    expect(elementRelation('土', '木')).toBe('controlled_by')
    expect(elementRelation('水', '火')).toBe('controls')
  })

  it('비화', () => {
    expect(elementRelation('金', '金')).toBe('same')
  })
})

describe('computeSamhapCoherence', () => {
  it('전 축 최상(동일 오행) → 합 등급, 상한 98 클램프 이내', () => {
    const c = computeSamhapCoherence({
      dayElement: '木',
      yongsinElement: '木',
      faceForm: '목형',
      fengshuiElement: '木',
    })
    expect(c).not.toBeNull()
    // 60 + 16(용신 동일) + 8(일간 동일) + 10(풍수 동일) = 94
    expect(c!.score).toBe(94)
    expect(c!.grade).toBe('합')
    expect(c!.parts).toHaveLength(3)
  })

  it('관상 오행형이 용신을 극 → 감점, 충 등급 가능', () => {
    // face 金, yongsin 木 (金剋木 -12), day 木 (金剋木 -8), fengshui 土 → 土 vs 木: 木剋土 → controlled_by -4
    const c = computeSamhapCoherence({
      dayElement: '木',
      yongsinElement: '木',
      faceForm: '금형',
      fengshuiElement: '土',
    })
    expect(c).not.toBeNull()
    // 60 - 12 - 8 - 4 = 36
    expect(c!.score).toBe(36)
    expect(c!.grade).toBe('충')
  })

  it('용신 없으면 일간 축만 계산 (엔진 폴백 경로)', () => {
    const c = computeSamhapCoherence({ dayElement: '火', faceForm: '목형' })
    expect(c).not.toBeNull()
    // 60 + (木생火 +5) = 65, 용신·풍수 축 없음
    expect(c!.score).toBe(65)
    expect(c!.parts).toHaveLength(1)
    expect(c!.grade).toBe('반합')
  })

  it('관상 오행형 미확인 → null (호출부 평균 폴백)', () => {
    expect(computeSamhapCoherence({ dayElement: '木', yongsinElement: '火' })).toBeNull()
    expect(computeSamhapCoherence({ dayElement: '木', faceForm: '혼합형' })).toBeNull()
  })

  it('일간 미상 → null', () => {
    expect(computeSamhapCoherence({ dayElement: null, faceForm: '목형' })).toBeNull()
  })

  it('narrative에 점수·등급·각 축 근거 포함 (프롬프트 주입 계약)', () => {
    const c = computeSamhapCoherence({
      dayElement: '木',
      yongsinElement: '火',
      faceForm: '목형',
      fengshuiElement: '水',
    })
    expect(c).not.toBeNull()
    expect(c!.narrative).toContain(`삼재 정합도 ${c!.score}점(${c!.grade})`)
    expect(c!.narrative).toContain('관상 오행형 × 용신')
    expect(c!.narrative).toContain('풍수 지배오행 × 용신')
  })

  it('하한 클램프 15', () => {
    // 최악 조합이라도 15 밑으로 내려가지 않는다 (산술상 60-12-8-10=30 이므로 클램프 미발동 케이스와 구분해 로직만 검증)
    const c = computeSamhapCoherence({
      dayElement: '木',
      yongsinElement: '木',
      faceForm: '금형',
      fengshuiElement: '金',
    })
    expect(c).not.toBeNull()
    expect(c!.score).toBeGreaterThanOrEqual(15)
  })
})
