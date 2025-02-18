# Computer Control Library

A TypeScript library for programmatic control of remote computers via WebSocket connections. This library provides a robust interface for executing commands, controlling mouse/keyboard input, and capturing screenshots on connected machines.

## Features

- WebSocket-based computer control
- Support for multiple action types:
  - Bash command execution
  - Mouse movement and clicks
  - Keyboard input
  - Screenshot capture
- File editing capabilities
- Built-in logging system
- Type-safe with Zod schema validation
- Event-driven architecture

## Model Context Protocol (MCP) Support

This library implements the Model Context Protocol (MCP) specification, allowing for standardized communication between language models and computer control interfaces. Key MCP features include:

- Full compliance with MCP server specifications
- Structured message format for model-computer interactions
- Support for both synchronous and asynchronous operations
- Standardized error handling and status reporting
- Built-in support for context preservation across interactions

The library can connect to any MCP-compliant server, enabling consistent behavior across different model providers and computer control implementations.

## Installation

```bash
npm install @hdr/sdk-preview
```

## Quick Start

```typescript
import { Computer } from '@hdr/sdk-preview';

// Initialize a new computer connection
const computer = new Computer();

// Connect to the remote computer
await computer.connect();

// Perform a high-level objective
await computer.do('create a file, write a poem and md5 hash it');

// Take a screenshot
const screenshot = await computer.screenshot();

// Execute a bash command
const result = await computer.execute({
  tool: 'bash',
  params: {
    command: 'ls -la',
  },
});

// Move the mouse and click
await computer.execute({
  tool: 'computer',
  params: {
    action: 'mouse_move',
    coordinates: [100, 100],
  },
});

await computer.execute({
  tool: 'computer',
  params: {
    action: 'left_click',
  },
});

// Close connection
await computer.close();
```

## Supported Actions

### Computer Control Actions

- Mouse Operations:
  - Move cursor
  - Left/right/middle click
  - Double click
  - Click and drag
  - Get cursor position
- Keyboard Operations:
  - Type text
  - Press specific keys
- Screen Operations:
  - Capture screenshots

### File Editing Actions

- View file contents
- Create new files
- Replace text in files
- Insert text at specific lines
- Undo previous edits

### Bash Actions

Execute arbitrary bash commands on the remote system.

## API Reference

### Computer Class

The main class for establishing connections and controlling remote computers.

```typescript
class Computer extends EventEmitter implements IComputer {
  constructor(
    baseUrl: string,
    apiKey: string,
    options?: Partial<ComputerOptions>
  );

  // Core methods
  connect(): Promise<void>;
  execute(command: Action): Promise<ComputerMessage>;
  isConnected(): boolean;
  close(): Promise<void>;
  screenshot(): Promise<string>;
}
```

### Configuration Options

```typescript
interface ComputerOptions {
  onMessage?: (message: ComputerMessage) => void | Promise<void>;
  parseMessage?: (message: MessageEvent) => void | ComputerMessage;
  onOpen?: () => void | Promise<void>;
  onError?: (error: Error) => void;
  onClose?: (code: number, reason: string) => void;
  beforeSend?: (data: unknown) => unknown;
}
```

## Logging

The library includes a built-in logging system that captures:

- All commands sent to the remote computer
- All responses received
- Screenshots (when enabled)
- Session information

Logs are stored in the `./computer_logs` directory by default.

## Error Handling

The library uses custom error classes and provides detailed error messages. All operations that can fail return promises that should be properly handled with try/catch blocks.

```typescript
try {
  await computer.connect();
} catch (error) {
  console.error('Failed to connect:', error.message);
}
```

## Environment Variables

- `HDR_API_KEY`: Your API key for authentication
- `ANTHROPIC_API_KEY`: optional Anthropic key for high-level objective-oriented computer use
- `HDR_WS_URL`: optional URL for computer use socket (defaults to 'wss://api.hdr.is/compute/ephemeral')

## Development

### Prerequisites

- Node.js 20+
- TypeScript 5.7+
- WebSocket-compatible environment

### Building

```bash
bun install
bun run build
```

### Testing

```bash
bun test
```
