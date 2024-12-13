import { z } from 'zod';

// Enum for allowed commands
export const EditActionsEnum = z.enum([
  'view',
  'create',
  'str_replace',
  'insert',
  'undo_edit',
]);

// Individual command schemas
const ViewParams = z
  .object({
    command: z.literal('view'),
    path: z.string(),
    view_range: z.array(z.number()).optional(),
  })
  .describe('View contents of a file.');

const CreateParams = z
  .object({
    command: z.literal('create'),
    path: z.string(),
    file_text: z.string(),
  })
  .describe('Create a new file with specified content.');

const StrReplaceParams = z
  .object({
    command: z.literal('str_replace'),
    path: z.string(),
    old_str: z.string(),
    new_str: z.string().optional(),
  })
  .describe('Replace text in a file.');

const InsertParams = z
  .object({
    command: z.literal('insert'),
    path: z.string(),
    insert_line: z.number(),
    new_str: z.string(),
  })
  .describe('Insert text at specific line in a file.');

const UndoEditParams = z
  .object({
    command: z.literal('undo_edit'),
    path: z.string(),
  })
  .describe('Undo last edit to a file.');

// Combined params schema using discriminated union
const EditParams = z.discriminatedUnion('command', [
  ViewParams,
  CreateParams,
  StrReplaceParams,
  InsertParams,
  UndoEditParams,
]);

// Main EditAction schema
export const EditAction = z
  .object({
    tool: z.literal('str_replace_editor'),
    params: EditParams,
  })
  .describe('File editing operations.');

// Export types
export type ViewParams = z.infer<typeof ViewParams>;
export type CreateParams = z.infer<typeof CreateParams>;
export type StrReplaceParams = z.infer<typeof StrReplaceParams>;
export type InsertParams = z.infer<typeof InsertParams>;
export type UndoEditParams = z.infer<typeof UndoEditParams>;
export type EditParams = z.infer<typeof EditParams>;
export type EditAction = z.infer<typeof EditAction>;

// Export schemas
export {
  ViewParams,
  CreateParams,
  StrReplaceParams,
  InsertParams,
  UndoEditParams,
  EditParams,
};
