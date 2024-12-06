import fs from 'fs';
import path from 'path';
import {
  LogConfig,
  type ComputerMessage,
  type ComputerMessageLog,
} from '../types';
import { createModuleLogger } from './logger';
import type { Action } from '../schemas/action';

const logger = createModuleLogger('ComputerLogger');

export class ComputerLogger {
  private logDir: string;
  private conversationFile: string;
  private runDir: string;
  private conversationLogFile: string;

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
    this.runDir = path.join(this.logDir, parsedOptions.runDir);
    logger.debug(`Creating run directory: ${this.runDir}`);
    this.conversationLogFile = path.join(this.runDir, this.conversationFile);

    fs.mkdirSync(this.logDir, { recursive: true });
    fs.mkdirSync(this.runDir, { recursive: true });
  }

  /**
   * Logs a command to the conversation log file
   * @param command - The command to log
   */
  public logSend(command: Action): void {
    fs.appendFileSync(this.conversationLogFile, JSON.stringify(command) + '\n');
  }

  public logReceive(message: ComputerMessage): void {
    logger.debug(`Logging message: ${JSON.stringify(message)}`);
    const screenshot_file = this.logScreenshot(message);
    const messageDict: ComputerMessageLog = { ...message };
    if (screenshot_file) {
      messageDict.screenshot_file = screenshot_file;
    }
    delete messageDict.result.base64_image;

    fs.appendFileSync(
      this.conversationLogFile,
      JSON.stringify(messageDict) + '\n'
    );
  }

  private logScreenshot(message: ComputerMessage): string | null {
    if (message.result.base64_image) {
      const screenshot_file = path.join(
        this.runDir,
        `screenshot_${message.timestamp}.png`
      );
      logger.debug(`Logging screenshot to: ${screenshot_file}`);
      const imageBuffer = Buffer.from(message.result.base64_image, 'base64');
      fs.writeFileSync(screenshot_file, imageBuffer);
      return screenshot_file;
    }
    return null;
  }

  public cleanup(): void {
    logger.debug(`Cleaning up run directory: ${this.runDir}`);
    fs.readdirSync(this.runDir).forEach((file) => {
      fs.unlinkSync(path.join(this.runDir, file));
    });
    fs.rmdirSync(this.runDir);
  }
}
