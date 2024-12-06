import { z } from 'zod';

// Schema for bash command actions
export const BashAction = z
  .object({
    tool: z.literal('bash'),
    params: z.object({
      command: z.string().min(1, {
        message: 'Command string is required',
      }),
    }),
  })
  .describe('Execute a bash command.');

export type BashAction = z.infer<typeof BashAction>;
