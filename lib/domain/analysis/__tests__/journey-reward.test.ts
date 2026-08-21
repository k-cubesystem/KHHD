/**
 * 종합운수 여정 완주 보상 — 후보 목록의 불변식.
 *
 * 이 테스트가 지키는 것:
 * ① 후보는 신위 4좌 + 테마 4종, (kind, code) 중복 없음.
 * ② 테마 후보는 기원(祈願) 보상 트랙과 겹치지 않는다 — 겹치면 한쪽 보상이 무의미해진다.
 * ③ findJourneyRewardChoice 는 목록 밖 입력(클라 조작)을 null 로 거른다.
 */
import {
  JOURNEY_REWARD_CHOICES,
  JOURNEY_COMPLETE_TITLE,
  findJourneyRewardChoice,
} from '@/lib/domain/analysis/journey-reward'
import { DEVOTION_REWARDS } from '@/lib/domain/shrine/devotion'

describe('여정 완주 보상 후보', () => {
  it('신위 4좌 + 테마 4종, (kind, code) 중복 없음', () => {
    const deities = JOURNEY_REWARD_CHOICES.filter((c) => c.kind === 'deity')
    const themes = JOURNEY_REWARD_CHOICES.filter((c) => c.kind === 'theme')
    expect(deities).toHaveLength(4)
    expect(themes).toHaveLength(4)

    const keys = JOURNEY_REWARD_CHOICES.map((c) => `${c.kind}:${c.code}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('모든 후보에 표시 폴백(name·element·tagline)이 있다', () => {
    for (const c of JOURNEY_REWARD_CHOICES) {
      expect(c.name.length).toBeGreaterThan(0)
      expect(c.element.length).toBeGreaterThan(0)
      expect(c.tagline.length).toBeGreaterThan(0)
    }
  })

  it('테마 후보는 기원 보상 트랙과 겹치지 않는다', () => {
    const devotionThemeCodes = new Set(DEVOTION_REWARDS.filter((r) => r.kind === 'theme').map((r) => r.code))
    for (const c of JOURNEY_REWARD_CHOICES.filter((c) => c.kind === 'theme')) {
      expect(devotionThemeCodes.has(c.code)).toBe(false)
    }
  })

  it('findJourneyRewardChoice — 목록 안은 찾고, 목록 밖·kind 불일치는 null', () => {
    const first = JOURNEY_REWARD_CHOICES[0]!
    expect(findJourneyRewardChoice(first.kind, first.code)).toEqual(first)

    expect(findJourneyRewardChoice('deity', 'no-such-code')).toBeNull()
    expect(findJourneyRewardChoice('theme', 'bari')).toBeNull() // 신위 코드를 테마로 요청
    expect(findJourneyRewardChoice('wallet', 'bari')).toBeNull() // 없는 kind
  })

  it('완주 칭호가 있다', () => {
    expect(JOURNEY_COMPLETE_TITLE.length).toBeGreaterThan(0)
  })
})
