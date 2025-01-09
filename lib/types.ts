import { z } from 'zod';
import 'dotenv/config';
import type { BetaMessageParam } from '@anthropic-ai/sdk/resources/beta/index.mjs';
import { ToolSchema, type Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Configuration for connecting to the HDR API
 * @property api_key - API key for authentication, defaults to HDR_API_KEY env var
 * @property ws_url - WebSocket API endpoint, defaults to wss://api.hdr.is
 * @property mcp - MCP API endpoint
 */
export const HDRConfig = z.object({
  api_key: z.string().default(process.env.HDR_API_KEY || ''),
  ws_url: z.string().default('wss://api.hdr.is/compute/ephemeral'),
  mcp_url: z.string(),
  log_dir: z.string().default('./computer_logs'),
  log_conversation: z.boolean().default(true),
});
export type HDRConfig = z.infer<typeof HDRConfig>;

export const LogConfig = z.object({
  logDir: z.string().default('./computer_logs'),
  runDir: z.string().default(new Date().toISOString()),
  logScreenshot: z.boolean().default(true),
  logConversation: z.boolean().default(true),
});
export type LogConfig = z.infer<typeof LogConfig>;

export const ToolResult = z.object({
  output: z.string().nullable(),
  error: z.string().nullable(),
  base64_image: z.string().nullable(),
  system: z.string().nullable(),
});
export type ToolResult = z.infer<typeof ToolResult>;

const Metadata = z.object({
  session_id: z.string().uuid(),
  message_id: z.string().uuid(),
  request_timestamp: z
    .string()
    .datetime()
    .transform((x) => new Date(x)),
  response_timestamp: z
    .string()
    .datetime()
    .transform((x) => new Date(x)),
});
type Metadata = z.infer<typeof Metadata>;

export const ComputerMessage = z.object({
  raw_input: z.string(),
  tool_result: ToolResult,
  metadata: Metadata,
});
export type ComputerMessage = z.infer<typeof ComputerMessage>;

export const ComputerMessageLog = ComputerMessage.extend({
  screenshot_file: z.string().optional(),
});
export type ComputerMessageLog = z.infer<typeof ComputerMessageLog>;

// The data payload that is expected to be stringified in `output.system` on connection.
export const MachineMetadata = z.object({
  display_height: z.number().nullable(),
  display_width: z.number().nullable(),
  display_num: z.number().nullable(),
  arch: z.string().nullable(),
  hostname: z.string().nullable(),
  access_token: z.string().nullable(),
});
export type MachineMetadata = z.infer<typeof MachineMetadata>;

export interface DefaultSamplingOptions {
  model: string;
  max_tokens: number;
  system: string;
  messages: BetaMessageParam[];
  temperature: number;
}

export const defaultSamplingOptions: DefaultSamplingOptions = {
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 4096,
  temperature: 0,
  system: '',
  messages: [],
};

/**
 * Contains information required by Hudson to spawn a new MCP server.
 * @property command - The shell command Hudson will run to spawn the server (such as `npx` or `uvx`)
 */
export interface StartServerRequest {
  name: string;
  command: string;
}

/**
 * The response returned by Hudson when a server is successfully registered.
 */
export const StartServerResponseSchema = z.object({
  tools: z.array(ToolSchema),
});
/**
 * The response returned by Hudson when a server is successfully registered.
 */
export type StartServerResponse = z.infer<typeof StartServerResponseSchema>;

/**
 * Represents an MCP server currently running on Hudson.
 */
export interface McpServer {
  name: string;
  tools: Tool[];
}
