import { redirect } from 'next/navigation'

/**
 * 구 「모니터링」 화면.
 *
 * 🔴 이 화면은 **메뉴에 링크가 없었다** — 어드민 드로어(app/admin/layout.tsx)에서 갈 수 없는
 *    화면인데도 매출·AI 호출·에러율·응답시간을 따로 계산해 그리고 있었다. 그 넷은 각각
 *    **분석**과 **Gemini 사용량** 화면이 이미 보여 준다. 같은 숫자를 두 곳에서 세면
 *    값이 갈릴 때 어느 쪽이 맞는지 알 길이 없다.
 *
 * 여기에만 있던 둘(DAU/WAU/MAU · 카테고리 분포)은 분석 화면으로 옮겼다
 * (`components/admin/service-metrics.tsx`). 즐겨찾기·옛 링크가 깨지지 않게 넘겨보낸다.
 */
export default function MonitoringPage() {
  redirect('/admin/analytics')
}
