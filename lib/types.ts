import { z } from 'zod';
import 'dotenv/config';
import type { BetaMessageParam } from '@anthropic-ai/sdk/resources/beta/index.mjs';
import { ToolSchema, type Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Configuration schema for connecting to the HDR API
 * @property api_key - API key for authentication, defaults to HDR_API_KEY env var
 * @property base_url - WebSocket API endpoint, defaults to https://api.hdr.is/compute/
 * @property log_dir - Directory for storing logs, defaults to ./computer_logs
 * @property log_conversation - Whether to log conversations, defaults to true
 */
export const HDRConfig = z.object({
  api_key: z.string().default(process.env.HDR_API_KEY || ''),
  base_url: z.string().default('https://api.hdr.is/compute/'),
  log_dir: z.string().default('./computer_logs'),
  log_conversation: z.boolean().default(true),
});
export type HDRConfig = z.infer<typeof HDRConfig>;

/**
 * Configuration schema for logging options
 * @property logDir - Directory for storing logs
 * @property runDir - Subdirectory for current run, defaults to timestamp
 * @property logScreenshot - Whether to save screenshots, defaults to true
 * @property logConversation - Whether to log conversations, defaults to true
 */
export const LogConfig = z.object({
  logDir: z.string().default('./computer_logs'),
  runDir: z.string().default(new Date().toISOString()),
  logScreenshot: z.boolean().default(true),
  logConversation: z.boolean().default(true),
});
export type LogConfig = z.infer<typeof LogConfig>;

/**
 * Schema for tool execution results
 * @property output - Text output from the tool, if any
 * @property error - Error message if tool execution failed
 * @property base64_image - Base64 encoded screenshot if taken
 * @property system - System-level metadata
 */
export const ToolResult = z.object({
  output: z.string().nullable(),
  error: z.string().nullable(),
  base64_image: z.string().nullable(),
  system: z.string().nullable(),
});
export type ToolResult = z.infer<typeof ToolResult>;

/**
 * Schema for message metadata
 * @property session_id - UUID for the current session
 * @property message_id - UUID for this specific message
 * @property request_timestamp - When the request was sent
 * @property response_timestamp - When the response was received
 */
const Metadata = z.object({
  session_id: z
    .string()
    .uuid()
    .describe('Unique identifier for the current session'),
  message_id: z
    .string()
    .uuid()
    .describe('Unique identifier for this specific message'),
  request_timestamp: z
    .string()
    .datetime()
    .transform((x) => new Date(x))
    .describe('Timestamp when the request was sent, converted to Date object'),
  response_timestamp: z
    .string()
    .datetime()
    .transform((x) => new Date(x))
    .describe(
      'Timestamp when the response was received, converted to Date object'
    ),
});
type Metadata = z.infer<typeof Metadata>;

/**
 * Schema for messages received from the computer
 * @property raw_input - The original input command
 * @property tool_result - Results from tool execution
 * @property metadata - Message metadata
 */
export const ComputerMessage = z.object({
  raw_input: z.string(),
  tool_result: ToolResult,
  metadata: Metadata,
});
export type ComputerMessage = z.infer<typeof ComputerMessage>;

/**
 * Extended schema for logged computer messages
 * Includes optional path to saved screenshot file
 */
export const ComputerMessageLog = ComputerMessage.extend({
  screenshot_file: z.string().optional(),
});
export type ComputerMessageLog = z.infer<typeof ComputerMessageLog>;

/**
 * Schema for machine metadata received on connection
 * Contains information about the remote system's display and architecture
 */
export const MachineMetadata = z.object({
  display_height: z.number().nullable(),
  display_width: z.number().nullable(),
  display_num: z.number().nullable(),
  arch: z.string().nullable(),
  machine_id: z.string().nullable(),
  access_token: z.string().nullable(),
});
export type MachineMetadata = z.infer<typeof MachineMetadata>;

/**
 * Interface for Claude AI sampling options
 * @property model - Claude model to use
 * @property max_tokens - Maximum tokens in response
 * @property system - System prompt
 * @property messages - Conversation history
 * @property temperature - Sampling temperature (0-1)
 */
export interface DefaultSamplingOptions {
  model: string;
  max_tokens: number;
  system: string;
  messages: BetaMessageParam[];
  temperature: number;
}

/**
 * Default sampling options for Claude AI
 */
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
