import type {
  BetaMessageParam,
  BetaToolResultBlockParam,
} from '@anthropic-ai/sdk/resources/beta/index.mjs';
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
const cleanContent = (content: BetaToolResultBlockParam['content']) => {
  if (Array.isArray(content)) {
    return content.map((c) =>
      c.type === 'image'
        ? { ...c, source: { ...c.source, data: '[base64 data omitted]' } }
        : c
    );
  }
  return content;
};

// Clean tool results
export const cleanToolResult = (toolResult: BetaToolResultBlockParam) => {
  return {
    ...toolResult,
    content: cleanContent(toolResult.content),
  };
};

export const cleanMessage = (message: BetaMessageParam) => {
  const content = message.content;
  if (!Array.isArray(content)) {
    return message;
  }

  return {
    ...message,
    content: content.map((c) => {
      // Handle direct image content
      if (c.type === 'image') {
        return { ...c, source: { ...c.source, data: '[base64 data omitted]' } };
      }
      // Handle tool results containing images
      if (c.type === 'tool_result') {
        return cleanToolResult(c);
      }
      return c;
    }),
  };
};
