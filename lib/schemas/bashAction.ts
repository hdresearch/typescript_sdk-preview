import { z } from 'zod';

export const BashAction = z.object({
  tool: z.literal('bash'),
  params: z.object({
    command: z.string(),
  }),
});

export type BashAction = z.infer<typeof BashAction>;
