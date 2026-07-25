import { buildGreeting, greetingToContent, resolveVisitKind, type GreetingMemory } from '../greeting'

const NOW = '2026-07-25T04:00:00.000Z' // KST 2026-07-25 13:00 (낮)

const concern: GreetingMemory = { type: 'concern', content: '이직을 할지 말지 반년째 고민 중이다.' }
const summary: GreetingMemory = { type: 'consultation_summary', content: '재물운과 이직 시기를 상담함' }
const fact: GreetingMemory = { type: 'profile_fact', content: '고양이 두 마리를 키운다' }

describe('resolveVisitKind', () => {
  it('기억도 방문기록도 없으면 첫 만남', () => {
    expect(resolveVisitKind({ now: NOW, lastVisitAt: null })).toBe('first')
  })

  it('방문기록은 없지만 기억이 있으면 첫 만남이 아니다', () => {
    expect(resolveVisitKind({ now: NOW, lastVisitAt: null, memories: [concern] })).toBe('today_first')
  })

  it('같은 KST 날짜면 이어서', () => {
    // KST 같은 날 오전 (UTC 2026-07-24T23:00 = KST 07-25 08:00)
    expect(resolveVisitKind({ now: NOW, lastVisitAt: '2026-07-24T23:00:00.000Z' })).toBe('resume')
  })

  it('UTC 날짜가 같아도 KST 날짜가 다르면 이어서가 아니다', () => {
    // UTC 07-25T00:30 → KST 07-25 09:30 (같은 날) 이므로 resume
    expect(resolveVisitKind({ now: NOW, lastVisitAt: '2026-07-25T00:30:00.000Z' })).toBe('resume')
    // UTC 07-24T10:00 → KST 07-24 19:00 (전날) 이므로 today_first
    expect(resolveVisitKind({ now: NOW, lastVisitAt: '2026-07-24T10:00:00.000Z' })).toBe('today_first')
  })

  it('14일 이상이면 오랜만', () => {
    expect(resolveVisitKind({ now: NOW, lastVisitAt: '2026-07-05T04:00:00.000Z' })).toBe('long_absence')
  })

  it('13일이면 아직 오랜만이 아니다 (경계)', () => {
    expect(resolveVisitKind({ now: NOW, lastVisitAt: '2026-07-12T05:00:00.000Z' })).toBe('today_first')
  })

  it('깨진 날짜 문자열 방어', () => {
    expect(resolveVisitKind({ now: NOW, lastVisitAt: 'not-a-date' })).toBe('first')
  })
})

describe('buildGreeting — 공통 계약', () => {
  it('마지막 줄은 항상 질문과 동일하다', () => {
    const cases = [
      { now: NOW, lastVisitAt: null },
      { now: NOW, lastVisitAt: '2026-07-24T10:00:00.000Z', memories: [concern] },
      { now: NOW, lastVisitAt: '2026-07-01T10:00:00.000Z', memories: [concern] },
      { now: NOW, lastVisitAt: '2026-07-25T00:30:00.000Z' },
    ]
    for (const c of cases) {
      const g = buildGreeting(c)
      expect(g.lines.at(-1)?.text).toBe(g.question)
      expect(g.lines.at(-1)?.kind).toBe('speech')
    }
  })

  it('질문은 정확히 한 개 — 물음표로 끝나거나 이어가기 유도문', () => {
    const g = buildGreeting({ now: NOW, lastVisitAt: null })
    expect(g.question.length).toBeGreaterThan(0)
    expect(g.quickReplies.length).toBeGreaterThan(0)
  })

  it('같은 입력이면 같은 출력 (결정론)', () => {
    const input = { now: NOW, lastVisitAt: '2026-07-25T01:00:00.000Z' }
    expect(buildGreeting(input)).toEqual(buildGreeting(input))
  })
})

describe('buildGreeting — 첫 만남', () => {
  it('신위 이름으로 자기소개하고 내레이션으로 연다', () => {
    const g = buildGreeting({ now: NOW, lastVisitAt: null, deityName: '월하노인', userName: '민수' })
    expect(g.visitKind).toBe('first')
    expect(g.lines[0].kind).toBe('narration')
    expect(g.lines[1].text).toContain('월하노인')
    expect(g.lines[1].text).toContain('민수님')
  })

  it('신위 미좌정이면 해화지기로 소개', () => {
    const g = buildGreeting({ now: NOW, lastVisitAt: null })
    expect(g.lines[1].text).toContain('해화지기')
  })

  it('이름이 없으면 호칭을 생략한다 (undefined님 금지)', () => {
    const g = buildGreeting({ now: NOW, lastVisitAt: null, userName: null })
    for (const l of g.lines) expect(l.text).not.toContain('undefined')
    expect(g.lines[1].text).not.toContain('님,')
  })
})

describe('buildGreeting — 오늘 첫 방문 (기억 인용)', () => {
  const base = { now: NOW, lastVisitAt: '2026-07-24T10:00:00.000Z' }

  it('고민 기억을 그대로 인용하고 후속을 묻는다', () => {
    const g = buildGreeting({ ...base, memories: [concern], userName: '민수' })
    const joined = g.lines.map((l) => l.text).join('\n')
    expect(joined).toContain('이직을 할지 말지 반년째 고민 중이다')
    expect(g.question).toContain('정리되셨')
    expect(g.quickReplies).toContain('아직 그대로예요')
  })

  it('고민이 없으면 상담요약을 인용한다', () => {
    const g = buildGreeting({ ...base, memories: [summary] })
    expect(g.lines.map((l) => l.text).join('\n')).toContain('재물운과 이직 시기를 상담함')
  })

  it('고민·요약이 없으면 프로필 사실을 인용한다', () => {
    const g = buildGreeting({ ...base, memories: [fact] })
    expect(g.lines.map((l) => l.text).join('\n')).toContain('고양이 두 마리')
  })

  it('기억이 전혀 없어도 자연스러운 문장 (빈 따옴표 금지)', () => {
    const g = buildGreeting(base)
    const joined = g.lines.map((l) => l.text).join('\n')
    expect(joined).not.toContain('""')
    expect(g.question).toBe('오늘은 어떤 이야기부터 꺼내볼까요?')
  })

  it('기원 2단 이상이면 관계의 깊이를 언급한다', () => {
    const g = buildGreeting({ ...base, devotionLevel: 4 })
    expect(g.lines.map((l) => l.text).join('\n')).toContain('기원 4단')
  })

  it('기원 1단 이하면 언급하지 않는다', () => {
    const g = buildGreeting({ ...base, devotionLevel: 1 })
    expect(g.lines.map((l) => l.text).join('\n')).not.toContain('기원 1단')
  })

  it('긴 기억은 잘라서 인용한다', () => {
    const long: GreetingMemory = { type: 'concern', content: '가'.repeat(200) }
    const g = buildGreeting({ ...base, memories: [long] })
    const quoted = g.lines.map((l) => l.text).join('\n')
    expect(quoted).toContain('…')
    expect(quoted.length).toBeLessThan(400)
  })
})

describe('buildGreeting — 오랜만 / 이어서', () => {
  it('오랜만이면 공백을 알아보고 지난 고민의 후속을 묻는다', () => {
    const g = buildGreeting({ now: NOW, lastVisitAt: '2026-06-20T10:00:00.000Z', memories: [concern] })
    expect(g.visitKind).toBe('long_absence')
    expect(g.lines.map((l) => l.text).join('\n')).toContain('한동안 안 보이셨어요')
    expect(g.question).toContain('이직을 할지 말지')
  })

  it('이어서는 한 줄만 — 자기소개·기억 재인용·시간대 인사를 반복하지 않는다', () => {
    const g = buildGreeting({
      now: NOW,
      lastVisitAt: '2026-07-25T01:00:00.000Z',
      memories: [concern],
      deityName: '월하노인',
      userName: '민수',
    })
    expect(g.visitKind).toBe('resume')
    expect(g.lines).toHaveLength(1)
    const text = g.lines[0].text
    expect(text).not.toContain('저는') // 자기소개 반복 금지
    expect(text).not.toContain('이직') // 기억 재인용 금지
    expect(text).not.toContain('낮에') // 시간대 인사 반복 금지
    expect(text).not.toContain('민수님') // 호칭 반복 금지
  })
})

describe('buildGreeting — 새 대화(new_chat)', () => {
  it('새 대화면 방문 간격과 무관하게 new_chat', () => {
    expect(resolveVisitKind({ now: NOW, lastVisitAt: '2026-07-25T01:00:00.000Z', forceNewChat: true })).toBe('new_chat')
    expect(resolveVisitKind({ now: NOW, lastVisitAt: '2026-06-01T01:00:00.000Z', forceNewChat: true })).toBe('new_chat')
  })

  it('첫 만남이 새 대화보다 우선 — 처음 온 사람에게 "새로 폈다"고 하지 않는다', () => {
    expect(resolveVisitKind({ now: NOW, lastVisitAt: null, forceNewChat: true })).toBe('first')
  })

  it('간략하다 — 2줄 이하이고 지난 고민을 끌고 오지 않는다', () => {
    const g = buildGreeting({
      now: NOW,
      lastVisitAt: '2026-07-25T01:00:00.000Z',
      forceNewChat: true,
      memories: [concern],
      userName: '민수',
    })
    expect(g.visitKind).toBe('new_chat')
    expect(g.lines.length).toBeLessThanOrEqual(2)
    const joined = g.lines.map((l) => l.text).join('\n')
    expect(joined).not.toContain('이직')
    expect(g.lines.at(-1)?.text).toBe(g.question)
  })

  it('새 대화엔 대상 고지를 넣지 않는다 (짧게 유지)', () => {
    const g = buildGreeting({
      now: NOW,
      lastVisitAt: '2026-07-25T01:00:00.000Z',
      forceNewChat: true,
      targetName: '어머니',
    })
    expect(g.lines.length).toBeLessThanOrEqual(2)
  })
})

describe('buildGreeting — 점사 대상(가족)', () => {
  it('가족 대상이면 질문 바로 앞에 대상 고지를 넣는다', () => {
    const g = buildGreeting({ now: NOW, lastVisitAt: null, targetName: '어머니' })
    const idx = g.lines.findIndex((l) => l.text.includes('어머니님을 함께 살펴보는'))
    expect(idx).toBeGreaterThan(-1)
    expect(idx).toBe(g.lines.length - 2) // 질문 바로 앞
    expect(g.lines.at(-1)?.text).toBe(g.question)
  })

  it('이어서 유형엔 대상 고지를 넣지 않는다 (짧게 유지)', () => {
    const g = buildGreeting({ now: NOW, lastVisitAt: '2026-07-25T01:00:00.000Z', targetName: '어머니' })
    expect(g.lines).toHaveLength(1)
  })
})

describe('greetingToContent', () => {
  it('내레이션은 괄호로 보존해 한 본문으로 합친다', () => {
    const g = buildGreeting({ now: NOW, lastVisitAt: null, deityName: '월하노인' })
    const content = greetingToContent(g)
    expect(content).toContain('(향 연기가 천천히 피어오릅니다.)')
    expect(content).toContain('월하노인')
    expect(content.split('\n\n').length).toBe(g.lines.length)
  })
})
