import { WebSocket, type MessageEvent } from 'ws';
import {
  ComputerMessage,
  HDRConfig,
  MachineMetadata,
  type ToolI,
} from './types';

import { bashTool, computerTool, editTool } from './tools';
import { ComputerLogger } from './utils/computerLogger';
import { createModuleLogger } from './utils/logger';
import { EventEmitter } from 'events';
import { Action } from './schemas/action';

const logger = createModuleLogger('Computer');

/**
 * Interface defining the core functionality for computer control
 */
export interface IComputer {
  /**
   * Establishes a WebSocket connection to the computer
   * @throws Error if connection fails or times out
   */
  connect(): Promise<void>;

  /**
   * Executes a command on the connected computer
   * @param command The action to execute (bash command or computer control action)
   * @returns A promise that resolves with the computer's response message
   * @throws Error if not connected or command execution fails
   */
  execute(command: Action): Promise<ComputerMessage>;

  /**
   * Checks if there is an active WebSocket connection to the computer
   * @returns true if WebSocket connection is open, false otherwise
   */
  isConnected(): boolean;
}

/**
 * Configuration options for customizing Computer behavior
 */
export interface ComputerOptions {
  /** Base URL for the WebSocket connection */
  baseUrl?: string;
  /** API key for authentication */
  apiKey?: string;
  /** Tools available to the computer */
  tools?: Set<ToolI>;
  /** Handler for processing incoming messages */
  onMessage: (message: ComputerMessage) => void | Promise<void>;
  /** Handler for parsing raw WebSocket messages */
  parseMessage: (message: MessageEvent) => void | ComputerMessage;
  /** Optional handler called when connection is established */
  onOpen?: () => void | Promise<void>;
  /** Optional handler for connection errors */
  onError?: (error: Error) => void;
  /** Optional handler for connection close events */
  onClose?: (code: number, reason: string) => void;
  /** Optional transform function for outgoing messages */
  beforeSend?: (data: unknown) => unknown;
}

/**
 * Default configuration options for Computer instances
 */
const defaultOptions: ComputerOptions = {
  tools: new Set([bashTool, computerTool, editTool]),
  onOpen: () => {},
  onMessage: () => {},
  onError: () => {},
  onClose: () => {},
  parseMessage: (message) => {
    console.log('message', message);
    return ComputerMessage.parse(JSON.parse(message.toString()));
  },
};

/**
 * Main class for establishing connections and controlling a remote computer
 * Implements EventEmitter pattern for WebSocket event handling
 */
export class Computer extends EventEmitter implements IComputer {
  /** Configuration settings for the computer connection */
  private config: HDRConfig;
  /** Options for customizing behavior */
  private options: ComputerOptions;
  /** WebSocket connection instance */
  private ws: WebSocket | null = null;
  /** Logger instance for this computer */
  private logger: ComputerLogger;

  /** ISO timestamp when instance was created */
  createdAt: string;
  /** ISO timestamp of last received message */
  updatedAt: string | null = null;
  /** Unique identifier for current session */
  sessionId: string | null = null;
  /** Connected computer's hostname */
  machineMetadata: MachineMetadata | null = null;
  /** Tools available to the computer */
  tools: Set<ToolI> = new Set();

  /**
   * Creates a new Computer instance
   * @param baseUrl WebSocket server URL
   * @param apiKey Authentication API key
   * @param options Configuration options
   */
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

  /**
   * Sets up event handlers for WebSocket events
   * @private
   */
  private setupEventHandlers() {
    this.on('open', this.onOpen);
    this.on('message', this.onMessage);
    this.on('error', this.onError);
    this.on('close', this.onClose);
  }

  /**
   * Handles WebSocket open events
   * @private
   */
  private onOpen() {
    this.options.onOpen?.();
  }

  private parseMessage(message: MessageEvent): ComputerMessage {
    this.options.parseMessage(message);
    return ComputerMessage.parse(JSON.parse(message.toString()));
  }

  /**
   * Handles incoming WebSocket messages
   * @param message The raw message event from WebSocket
   * @private
   */
  private onMessage(message: MessageEvent) {
    const parsedMessage = this.parseMessage(message);
    this.setUpdatedAt(parsedMessage.metadata.response_timestamp.getTime());
    this.logger.logReceive(parsedMessage);
    this.handleConnectionMessage(parsedMessage);
    this.options.onMessage(parsedMessage);
  }

  /**
   * Handles WebSocket error events
   * @param error The error that occurred
   * @private
   */
  private onError(error: Error) {
    logger.error(`Error: ${error.message}`);
    this.options.onError?.(error);
  }

  /**
   * Handles WebSocket close events
   * @param code The close code
   * @param reason The reason for closing
   * @private
   */
  private onClose(code: number, reason: string) {
    logger.info(`Connection closed: ${code} ${reason}`);
    this.options.onClose?.(code, reason);
  }

  /**
   * Processes connection-related messages and updates session info
   * @param message The parsed computer message
   * @private
   */
  private handleConnectionMessage(message: ComputerMessage) {
    // We assume that the connection message, and only the connection message, will have the following parse succeed
    console.log('message', message);
    const tryParse = MachineMetadata.safeParse(message.tool_result.system);

    if (tryParse.success) {
      const machineMetadata = tryParse.data;
      this.machineMetadata = machineMetadata;
      this.sessionId = message.metadata.session_id;
    } else {
      console.log('tryParse', tryParse);
    }
  }

  /**
   * Establishes a WebSocket connection to the computer
   * @returns Promise that resolves when connection is established
   * @throws Error if connection fails
   */
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

  /**
   * Sends raw data through the WebSocket connection
   * @param data Data to send (will be JSON stringified if not a string)
   * @throws Error if not connected
   */
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

  /**
   * Executes a command on the connected computer
   * This method will connect to a computer if not already connected
   * @param command The action to execute
   * @returns Promise resolving to the computer's response
   */
  public async execute(command: Action): Promise<ComputerMessage> {
    await this.ensureConnected();
    logger.info('Sending command:', JSON.stringify(command));

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

  /**
   * Updates the timestamp of last received message
   * @param timestamp Unix timestamp in milliseconds
   * @private
   */
  private setUpdatedAt(timestamp: number) {
    this.updatedAt = new Date(timestamp).toISOString();
  }

  /**
   * Ensures there is an active connection, connecting if necessary
   * @private
   */
  private async ensureConnected() {
    if (!this.isConnected()) {
      await this.connect();
    }
  }

  /**
   * Checks if there is an active WebSocket connection
   * @returns true if connected, false otherwise
   */
  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Closes the WebSocket connection if open
   */
  public async close() {
    this.ws?.close();
    this.ws = null;
  }

  /**
   * Takes a screenshot of the connected computer's display
   * @returns Promise resolving to base64 encoded PNG image data
   * @throws Error if screenshot capture fails
   */
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
