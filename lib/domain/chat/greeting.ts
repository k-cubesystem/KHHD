/**
 * 선문안(先問安) — 채팅 입장 시 신위가 먼저 건네는 오프닝.
 *
 * ZETA 의 "캐릭터가 먼저 말을 걺 + 과거 대화를 기억하고 인용" 원리를 가져오되,
 * AI 호출 없이 결정론으로 조립한다. 사용자가 아무 말도 하지 않고 나가는 경로에서
 * 원가가 발생하면 안 되고, 로딩 없이 즉시 떠야 하기 때문이다.
 *
 * 개인적으로 느껴지는 근거는 창작이 아니라 실제 데이터다:
 * user_ai_memory(고민·프로필·상담요약) / 마지막 방문 시각 / 기원 단 / 좌정 신위.
 *
 * 순수 함수 — now 를 주입받아 시간 의존성을 제거했다(단위테스트 대상).
 * PLAN-shaman-chat-zeta-v1.md §3-A
 */

import type { MemoryType } from '@/lib/ai/memory'

/**
 * 방문 유형 — 오프닝의 톤을 가른다. new_chat 은 사용자가 의도적으로 대화를 새로 편 경우.
 * oracle 은 신탁(선톡)을 받고 「이어서 여쭙기」로 들어온 경우 — 신위가 자기 말을 되받는다.
 */
export type VisitKind = 'first' | 'today_first' | 'long_absence' | 'resume' | 'new_chat' | 'oracle'

/** 오프닝 한 줄. narration 은 말풍선이 아니라 중앙 이탤릭으로 렌더된다(ZETA 내레이션 UI). */
export interface GreetingLine {
  kind: 'narration' | 'speech'
  text: string
}

export interface GreetingMemory {
  type: MemoryType
  content: string
}

export interface GreetingInput {
  /** 좌정 신위 이름. 없으면 해화지기. */
  deityName?: string | null
  /** 내담자 호칭(이름). 없으면 호칭 생략. */
  userName?: string | null
  /** 점사 대상이 가족이면 그 이름 — 본인이면 null. */
  targetName?: string | null
  /** 마지막 대화 시각(ISO). 없으면 첫 만남 후보. */
  lastVisitAt?: string | null
  /** 현재 시각(ISO) — 주입 필수(결정론). */
  now: string
  /** 중요도순 기억. 상위 항목을 인용한다. */
  memories?: GreetingMemory[]
  /** 기원 단(祈願). 관계의 깊이 표현에 쓴다. */
  devotionLevel?: number | null
  /** 사용자가 '새 대화'를 눌러 자리를 새로 편 경우 — 방문 간격과 무관하게 짧게 연다. */
  forceNewChat?: boolean
  /**
   * 「오늘의 지도」 한 줄(lib/domain/fortune/day-map.ts) — 그날 일진에서 결정론으로 뽑은 문장.
   * 인사와 질문 사이에 놓여 **매일 다른 첫 마디**를 만든다. 같은 날 다시 와도 같은 문장(결정론).
   */
  todayMapLine?: string
  /**
   * 신탁에서 이어온 경우 — 그 신탁 본문. 신위가 «자기가 한 말»을 되받으며 문답을 연다.
   * 열람률 100%인 신탁이 그냥 닫히던 것을 대화 입구로 잇는 자리다(P1-C).
   */
  oracleMessage?: string | null
  /** 신탁이 내려진 시각(ISO) — 「어제/오늘」 같은 시간 표현에 쓴다. */
  oracleAt?: string | null
}

export interface Greeting {
  visitKind: VisitKind
  /**
   * 순서대로 시차 출력할 줄들. 내레이션 뒤에 **말풍선은 하나**다 —
   * 신위가 두세 번 연달아 말을 걸면 «먼저 말하는 사람»이 아니라 «떠드는 화면»이 된다(CEO 지시 08-22).
   */
  lines: GreetingLine[]
  /** 마지막 열린 질문 — 말풍선의 끝을 이룬다(lines.at(-1).text 가 이 문자열로 끝난다). */
  question: string
  /** 질문에 답하기 쉽게 주는 빠른 답 칩. */
  quickReplies: string[]
}

const DAY_MS = 24 * 60 * 60 * 1000
const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const LONG_ABSENCE_DAYS = 14

/** UTC 기준 시각을 KST 날짜키(YYYY-MM-DD)로. 서버·클라이언트 어디서 돌아도 동일. */
function kstDayKey(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  return new Date(t + KST_OFFSET_MS).toISOString().slice(0, 10)
}

/** 방문 유형 판정. 기억도 없고 방문 기록도 없으면 첫 만남. */
export function resolveVisitKind(
  input: Pick<GreetingInput, 'lastVisitAt' | 'now' | 'memories' | 'forceNewChat' | 'oracleMessage'>
): VisitKind {
  const { lastVisitAt, now } = input
  // 신탁을 타고 들어온 걸음이 가장 앞선다 — 그 말을 되받지 않으면 여기 온 이유가 사라진다.
  if (input.oracleMessage?.trim()) return 'oracle'
  const hasMemory = (input.memories?.length ?? 0) > 0
  // 첫 만남은 새 대화보다 우선 — 처음 온 사람에게 "새로 폈다"고 하면 말이 안 된다.
  if (input.forceNewChat && (lastVisitAt || hasMemory)) return 'new_chat'
  if (!lastVisitAt) return hasMemory ? 'today_first' : 'first'

  const last = new Date(lastVisitAt).getTime()
  const cur = new Date(now).getTime()
  if (Number.isNaN(last) || Number.isNaN(cur)) return hasMemory ? 'today_first' : 'first'

  if (kstDayKey(lastVisitAt) === kstDayKey(now)) return 'resume'
  if (cur - last >= LONG_ABSENCE_DAYS * DAY_MS) return 'long_absence'
  return 'today_first'
}

/** KST 시간대별 인사말. */
function timeOfDayWord(now: string): string {
  const t = new Date(now).getTime()
  if (Number.isNaN(t)) return '오늘'
  const hour = new Date(t + KST_OFFSET_MS).getUTCHours()
  if (hour < 5) return '늦은 밤'
  if (hour < 11) return '아침'
  if (hour < 17) return '낮'
  if (hour < 21) return '저녁'
  return '밤'
}

/** 날짜키에서 뽑은 안정적 인덱스 — 같은 날엔 같은 변주, 날이 바뀌면 달라진다. */
function variantIndex(now: string, buckets: number): number {
  const key = kstDayKey(now)
  let sum = 0
  for (let i = 0; i < key.length; i++) sum = (sum * 31 + key.charCodeAt(i)) % 100003
  return buckets > 0 ? sum % buckets : 0
}

/** 기억 문장을 인사에 넣기 좋게 다듬는다 — 말끝을 잘라 명사구에 가깝게. */
function trimMemory(content: string, max = 46): string {
  const s = content.trim().replace(/\s+/g, ' ')
  if (!s) return ''
  const stripped = s.replace(/[.。!?]+$/, '')
  return stripped.length > max ? `${stripped.slice(0, max)}…` : stripped
}

function pickMemory(memories: GreetingMemory[] | undefined, type: MemoryType): string | null {
  const hit = memories?.find((m) => m.type === type && m.content.trim().length > 0)
  return hit ? trimMemory(hit.content) : null
}

const 호칭 = (userName?: string | null) => (userName?.trim() ? `${userName.trim()}님` : '')

/** 첫 만남 — 신위가 자기를 소개하고 부담 없는 질문 하나로 연다. */
function buildFirst(input: GreetingInput): { lines: GreetingLine[]; question: string; quickReplies: string[] } {
  const who = input.deityName?.trim() || '해화지기'
  const name = 호칭(input.userName)
  const question = '요즘 가장 마음을 붙들고 있는 일이 뭔가요?'
  return {
    lines: [
      { kind: 'narration', text: '향 연기가 천천히 피어오릅니다.' },
      {
        kind: 'speech',
        text: `${name ? `${name}, ` : ''}오셨군요. 저는 ${who}예요.\n여기서는 잘 보이려 애쓰지 않으셔도 돼요.`,
      },
      { kind: 'speech', text: question },
    ],
    question,
    quickReplies: ['일 이야기요', '사람 관계요', '돈 문제요', '그냥 답답해요'],
  }
}

/** 오늘 첫 방문 — 기억을 인용한 안부 + 오늘의 상태 + 질문. */
function buildTodayFirst(input: GreetingInput): { lines: GreetingLine[]; question: string; quickReplies: string[] } {
  const name = 호칭(input.userName)
  const concern = pickMemory(input.memories, 'concern')
  const summary = pickMemory(input.memories, 'consultation_summary')
  const fact = pickMemory(input.memories, 'profile_fact')
  const when = timeOfDayWord(input.now)

  const lines: GreetingLine[] = [{ kind: 'narration', text: '초에 불이 옮겨 붙습니다.' }]

  if (concern) {
    lines.push({
      kind: 'speech',
      text: `${name ? `${name}, ` : ''}${when}에 오셨네요.\n지난번엔 "${concern}" 이야기를 하셨죠.`,
    })
  } else if (summary) {
    lines.push({
      kind: 'speech',
      text: `${name ? `${name}, ` : ''}${when}에 오셨네요.\n지난 이야기는 "${summary}" 였고요.`,
    })
  } else if (fact) {
    lines.push({ kind: 'speech', text: `${name ? `${name}, ` : ''}${when}에 오셨네요.\n${fact}, 기억하고 있어요.` })
  } else {
    lines.push({
      kind: 'speech',
      text: `${name ? `${name}, ` : ''}${when}에 오셨네요.\n오늘은 어떤 마음으로 앉으셨을까 하고 기다렸어요.`,
    })
  }

  const level = input.devotionLevel ?? 0
  if (level >= 2) {
    lines.push({ kind: 'speech', text: `기원 ${level}단까지 오셨으니, 이제 서로 꽤 아는 사이네요.` })
  }

  const question = concern ? '그 뒤로 마음이 좀 정리되셨어요?' : '오늘은 어떤 이야기부터 꺼내볼까요?'
  lines.push({ kind: 'speech', text: question })

  return {
    lines,
    question,
    quickReplies: concern
      ? ['아직 그대로예요', '조금 나아졌어요', '다른 고민이 생겼어요']
      : ['요즘 운이 궁금해요', '고민이 하나 있어요', '그냥 이야기하고 싶어요'],
  }
}

/** 오랜만 — 공백을 알아보고, 지난 고민의 후속을 묻는다. */
function buildLongAbsence(input: GreetingInput): { lines: GreetingLine[]; question: string; quickReplies: string[] } {
  const name = 호칭(input.userName)
  const concern = pickMemory(input.memories, 'concern') ?? pickMemory(input.memories, 'consultation_summary')
  const question = concern ? `그때 "${concern}" 그 일은 어떻게 되었어요?` : '그동안 어떻게 지내셨어요?'
  return {
    lines: [
      { kind: 'narration', text: '문이 열리자 묵은 향내가 잠시 흔들립니다.' },
      {
        kind: 'speech',
        text: `${name ? `${name}, ` : ''}한동안 안 보이셨어요.\n자리는 그대로 두고 기다리고 있었어요.`,
      },
      { kind: 'speech', text: question },
    ],
    question,
    quickReplies: concern
      ? ['잘 풀렸어요', '아직도 그대로예요', '얘기가 길어요']
      : ['그냥저냥요', '많이 힘들었어요', '새 고민이 생겼어요'],
  }
}

/** 새 대화 — 사용자가 자리를 새로 폈다. 지난 이야기를 끌고 오지 않고 짧게 연다. */
function buildNewChat(input: GreetingInput): { lines: GreetingLine[]; question: string; quickReplies: string[] } {
  const variants = [
    '새로 자리를 폈어요. 어떤 이야기부터 꺼내볼까요?',
    '깨끗한 자리예요. 지금 마음에 걸리는 게 뭔가요?',
    '처음부터 다시 들을게요. 무엇이 궁금하세요?',
  ]
  const question = variants[variantIndex(input.now, variants.length)]
  return {
    lines: [
      { kind: 'narration', text: '자리를 고쳐 앉습니다.' },
      { kind: 'speech', text: question },
    ],
    question,
    quickReplies: ['운의 흐름이요', '고민이 있어요', '사람 문제요'],
  }
}

/** 신탁이 내려진 뒤 얼마나 지났는지 — 「오늘/어제/며칠 전」. KST 날짜키로 센다(결정론). */
function oracleWhen(oracleAt: string | null | undefined, now: string): string {
  if (!oracleAt) return ''
  const a = new Date(kstDayKey(oracleAt)).getTime()
  const b = new Date(kstDayKey(now)).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return ''
  const days = Math.round((b - a) / DAY_MS)
  if (days <= 0) return '조금 전'
  if (days === 1) return '어제'
  if (days <= 6) return '며칠 전'
  return '지난번'
}

/**
 * 신탁에서 이어온 걸음 — 신위가 «자기가 남긴 말»을 인용하고 그 뒤를 묻는다.
 * 신탁은 지금까지 위로 한 줄로 닫혀 있었다(실측 34건 전부 열람·전부 무응답). 그 끝을 질문으로 연다.
 */
function buildOracle(input: GreetingInput): { lines: GreetingLine[]; question: string; quickReplies: string[] } {
  const name = 호칭(input.userName)
  const when = oracleWhen(input.oracleAt, input.now)
  const quoted = trimMemory(input.oracleMessage ?? '', 70)
  const question = '그 뒤로 마음이 좀 어떠셨어요?'
  return {
    lines: [
      { kind: 'narration', text: '향불이 한 번 크게 흔들립니다.' },
      {
        kind: 'speech',
        text: `${name ? `${name}, ` : ''}${when ? `${when} ` : ''}제가 이런 말을 남겼지요.\n「${quoted}」`,
      },
      { kind: 'speech', text: question },
    ],
    question,
    quickReplies: ['그 말이 위로가 됐어요', '아직 그대로예요', '다른 이야기를 하고 싶어요'],
  }
}

/** 이어서 — 같은 날 재입장. 인사 반복 없이 짧게 잇는다. */
function buildResume(input: GreetingInput): { lines: GreetingLine[]; question: string; quickReplies: string[] } {
  const variants = [
    '다시 오셨네요. 아까 하던 이야기, 더 풀어볼까요?',
    '아직 마음에 남은 게 있으셨군요. 이어서 들을게요.',
    '자리 그대로예요. 하시던 말씀 계속하셔도 좋아요.',
  ]
  const question = variants[variantIndex(input.now, variants.length)]
  return {
    lines: [{ kind: 'speech', text: question }],
    question,
    quickReplies: ['이어서 할게요', '다른 걸 물어볼래요'],
  }
}

/**
 * 오프닝 조립. 점사 대상이 가족이면 화자가 그 가족을 함께 봐주는 맥락으로 한 줄 덧붙인다.
 */
export function buildGreeting(input: GreetingInput): Greeting {
  const visitKind = resolveVisitKind(input)

  const built =
    visitKind === 'oracle'
      ? buildOracle(input)
      : visitKind === 'first'
        ? buildFirst(input)
        : visitKind === 'new_chat'
          ? buildNewChat(input)
          : visitKind === 'long_absence'
            ? buildLongAbsence(input)
            : visitKind === 'resume'
              ? buildResume(input)
              : buildTodayFirst(input)

  const lines = [...built.lines]
  const target = input.targetName?.trim()
  if (target && visitKind !== 'resume' && visitKind !== 'new_chat') {
    // 질문 앞에 대상 고지를 끼운다 — 질문은 항상 마지막이어야 한다.
    lines.splice(lines.length - 1, 0, { kind: 'speech', text: `오늘은 ${target}님을 함께 살펴보는 자리네요.` })
  }

  // 「오늘의 지도」 — 인사와 질문 «사이»에. 첫 마디가 날마다 달라지는 자리다.
  // 신탁을 되받는 자리에서는 넣지 않는다 — 인용 뒤에 지도까지 붙으면 말이 길어져 질문이 묻힌다.
  const todayMap = visitKind === 'oracle' ? '' : input.todayMapLine?.trim()
  if (todayMap) lines.splice(lines.length - 1, 0, { kind: 'speech', text: todayMap })

  return { visitKind, lines: mergeSpeech(lines), question: built.question, quickReplies: built.quickReplies }
}

/**
 * 연속된 말풍선을 하나로 합친다 — 화면에 뜨는 신위의 말풍선은 «한 개»여야 한다.
 * (내레이션은 말풍선이 아니라 중앙 이탤릭이므로 합치지 않고 자리도 지킨다.)
 */
function mergeSpeech(lines: GreetingLine[]): GreetingLine[] {
  const merged: GreetingLine[] = []
  for (const line of lines) {
    const prev = merged[merged.length - 1]
    if (line.kind === 'speech' && prev?.kind === 'speech') {
      merged[merged.length - 1] = { kind: 'speech', text: `${prev.text}\n\n${line.text}` }
      continue
    }
    merged.push(line)
  }
  return merged
}

/** 오프닝 줄들을 대화 저장용 단일 본문으로 합친다(내레이션은 괄호로 보존). */
export function greetingToContent(greeting: Greeting): string {
  return greeting.lines.map((l) => (l.kind === 'narration' ? `(${l.text})` : l.text)).join('\n\n')
}
