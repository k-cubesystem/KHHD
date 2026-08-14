/**
 * 개운 처방의 계약.
 *
 * 🔴 이 파일이 지키는 단 하나: **같은 사주 = 같은 처방.**
 * 어제 본 처방과 오늘 본 처방이 다르면, 사용자는 둘 중 무엇을 믿을지 모르게 된다. 그 순간
 * 처방은 조언이 아니라 장식이 된다 — AI 가 매번 지어내던 옛 구조가 정확히 그랬다.
 */
import { buildSajuContext, type PersonInfo } from '@/lib/saju-engine/context-builder'
import { buildRemedySet, isElement, remedyPromptBlock, remedyTeaser, type RemedySet } from '@/lib/domain/remedy/remedy'

/** 결이 다르게 나오도록 고른 표본 — 다른 판정 테스트와 같은 여섯이다. */
const PEOPLE: ReadonlyArray<PersonInfo> = [
  { name: '가', birthDate: '1988-03-14', birthTime: '09:30', gender: 'male' },
  { name: '나', birthDate: '1993-11-02', birthTime: '23:10', gender: 'female' },
  { name: '다', birthDate: '1979-06-25', birthTime: '05:00', gender: 'male' },
  { name: '라', birthDate: '2000-01-08', birthTime: '14:40', gender: 'female' },
  { name: '마', birthDate: '1985-09-30', birthTime: '18:20', gender: 'female' },
  { name: '바', birthDate: '1996-04-17', birthTime: '02:15', gender: 'male' },
]

function setsOf(): RemedySet[] {
  return PEOPLE.map((person) => buildRemedySet(buildSajuContext(person)))
}

describe('🔴 결정론', () => {
  it('같은 사주를 두 번 풀면 한 글자도 다르지 않다', () => {
    for (const person of PEOPLE) {
      const first = buildRemedySet(buildSajuContext(person))
      const second = buildRemedySet(buildSajuContext(person))

      expect(first).toEqual(second)
    }
  })

  it('사주가 다르면 처방이 한 벌로 몰려 있지 않다 (표가 장식이 아니다)', () => {
    const colors = new Set(setsOf().map((set) => set.items[0].value))

    expect(colors.size).toBeGreaterThan(1)
  })
})

describe('처방의 모양', () => {
  it('용신·희신·기신이 오행 다섯 중 하나다', () => {
    for (const set of setsOf()) {
      for (const element of [set.yongsin, set.huisin, set.gisin]) {
        expect({ element, ok: isElement(element) }).toEqual({ element, ok: true })
      }
    }
  })

  it('채우는 처방이 일곱 가지 이상이다 (유료가 «상세»하다는 말의 실체)', () => {
    for (const set of setsOf()) expect(set.items.length).toBeGreaterThanOrEqual(7)
  })

  it('덜어낼 처방도 함께 나온다 (채우기만 하면 처방이 아니라 광고가 된다)', () => {
    for (const set of setsOf()) expect(set.avoid.length).toBeGreaterThan(0)
  })

  it('모든 항목이 근거와 행동을 함께 든다', () => {
    for (const set of setsOf()) {
      for (const item of [...set.items, ...set.avoid]) {
        expect(item.label.trim().length).toBeGreaterThan(0)
        expect(item.value.trim().length).toBeGreaterThan(0)
        expect(item.basis.trim().length).toBeGreaterThan(0)
        expect(item.action.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('행동은 오늘·이번 주 안에 할 수 있는 크기다 (돈 드는 처방을 넣지 않는다)', () => {
    for (const set of setsOf()) {
      for (const item of set.items) {
        expect(item.action).not.toMatch(/구입|구매|사세요|결제|비용/)
      }
    }
  })

  it('갈래가 겹치지 않고 고르게 퍼진다', () => {
    for (const set of setsOf()) {
      const kinds = new Set(set.items.map((item) => item.kind))

      expect(kinds.size).toBeGreaterThanOrEqual(6)
    }
  })
})

describe('🔴 문구 규율 — 효과를 단정하지 않는다 (표시광고법 §9-1)', () => {
  const BANNED = [
    '보장',
    '반드시',
    '확실히',
    '무조건',
    '완치',
    '치료',
    '낫습니다',
    '부자',
    '대박',
    '급등',
    '재물이 들어옵니다',
    '평생',
    '무제한',
  ]

  it('처방 문안 전량에 효과 단정·의료 어휘가 없다', () => {
    for (const set of setsOf()) {
      for (const item of [...set.items, ...set.avoid]) {
        for (const word of BANNED) {
          expect(`${item.label}/${item.value}/${item.basis}/${item.action}`).not.toContain(word)
        }
      }
    }
  })

  it('덜어낼 처방은 «금지»가 아니라 정도의 말로 쓴다', () => {
    for (const set of setsOf()) {
      for (const item of set.avoid) {
        expect(item.value).not.toMatch(/절대|금지|하지 마/)
      }
    }
  })
})

describe('무료 맛보기 — 후킹은 사실 위에서만 성립한다', () => {
  it('맛보기는 오늘 당장 해볼 수 있는 «색» 하나다', () => {
    for (const set of setsOf()) {
      const { preview } = remedyTeaser(set)

      expect(preview.kind).toBe('color')
      expect(preview.action.trim().length).toBeGreaterThan(0)
    }
  })

  it('🔴 남은 개수는 배열 길이에서 나온다 (부풀리면 그 순간 거짓 표시가 된다)', () => {
    for (const set of setsOf()) {
      const { hiddenCount } = remedyTeaser(set)

      expect(hiddenCount).toBe(set.items.length - 1 + set.avoid.length)
      expect(hiddenCount).toBeGreaterThan(0)
    }
  })
})

describe('프롬프트 블록 — AI 는 설명만 한다', () => {
  it('처방을 새로 만들지 말라고 못 박는다', () => {
    const block = remedyPromptBlock(setsOf()[0])

    expect(block).toContain('새로 만들지 말고')
  })

  it('항목·근거·행동이 모두 실린다 (AI 가 근거를 지어낼 필요가 없어진다)', () => {
    const set = setsOf()[0]
    const block = remedyPromptBlock(set)

    for (const item of set.items) {
      expect(block).toContain(item.value)
      expect(block).toContain(item.basis)
    }
  })
})
