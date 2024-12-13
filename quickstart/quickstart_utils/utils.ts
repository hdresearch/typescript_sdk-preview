import { ToolResult } from '../../lib/types';
import type { BetaToolResultBlockParam } from '@anthropic-ai/sdk/resources/beta/index.mjs';

interface ImageSource {
  type: 'base64';
  media_type: 'image/png';
  data: string;
}

interface TextContent {
  type: 'text';
  text: string;
}

interface ImageContent {
  type: 'image';
  source: ImageSource;
}

export function makeToolResult(
  result: ToolResult,
  toolUseId: string
): BetaToolResultBlockParam {
  const toolResultContent: (TextContent | ImageContent)[] = [];
  let isError = false;

  if (result.error) {
    isError = true;
    toolResultContent.push({
      type: 'text',
      text: result.error,
    });
  } else {
    if (result.output) {
      toolResultContent.push({
        type: 'text',
        text: result.output,
      });
    }
    if (result.base64_image) {
      toolResultContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: result.base64_image,
        },
      });
    }
  }

  return {
    type: 'tool_result',
    content: toolResultContent,
    tool_use_id: toolUseId,
    is_error: isError,
  };
}
