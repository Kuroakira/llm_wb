// Environment detection utility
export const isTestEnvironment = process.env.NODE_ENV === 'test' ||
  (typeof global !== 'undefined' && 'describe' in global) ||
  (typeof navigator !== 'undefined' && navigator.userAgent.includes('HeadlessChrome')) ||
  (typeof window !== 'undefined' && (
    window.location.search.includes('force-html=true') ||
    window.navigator.webdriver === true ||
    (window as any).__playwright !== undefined
  ))

