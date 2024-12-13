import { z } from 'zod';
import 'dotenv/config';

/**
 * Configuration for connecting to the HDR API
 * @property api_key - API key for authentication, defaults to HDR_API_KEY env var
 * @property base_url - WebSocket API endpoint, defaults to wss://api.hdr.is
 */
export const HDRConfig = z.object({
  api_key: z.string().default(process.env.HDR_API_KEY || ''),
  base_url: z.string().default('wss://api.hdr.is/compute/ephemeral'),
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

export interface ToolI {
  name: string;
  type: string;
  display_height_px?: number;
  display_width_px?: number;
}
