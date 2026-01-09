const createLogger = (prefix: string) => ({
  info: (message: any, ...args: any[]) => {
    if (typeof message === 'object') {
      console.log(`[${prefix}][INFO]`, JSON.stringify(message, null, 2), ...args);
    } else {
      console.log(`[${prefix}][INFO] ${message}`, ...args);
    }
  },
  error: (message: any, ...args: any[]) => {
    if (typeof message === 'object') {
      console.error(`[${prefix}][ERROR]`, JSON.stringify(message, null, 2), ...args);
    } else {
      console.error(`[${prefix}][ERROR] ${message}`, ...args);
    }
  },
  warn: (message: any, ...args: any[]) => {
    if (typeof message === 'object') {
      console.warn(`[${prefix}][WARN]`, JSON.stringify(message, null, 2), ...args);
    } else {
      console.warn(`[${prefix}][WARN] ${message}`, ...args);
    }
  },
  debug: (message: any, ...args: any[]) => {
    if (typeof message === 'object') {
      console.debug(`[${prefix}][DEBUG]`, JSON.stringify(message, null, 2), ...args);
    } else {
      console.debug(`[${prefix}][DEBUG] ${message}`, ...args);
    }
  }
});

export const logger = createLogger('APP');

export const loggers = {
  solana: createLogger('SOLANA'),
  lottery: createLogger('LOTTERY'),
  claim: createLogger('CLAIM'),
  affiliate: createLogger('AFFILIATE'),
  vrf: createLogger('VRF'),
  draw: createLogger('DRAW'),
  api: createLogger('API'),
  audit: createLogger('AUDIT'),
  auth: createLogger('AUTH'),
  mission: createLogger('MISSION'),
  ticket: createLogger('TICKET'),
  default: createLogger('APP'),
};
