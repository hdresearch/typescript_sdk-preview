import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Computer } from '../lib/computer';
import { bashTool } from '../lib/tools';
import { computerTool } from '../lib/tools';
import { StartServerResponse } from '../lib/types';

describe('Computer Tests', () => {
  let computer: Computer;

  beforeAll(async () => {
    computer = new Computer();
    await computer.connect();
  });

  afterAll(async () => {
    await computer.close();
  });

  describe('Computer Use Tests', () => {
    it('should handle connect', async () => {
      expect(computer.isConnected()).toBe(true);
    });

    it('should handle connection message', async () => {
      expect(computer.sessionId).toBeDefined();
      expect(computer.machineMetadata).toBeDefined();
      expect(computer.listComputerUseTools()).toEqual([bashTool, computerTool]);
    });

    it('should handle send message', async () => {
      const message = await computer.execute({
        tool: 'computer',
        params: {
          action: 'cursor_position',
        },
      });
      expect(message.tool_result.output).toMatch(/X=\d+,Y=\d+/);
    });

    it('should handle screenshot', async () => {
      const base64_image = await computer.screenshot();
      expect(base64_image).toBeDefined();
    });

    it('should handle bash', async () => {
      const message = await computer.execute({
        tool: 'bash',
        params: { command: 'echo hello world' },
      });
      expect(message.tool_result.output).toBe('hello world');
    });

    it('should handle move mouse', async () => {
      await computer.execute({
        tool: 'computer',
        params: { action: 'mouse_move', coordinate: [100, 100] },
      });

      const cursor_position = await computer.execute({
        tool: 'computer',
        params: { action: 'cursor_position' },
      });
      expect(cursor_position.tool_result.output).toBe('X=100,Y=100');
    });
  });

  describe('MCP tests (featuring kips)', () => {
    let serverStarted = false;

    beforeAll(async () => {
      const { serverInfo: _serverInfo, error } = await computer.startMcpServer(
        'kips',
        'npx kips serve'
      );
      if (error || !_serverInfo) {
        if (error?.includes('already running')) {
          console.warn(
            "MCP server 'kips' is already running on the remote machine."
          );
          serverStarted = true;
        } else {
          throw new Error(`Failed to start MCP server 'kips': ${error}`);
        }
      } else {
        serverStarted = true;
      }
    });

    it('should start up successfully', () => {
      expect(serverStarted).toBeTrue();
    });

    it('should ping', async () => {
      await computer.mcpPing();
    });

    it('should be a Hudson Server', async () => {
      const implementation = await computer.getMcpServerVersion();
      expect(implementation?.name).toBe('hudson-server');
    });

    it('should have tools capabilities', async () => {
      const capabilities = await computer.getMcpServerCapabilities();
      expect(capabilities?.tools).toBeDefined();
    });

    it('should have a query tool', async () => {
      const tools = await computer.listMcpTools();
      expect(tools.find(tool => tool.name === 'kips/query')).toBeDefined();
    });

    it('should list both computer use and mcp tools', async () => {
      const tools = await computer.listAllTools();
      expect(tools.find(tool => tool.name === 'kips/update')).toBeDefined();
      expect(tools.find(tool => tool.name === 'computer' && tool.type === 'computer_20241022')).toBeDefined();
    });

    it('should invoke the query tool', async () => {
      const toolResult = await computer.callMcpTool('kips/query', {
        sql: 'SELECT 1;',
      });
      expect(toolResult.isError).toBeFalse();
    });

    it('should not invoke a fake tool', async () => {
      const toolPromise = computer.callMcpTool('kips/fake-tool', {
        fakeArg: false,
      });
      expect(toolPromise).rejects.toThrow();
    });

    it('should not invoke a tool on a fake server', async () => {
      const toolPromise = computer.callMcpTool('kups/query', {
        sql: 'SELECT 1;',
      });
      expect(toolPromise).rejects.toThrow();
    });
  });

  // it('should edit a file', async () => {
  //   await computer.execute({
  //     tool: 'str_replace_editor',
  //     params: {
  //       command: 'create',
  //       path: '/tmp/test.txt',
  //       file_text: 'Hello world!',
  //     },
  //   });

  //   const message = await computer.execute({
  //     tool: 'str_replace_editor',
  //     params: {
  //       command: 'view',
  //       path: '/tmp/test.txt',
  //     },
  //   });
  //   expect(message.tool_result.output).toBe('Hello world!');
  // });
});
