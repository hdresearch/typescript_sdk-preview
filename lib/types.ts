export interface ToolResult {
  output: any;
  base64_image?: string;
  screenshot_file?: string;
  error?: string;
}

export interface ComputerMessage {
  session_id: string;
  timestamp: number;
  result: ToolResult;
  error?: string;
}
