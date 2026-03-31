import * as Sentry from '@sentry/nextjs'

const PII_PATTERNS: Array<[RegExp, string]> = [
  [/payment_key["']?\s*[:=]\s*["']?[\w-]+/gi, 'payment_key: [MASKED]'],
  [/order_id["']?\s*[:=]\s*["']?[\w-]+/gi, 'order_id: [MASKED]'],
  [/paymentKey["']?\s*[:=]\s*["']?[\w-]+/gi, 'paymentKey: [MASKED]'],
  [/orderId["']?\s*[:=]\s*["']?[\w-]+/gi, 'orderId: [MASKED]'],
  [/billing_key["']?\s*[:=]\s*["']?[\w-]+/gi, 'billing_key: [MASKED]'],
  [/billingKey["']?\s*[:=]\s*["']?[\w-]+/gi, 'billingKey: [MASKED]'],
  [/phone["']?\s*[:=]\s*["']?01\d{8,9}/gi, 'phone: [MASKED]'],
]

function maskPII(value: string): string {
  let masked = value
  for (const [pattern, replacement] of PII_PATTERNS) {
    masked = masked.replace(pattern, replacement)
  }
  return masked
}

function sanitizeArg(arg: unknown): unknown {
  if (typeof arg === 'string') return maskPII(arg)
  if (arg instanceof Error) return arg
  try {
    const str = JSON.stringify(arg)
    return JSON.parse(maskPII(str))
  } catch {
    return arg
  }
}

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
      const sanitized = args.map(sanitizeArg)
      const message = sanitized.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
      Sentry.captureMessage(message, 'warning')
    }
  },

  error: (...args: unknown[]) => {
    console.error(...args)

    if (isSentryAvailable()) {
      const sanitized = args.map(sanitizeArg)
      const firstArg = sanitized[0]
      if (firstArg instanceof Error) {
        Sentry.captureException(firstArg, {
          extra: sanitized.length > 1 ? { context: sanitized.slice(1) } : undefined,
        })
      } else {
        const message = sanitized.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
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
