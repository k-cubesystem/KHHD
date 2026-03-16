import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  const isProduction = process.env.NODE_ENV === 'production'

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,

    // Performance: 프로덕션에서는 10%만 샘플링, 개발에서는 전수
    tracesSampleRate: isProduction ? 0.1 : 1.0,

    // Session Replay: 일반 세션 10%, 에러 세션 100%
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.replayIntegration(),
      Sentry.browserTracingIntegration(),
    ],

    // 불필요한 에러 필터링
    ignoreErrors: [
      'ResizeObserver loop',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection captured',
      /^Loading chunk [\d]+ failed/,
    ],
  })
}
