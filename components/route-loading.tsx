/**
 * 라우트 전환 폴백(loading.tsx 전용).
 *
 * 🔴 **루트(app/loading.tsx)에는 두지 않는다.** 루트 레이아웃이 next-intl 로 쿠키를 읽어
 *    앱 전체가 동적 렌더이므로, 루트에 Suspense 경계가 있으면 Next 가 이 폴백을 담은 셸을
 *    **HTTP 200 으로 먼저 내보내고** 본문을 그 뒤에 스트리밍한다. 그래서 두 가지가 망가졌다
 *    (2026-09-08~23 라이브 실측):
 *    · 매칭된 라우트에서 notFound() 를 불러도 상태 코드가 이미 나간 200 이었다(소프트 404).
 *    · 크롤러가 받는 첫 HTML 이 스피너 껍데기였다 — /guide 32편의 본문·JSON-LD 가 0건.
 *      애드센스가 「가치가 별로 없는 콘텐츠」로 반려한 그 자리다.
 *    경계는 **느린 로그인 화면 세그먼트에만** 둔다. 공개 콘텐츠 라우트는 막고 렌더해야
 *    본문이 첫 HTML 에 들어가고 404 가 404 로 나간다.
 */
export function RouteLoading({ label = '불러오는 중...' }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="relative mx-auto mb-4 h-12 w-12">
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-gold-500" />
        </div>
        <p className="animate-pulse text-sm text-gold-300/80">{label}</p>
      </div>
    </div>
  )
}
