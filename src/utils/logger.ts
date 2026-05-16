const isDebug = import.meta.env.VITE_DEBUG === 'true' || import.meta.env.DEV;

export const logger = {
  debug: (...args: unknown[]): void => {
    if (isDebug) console.log(...args);
  },
  info: (...args: unknown[]): void => {
    if (isDebug) console.info(...args);
  },
  warn: (...args: unknown[]): void => {
    console.warn(...args);
  },
  error: (...args: unknown[]): void => {
    console.error(...args);
  },
};
