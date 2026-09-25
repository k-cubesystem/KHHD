import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  const isProduction = process.env.NODE_ENV === 'production'

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,

    // Performance: 프로덕션에서는 10%만 샘플링, 개발에서는 전수
    tracesSampleRate: isProduction ? 0.1 : 1.0,

    // 요청 본문·쿠키는 이벤트에 싣지 않는다 — 회원이 쓴 글·세션 쿠키가 국외(Sentry)로 나가면 안 된다.
    // 같은 이름(RequestData)의 통합을 주면 SDK 기본 인스턴스를 대체한다. url·method·나머지 헤더는 그대로 남는다.
    integrations: [Sentry.requestDataIntegration({ include: { data: false, cookies: false } })],
  })
}
