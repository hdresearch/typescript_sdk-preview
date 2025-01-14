import { z } from 'zod';

// Schema for other actions (such as MCP tool invocations)
export const UnknownAction = z.object({
  tool: z.string().min(1),
  params: z.record(z.string(), z.any()),
});

export type UnknownAction = z.infer<typeof UnknownAction>;
