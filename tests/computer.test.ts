import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Computer } from '../lib/computer';
import { bashTool, editTool } from '../lib/tools';
import { computerTool } from '../lib/tools';

describe('Computer Tests', () => {
  let computer: Computer;

  beforeAll(async () => {
    const baseUrl = process.env.TEST_BASE_URL;

    computer = new Computer({ baseUrl });
    await computer.connect();
  });

  it('should handle connect', async () => {
    expect(computer.isConnected()).toBe(true);
  });

  it('should handle connection message', async () => {
    expect(computer.sessionId).toBeDefined();
    expect(computer.machineMetadata).toBeDefined();
    expect(computer.listTools()).toEqual([bashTool, computerTool, editTool]);
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

  afterAll(async () => {
    await computer.close();
  });
});
