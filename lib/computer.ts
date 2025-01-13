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
import { getStreamUrl, getWSSUrl } from './utils/urls';

const logger = createModuleLogger('Computer');

/**
 * Interface defining the core functionality for computer control operations
 */
export interface IComputer {
  /** Establishes a WebSocket connection to the computer control server */
  connect(): Promise<void>;
  /** Executes a specified command action on the connected computer */
  execute(command: Action): Promise<ComputerMessage>;
  /** Checks if the WebSocket connection is currently active */
  isConnected(): boolean;
}

/**
 * Configuration options for the Computer instance
 */
export interface ComputerOptions {
  /** Base WebSocket URL for the server */
  baseUrl?: string;
  /** HDR API key for authentication */
  apiKey?: string;
  /** Set of available tools for computer control */
  tools?: Set<ToolI>;
  logOutput?: boolean;
  /** Callback function for handling incoming messages */
  onMessage: (message: ComputerMessage) => void | Promise<void>;
  /** Function to parse incoming WebSocket messages */
  parseMessage: (message: MessageEvent) => void | ComputerMessage;
  /** Callback function triggered when connection is established */
  onOpen?: () => void | Promise<void>;
  /** Error handling callback */
  onError?: (error: Error) => void;
  /** Callback function for connection closure */
  onClose?: (code: number, reason: string) => void;
  /** Pre-processing function for outgoing data */
  beforeSend?: (data: unknown) => unknown;
}

/**
 * Default configuration options for the Computer instance
 */
const defaultOptions: ComputerOptions = {
  baseUrl: process.env.HDR_BASE_URL || 'wss://api.hdr.is/compute/ephemeral',
  tools: new Set([bashTool, computerTool]),
  logOutput: true,
  onOpen: () => {},
  onMessage: () => {},
  onError: () => {},
  onClose: () => {},
  parseMessage: (message: MessageEvent) => {
    return ComputerMessage.parse(JSON.parse(message.toString()));
  },
};

/**
 * Main class for managing computer control operations through WebSocket
 * @extends EventEmitter
 * @implements IComputer
 */
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

  /**
   * Creates a new Computer instance
   * @param {Partial<ComputerOptions>} options - Configuration options for the computer control interface
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
   * Handles WebSocket open event
   * @private
   */
  private onOpen() {
    this.options.onOpen?.();
  }

  /**
   * Parses incoming WebSocket messages
   * @param {MessageEvent} message - Raw WebSocket message
   * @returns {ComputerMessage} Parsed message object
   * @private
   */
  private parseMessage(message: MessageEvent): ComputerMessage {
    this.options.parseMessage(message);
    return ComputerMessage.parse(JSON.parse(message.toString()));
  }

  /**
   * Processes incoming WebSocket messages
   * @param {MessageEvent} message - WebSocket message event
   * @private
   */
  private onMessage(message: MessageEvent) {
    const parsedMessage = this.parseMessage(message);
    this.setUpdatedAt(parsedMessage.metadata.response_timestamp.getTime());
    if (this.options.logOutput) {
      this.logger.logReceive(parsedMessage);
    }
    this.handleConnectionMessage(parsedMessage);
    this.options.onMessage(parsedMessage);
  }

  /**
   * Handles WebSocket error events
   * @param {Error} error - Error object
   * @private
   */
  private onError(error: Error) {
    logger.error(`Error: ${error.message}`);
    this.options.onError?.(error);
  }

  /**
   * Handles WebSocket close events
   * @param {number} code - Close status code
   * @param {string} reason - Close reason
   * @private
   */
  private onClose(code: number, reason: string) {
    logger.info(`Connection closed: ${code} ${reason}`);
    this.options.onClose?.(code, reason);
  }

  /**
   * Processes connection-related messages and updates machine metadata
   * @param {ComputerMessage} message - Parsed computer message
   * @private
   */
  private handleConnectionMessage(message: ComputerMessage) {
    const tryParse = MachineMetadata.safeParse(
      JSON.parse(message.tool_result.system ?? '{}')
    );

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

  /**
   * Establishes WebSocket connection
   * @returns {Promise<void>}
   */
  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wssUrl = getWSSUrl(this.config.base_url);
      logger.info(`Connecting to ${wssUrl}`);
      this.ws = new WebSocket(wssUrl, {
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
   * Sends data through WebSocket connection
   * @param {Action} data - Action to be sent
   * @returns {Promise<void>}
   * @private
   */
  private async send(data: Action): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    if (this.options.logOutput) {
      this.logger.logSend(data);
    }

    const processed = this.options.beforeSend?.(data) ?? data;
    const message =
      typeof processed === 'string' ? processed : JSON.stringify(processed);
    this.ws?.send(message);
  }

  /**
   * Executes a command and waits for response
   * @param {Action} command - Command to execute
   * @returns {Promise<ComputerMessage>} Response message
   */
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

  /**
   * Executes a high-level objective using specified provider
   * @param {string} objective - Description of the task to perform
   * @param {'anthropic' | 'custom'} provider - Provider to use for execution
   * @returns {Promise<void>}
   */
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

  /**
   * Updates the last activity timestamp
   * @param {number} timestamp - Unix timestamp
   * @private
   */
  private setUpdatedAt(timestamp: number) {
    this.updatedAt = new Date(timestamp).toISOString();
  }

  /**
   * Ensures WebSocket connection is established
   * @private
   */
  private async ensureConnected() {
    if (!this.isConnected()) {
      await this.connect();
    }
  }

  /**
   * Checks if WebSocket connection is active
   * @returns {boolean} Connection status
   */
  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Closes the WebSocket connection
   * @returns {Promise<void>}
   */
  public async close() {
    this.ws?.close();
    this.ws = null;
  }

  /**
   * Takes a screenshot of the connected computer
   * @returns {Promise<string>} Base64 encoded screenshot
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

  /**
   * Registers new tools for computer control
   * @param {ToolI[]} tools - Array of tools to register
   */
  public registerTool(tools: ToolI[]) {
    tools.forEach((tool) => {
      this.options.tools?.add(tool);
    });
  }

  /**
   * Lists all registered tools
   * @returns {ToolI[]} Array of registered tools
   */
  public listTools(): ToolI[] {
    return Array.from(this.options.tools ?? new Set());
  }

  /**
   * Waits for machine metadata to be available
   * @param {number} timeoutMs - Maximum time to wait in milliseconds (default: 10000)
   * @throws {Error} If metadata is not available within timeout period
   * @private
   */
  private async waitForMetadata(timeoutMs: number = 10000): Promise<void> {
    const startTime = Date.now();
    while (!this.machineMetadata) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error('Timeout waiting for machine metadata');
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  public async videoStreamUrl() {
    if (!this.isConnected()) {
      throw new Error('Computer is not connected.');
    }

    await this.waitForMetadata();

    return getStreamUrl(
      this.config.base_url,
      this.machineMetadata!.machine_id!
    );
  }
}
