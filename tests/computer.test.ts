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

  it('should edit a file', async () => {
    await computer.execute({
      tool: 'str_replace_editor',
      params: {
        command: 'create',
        path: '/tmp/test.txt',
        file_text: 'Hello world!',
      },
    });

    const message = await computer.execute({
      tool: 'str_replace_editor',
      params: {
        command: 'view',
        path: '/tmp/test.txt',
      },
    });
    expect(message.tool_result.output).toBe('Hello world!');
  });

  afterAll(async () => {
    await computer.close();
  });
});
