import { describe, test, expect } from 'bun:test';
import { Computer } from '../dist/bun';

describe('Computer SDK Bun Distribution Test', () => {
  test('should load built distribution', () => {
    const computer = new Computer();
    expect(computer).toBeDefined();
    expect(computer.isConnected()).toBe(false);
  });

  test('should connect using built distribution', async () => {
    const apiKey = process.env.HDR_API_KEY;
    if (!apiKey) {
      console.log(
        'No HDR_API_KEY found in environment, skipping connection test'
      );
      return;
    }

    const computer = new Computer({
      apiKey,
    });

    try {
      await computer.connect();
      expect(computer.isConnected()).toBe(true);

      const metadata = await computer.getMetadata();
      expect(metadata).toBeDefined();
      expect(metadata.machine_id).toBeDefined();

      await computer.close();
      expect(computer.isConnected()).toBe(false);
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  });
});
