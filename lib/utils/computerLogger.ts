import {
  mkdirSync,
  appendFileSync,
  writeFileSync,
  readdirSync,
  unlinkSync,
  rmdirSync,
} from 'node:fs';
import { join } from 'node:path';
import {
  LogConfig,
  type ComputerMessage,
  type ComputerMessageLog,
} from '../types';
import { createModuleLogger } from './logger';
import type { Action } from '../schemas/action';

const logger = createModuleLogger('ComputerLogger');

/**
 * Class for logging computer interactions and screenshots
 * Handles saving commands, responses and screenshots to disk
 */
export class ComputerLogger {
  private logDir: string;
  private conversationFile: string;
  private runDir: string;
  private conversationLogFile: string;

  /**
   * Creates a new ComputerLogger instance
   * @param options - Configuration options for logging
   * @param options.logDir - Directory to store logs in
   * @param options.logConversation - Whether to log conversation history
   * @param options.logScreenshot - Whether to save screenshots
   * @param options.runDir - Subdirectory for current run's logs
   */
  constructor(
    options: {
      logDir?: string;
      logConversation?: boolean;
      logScreenshot?: boolean;
      runDir?: string;
    } = {}
  ) {
    const parsedOptions = LogConfig.parse(options);
    this.logDir = parsedOptions.logDir;
    this.conversationFile = 'conversation.jsonl';
    this.runDir = join(this.logDir, parsedOptions.runDir);
    logger.debug(`Creating run directory: ${this.runDir}`);
    this.conversationLogFile = join(this.runDir, this.conversationFile);

    mkdirSync(this.logDir, { recursive: true });
    mkdirSync(this.runDir, { recursive: true });
  }

  /**
   * Logs an outgoing command to the conversation log file
   * @param command - The command action to log
   */
  public logSend(command: Action): void {
    appendFileSync(this.conversationLogFile, JSON.stringify(command) + '\n');
  }

  /**
   * Logs an incoming message response to the conversation log file
   * Also handles saving any screenshots included in the message
   * @param message - The message response to log
   */
  public logReceive(message: ComputerMessage): void {
    logger.debug(`Logging message: ${JSON.stringify(message)}`);
    const screenshot_file = this.logScreenshot(message);
    const messageDict: ComputerMessageLog = { ...message };
    if (screenshot_file) {
      messageDict.screenshot_file = screenshot_file;
    }
    messageDict.tool_result.base64_image = null;

    appendFileSync(
      this.conversationLogFile,
      JSON.stringify(messageDict) + '\n'
    );
  }

  /**
   * Saves a screenshot from a message to disk if one is present
   * @param message - Message potentially containing a screenshot
   * @returns Path to saved screenshot file, or null if no screenshot
   * @private
   */
  private logScreenshot(message: ComputerMessage): string | null {
    if (message.tool_result.base64_image) {
      const timestamp = message.metadata.request_timestamp.toISOString();
      const screenshot_file = join(this.runDir, `screenshot_${timestamp}.png`);
      logger.debug(`Logging screenshot to: ${screenshot_file}`);
      const imageBuffer = Buffer.from(
        message.tool_result.base64_image,
        'base64'
      );
      writeFileSync(screenshot_file, new Uint8Array(imageBuffer));
      return screenshot_file;
    }
    return null;
  }

  /**
   * Cleans up all log files and directories created by this logger instance
   */
  public cleanup(): void {
    logger.debug(`Cleaning up run directory: ${this.runDir}`);
    readdirSync(this.runDir).forEach((file) => {
      unlinkSync(join(this.runDir, file));
    });
    rmdirSync(this.runDir);
  }
}
