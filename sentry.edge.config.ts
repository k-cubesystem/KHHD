import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  const isProduction = process.env.NODE_ENV === 'production'

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,

    // Performance: 프로덕션에서는 10%만 샘플링, 개발에서는 전수
    tracesSampleRate: isProduction ? 0.1 : 1.0,
  })
}
