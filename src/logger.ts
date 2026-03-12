/**
 * A simple logger that only outputs messages in development mode.
 * It uses Vite's `import.meta.env.DEV` to determine the environment.
 */

const isDevMode = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (isDevMode) {
      console.log(...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDevMode) {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    if (isDevMode) {
      console.error(...args);
    }
  },
};