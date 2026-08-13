/**
 * 인기테마운세 — 테마 판정 레지스트리.
 *
 * ## 여기가 「테마가 코드에 등록되는」 단 하나의 자리다
 * 화면·라우트·서버 액션·저장·공유는 전부 공용이다. 테마 하나를 늘리는 데 필요한 코드 변경은
 * **판정 파일 1개 + 아래 표에 한 줄**이 전부다(마스터 §6-2).
 *
 * ## 🔴 계산은 여기, 표시는 `themes.ts`
 * 카피 표에는 `reading: true` 한 칸이 있고(가는 곳·복채를 가른다), 실제로 도는 판정은 이 표에
 * 있다. **둘이 어긋나면 빌드가 아니라 테스트가 잡는다**(`__tests__/resolvers.test.ts`) —
 * 카피와 계산은 서로 다른 속도로 늘어나므로 컴파일로 묶으면 한쪽이 다른 쪽을 인질로 잡는다.
 *
 * 어긋났을 때의 화면 거동도 안전한 쪽으로 잡혀 있다. 플래그만 켜져 있으면 상세 화면이
 * 「준비 중」으로 닫히고 **복채는 못 받는다**(서버 액션이 판정기 부재로 먼저 거절한다).
 *
 * ## 테마 하나 추가하기 (다음 기가 하는 일 전량)
 *   ① `resolvers/{id}.ts` — `ThemeResolver` 1개 export (L2 판정 + L3 프롬프트 조각)
 *   ② 이 파일의 `RESOLVERS` 에 한 줄
 *   ③ `themes.ts` 의 그 테마에 `reading: true` (미끼면 `freeReading: true` 도)
 *   ④ `__tests__/resolvers/{id}.test.ts` — 결정론 + 판정표 고정
 */
import type { ThemeResolver } from '../verdict-types'
import { leaveOrStayResolver } from './leave-or-stay'

/**
 * 🔴 키는 `THEME_FORTUNES` 의 id 와 같아야 한다 — 레지스트리 계약 테스트가 대조한다.
 *
 * Map 을 쓰는 이유: 조회 키가 **URL 에서 온 문자열**이다. 객체 리터럴을 그대로 인덱싱하면
 * `constructor`·`toString` 같은 이름이 프로토타입의 함수를 돌려줘 「등록된 테마」 행세를 한다.
 */
const RESOLVERS: ReadonlyMap<string, ThemeResolver> = new Map([[leaveOrStayResolver.themeId, leaveOrStayResolver]])

/** 판정이 선 테마인가. 아니면 상세 화면이 「준비 중」으로 닫힌다. */
export function themeResolver(themeId: string): ThemeResolver | null {
  return RESOLVERS.get(themeId) ?? null
}

export function resolvedThemeIds(): readonly string[] {
  return [...RESOLVERS.keys()]
}
