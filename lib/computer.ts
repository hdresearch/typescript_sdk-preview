import { WebSocket, type Event, type MessageEvent } from 'ws';
import { ComputerMessage, HDRConfig } from './types';
import { ComputerLogger } from './utils/computerLogger';
import { createModuleLogger } from './utils/logger';
import { EventEmitter } from 'events';
import { Action } from './schemas/action';
const logger = createModuleLogger('Computer');

export interface IComputer {
  /**
   * Establishes a connection to the computer
   * @throws Error if connection fails
   */
  connect(): Promise<void>;

  /**
   * Executes a command on the computer
   * @param command The command to execute
   * @returns A promise that resolves with the computer's response
   */
  execute(command: Action): Promise<ComputerMessage>;

  /**
   * Checks if the computer is currently connected
   * @returns true if connected, false otherwise
   */
  isConnected(): boolean;
}

interface ComputerOptions {
  // Required handlers
  onMessage: (message: MessageEvent) => void | Promise<void>;
  parseMessage: (message: MessageEvent) => any;

  // Optional handlers
  onOpen?: () => void | Promise<void>;
  onError?: (error: Error) => void;
  onClose?: (code: number, reason: string) => void;
  beforeSend?: (data: any) => any;
}

const defaultOptions: ComputerOptions = {
  onOpen: () => {},
  onMessage: () => {},
  onError: () => {},
  onClose: () => {},
  parseMessage: (message: MessageEvent) =>
    ComputerMessage.parse(JSON.parse(message.toString())),
};

export class Computer extends EventEmitter implements IComputer {
  private config: HDRConfig;
  private options: ComputerOptions;
  private ws: WebSocket | null = null;
  private logger: ComputerLogger;

  createdAt: string;
  updatedAt: string | null = null;
  sessionId: string | null = null;
  host: string | null = null;
  accessToken: string | null = null;

  constructor(
    baseUrl: string,
    apiKey: string,
    options: Partial<ComputerOptions> = {}
  ) {
    super();
    this.options = { ...defaultOptions, ...options };
    this.config = HDRConfig.parse({
      base_url: baseUrl,
      api_key: apiKey,
    });
    this.logger = new ComputerLogger();
    this.createdAt = new Date().toISOString();

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.on('open', this.onOpen);
    this.on('message', this.onMessage);
    this.on('error', this.onError);
    this.on('close', this.onClose);
  }

  private onOpen() {
    this.options.onOpen?.();
  }

  private onMessage(message: MessageEvent) {
    const parsedMessage = this.options.parseMessage(message);
    this.setUpdatedAt(parsedMessage.timestamp);
    this.handleConnectionMessage(parsedMessage);
    this.options.onMessage(parsedMessage);
  }

  private onError(error: Error) {
    logger.error(`Error: ${error.message}`);
    this.options.onError?.(error);
  }

  private onClose(code: number, reason: string) {
    logger.info(`Connection closed: ${code} ${reason}`);
    this.options.onClose?.(code, reason);
  }

  private handleConnectionMessage(message: ComputerMessage) {
    if (message.result.output.message) {
      this.sessionId = message.session_id;
      this.host = message.result.output.data.host;
      this.accessToken = message.result.output.data.access_token;
    }
  }

  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.config.base_url, {
        headers: { Authorization: `Bearer ${this.config.api_key}` },
      });

      this.ws.on('open', () => {
        this.emit('connected');
        resolve();
      });

      this.ws.on('message', (message) => {
        this.emit('message', message);
      });

      this.ws.on('error', (error) => {
        this.emit('error', error);
        reject(error);
      });

      this.ws.on('close', (code, reason) => {
        this.emit('close', code, reason);
        reject(new Error(`Connection closed: ${code} ${reason}`));
      });
    });
  }

  public async send(data: any): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }
    // If data is already a string, use it as-is. If not, convert to JSON string
    const processed = this.options.beforeSend?.(data) ?? data;
    // If already string, use as-is, otherwise stringify
    const message =
      typeof processed === 'string' ? processed : JSON.stringify(processed);
    this.ws?.send(message);
  }

  public async execute(command: Action): Promise<ComputerMessage> {
    await this.ensureConnected();
    logger.info('Sending command:', JSON.stringify(command));
    return new Promise((resolve) => {
      const handleMessage = (message: MessageEvent) => {
        const response = this.options.parseMessage(message);
        this.removeListener('message', handleMessage);
        resolve(response);
      };

      this.addListener('message', handleMessage);
      this.send(command);
    });
  }

  private setUpdatedAt(timestamp: number) {
    this.updatedAt = new Date(timestamp).toISOString();
  }

  private async ensureConnected() {
    if (!this.isConnected()) {
      await this.connect();
    }
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  public async close() {
    this.ws?.close();
    this.ws = null;
  }

  public async screenshot(): Promise<string> {
    const message = await this.execute({
      tool: 'computer',
      params: { action: 'screenshot' },
    });

    if (!message.result.base64_image) {
      throw new Error('No screenshot data received');
    }
    return message.result.base64_image;
  }
}
