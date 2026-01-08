export const logger = {
  info: (message: any, ...args: any[]) => {
    if (typeof message === 'object') {
      console.log('[INFO]', JSON.stringify(message, null, 2), ...args);
    } else {
      console.log(`[INFO] ${message}`, ...args);
    }
  },
  error: (message: any, ...args: any[]) => {
    if (typeof message === 'object') {
      console.error('[ERROR]', JSON.stringify(message, null, 2), ...args);
    } else {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },
  warn: (message: any, ...args: any[]) => {
    if (typeof message === 'object') {
      console.warn('[WARN]', JSON.stringify(message, null, 2), ...args);
    } else {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  debug: (message: any, ...args: any[]) => {
    if (typeof message === 'object') {
      console.debug('[DEBUG]', JSON.stringify(message, null, 2), ...args);
    } else {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
};
