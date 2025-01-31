import { z } from 'zod';
import { BashAction } from './bashAction.js';
import { ComputerAction } from './computerActions.js';
import { EditAction } from './editActions.js';

/**
 * Union type representing all possible actions that can be executed
 */
export const Action = z
  .union([BashAction, ComputerAction, EditAction])
  .describe('An action that can be executed by the system');

export type Action = z.infer<typeof Action>;
