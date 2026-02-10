/**
 * 개발 환경에서만 로그를 출력하는 Logger
 * 프로덕션에서는 에러만 로깅
 */
export const logger = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args);
    }
  },

  warn: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(...args);
    }
  },

  error: (...args: any[]) => {
    // 에러는 프로덕션에서도 로깅
    console.error(...args);
  },

  info: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(...args);
    }
  },

  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(...args);
    }
  },
};
