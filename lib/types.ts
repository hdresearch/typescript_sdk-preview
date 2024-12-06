import { z } from 'zod';
import 'dotenv/config';

/**
 * Configuration for connecting to the HDR API
 * @property api_key - API key for authentication, defaults to HDR_API_KEY env var
 * @property base_url - WebSocket API endpoint, defaults to wss://api.hdr.is
 */
export const HDRConfig = z.object({
  api_key: z.string().default(process.env.HDR_API_KEY || ''),
  base_url: z.string().default('wss://api.hdr.is/compute/ws'),
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

/**
/**
 * Result returned from executing a tool/command
 * @property output - Output data from the tool execution
 * @property base64_image - Optional base64 encoded screenshot
 * @property error - Optional error message if the tool failed
 * @property system - Optional system message/metadata
 */
export const ToolResult = z.object({
  output: z.any(),
  base64_image: z.string().nullish(),
  error: z.string().nullish(),
  system: z.string().nullish(),
});
export type ToolResult = z.infer<typeof ToolResult>;

/**
 * Message format for communication with the Computer
 * @property session_id - Unique identifier for the computer session
 * @property timestamp - Unix timestamp of when the message was created
 * @property result - Result data from tool execution
 * @property error - Optional error message if something went wrong
 */
export const ComputerMessage = z.object({
  session_id: z.string(),
  timestamp: z.number(),
  result: ToolResult,
  error: z.string().nullish(),
});
export type ComputerMessage = z.infer<typeof ComputerMessage>;

export const ComputerMessageLog = ComputerMessage.extend({
  screenshot_file: z.string().optional(),
});
export type ComputerMessageLog = z.infer<typeof ComputerMessageLog>;
