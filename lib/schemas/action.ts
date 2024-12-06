import { z } from 'zod';
import { BashAction } from './bashAction';
import { ComputerAction } from './computerActions';

export const Action = z.union([BashAction, ComputerAction]);

export type Action = z.infer<typeof Action>;
