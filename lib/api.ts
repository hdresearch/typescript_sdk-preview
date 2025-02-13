import type { Action } from './schemas/action';
import {
  ComputerMessage,
  StartServerResponseSchema,
  type StartServerRequest,
  type StartServerResponse,
} from './types';
import { fetchAndValidate } from './utils/fetchAndValidate';
import path from 'path';

type HdrApiPaths = {
  computerUse: string;
  mcp: {
    base: string;
    startServer: string;
  };
  file: {
    upload: string;
    download: string;
  };
  system: string;
};

enum HeaderSet {
  Get,
  PostJson,
  PostFormData,
}

export class HdrApi {
  apiKey: string | null;
  paths: HdrApiPaths;

  constructor(hostname: string, apiKey: string | null) {
    this.apiKey = apiKey;
    this.paths = {
      computerUse: path.join(hostname, 'computer_use'),
      mcp: {
        base: path.join(hostname, 'mcp'),
        startServer: path.join(hostname, 'mcp', 'register_server'),
      },
      file: {
        // TODO: Remove redundant 'file' in paths
        upload: path.join(hostname, 'file', 'file', 'upload'),
        download: path.join(hostname, 'file', 'file', 'download'),
      },
      system: path.join(hostname, 'system'),
    };
  }

  async useComputer(action: Action): Promise<ComputerMessage> {
    return fetchAndValidate(this.paths.computerUse, ComputerMessage, {
      method: 'POST',
      headers: this.getHeaders(HeaderSet.PostJson),
      body: JSON.stringify(action),
    });
  }

  async startMcpServer(
    name: string,
    command: string
  ): Promise<StartServerResponse> {
    const request: StartServerRequest = {
      name,
      command,
    };

    return fetchAndValidate(
      this.paths.mcp.startServer,
      StartServerResponseSchema,
      {
        method: 'POST',
        headers: this.getHeaders(HeaderSet.PostJson),
        body: JSON.stringify(request),
      }
    );
  }

  async uploadFile(filename: string, blob: Blob) {
    const formData = new FormData();
    formData.append('file', blob, filename);

    return fetch(this.paths.file.upload, {
      method: 'POST',
      headers: this.getHeaders(HeaderSet.PostFormData),
      body: formData,
    });
  }

  private getBearerToken(): string {
    return `Bearer ${this.apiKey}`;
  }

  private getHeaders(method: HeaderSet): HeadersInit {
    switch (method) {
      case HeaderSet.Get:
        return {
          Authorization: this.getBearerToken(),
        };
      case HeaderSet.PostJson:
        return {
          Authorization: this.getBearerToken(),
          'Content-Type': 'application/json',
        };
      case HeaderSet.PostFormData:
        return {
          Authorization: this.getBearerToken(),
          'Content-Type': 'multipart/form-data',
        };
    }
  }
}
