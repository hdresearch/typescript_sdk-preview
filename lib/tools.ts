import type { ToolI } from './types';

export const bashTool: ToolI = {
  name: 'bash',
  type: 'bash_20241022',
};

export const computerTool: ToolI = {
  name: 'computer',
  type: 'computer_20241022',
  // Default display dimensions. Will be updated by the server on connection.
  display_height_px: 768,
  display_width_px: 1024,
};

export const editTool: ToolI = {
  name: 'str_replace_editor',
  type: 'text_editor_20241022',
};
