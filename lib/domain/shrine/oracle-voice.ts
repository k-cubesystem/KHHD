/**
 * 신탁의 «오늘의 결» — 같은 신위가 매일 다른 각도로 말하게 하는 결정론 변주(P1-C).
 *
 * 🔴 왜 필요했나: 신탁 프롬프트에 넣어주던 것이 넷뿐이었다(신위 이름·성격·말투·날짜).
 *    그래서 실측 34건이 전부 같은 감정(bless)·같은 위로문("먼 길을 걸어오느라 애썼으니…")이었다.
 *    소재(오늘의 기운)와 «말하는 각도»를 함께 주면 같은 신위도 날마다 다른 말을 한다.
 *
 * 순수 함수 — 날짜키를 주입받아 같은 날엔 같은 결, 날이 바뀌면 달라진다(테스트 대상).
 */

import type { DayFlow } from '@/lib/domain/fortune/day-map'

/** 신탁이 취할 수 있는 말의 결 — 하루에 하나가 뽑힌다. */
export const ORACLE_ANGLES = [
  '오늘 하루를 여는 축원으로',
  '어제와 달라진 기운을 짚어주는 말로',
  '오늘 걸려 넘어지기 쉬운 한 가지를 넌지시 일러주는 말로',
  '내담자가 스스로 알아차리도록 되묻는 말로',
  '오늘 해두면 좋을 작은 행동 하나를 권하는 말로',
  '지난 걸음을 알아봐 주는 말로',
] as const

/**
 * 오늘의 흐름별 어울리는 표정 후보 — 신위가 늘 bless 만 짓던 것을 가른다.
 * (실제 선택은 모델이 하되, 후보를 좁혀 주면 그날의 기운과 어긋나지 않는다.)
 */
const FLOW_EMOTIONS: Record<DayFlow, string> = {
  support: 'bless 나 smile',
  output: 'smile 이나 surprised',
  same: 'neutral 이나 smile',
  control: 'stern 이나 neutral',
  pressure: 'sad 나 stern',
}

/** 날짜키(YYYY-MM-DD)에서 뽑은 안정적 인덱스 — 같은 날엔 같은 결. */
function dayIndex(dayKey: string, buckets: number): number {
  let sum = 0
  for (let i = 0; i < dayKey.length; i++) sum = (sum * 31 + dayKey.charCodeAt(i)) % 100003
  return buckets > 0 ? sum % buckets : 0
}

export interface OracleVoice {
  /** 오늘 신탁이 취할 말의 결 */
  angle: string
  /** 오늘 기운에 어울리는 표정 후보(프롬프트 힌트) */
  emotionHint: string
}

/**
 * @param dayKey KST 날짜키 'YYYY-MM-DD'
 * @param flow   오늘의 지도 흐름(없으면 무난한 기본)
 */
export function oracleVoiceFor(dayKey: string, flow?: DayFlow | null): OracleVoice {
  return {
    angle: ORACLE_ANGLES[dayIndex(dayKey, ORACLE_ANGLES.length)],
    emotionHint: flow ? FLOW_EMOTIONS[flow] : 'neutral 이나 smile',
  }
}
