import { z } from 'zod';
import { BashAction } from './bashAction';
import { ComputerAction } from './computerActions';

/**
 * Union type representing all possible actions that can be executed
 */
export const Action = z
  .union([BashAction, ComputerAction])
  .describe('An action that can be executed by the system');

export type Action = z.infer<typeof Action>;
