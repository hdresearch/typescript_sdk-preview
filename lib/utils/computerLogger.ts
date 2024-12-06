import fs from 'fs';
import path from 'path';
import type { ComputerMessage } from '../types';

export class ComputerLogger {
  private base_dir: string;
  private conversation_file: string;
  private run_dir: string;
  private conversation_log_file: string;

  constructor(baseDir: string = 'computer_logs') {
    this.base_dir = baseDir;
    this.conversation_file = 'conversation.jsonl';
    this.run_dir = path.join(this.base_dir, this.getTimestamp());
    this.conversation_log_file = path.join(
      this.run_dir,
      this.conversation_file
    );

    fs.mkdirSync(this.base_dir, { recursive: true });
    fs.mkdirSync(this.run_dir, { recursive: true });
  }

  private getTimestamp(): string {
    return new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
  }

  public logSend(command: any): void {
    fs.appendFileSync(
      this.conversation_log_file,
      JSON.stringify(command) + '\n'
    );
  }

  public logReceive(message: ComputerMessage): void {
    const screenshot_file = this.logScreenshot(message);
    const messageDict = { ...message };
    if (screenshot_file) {
      messageDict.result.screenshot_file = screenshot_file;
    }
    delete messageDict.result.base64_image;

    fs.appendFileSync(
      this.conversation_log_file,
      JSON.stringify(messageDict) + '\n'
    );
  }

  private logScreenshot(message: ComputerMessage): string | null {
    if (message.result.base64_image) {
      const screenshot_file = path.join(
        this.run_dir,
        `screenshot_${message.timestamp}.png`
      );
      const imageBuffer = Buffer.from(message.result.base64_image, 'base64');
      fs.writeFileSync(screenshot_file, imageBuffer);
      return screenshot_file;
    }
    return null;
  }

  public cleanup(): void {
    fs.readdirSync(this.run_dir).forEach((file) => {
      fs.unlinkSync(path.join(this.run_dir, file));
    });
    fs.rmdirSync(this.run_dir);
  }
}
