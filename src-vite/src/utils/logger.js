// OJT Master - Debug Logger (Issue #125)
// 프로덕션에서는 로그 비활성화

const isDev = import.meta.env.DEV;

/**
 * 개발 환경에서만 로그 출력
 */
export const logger = {
  log: (...args) => {
    if (isDev) console.log(...args);
  },
  warn: (...args) => {
    console.warn(...args); // warn은 항상 출력
  },
  error: (...args) => {
    console.error(...args); // error는 항상 출력
  },
  debug: (...args) => {
    if (isDev) console.log('[DEBUG]', ...args);
  },
  info: (...args) => {
    if (isDev) console.log('[INFO]', ...args);
  },
};

export default logger;
