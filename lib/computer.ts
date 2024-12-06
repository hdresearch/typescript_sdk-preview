import WebSocket from 'ws';
import type { HDRConfig } from './config';
import type { ComputerMessage } from './types';
import { ComputerLogger } from './utils/computerLogger';

class Computer extends WebSocket {
  private id?: string;
  private created_at: string;
  private updated_at?: string;
  private logger: ComputerLogger;
  private access_token?: string;
  private host?: string;

  constructor(config: HDRConfig) {
    super(config.base_url, {
      headers: { Authorization: `Bearer ${config.api_key}` },
      rejectUnauthorized: false,
    });

    this.created_at = new Date().toISOString();
    this.logger = new ComputerLogger();

    this.on('message', this.handleMessage.bind(this));
    this.on('error', this.handleError.bind(this));
  }

  private handleMessage(message: WebSocket.MessageEvent) {
    console.log(message);
  }

  private handleError(error: WebSocket.ErrorEvent) {
    console.error(error);
  }

  private handleInitialConnection(message: ComputerMessage): void {
    this.id = message.session_id;
    const data = message.result.output?.data || {};
    this.access_token = data.access_token;
    this.host = data.host;
  }

  public async execute(command: string): Promise<ComputerMessage> {
    return new Promise((resolve, reject) => {
      this.logger.logSend(command);
      this.send(JSON.stringify(command));

      const handleMessage = (message: ComputerMessage) => {
        this.removeListener('computerMessage', handleMessage);
        this.removeListener('computerError', handleError);
        resolve(message);
      };

      const handleError = (error: Error) => {
        this.removeListener('computerMessage', handleMessage);
        this.removeListener('computerError', handleError);
        reject(error);
      };

      this.once('computerMessage', handleMessage);
      this.once('computerError', handleError);
    });
  }
}
