import { parseSamhap, isSamhapEmpty } from '../samhap-parse'

describe('parseSamhap', () => {
  const full = `
서론 텍스트...
[[SUMMARY: 세 기운이 재물의 방향으로 모입니다]]
[[HARMONY_1: 재물의 결, 사주 재성과 관상 코, 손금 재물선이 한 방향을 가리킵니다]]
[[HARMONY_2: 사람 복, 온화한 눈매와 감정선이 인복을 뒷받침합니다]]
[[HARMONY_3: 추진력, 일간의 양(陽) 기운이 이마·운명선과 호응합니다]]
[[TENSION: 조급함, 강한 추진력이 때로 서두름으로 비칠 수 있으니 완급 조절이 필요합니다]]
[[TIMING_1: 2026~2028, 재물 기반을 다지기 좋은 시기입니다]]
[[TIMING_2: 2029, 관계에서 귀인을 만날 흐름입니다]]
[[REMEDY_1: 아침에 물 한 잔으로 하루를 여세요]]
[[REMEDY_2: 황색 소품을 책상 왼쪽에 두세요]]
꼬리말...
`

  it('전체 태그 파싱', () => {
    const p = parseSamhap(full)
    expect(p.summary).toBe('세 기운이 재물의 방향으로 모입니다')
    expect(p.harmonies).toHaveLength(3)
    expect(p.harmonies[0]).toEqual({
      title: '재물의 결',
      detail: '사주 재성과 관상 코, 손금 재물선이 한 방향을 가리킵니다',
    })
    expect(p.tension).toEqual({
      title: '조급함',
      interpretation: '강한 추진력이 때로 서두름으로 비칠 수 있으니 완급 조절이 필요합니다',
    })
    expect(p.timings).toHaveLength(2)
    expect(p.timings[0]).toEqual({ period: '2026~2028', advice: '재물 기반을 다지기 좋은 시기입니다' })
    expect(p.remedies).toEqual(['아침에 물 한 잔으로 하루를 여세요', '황색 소품을 책상 왼쪽에 두세요'])
    expect(isSamhapEmpty(p)).toBe(false)
  })

  it('detail 안의 콤마는 보존(첫 콤마만 경계)', () => {
    const p = parseSamhap('[[HARMONY_1: 재물, 코, 재물선, 재성이 모두 재물을 향합니다]]')
    expect(p.harmonies[0]).toEqual({ title: '재물', detail: '코, 재물선, 재성이 모두 재물을 향합니다' })
  })

  it('일부 태그만 있어도 파싱', () => {
    const p = parseSamhap('[[HARMONY_1: 제목, 설명]] 나머지 없음')
    expect(p.harmonies).toHaveLength(1)
    expect(p.timings).toHaveLength(0)
    expect(p.remedies).toHaveLength(0)
    expect(isSamhapEmpty(p)).toBe(false)
  })

  it('태그가 전혀 없으면 empty → 원문 폴백 신호', () => {
    const p = parseSamhap('구조화 태그 없는 자유 서술입니다.')
    expect(isSamhapEmpty(p)).toBe(true)
    expect(p.harmonies).toHaveLength(0)
  })

  it('빈 입력 방어', () => {
    const p = parseSamhap('')
    expect(isSamhapEmpty(p)).toBe(true)
  })
})

describe('parseSamhap v2 — 삼재교차법 태그', () => {
  const v2 = `
[[SUMMARY: 명과 상이 한 방향으로 흐릅니다]]
[[NOW: 임수(壬水) 대운 중반 | 대운은 확장기, 중정(눈·코)의 힘과 운명선 중부가 같은 상승을 가리킵니다. 지금은 벌리는 때입니다.]]
[[CROSS_WEALTH: 합 | 사주의 편재, 코의 재백궁, 손금 재물선이 모두 같은 말을 합니다. 흐름이 들어오는 구조입니다.]]
[[CROSS_CAREER: 반합 | 관성은 강하나 이마 관록궁이 눌려 있습니다. 명이 주도하고 상이 따라오는 국면입니다.]]
[[CROSS_LOVE: 충 | 배우자성은 안정인데 감정선이 흔들립니다. 명대로 살지 못하는 신호이니, 회복 처방이 먼저입니다.]]
[[CROSS_HEALTH: 합 | 일간이 튼튼하고 명궁 기색이 맑으며 생명선이 깊습니다.]]
[[HARMONY_1: 재물의 결, 세 근거가 겹칩니다]]
[[REMEDY_1: 아침 산책]]
`

  it('NOW 파이프 2필드 파싱', () => {
    const p = parseSamhap(v2)
    expect(p.now).toEqual({
      phase: '임수(壬水) 대운 중반',
      detail: '대운은 확장기, 중정(눈·코)의 힘과 운명선 중부가 같은 상승을 가리킵니다. 지금은 벌리는 때입니다.',
    })
  })

  it('CROSS 4주제 파싱 — 판정과 해석 분리, 해석 안 콤마·마침표 보존', () => {
    const p = parseSamhap(v2)
    expect(p.crosses).toHaveLength(4)
    expect(p.crosses[0]).toEqual({
      key: 'wealth',
      label: '재물',
      verdict: '합',
      detail: '사주의 편재, 코의 재백궁, 손금 재물선이 모두 같은 말을 합니다. 흐름이 들어오는 구조입니다.',
    })
    expect(p.crosses[1].verdict).toBe('반합')
    expect(p.crosses[2].verdict).toBe('충')
    expect(p.crosses[3].key).toBe('health')
  })

  it('v2 태그만 있어도 empty 아님', () => {
    const p = parseSamhap('[[CROSS_WEALTH: 합 | 흐름이 좋습니다]]')
    expect(isSamhapEmpty(p)).toBe(false)
    expect(p.crosses).toHaveLength(1)
  })

  it('구(v1) 응답 — CROSS/NOW 없어도 기존 필드 그대로 (하위호환)', () => {
    const p = parseSamhap('[[SUMMARY: 요약]] [[HARMONY_1: 제목, 설명]]')
    expect(p.crosses).toHaveLength(0)
    expect(p.now).toBeUndefined()
    expect(p.summary).toBe('요약')
    expect(p.harmonies).toHaveLength(1)
  })

  it('CROSS 일부만 있어도 있는 것만 수집', () => {
    const p = parseSamhap('[[CROSS_LOVE: 반합 | 인연은 명이 이끕니다]]')
    expect(p.crosses).toHaveLength(1)
    expect(p.crosses[0].key).toBe('love')
  })
})
