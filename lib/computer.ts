import { WebSocket, type MessageEvent } from 'ws';
import {
  ComputerMessage,
  HDRConfig,
  MachineMetadata,
  type ToolI,
} from './types';

import { bashTool, computerTool } from './tools';
import { ComputerLogger } from './utils/computerLogger';
import { createModuleLogger } from './utils/logger';
import { EventEmitter } from 'events';
import { Action } from './schemas/action';
import { useComputer } from './anthropic';

const logger = createModuleLogger('Computer');

export interface IComputer {
  connect(): Promise<void>;
  execute(command: Action): Promise<ComputerMessage>;
  isConnected(): boolean;
}

export interface ComputerOptions {
  baseUrl?: string;
  apiKey?: string;
  tools?: Set<ToolI>;
  onMessage: (message: ComputerMessage) => void | Promise<void>;
  parseMessage: (message: MessageEvent) => void | ComputerMessage;
  onOpen?: () => void | Promise<void>;
  onError?: (error: Error) => void;
  onClose?: (code: number, reason: string) => void;
  beforeSend?: (data: unknown) => unknown;
}

const defaultOptions: ComputerOptions = {
  baseUrl: process.env.HDR_BASE_URL || 'wss://api.hdr.is/compute/ephemeral',
  tools: new Set([bashTool, computerTool]),
  onOpen: () => {},
  onMessage: () => {},
  onError: () => {},
  onClose: () => {},
  parseMessage: (message: MessageEvent) => {
    return ComputerMessage.parse(JSON.parse(message.toString()));
  },
};

export class Computer extends EventEmitter implements IComputer {
  private config: HDRConfig;
  private options: ComputerOptions;
  private ws: WebSocket | null = null;
  private logger: ComputerLogger;
  createdAt: string;
  updatedAt: string | null = null;
  sessionId: string | null = null;
  machineMetadata: MachineMetadata | null = null;
  tools: Set<ToolI> = new Set();

  constructor(options: Partial<ComputerOptions> = {}) {
    super();
    this.options = { ...defaultOptions, ...options };
    this.config = HDRConfig.parse({
      base_url: options.baseUrl,
      api_key: options.apiKey,
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

  private parseMessage(message: MessageEvent): ComputerMessage {
    this.options.parseMessage(message);
    return ComputerMessage.parse(JSON.parse(message.toString()));
  }

  private onMessage(message: MessageEvent) {
    const parsedMessage = this.parseMessage(message);
    this.setUpdatedAt(parsedMessage.metadata.response_timestamp.getTime());
    this.logger.logReceive(parsedMessage);
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
    const tryParse = MachineMetadata.safeParse(message.tool_result.system);

    if (tryParse.success) {
      const machineMetadata = tryParse.data;
      this.machineMetadata = machineMetadata;
      this.sessionId = message.metadata.session_id;

      const updatedComputerTool = {
        ...computerTool,
        display_height_px: machineMetadata.display_height ?? 0,
        display_width_px: machineMetadata.display_width ?? 0,
      };

      this.options.tools?.delete(computerTool);
      this.options.tools?.add(updatedComputerTool);
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

  private async send(data: Action): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    this.logger.logSend(data);

    const processed = this.options.beforeSend?.(data) ?? data;
    const message =
      typeof processed === 'string' ? processed : JSON.stringify(processed);
    this.ws?.send(message);
  }

  public async execute(command: Action): Promise<ComputerMessage> {
    await this.ensureConnected();
    logger.info({ command }, 'Sending command:');

    return new Promise((resolve) => {
      const handleMessage = (message: MessageEvent) => {
        const response = this.parseMessage(message);
        this.removeListener('message', handleMessage);
        resolve(response);
      };

      this.addListener('message', handleMessage);
      this.send(command);
    });
  }

  public async do(
    objective: string,
    provider: 'anthropic' | 'custom' = 'anthropic'
  ): Promise<void> {
    if (provider === 'custom') {
      throw new Error(
        'Custom providers are not supported for this method. Use the execute method instead.'
      );
    }
    await useComputer(objective, this);
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

    if (!message.tool_result.base64_image) {
      throw new Error('No screenshot data received');
    }
    return message.tool_result.base64_image;
  }

  public registerTool(tools: ToolI[]) {
    tools.forEach((tool) => {
      this.options.tools?.add(tool);
    });
  }

  public listTools(): ToolI[] {
    return Array.from(this.options.tools ?? new Set());
  }
}
