import pino from 'pino';

const transport = pino.transport({
  target: 'pino-pretty',
  options: {
    translateTime: 'HH:MM:ss Z',
    ignore: 'pid,hostname',
    colorize: true,
    levelFirst: true,
  },
});

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    base: {
      env: process.env.NODE_ENV || 'development',
    },
  },
  transport
);

// Create child loggers for different modules
export const createModuleLogger = (module: string) => {
  return logger.child({ module });
};
