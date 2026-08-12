import { redirect } from 'next/navigation'

/**
 * 구 「테마별 상세 분석」 목업 라우트.
 * 사주를 읽지 않고 전원에게 같은 점수·같은 총평을 띄우던 화면이라 폐기했다(표시광고법).
 * 북마크·뒤로가기로 들어오는 길이 남아 있어 삭제 대신 실제 분석 화면으로 넘긴다.
 */
const REAL_ROUTES: Record<string, string> = {
  wealth: '/protected/analysis/wealth',
  love: '/protected/analysis/trend/love',
  career: '/protected/analysis/trend/career',
  exam: '/protected/analysis/trend/exam',
  estate: '/protected/analysis/trend/estate',
}

export default async function ThemeAnalysisPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params
  redirect(REAL_ROUTES[type] ?? '/protected/analysis')
}
