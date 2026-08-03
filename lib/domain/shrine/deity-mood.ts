/**
 * 좌정 신위의 표정 — **결정론 상태머신**.
 *
 * 17신위 전부 표정 9종(base·neutral·smile·stern·sad·surprised·bless·angry·portrait)이 이미 있는데,
 * 지금까지 신탁·채팅에서만 쓰였고 신당 방의 신위는 정지해 있었다. 여기서 그 그림을 쓴다 —
 * 새 그림 0장, AI 0원.
 *
 * ⚠️ **표정은 사용자의 행동에 대한 답이어야 한다.** 근거 없이 표정이 바뀌면 "내가 뭘 잘못했나"가
 *    된다. 그래서 규칙을 둘로만 뒀다: 오늘 기도를 올렸으면 흡족하고(bless), 백일을 시작해 놓고
 *    오늘 안 왔으면 기다린다(sad). 그 밖은 평상(neutral)이다.
 * ⚠️ `angry` 는 **쓰지 않는다.** 파일은 있지만 규칙에 넣지 않았다 — 신당에 들어왔는데 모신 신이
 *    화나 있으면, 그건 연출이 아니라 사람을 불안하게 만드는 일이다. 쓸 근거가 생기면 그때 넣는다.
 * ⚠️ 유대 L1 은 표정이 둘뿐이다(bondUnlocks().emotions === 2). 그 계정에 일곱 표정을 보내면
 *    해금의 뜻이 없어진다 — 여기서 접어 준다.
 */

export type DeityMood = 'neutral' | 'smile' | 'stern' | 'sad' | 'surprised' | 'bless' | 'angry'

export interface DeityMoodInput {
  /** 오늘(KST) 기도를 올렸는가 */
  readonly prayedToday: boolean
  /** 기원 단 — 0이면 아직 시작하지 않았다 */
  readonly devotionLevel: number
  /** 유대 단계가 허용하는 표정 수 (bondUnlocks().emotions) */
  readonly allowedEmotions: number
}

/** 표정 둘만 허용되는 계정에서 일곱 표정을 접는 표. 접힌 뒤에도 뜻이 통해야 한다. */
const FOLD_TO_TWO: Readonly<Record<DeityMood, DeityMood>> = Object.freeze({
  neutral: 'neutral',
  smile: 'smile',
  bless: 'smile', // 흡족함 → 웃음
  surprised: 'smile',
  sad: 'neutral', // 기다림 → 평상 (L1 에게 서운한 얼굴을 보이지 않는다)
  stern: 'neutral',
  angry: 'neutral',
})

export function deityMood(input: DeityMoodInput): DeityMood {
  const raw: DeityMood = input.prayedToday ? 'bless' : Math.floor(input.devotionLevel) >= 1 ? 'sad' : 'neutral'

  return input.allowedEmotions >= 7 ? raw : FOLD_TO_TWO[raw]
}

/**
 * 표정 그림의 주소.
 *
 * ⚠️ 평상(neutral)은 **넘겨받은 주소를 그대로 돌려준다**. 신위마다 기본 그림이 `base.webp` 인데
 *    `neutral.webp` 로 갈아끼우면, 그림 하나가 없는 신위에서 조용히 깨진 이미지가 된다.
 *    바꿀 이유가 있을 때만 바꾼다.
 */
export function deityMoodUrl(baseUrl: string, mood: DeityMood): string {
  if (mood === 'neutral') return baseUrl
  if (!/[^/]+\.webp$/.test(baseUrl)) return baseUrl
  return baseUrl.replace(/[^/]+\.webp$/, `${mood}.webp`)
}
