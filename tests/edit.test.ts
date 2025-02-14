import { describe, beforeAll, afterAll, it, expect } from 'bun:test';
import { Computer, ConnectOptions } from '../lib/computer';
import { ComputerMessage } from '../lib/types';
import { join } from 'path';
import os from 'os';
import fs from 'fs/promises';

const TMPDIR = '/tmp';
const FILEPATH = join(TMPDIR, 'hdr_typescript_sdk_test.txt');
const FILEPATH_FAKE = join(TMPDIR, 'hdr_typescript_sdk_does_not_exist.txt');

describe('Edit tests', () => {
  let computer: Computer;

  beforeAll(async () => {
    await cleanTempFiles();

    computer = await Computer.create();
  });

  afterAll(async () => {
    await cleanTempFiles();
  });

  it('should be able to create and manipulate a file', async () => {
    let toolResult: ComputerMessage;

    // Try to create file
    toolResult = await computer.execute({
      tool: 'str_replace_editor',
      params: {
        path: FILEPATH,
        command: 'create',
        file_text:
          'This file was created by the TypeScirpt SDK by HDR Research! If you found this file, then something went wrong, because it is supposed to be deleted.',
      },
    });
    expect(toolResult.tool_result.error).toBeNull();
    expect(toolResult.tool_result.output).toBeString();

    // Try to replace typo
    toolResult = await computer.execute({
      tool: 'str_replace_editor',
      params: {
        path: FILEPATH,
        command: 'str_replace',
        old_str: 'TypeScirpt',
        new_str: 'TypeScript',
      },
    });
    expect(toolResult.tool_result.error).toBeNull();
    expect(toolResult.tool_result.output).toBeString();

    // Try to insert a new line at the end
    toolResult = await computer.execute({
      tool: 'str_replace_editor',
      params: {
        path: FILEPATH,
        command: 'insert',
        new_str:
          'If you found this line, then the test must have failed, because it is supposed to be DELETED.',
        insert_line: 1,
      },
    });
    expect(toolResult.tool_result.error).toBeNull();
    expect(toolResult.tool_result.output).toBeString();

    // Try to undo the new line
    toolResult = await computer.execute({
      tool: 'str_replace_editor',
      params: {
        path: FILEPATH,
        command: 'undo_edit',
      },
    });
    expect(toolResult.tool_result.error).toBeNull();
    expect(toolResult.tool_result.output).toBeString();

    // Try to view the file
    toolResult = await computer.execute({
      tool: 'str_replace_editor',
      params: {
        path: FILEPATH,
        command: 'view',
      },
    });
    const output = toolResult.tool_result.output;
    expect(output).not.toContain('TypeScirpt');
    expect(output).toContain('TypeScript');
    expect(output).toContain('deleted');
    expect(output).not.toContain('DELETED');
  });

  it('should fail on trying to manipulate a non-existent file', async () => {
    let toolResult: ComputerMessage;

    // Try to create in non-existent directory
    toolResult = await computer.execute({
      tool: 'str_replace_editor',
      params: {
        path: join(os.tmpdir(), 'clearly_fake_dir', 'test.txt'),
        command: 'create',
        file_text: 'This should fail',
      },
    });
    expect(toolResult.tool_result.output).toBeNull();
    expect(toolResult.tool_result.error).toBeString();

    // Try to replace string in non-existent file
    toolResult = await computer.execute({
      tool: 'str_replace_editor',
      params: {
        path: FILEPATH_FAKE,
        command: 'str_replace',
        old_str: 'test',
        new_str: 'replacement',
      },
    });
    expect(toolResult.tool_result.output).toBeNull();
    expect(toolResult.tool_result.error).toBeString();

    // Try to insert into non-existent file
    toolResult = await computer.execute({
      tool: 'str_replace_editor',
      params: {
        path: FILEPATH_FAKE,
        command: 'insert',
        new_str: 'test line',
        insert_line: 1,
      },
    });
    expect(toolResult.tool_result.output).toBeNull();
    expect(toolResult.tool_result.error).toBeString();

    // Try to undo edit on non-existent file
    // Note that if previous tests fail (and do create a file), the Vers instance can be "poisoned" with its undo history and may have to be restarted before this test will succeed.
    console.log('=== undo_edit ===');
    toolResult = await computer.execute({
      tool: 'str_replace_editor',
      params: {
        path: FILEPATH_FAKE,
        command: 'undo_edit',
      },
    });
    expect(toolResult.tool_result.output).toBeNull();
    expect(toolResult.tool_result.error).toBeString();

    // Try to view non-existent file (last to ensure that none of the other ops created the file)
    toolResult = await computer.execute({
      tool: 'str_replace_editor',
      params: {
        path: FILEPATH_FAKE,
        command: 'view',
      },
    });
    expect(toolResult.tool_result.output).toBeNull();
    expect(toolResult.tool_result.error).toBeString();
  });
});

async function cleanTempFiles() {
  if (await fs.exists(FILEPATH)) {
    await fs.rm(FILEPATH);
  }
  if (await fs.exists(FILEPATH_FAKE)) {
    await fs.rm(FILEPATH_FAKE);
  }
}
