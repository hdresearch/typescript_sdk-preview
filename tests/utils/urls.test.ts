import { describe, it, expect } from 'bun:test';
import { getWSSUrl, getStreamUrl, getMcpUrl } from '../../lib/utils/urls';

describe('getWSSUrl', () => {
  it('converts http:// URLs to wss:// and adds /ephemeral', () => {
    const input = 'http://api.hdr.is/compute';
    const expected = 'wss://api.hdr.is/compute/ephemeral';
    expect(getWSSUrl(input)).toBe(expected);
  });

  it('converts https:// URLs to wss:// and adds /ephemeral', () => {
    const input = 'https://api.hdr.is/compute';
    const expected = 'wss://api.hdr.is/compute/ephemeral';
    expect(getWSSUrl(input)).toBe(expected);
  });

  it('handles URLs with trailing slashes', () => {
    const input = 'https://api.hdr.is/compute/';
    const expected = 'wss://api.hdr.is/compute/ephemeral';
    expect(getWSSUrl(input)).toBe(expected);
  });
});

describe('getStreamUrl', () => {
  it('constructs the stream URL with baseURL and machineId', () => {
    const baseURL = 'https://api.hdr.is';
    const machineId = '123abc';
    const expected = 'https://api.hdr.is/compute/123abc/stream';
    expect(getStreamUrl(baseURL, machineId)).toBe(expected);
  });
});

describe('getMcpUrl', () => {
  it('constructs the MCP URL with baseURL and machineId', () => {
    const baseURL = 'https://api.hdr.is';
    const machineId = '123abc';
    const expected = 'https://api.hdr.is/compute/123abc/mcp';
    expect(getMcpUrl(baseURL, machineId)).toBe(expected);
  });

  it('throws error if machineId is null', () => {
    const baseURL = 'https://api.hdr.is';
    const machineId = null;
    expect(() => getMcpUrl(baseURL, machineId)).toThrow(
      'Unable to get MCP Url: machineId is null.'
    );
  });
});
