// anthropic generative loop for computer use
import Anthropic from '@anthropic-ai/sdk';
import type {
  BetaContentBlock,
  BetaMessageParam,
  BetaTextBlockParam,
  BetaToolResultBlockParam,
  BetaToolUseBlock,
} from '@anthropic-ai/sdk/resources/beta/index.mjs';
import { Computer } from '../lib';
import { Action } from '../lib/schemas/action';
import {
  defaultSamplingOptions,
  MachineMetadata,
  type DefaultSamplingOptions,
} from '../lib/types';
import { logger, cleanMessage } from '../lib/utils/logger';
import { convertToolResult } from './tools';
import { ToolResult } from '../lib/types';
import { UnknownAction } from './schemas/unknownAction';
import type { ToolResultBlockParam } from '@anthropic-ai/sdk/resources/index.mjs';

function systemCapability(machineMetadata: MachineMetadata) {
  return `<SYSTEM_CAPABILITY>
* You are utilising an Ubuntu virtual machine using ${machineMetadata.arch} architecture with internet access.
* You can feel free to install Ubuntu applications with your bash tool. Use curl instead of wget.
* To open firefox, please just click on the firefox icon.  Note, firefox-esr is what is installed on your system. 
* Using bash tool you can start GUI applications, but you need to set export DISPLAY=:1 and use a subshell. For example "(DISPLAY=:1 xterm &)". GUI apps run with bash tool will appear within your desktop environment, but they may take some time to appear. Take a screenshot to confirm it did.
* When using your bash tool with commands that are expected to output very large quantities of text, redirect into a tmp file and use str_replace_editor or \`grep -n -B <lines before> -A <lines after> <query> <filename>\` to confirm output.
* When viewing a page it can be helpful to zoom out so that you can see everything on the page.  Either that, or make sure you scroll down to see everything before deciding something isn't available.
* When using your computer function calls, they take a while to run and send back to you.  Where possible/feasible, try to chain multiple of these calls all into one function calls request.
* The current date is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.
</SYSTEM_CAPABILITY>
  `;
}

/**
 * Executes a task on a remote computer using Claude AI and handles the interaction loop
 *
 * This function:
 * 1. Sets up a conversation with Claude using the provided task
 * 2. Manages a loop of:
 *    - Getting responses from Claude
 *    - Executing any tools/commands Claude requests
 *    - Feeding results back to Claude
 * 3. Continues until Claude has no more actions to take
 *
 * @param task - The natural language instruction/task to give to Claude
 * @param computer - Instance of Computer class for executing commands
 * @param options - Optional sampling parameters for Claude (model, tokens etc)
 */
export async function useComputer(
  task: string,
  computer: Computer,
  options?: Partial<DefaultSamplingOptions>
) {
  // Merge provided options with defaults
  const samplingOptions = { ...defaultSamplingOptions, ...options };
  const client = new Anthropic();
  const tools = await computer.listAllTools();

  // Initialize conversation history
  const messages: BetaMessageParam[] = [];

  // Add the user's task as first message
  messages.push({
    role: 'user',
    content: task,
  });

  // Create system prompt that tells Claude about the computer's capabilities
  const systemPrompt: BetaTextBlockParam = {
    type: 'text',
    text: systemCapability(computer.machineMetadata),
  };

  // Main interaction loop
  while (true) {
    // Get Claude's response
    const response = await client.beta.messages.create({
      model: samplingOptions.model,
      messages: messages,
      system: [systemPrompt],
      max_tokens: samplingOptions.max_tokens,
      tools: tools,
      betas: ['computer-use-2024-10-22'],
    });

    // Store results from any tools Claude uses
    const toolResults: BetaToolResultBlockParam[] = [];

    // Process Claude's response content sequentially
    const assistantContent: BetaContentBlock[] = [];
    for (const content of response.content) {
      assistantContent.push(content);
      if (content.type === 'text') {
        // Log Claude's text responses
        logger.info(content.text, 'Assistant: ');
      } else if (content.type === 'tool_use') {
        // Execute and log tool usage
        logger.info({ command: content }, 'Executing: ');
        toolResults.push(await handleToolRequest(content, computer));
      }
    }

    // Add Claude's response to conversation history
    messages.push({
      role: 'assistant',
      content: assistantContent,
    });

    // If tools were used, add results to conversation
    // Otherwise end the conversation loop
    if (toolResults.length > 0) {
      messages.push({
        role: 'user',
        content: toolResults,
      });
    } else {
      break;
    }
  }

  // Clean up and log completion
  logger.info({ task }, 'Completed task: ');
  const cleanedMessages = messages.map(cleanMessage);

  return cleanedMessages;
}

/**
 * Handles execution of a single tool use request from Claude
 *
 * @param block - The tool use request from Claude
 * @param computer - The computer instance
 * @returns {Promise<BetaToolResultBlockParam>} - The tool result
 */
async function handleToolRequest(block: BetaToolUseBlock, computer: Computer): Promise<BetaToolResultBlockParam> {
  // Try to parse as computer use action
  const parseAction = Action.safeParse({
    tool: block.name,
    params: block.input,
  });

  if (parseAction.success) {
    logger.debug(parseAction.data, 'Parsed action:');
    return convertToolResult(
        (await computer.execute(parseAction.data)).tool_result,
        block.id
      );
  }

  // Try to parse as MCP (unknown) action
  const parseUnknownAction = UnknownAction.safeParse({
    tool: block.name,
    params: block.input,
  });

  if (parseUnknownAction.success) {
    logger.debug(parseUnknownAction.data, 'Parsed unknown action:');
      const result = await computer.callMcpTool(
        parseUnknownAction.data.tool,
        parseUnknownAction.data.params
      );
    const toolResult: ToolResultBlockParam = {
      tool_use_id: block.id,
      type: 'tool_result',
      content: JSON.stringify(result.content),
      is_error: result.isError
        ? Boolean(result.isError)
        : undefined,
    };
    return toolResult;
  }

  // Return error result
  const result: ToolResult = {
    error: `Tool ${block.name} failed is invalid`,
    output: null,
    base64_image: null,
    system: null,
  };
  const errorResult = convertToolResult(result, block.id);
  logger.debug({ tool_use_error: errorResult }, 'Could not parse tool use');
  return errorResult;
}