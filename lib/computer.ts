import { readFile } from 'fs/promises';
import {
  ComputerMessage,
  HDRConfig,
  MachineMetadata,
  type StartServerResponse,
} from './types';

import { bashTool, computerTool } from './tools';
import { ComputerLogger } from './utils/computerLogger';
import { Action } from './schemas/action';
import { useComputer } from './anthropic';
import {
  Client,
  type ClientOptions,
} from '@modelcontextprotocol/sdk/client/index.js';
import { VERSION, MCP_CLIENT_NAME } from './constants';
import type {
  CallToolRequest,
  CallToolResultSchema,
  CompatibilityCallToolResultSchema,
  Implementation,
  ServerCapabilities,
} from '@modelcontextprotocol/sdk/types.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type { RequestOptions } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type {
  BetaToolUnion,
  BetaTool,
} from '@anthropic-ai/sdk/resources/beta/index.mjs';
import { fetchAndValidate } from './utils/fetchAndValidate';
import path from 'path';
import { HdrApi } from './api';

// Polyfill is a workaround required by MCP SDK  - asebexen
// Solution taken from https://github.com/pocketbase/pocketbase/discussions/3285
import { EventSource } from 'eventsource';
global.EventSource = EventSource;

/**
 * Options that may be passed to Computer.connect()
 */
export interface ConnectOptions {
  /** Override the default MCP URL, which is derived from Computer.options */
  mcpUrl?: string;
}

/**
 * Configuration options for the Computer instance
 */
export interface ComputerOptions {
  /** Vers Server base URL */
  baseUrl: string;
  /** HDR API key for authentication */
  apiKey: string | null;
  /** Set of available tools for computer control */
  tools: Set<BetaToolUnion>;
  logOutput: boolean;
}

/**
 * Default configuration options for the Computer instance
 */
const defaultOptions: ComputerOptions = {
  baseUrl: process.env.HDR_BASE_URL || 'https://api.hdr.is/compute/',
  apiKey: process.env.HDR_API_KEY ?? null,
  tools: new Set([bashTool, computerTool]),
  logOutput: true,
};

/**
 * Metadata for the MCP client
 */
const mcpClientInfo: Implementation = {
  name: MCP_CLIENT_NAME,
  version: VERSION,
};

/**
 * Main class for managing computer control operations through WebSocket, as well as MCP operations
 * @extends EventEmitter
 */
export class Computer {
  private config: HDRConfig;
  private options: ComputerOptions;
  private mcpClient: Client | null = null;
  private logger: ComputerLogger;
  createdAt: string;
  updatedAt: string | null = null;
  sessionId: string | null = null;
  machineMetadata: MachineMetadata;
  api: HdrApi;

  /**
   * You probably want to await Computer.create instead.
   */
  constructor(options: ComputerOptions, machineMetadata: MachineMetadata) {
    this.options = options;
    this.machineMetadata = machineMetadata;
    this.config = HDRConfig.parse({
      base_url: this.options.baseUrl,
      api_key: this.options.apiKey,
    });
    this.logger = new ComputerLogger();
    this.createdAt = new Date().toISOString();
    this.api = new HdrApi(this.getHostname(), this.options.apiKey);
  }

  static async create(
    options: Partial<ComputerOptions> = {}
  ): Promise<Computer> {
    const optionsWithDefaults: ComputerOptions = {
      ...defaultOptions,
      ...options,
    };
    if (process.env.HOSTNAME_OVERRIDE) {
      optionsWithDefaults.baseUrl = process.env.HOSTNAME_OVERRIDE;
    }

    const resourceUrl = process.env.HOSTNAME_OVERRIDE
      ? new HdrApi(process.env.HOSTNAME_OVERRIDE, null).paths.system
      : `${optionsWithDefaults.baseUrl}/connect`;

    // Request resources from the server
    const machineMetadata = await fetchAndValidate(
      resourceUrl,
      MachineMetadata,
      {
        headers: {
          Authorization: `Bearer ${optionsWithDefaults.apiKey}`,
        },
      }
    );

    const computer = new Computer(optionsWithDefaults, machineMetadata);
    await computer.connectMcp();

    return computer;
  }

  /**
   * Establish MCP Client connection
   * @private
   */
  private async connectMcp(): Promise<void> {
    const options: ClientOptions = {
      capabilities: {},
    };
    this.mcpClient = new Client(mcpClientInfo, options);
    const transport = new SSEClientTransport(new URL(this.api.paths.mcp.base));

    return this.mcpClient.connect(transport);
  }

  /**
   * Executes a command and waits for response
   * @param {Action} action - Command to execute
   * @returns {Promise<ComputerMessage>} Response message
   */
  public async execute(action: Action): Promise<ComputerMessage> {
    this.logger.logSend(action);
    const message = await this.api.useComputer(action);
    this.logger.logReceive(message);
    return message;
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
  ) {
    if (provider === 'custom') {
      throw new Error(
        'Custom providers are not supported for this method. Use the execute method instead.'
      );
    }
    return useComputer(objective, this);
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
   * @param {BetaToolUnion[]} tools - Array of tools to register
   */
  public registerTool(tools: BetaToolUnion[]) {
    tools.forEach((tool) => {
      this.options.tools?.add(tool);
    });
  }

  /**
   * Lists all registered computer use tools
   * @returns {BetaToolUnion[]} Array of registered computer use tools
   */
  public listComputerUseTools(): BetaToolUnion[] {
    return Array.from(this.options.tools ?? new Set());
  }

  /**
   * Starts an MCP server by invoking the supplied shell command. If the server is already running, returns the server's info without starting another instance.
   */
  public async startMcpServer(
    name: string,
    command: string
  ): Promise<StartServerResponse> {
    if (!this.mcpClient)
      throw new Error(
        'MCP Client not connected; have you called Computer.connect()?'
      );

    return this.api.startMcpServer(name, command);
  }

  public async callMcpTool(
    name: string,
    args?: Record<string, unknown>,
    resultSchema?:
      | typeof CallToolResultSchema
      | typeof CompatibilityCallToolResultSchema,
    options?: RequestOptions
  ) {
    if (!this.mcpClient)
      throw new Error(
        'MCP Client not connected; have you called Computer.connect()?'
      );
    const params: CallToolRequest['params'] = {
      name,
      arguments: args,
    };

    return this.mcpClient.callTool(params, resultSchema, options);
  }

  /**
   * @returns a list of tools exposed by all currently-running MCP servers
   */
  public async listMcpTools(): Promise<BetaTool[]> {
    if (!this.mcpClient)
      throw new Error(
        'MCP Client not connected; have you called Computer.connect()?'
      );
    return this.mcpClient.listTools().then((x) =>
      // Rename inputSchema to input_schema
      x.tools.map((tool) => {
        const { inputSchema, ...rest } = tool;
        const betaTool: BetaTool = {
          ...rest,
          input_schema: inputSchema,
        };
        return betaTool;
      })
    );
  }

  public async getMcpServerCapabilities(): Promise<
    ServerCapabilities | undefined
  > {
    if (!this.mcpClient)
      throw new Error(
        'MCP Client not connected; have you called Computer.connect()?'
      );
    return this.mcpClient.getServerCapabilities();
  }

  public async getMcpServerVersion(): Promise<Implementation | undefined> {
    if (!this.mcpClient)
      throw new Error(
        'MCP Client not connected; have you called Computer.connect()?'
      );
    return this.mcpClient.getServerVersion();
  }

  public async mcpPing() {
    if (!this.mcpClient)
      throw new Error(
        'MCP Client not connected; have you called Computer.connect()?'
      );
    return this.mcpClient.ping();
  }

  /**
   * @returns a list of all tools, both computer use and MCP.
   */
  public async listAllTools(): Promise<BetaToolUnion[]> {
    return [...this.listComputerUseTools(), ...(await this.listMcpTools())];
  }

  public async putFile(path: string) {
    const file = await readFile(path);
    const pathParts = path.split('/');
    const filename = pathParts[pathParts.length - 1];

    const response = await this.api.uploadFile(filename, new Blob([file]));

    if (!response.ok) {
      throw new Error(
        `${response.status} ${response.statusText}: ${await response.text()}`
      );
    }

    return response;
  }

  getHostname(): string {
    if (process.env.HOSTNAME_OVERRIDE) {
      return process.env.HOSTNAME_OVERRIDE;
    } else if (this.machineMetadata.machine_id) {
      return path.join(
        'https://api.hdr.is',
        'compute',
        this.machineMetadata.machine_id
      );
    } else {
      throw new Error(
        'Unable to resolve hostname: machine_id is null and HOSTNAME_OVERRIDE is unset.'
      );
    }
  }
}
