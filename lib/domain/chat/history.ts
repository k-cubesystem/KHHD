/**
 * 대화 히스토리를 Gemini 가 받는 모양으로 다듬는다.
 *
 * ## 🔴 이 파일이 고친 라이브 장애 (2026-08-16)
 * 고민상담이 통째로 죽어 있었다. 오류는 이것 하나였다 —
 *
 * ```
 * [GoogleGenerativeAI Error]: First content should be with role 'user', got model
 * ```
 *
 * 신위는 사용자보다 **먼저 말을 건다**(선문안, 2026-07-25). 그 인사가 `assistant` 로 저장되므로
 * 대화 히스토리의 첫 항목이 `model` 이 되고, 그대로 `startChat({ history })` 에 넣으면 SDK 가
 * **호출 전에** 거절한다. 즉 「신위가 인사 → 사용자가 첫 말을 건다」는 정상 경로가 100% 실패했다.
 *
 * ## 왜 순수 함수로 빼는가
 * 서버 액션 안에 인라인으로 두면 이 규칙을 테스트할 방법이 없다. 실제로 없었기 때문에 장애가
 * 배포까지 갔다. 규칙은 하나뿐이라 함수 하나면 되고, 테스트가 그 하나를 영원히 붙든다.
 */

export interface ChatTurn {
  readonly role: 'user' | 'assistant'
  readonly content: string
}

export interface GeminiTurn {
  role: 'user' | 'model'
  /** SDK 의 Content 타입이 가변 배열을 요구한다 — readonly 로 두면 그대로 못 넘긴다. */
  parts: Array<{ text: string }>
}

/**
 * Gemini `startChat` 에 넣을 히스토리를 만든다.
 *
 * 규칙 하나: **첫 항목은 반드시 `user`** 다.
 *
 * 🔴 창(window)을 자른 **뒤에 한 번 더** 맞춰야 한다. 앞의 선문안만 걷어내고 끝내면, 최근 N개를
 *    떼어낼 때 그 조각이 다시 model 로 시작할 수 있다(예: [u,m,u,m,u] 에서 뒤 2개 = [m,u]).
 *    한 번만 맞추면 «가끔 되고 가끔 안 되는» 버그가 되어 재현이 어려워진다.
 *
 * 🔴 잘라낸 선문안을 «잃는» 것이 아니다. 그 내용은 systemInstruction 과 세션 요약이 이미 들고
 *    있고, 히스토리는 모델이 대화의 차례를 세는 용도다.
 */
export function toGeminiHistory(
  turns: ReadonlyArray<ChatTurn>,
  windowSize: number,
  /** 각 발화에 적용할 정화 함수(인젝션 가드). 없으면 원문 그대로. */
  sanitize: (text: string) => string = (text) => text
): GeminiTurn[] {
  const windowed = turns.slice(-Math.max(1, windowSize))
  const firstUser = windowed.findIndex((turn) => turn.role === 'user')
  // 사용자 발화가 하나도 없으면 히스토리는 비운다 — 선문안만 있는 첫 대화가 이 경우다.
  if (firstUser === -1) return []

  return windowed.slice(firstUser).map((turn) => ({
    role: turn.role === 'user' ? ('user' as const) : ('model' as const),
    parts: [{ text: sanitize(turn.content) }],
  }))
}
