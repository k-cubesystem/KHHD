/**
 * 사주 풀이 지시문의 «최근 1~2년» — 날짜가 박히지 않고 **서울 날짜**에서 세어지는가(2026-09-29 수복).
 *
 * 전에는 `2024~2025년 · 갑진년/을사년` 이 문면에 고정돼 해가 바뀌어도 그대로 나갔다.
 * 기대값의 간지는 만세력 표와 대조해 손으로 적었다 — 엔진이 틀리면 여기서 드러난다.
 */
import { buildCheonjiinPrompt } from '../cheonjiin-prompt'

const VARS: Record<string, string> = {
  name: '홍길동',
  gender: '남성',
  birthDate: '1990-05-05',
  birthTime: '10:30',
  age: '36',
  homeAddress: '정보 없음',
  workAddress: '정보 없음',
  faceImageUrl: '관상 이미지 없음',
  handImageUrl: '손금 이미지 없음',
  raritySeed: '庚午辛巳庚辰辛巳',
}

const FLAGS = { hasFaceImage: false, hasHandImage: false, hasFengshui: false, hasWorkAddress: false }

function promptAt(iso: string): string {
  return buildCheonjiinPrompt(VARS, new Date(iso), FLAGS, '엔진 명식 프롬프트')
}

describe('buildCheonjiinPrompt — 최근 1~2년 세운', () => {
  it('2026-09-29(KST)이면 앞선 두 해 2024~2025년과 갑진·을사를 짚는다', () => {
    const prompt = promptAt('2026-09-29T10:00:00+09:00')

    expect(prompt).toContain('**최근 1~2년 (2024~2025년)** — 가장 중요! 세운(갑진년/을사년)이 원국에')
    expect(prompt).toContain('"period": "2024~2025년"')
    expect(prompt).toContain('"basis": "2024~2025년 세운(갑진년/을사년)이 원국과 어떻게 작용했는지"')
    expect(prompt).toContain('- 세운(歲運): 2024년 갑진(甲辰) · 2025년 을사(乙巳) · 2026년 병오(丙午) ← 올해')
  })

  it('서울이 이미 새해면(UTC 12-31 15:30) 한 해 넘어간다 — UTC 날짜로 세지 않는다', () => {
    const prompt = promptAt('2026-12-31T15:30:00Z')

    expect(prompt).toContain('**최근 1~2년 (2025~2026년)** — 가장 중요! 세운(을사년/병오년)이 원국에')
    expect(prompt).toContain('"period": "2025~2026년"')
    expect(prompt).toContain('- 세운(歲運): 2025년 을사(乙巳) · 2026년 병오(丙午) · 2027년 정미(丁未) ← 올해')
    expect(prompt).not.toContain('2024~2025년')
  })

  it('서울이 아직 12-31 이면(UTC 12-31 14:30) 그해 기준을 지킨다', () => {
    const prompt = promptAt('2026-12-31T14:30:00Z')

    expect(prompt).toContain('**최근 1~2년 (2024~2025년)**')
    expect(prompt).not.toContain('2025~2026년')
  })
})
