/** 마지막 글자에 받침이 있는지. 한글 음절이 아니면 false. */
export function hasFinalConsonant(word: string): boolean {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  return code >= 0 && code <= 11_171 && code % 28 !== 0
}

/** 「불이」「나무가」 — 주격 조사를 받침에 맞게 붙인다. */
export function withSubject(word: string): string {
  return `${word}${hasFinalConsonant(word) ? '이' : '가'}`
}

/** 「흙은」「나무는」 — 보조사 은/는을 받침에 맞게 붙인다. */
export function withTopic(word: string): string {
  return `${word}${hasFinalConsonant(word) ? '은' : '는'}`
}
