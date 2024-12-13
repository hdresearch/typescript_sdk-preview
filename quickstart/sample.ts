import Anthropic from '@anthropic-ai/sdk';
import type {
  BetaContentBlock,
  BetaMessageParam,
  BetaTextBlockParam,
  BetaToolResultBlockParam,
  BetaToolUseBlock,
  BetaToolUnion,
} from '@anthropic-ai/sdk/resources/beta/index.mjs';
import { Computer } from '../lib';
import { Action } from '../lib/schemas/action';
import {
  defaultSamplingOptions,
  type DefaultSamplingOptions,
} from './quickstart_utils/types';
import { logger } from '../lib/utils/logger';
import { makeToolResult } from './quickstart_utils/utils';
import { ToolResult } from '../lib/types';

const BASE_URL = 'wss://api.hdr.is/compute/ephemeral';

// This is the base system prompt
// This prompt assumes you have all tools enabled.
// If you want to use a subset of tools, you can modify this prompt to include only the tools you want to use.
function systemCapability(computer: Computer) {
  return `<SYSTEM_CAPABILITY>
* You are utilising an Ubuntu virtual machine using ${computer.machineMetadata?.arch} architecture with internet access.
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

async function useComputer(
  task: string,
  computer: Computer,
  options: Partial<DefaultSamplingOptions>
) {
  const samplingOptions = { ...defaultSamplingOptions, ...options };
  const client = new Anthropic();
  const messages: BetaMessageParam[] = [];

  messages.push({
    role: 'user',
    content: task,
  });

  const systemPrompt: BetaTextBlockParam = {
    type: 'text',
    text: systemCapability(computer),
  };

  if (!computer.isConnected()) {
    throw new Error('Failed to connect to computer');
  }
  logger.info({ tools: computer.listTools() }, 'Tools enabled: ');
  while (true) {
    const response = await client.beta.messages.create({
      model: samplingOptions.model,
      messages: messages,
      system: [systemPrompt],
      max_tokens: samplingOptions.max_tokens,
      tools: computer.listTools() as BetaToolUnion[],
      betas: ['computer-use-2024-10-22'],
    });

    const toolResults: BetaToolResultBlockParam[] = [];

    async function handleToolResult(block: BetaToolUseBlock) {
      const parseAction = Action.safeParse({
        tool: block.name,
        params: block.input,
      });

      let result: ToolResult;
      if (!parseAction.success) {
        result = ToolResult.parse({
          error: `Tool ${block.name} failed is invalid`,
          output: null,
          base64_image: null,
          system: null,
        });
        const errorResult = makeToolResult(result, block.id);
        console.debug(
          { tool_use_error: errorResult },
          'Could not parse tool use'
        );
        toolResults.push(errorResult);
        return;
      }

      logger.debug(JSON.stringify(parseAction.data), 'Parsed action:');

      const computerResponse = await computer.execute(parseAction.data);
      result = await computerResponse.tool_result;
      if (result) {
        const toolResult = makeToolResult(result, block.id);
        toolResults.push(toolResult);
        // logger.info({ tool_result: toolResult }, 'Tool result');
      }
    }

    const assistantContent: BetaContentBlock[] = [];
    // for loop so handleToolResult can be called in order
    for (const content of response.content) {
      assistantContent.push(content);
      if (content.type === 'text') {
        logger.info(content.text, 'Assistant: ');
      } else if (content.type === 'tool_use') {
        logger.info({ command: content }, 'Executing: ');
        await handleToolResult(content);
      }
    }

    messages.push({
      role: 'assistant',
      content: assistantContent,
    });

    if (toolResults.length > 0) {
      messages.push({
        role: 'user',
        content: toolResults,
      });
    } else {
      break;
    }
  }
  computer.close();
  logger.info({ task }, 'Completed task: ');
}

async function main() {
  // await useComputer(
  //   'Move your mouse to the center of the screen and the confirm.',
  //   {}
  // );
  const computer = new Computer({ baseUrl: BASE_URL });
  await computer.connect();
  // await useComputer('Please close firefox', computer, {});
  // await useComputer('Please use cowsay to say hello', computer, {});
  await useComputer(
    'Write a simple static python webserver that displays "Hello world!" and then open the webpage in firefox to confirm it is up.',
    computer,
    {}
  );
  // await useComputer(
  //   'Navigate to https://hdr.is to and get a feel for the aesthetics of the site. Write me a python webserver that creates a static webpage that displays "Hello world!" in a similar style, run the server, and then open the webpage in firefox',
  //   computer,
  //   {}
  // );

  await computer.close();
}

main();
