const noop = () => null;

export const logger =
  process.env.NODE_ENV === "development"
    ? {
        debug: console.log,
        info: console.log,
        warn: console.warn,
        error: console.error,
      }
    : {
        debug: noop,
        info: noop,
        warn: noop,
        error: noop,
      };
