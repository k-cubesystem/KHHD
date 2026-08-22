/**
 * 사주·궁합 허브(/protected/analysis)의 «섹션» 정의 — 단일 출처.
 *
 * 앵커 id 와 섹션 제목이 한 줄에 모여 있으므로, 라벨만 갈아끼우는 재편은 이 파일의 문자열
 * 하나로 끝난다. 화면 쪽에는 제목 문자열을 다시 쓰지 않는다 — 쓰면 그 순간 두 곳이 된다.
 *
 * 2026-08-13 비우기(CEO 지시): 여섯 섹션이 셋이 됐다.
 * ① 인기테마운세 → ② 무엇으로 볼까요 → 종합사주풀이 여정(맨 하단).
 *
 * 없어진 것: 오늘의 정성 · 절기 특별 이벤트 배너 · 더 깊이 들여다보기 · 하단 오늘의 운세 카드.
 * 상단 바로가기 칩(`HubSectionNav`)도 함께 내렸다 — 섹션이 셋뿐인 화면에서 칩은 한 번 더
 * 누르게 만들 뿐이다. 그래서 이 표에는 칩 라벨(`label`)·조건부 노출(`condition`)이 없다.
 *
 * 2026-08-13 저녁 앱 홈 개편(CEO 지시 "상단에 어플처럼 아이콘과 제목"): 셋의 «수»는 그대로고
 * 첫 자리가 바뀌었다. ② 「무엇으로 볼까요」 카드 4장은 맨 위 **아이콘 런처 8칸**으로 흡수돼
 * 사라졌다(링크 무손실 — `lib/domain/analysis/hub-home.ts` `HUB_LAUNCHER`).
 * 앱 헤더는 이 표에 없다 — 페이지 본문이 아니라 고정 상단 바(`components/mobile-header.tsx`)가
 * 그린다. 허브에서는 그 바가 뒤로가기 대신 앱 홈 머리글로 선다(최상위 탭에 뒤로가기는 없다).
 *
 * 🔴 「더 깊이」가 들고 있던 **오늘의 운세·2026 병오년은 지운 게 아니라 옮겼다.**
 *    테마 목록(`/protected/analysis/theme`)의 「지금 바로 볼 수 있는 풀이」가 지금 두 화면의
 *    유일한 진입 경로다(`lib/domain/theme-fortune/themes.ts` `STANDALONE_ROUTES`).
 *    그냥 지웠으면 두 기능이 접근 불가가 됐다.
 *
 * 선언 순서 = 화면의 문서 순서다(`Object.values` 는 문자열 키의 선언 순서를 지킨다).
 */

export interface HubSection {
  /** 앵커 id. `<a href="#id">` 와 섹션 요소의 `id` 가 이 값 하나를 공유한다. */
  readonly id: string
  /**
   * 섹션 제목. 눈에 보이든(제목 줄) 스크린리더용이든(`sr-only`) 문구는 여기 것 하나뿐이다.
   * 어느 쪽으로 그릴지는 화면이 정한다 — 카드가 이미 제 이름을 달고 있는 자리에 제목을 또
   * 그리면 같은 말이 두 번 보인다.
   */
  readonly title: string
}

export const HUB_SECTIONS = {
  /**
   * 맨 위 — 아이콘 런처 8칸. 구 ② 「무엇으로 볼까요」의 자리를 잇는다.
   * 제목은 화면에 글자로 서지 않는다(`sr-only`) — 아이콘마다 제 이름을 달고 있다.
   */
  launcher: {
    id: 'hub-launcher',
    title: '바로 보기',
  },
  /**
   * 사주 유도 카드 바로 아래 — 사주→관상→손금→풀이→종합의 진행(복주머니 다섯).
   * 2026-08-22 CEO 재지시(«위치가 너무 하단»)로 맨 하단에서 올라왔다: 10줄 테마 리스트 밑에
   * 묻혀 있던 코어 루프를 «사주 보기 = 첫 주머니 채우기» 동선으로 사주 카드에 붙인다.
   */
  journey: {
    id: 'hub-journey',
    title: '나의 복주머니',
  },
  /** 맨 하단 — 질문으로 들어오는 입구(브라우징 롱테일). */
  themeFortune: {
    id: 'hub-theme',
    title: '인기테마운세',
  },
} as const satisfies Record<string, HubSection>

/** 표 전체를 문서 순서대로. `as const` 로 좁혀진 리터럴 타입을 공통 모양으로 넓혀 준다. */
export function allHubSections(): readonly HubSection[] {
  return Object.values(HUB_SECTIONS)
}

/** 섹션 제목 요소의 id — `aria-labelledby` 가 가리키는 곳. */
export function hubHeadingId(sectionId: string): string {
  return `${sectionId}-title`
}
