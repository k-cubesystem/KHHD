import * as Sentry from '@sentry/nextjs'

/**
 * Sentry가 초기화되었는지 확인
 * DSN이 없는 개발환경에서는 false를 반환하여 Sentry 호출을 스킵
 */
function isSentryAvailable(): boolean {
  try {
    return !!Sentry.getClient()
  } catch {
    return false
  }
}

/**
 * 개발 환경에서만 로그를 출력하는 Logger
 * 프로덕션에서는 에러/경고를 Sentry로 전송
 */
export const logger = {
  log: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args)
    }
  },

  warn: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(...args)
    }

    if (isSentryAvailable()) {
      const message = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
      Sentry.captureMessage(message, 'warning')
    }
  },

  error: (...args: unknown[]) => {
    // 에러는 프로덕션에서도 콘솔 로깅
    console.error(...args)

    if (isSentryAvailable()) {
      const firstArg = args[0]
      if (firstArg instanceof Error) {
        Sentry.captureException(firstArg, {
          extra: args.length > 1 ? { context: args.slice(1) } : undefined,
        })
      } else {
        const message = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
        Sentry.captureMessage(message, 'error')
      }
    }
  },

  info: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(...args)
    }
  },

  debug: (...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(...args)
    }
  },
}
