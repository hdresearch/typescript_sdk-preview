import type { BetaMessageParam } from '@anthropic-ai/sdk/resources/beta/index.mjs';

export interface DefaultSamplingOptions {
  model: string;
  max_tokens: number;
  system: string;
  messages: BetaMessageParam[];
  temperature: number;
}

export const defaultSamplingOptions: DefaultSamplingOptions = {
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 4096,
  temperature: 0,
  system: '',
  messages: [],
};
