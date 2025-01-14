import { ToolResult } from './types';
import type {
  BetaToolBash20241022,
  BetaToolComputerUse20241022,
  BetaToolResultBlockParam,
  BetaToolTextEditor20241022,
} from '@anthropic-ai/sdk/resources/beta/index.mjs';

export const bashTool: BetaToolBash20241022 = {
  name: 'bash',
  type: 'bash_20241022',
};

export const computerTool: BetaToolComputerUse20241022 = {
  name: 'computer',
  type: 'computer_20241022',
  // Default display dimensions. Will be updated by the server on connection.
  display_height_px: 768,
  display_width_px: 1024,
};

export const editTool: BetaToolTextEditor20241022 = {
  name: 'str_replace_editor',
  type: 'text_editor_20241022',
};

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
/**
 * Converts a ToolResult into a BetaToolResultBlockParam for Claude's tool use API
 *
 * Takes a ToolResult from executing a tool and formats it into the structure
 * expected by Claude's tool use API. Handles both text output and base64 encoded
 * images.
 *
 * @param result - The result from executing a tool, containing output/error/image
 * @param toolUseId - Unique ID for this tool use instance from Claude
 * @returns Formatted tool result block for Claude's API
 *
 * @example
 * const result = {
 *   output: "Hello world",
 *   error: null,
 *   base64_image: null,
 *   system: null
 * };
 * makeToolResult(result, "abc123");
 */
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
