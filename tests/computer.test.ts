import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Computer } from '../lib/computer';

describe('Computer Tests', () => {
  let computer: Computer;

  beforeAll(async () => {
    computer = new Computer();
    await computer.connect();
  });

  it('should handle connect', async () => {
    expect(computer.isConnected()).toBe(true);
  });
  // TODO: This isn't supported by Hudson atm. What is this?  - asebexen
//   it('should handle connection message', async () => {
//     expect(computer.sessionId).toBeDefined();
//     expect(computer.host).toBeDefined();
//     expect(computer.accessToken).toBeDefined();
//   });

  it('should handle send message', async () => {
    const message = await computer.execute({
      tool: 'computer',
      params: {
        action: 'cursor_position',
      },
    });
    expect(message.output.output).toMatch(/X=\d+,Y=\d+/);
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
    expect(message.output.output).toBe('hello world');
  });

  afterAll(async () => {
    await computer.close();
  });
});
