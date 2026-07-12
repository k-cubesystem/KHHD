/**
 * AI 사용자 입력 가드 — 길이 제한 + 프롬프트 인젝션 의심 패턴 감지 (S2).
 * 순수 함수(side-effect 없음). 신탁/채팅 등 사용자 입력을 프롬프트에 넣기 전에 통과시킨다.
 * 방침: 길이는 하드 컷(토큰 폭탄/남용 방어). 인젝션은 차단이 아니라 **플래그**(오탐으로 정상 사용자 차단 방지)
 *       — 호출부에서 로깅/텔레메트리에 활용, 필요 시 별도 정책 적용.
 */

/** 신탁/채팅 사용자 입력 문자 상한. */
export const MAX_AI_INPUT_CHARS = 2000

const INJECTION_PATTERNS: readonly RegExp[] = [
  /ignore\s+(all\s+)?(the\s+)?previous/i,
  /disregard\s+(the\s+)?(above|previous|prior)/i,
  /\bsystem\s*prompt\b/i,
  /\b(you\s+are\s+now|act\s+as|pretend\s+to\s+be)\b/i,
  /^\s*(system|assistant|developer)\s*:/im,
  /너는\s*(이제|지금부터)/,
  /지금부터\s*(너는|당신은)/,
  /(이전|앞선|위의)\s*(지시|명령|규칙|프롬프트)[^\n]{0,10}(무시|잊어|잊고|따르지)/,
  /역할[^\n]{0,6}(변경|바꿔|바꾸)/,
]

export interface GuardedInput {
  /** 정제된 텍스트(트림 + 길이 컷). */
  text: string
  /** 길이 상한 초과로 잘렸는지. */
  truncated: boolean
  /** 프롬프트 인젝션 의심 패턴 매칭 여부(플래그, 차단 아님). */
  suspicious: boolean
}

/** 사용자 입력을 정제·검사. maxChars 기본 MAX_AI_INPUT_CHARS. */
export function guardAiInput(raw: unknown, maxChars: number = MAX_AI_INPUT_CHARS): GuardedInput {
  const s = typeof raw === 'string' ? raw : ''
  const trimmed = s.trim()
  const truncated = trimmed.length > maxChars
  const text = truncated ? trimmed.slice(0, maxChars) : trimmed
  const suspicious = INJECTION_PATTERNS.some((re) => re.test(text))
  return { text, truncated, suspicious }
}
