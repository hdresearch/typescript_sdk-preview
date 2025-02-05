import type { BetaContentBlockParam, BetaToolResultBlockParam } from '@anthropic-ai/sdk/resources/beta/index.mjs';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    env: process.env.NODE_ENV || 'development',
  },
  transport: {
    target: 'pino-pretty',
    options: {
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
      colorize: true,
      levelFirst: true,
    },
  },
});

// Create child loggers for different modules
export const createModuleLogger = (module: string) => {
  return logger.child({ module });
};

export { logger };

// Remove base64 image data from logs
export const cleanLogs = (toolResult: BetaToolResultBlockParam) => {
  return {
    ...toolResult,
    content: Array.isArray(toolResult.content)
      ? toolResult.content.map(c =>
        c.type === 'image' ? { ...c, source: { ...c.source, data: '[base64 data omitted]' } } : c
      )
      : toolResult.content
  }
}