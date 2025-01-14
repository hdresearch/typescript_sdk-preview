import { Computer } from '../lib';
import { ConnectOptions } from '../lib/computer';

const TEST_CONNECT_OPTIONS: ConnectOptions = {
  wsUrl: 'http://localhost:8080/ws',
  mcpUrl: 'http://localhost:8080/mcp',
};

async function main() {
  const computer = new Computer();
  await computer.connect(TEST_CONNECT_OPTIONS);
  await computer.startMcpServer(
    'server-everything',
    'npx -y @modelcontextprotocol/server-everything'
  );
  const tools = await computer.listAllTools();
  console.log(tools);
}

await main();
