import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getDestinyTargets } from '@/app/actions/user/destiny'
import { themeResolver } from '@/lib/domain/theme-fortune/resolvers'
import { relatedThemes, themeById, THEME_LIST_PATH } from '@/lib/domain/theme-fortune/themes'
import { ThemeDetailContent } from './theme-detail-content'

/**
 * `/protected/analysis/theme/[type]` — 한 자리가 세 가지 일을 한다(마스터 §3-3).
 *
 *   ① 구 5개 slug(wealth·love·career·exam·estate) → **진짜 화면으로 리다이렉트**
 *   ② 출하 테마 slug → **테마 상세 렌더**
 *   ③ 그 밖 → 허브
 *
 * ①이 먼저인 이유: 북마크·공유 링크·검색 색인이 이미 나가 있는 주소들이라 지우면 404다.
 * 그리고 그 다섯은 사주를 읽지 않고 전원에게 같은 「85점」을 띄우던 목업이었다 —
 * 리다이렉트가 그 라이브 버그의 실질적 수복이다(마스터 §1-1).
 *
 * 🔴 이 페이지는 **AI 를 부르지 않는다.** 서버에서 하는 일은 테마 해석과 대상 목록 조회뿐이고,
 *    분석은 사용자가 버튼을 눌러야 돈다(직장·재물 §3-7 — 9차에 「마운트마다 Gemini 생성」 사고).
 */
/**
 * 🔴 Map 이다. slug 는 **URL 에서 오는 임의 문자열**이라, 객체 리터럴을 그대로 인덱싱하면
 *    `/theme/constructor` 가 프로토타입의 함수를 «주소»로 물고 `redirect()` 에 넘긴다
 *    (TypeScript 의 index signature 는 이걸 `string` 이라고 말해 준다 — 잡아 준 건 테스트다).
 */
const REAL_ROUTES: ReadonlyMap<string, string> = new Map([
  ['wealth', '/protected/analysis/wealth'],
  ['love', '/protected/analysis/trend/love'],
  ['career', '/protected/analysis/trend/career'],
  ['exam', '/protected/analysis/trend/exam'],
  ['estate', '/protected/analysis/trend/estate'],
])

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const { type } = await params
  const theme = themeById(type)
  if (!theme || !theme.shipped) return { title: '인기테마운세' }

  return { title: `${theme.title} — 인기테마운세`, description: theme.subcopy }
}

export default async function ThemeAnalysisPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params

  const legacy = REAL_ROUTES.get(type)
  if (legacy) redirect(legacy)

  const theme = themeById(type)
  if (!theme || !theme.shipped) redirect('/protected/analysis')

  // 대상은 단일 출처(v_destiny_targets)로만 해석한다. targetId 쿼리를 받지 않는 이유는
  // 이 화면이 «본인 사주»를 보는 자리이기 때문 — 없으면 첫 대상으로 떨어져 막다른 길을 만들지 않는다.
  const targets = await getDestinyTargets()
  const initialTarget = targets.find((target) => target.target_type === 'self') ?? targets[0] ?? null

  // 판정이 등록됐는가 = 이 화면이 실제 풀이를 낼 수 있는가. 등록 전이면 「준비 중」으로 닫는다.
  const resolver = themeResolver(theme.id)

  return (
    <ThemeDetailContent
      theme={theme}
      hasReading={resolver !== null}
      question={resolver?.prompt.question ?? null}
      targets={targets}
      initialTargetId={initialTarget?.id ?? null}
      related={[...relatedThemes(theme)]}
      listPath={THEME_LIST_PATH}
    />
  )
}
