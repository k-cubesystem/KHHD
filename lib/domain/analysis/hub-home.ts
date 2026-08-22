/**
 * 사주·궁합 허브의 «앱 홈» 층 — 상단 헤더 인사 + 아이콘 런처. 단일 출처.
 *
 * 2026-08-13 CEO 지시: "상단에 어플처럼 아이콘과 제목으로 꾸며지면 좋겠는데."
 * 그래서 허브 맨 위가 두 겹이 됐다.
 *
 *   [앱 헤더]  아이콘 + 「청담해화당」 + 인사 한 줄  ← `components/mobile-header.tsx` 가 그린다
 *   [런처]     원형 아이콘 8칸 (2×4)               ← `components/analysis/HubLauncher.tsx`
 *
 * 🔴 이 층은 **상수와 정적 자산만** 쓴다. 허브에서 AI·서버액션을 부르면 9차 사고(마운트마다
 *    Gemini 생성)가 그대로 재발한다. 이 파일에 import 가 하나(테마 목록 경로)뿐인 것이 계약이다.
 *
 * ## 런처가 흡수한 것
 * 구 ② 「무엇으로 볼까요」 카드 4장(궁합·관상·손금·풍수)은 **런처로 들어와 없어졌다.**
 * 2열 카드 4장이 먹던 세로를 아이콘 4칸으로 줄이는 것이 이번 개편의 목적이다 — 링크는 하나도
 * 잃지 않았다(그 넷은 지금도 여기 있다).
 *
 * ## 🔴 런처에 넣지 않는 것
 * **오늘의 운세 · 2026 병오년 · 고민상담.** 앞의 둘은 하루 전(08-13 새벽) CEO 가 허브에서
 * 명시적으로 내려 테마 목록(`/protected/analysis/theme`)의 「지금 바로 볼 수 있는 풀이」로
 * 옮긴 것이고, 고민상담·신당·웹툰은 하단 네비가 이미 지고 있다. 다시 올리면 그때 지시가
 * 무효가 되거나 같은 입구가 둘이 된다.
 *
 * ## 🔴 단가(냥)를 라벨에 쓰지 않는다
 * 재물운·종합풀이는 복채를 받는 화면이지만, 런처는 «어디로 가는지»만 말한다. 값은 도착 화면이
 * 실차감 키(`feature-costs.ts`)에서 파생해 밝힌다 — 표시 = 실차감 단일 출처를 깨지 않는다.
 */
import { THEME_LIST_PATH } from '@/lib/domain/theme-fortune/themes'

export interface HubLauncherEntry {
  /** 안정 키. 테스트·GA 라벨이 이 문자열을 잡는다. */
  readonly id: string
  /** 아이콘 밑 한 줄. 4열 그리드에 들어가야 하므로 짧게 — 다섯 자를 넘기지 않는다. */
  readonly label: string
  /** 목적지. 허브 밖의 실제 화면이며, 리다이렉트 경유가 아니어야 한다. */
  readonly href: string
  /** 「설빛 온기」 일러스트 (public/icons/hub). 여덟 칸 모두 같은 결의 webp 다. */
  readonly icon: string
}

/**
 * 선언 순서 = 화면의 왼쪽 위부터의 순서(2×4).
 *
 * 앞 다섯은 «내 것을 본다»(사주→궁합→관상→손금→풍수), 뒤 셋은 «더 본다»(재물운·종합·목록).
 * 첫 칸이 사주풀이인 것은 유도 카드(`MasterpieceSection`)와 같은 목적지라 일부러다 —
 * 아이콘으로 한 번, 큰 카드로 한 번, 같은 문을 두 크기로 연다.
 *
 * ## 🔴 사주풀이와 종합풀이는 **각각 남는다** (2026-08-22 정정)
 * 하루 사이에 «둘을 한 칸으로 통합»했다가 **되돌렸다.** CEO 의 원래 요청은
 * «기존 기능은 그대로 두고 **메인 배너와 아이콘만** 수정»이었다 — 기능 통합은 오해였다.
 * 여덟 칸이 정본이고, 이번에 바뀐 것은 **두 칸의 그림뿐**이다:
 *   · `saju`   → `saju-v3.webp`   (주칠 명식판 — v2 는 옅어서 첫 칸이 밀렸다, CEO 반려)
 *   · `samhap` → `samhap-v2.webp` (네 기둥 + 고리 셋)
 * 🔴 구 `saju.webp`·`samhap.webp` 를 덮어쓰지 않고 새 파일명을 쓴 이유 — 같은 이름을
 *    덮어쓰면 폰 캐시가 옛 그림을 재사용한다(2026-08-10 실증).
 */
export const HUB_LAUNCHER: readonly HubLauncherEntry[] = [
  { id: 'saju', label: '사주풀이', href: '/protected/analysis/cheonjiin', icon: '/icons/hub/saju-v3.webp' },
  { id: 'compatibility', label: '궁합', href: '/protected/analysis/compatibility', icon: '/icons/hub/gunghap.webp' },
  { id: 'face', label: '관상', href: '/protected/studio/face', icon: '/icons/hub/gwansang.webp' },
  { id: 'palm', label: '손금', href: '/protected/studio/palm', icon: '/icons/hub/songeum.webp' },
  { id: 'fengshui', label: '풍수', href: '/protected/studio/fengshui', icon: '/icons/hub/pungsu.webp' },
  // targetId 없는 맨 경로로 보낸다 — 그 화면이 v_destiny_targets 로 본인 대상을 스스로 고른다.
  { id: 'wealth', label: '재물운', href: '/protected/analysis/wealth', icon: '/icons/hub/jaemul.webp' },
  { id: 'samhap', label: '종합풀이', href: '/protected/studio/samhap', icon: '/icons/hub/samhap-v2.webp' },
  { id: 'themes', label: '테마 전체', href: THEME_LIST_PATH, icon: '/icons/hub/themes.webp' },
]

/** KST 는 서머타임이 없다 — UTC 고정 오프셋으로 충분하다. */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/**
 * 헤더 인사 한 줄. **결정론** — 같은 시각이면 누구에게나 같은 문장이다(Math.random 금지).
 *
 * 이름은 부르지 않는다. 허브를 여는 데 프로필 조회를 한 건 더 붙일 값이 없고, 이름이 비어 있는
 * 계정(소셜 로그인)에서는 인사가 화면마다 달라져 오히려 어수선하다.
 *
 * 기준은 서울 시각이다. 서버 렌더와 브라우저의 로컬 타임존이 달라도 같은 문장이 나온다.
 */
export function hubGreeting(now: Date = new Date()): string {
  const hour = new Date(now.getTime() + KST_OFFSET_MS).getUTCHours()

  if (hour >= 5 && hour <= 10) return '좋은 아침이어요'
  if (hour >= 11 && hour <= 16) return '어서 오셔요'
  if (hour >= 17 && hour <= 21) return '편안한 저녁이어요'
  return '늦은 밤에 오셨네요'
}
