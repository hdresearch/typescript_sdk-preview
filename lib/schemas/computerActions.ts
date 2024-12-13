import { z } from 'zod';

// Custom error class
class ComputerToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ComputerToolError';
  }
}

// Mouse Actions
const MouseMoveAction = z
  .object({
    action: z.literal('mouse_move'),
    coordinate: z.tuple([z.number().int(), z.number().int()]),
  })
  .describe('Move mouse cursor to specific coordinates.');

const LeftClickDragAction = z
  .object({
    action: z.literal('left_click_drag'),
    coordinates: z.tuple([z.number().int(), z.number().int()]),
  })
  .describe('Click and drag with left mouse button to coordinates.');

const CursorPositionAction = z
  .object({
    action: z.literal('cursor_position'),
  })
  .describe('Get current cursor position.');

const LeftClickAction = z
  .object({
    action: z.literal('left_click'),
  })
  .describe('Perform left mouse click.');

const RightClickAction = z
  .object({
    action: z.literal('right_click'),
  })
  .describe('Perform right mouse click.');

const MiddleClickAction = z
  .object({
    action: z.literal('middle_click'),
  })
  .describe('Perform middle mouse click.');

const DoubleClickAction = z
  .object({
    action: z.literal('double_click'),
  })
  .describe('Perform double click with left mouse button.');

// Keyboard Actions
const KeyAction = z
  .object({
    action: z.literal('key'),
    text: z.string().min(1, {
      message: 'Text is required for key action',
    }),
  })
  .describe('Press specific keyboard key(s).');

const TypeAction = z
  .object({
    action: z.literal('type'),
    text: z.string().min(1, {
      message: 'Text is required for type action',
    }),
  })
  .describe('Type text string.');

// Screenshot Action
const ScreenshotAction = z
  .object({
    action: z.literal('screenshot'),
  })
  .describe('Capture screenshot of current screen.');

// Union of all possible actions
const ComputerParams = z.discriminatedUnion('action', [
  MouseMoveAction,
  CursorPositionAction,
  LeftClickAction,
  LeftClickDragAction,
  RightClickAction,
  MiddleClickAction,
  DoubleClickAction,
  KeyAction,
  TypeAction,
  ScreenshotAction,
]);

// Container for computer control actions
const ComputerAction = z.object({
  tool: z.literal('computer'),
  params: ComputerParams,
});

// Export types inferred from the schemas
export type MouseMoveAction = z.infer<typeof MouseMoveAction>;
export type LeftClickDragAction = z.infer<typeof LeftClickDragAction>;
export type CursorPositionAction = z.infer<typeof CursorPositionAction>;
export type LeftClickAction = z.infer<typeof LeftClickAction>;
export type RightClickAction = z.infer<typeof RightClickAction>;
export type MiddleClickAction = z.infer<typeof MiddleClickAction>;
export type DoubleClickAction = z.infer<typeof DoubleClickAction>;
export type KeyAction = z.infer<typeof KeyAction>;
export type TypeAction = z.infer<typeof TypeAction>;
export type ScreenshotAction = z.infer<typeof ScreenshotAction>;
export type ComputerParams = z.infer<typeof ComputerParams>;
export type ComputerAction = z.infer<typeof ComputerAction>;

// Export schemas and error class
export {
  MouseMoveAction,
  LeftClickDragAction,
  CursorPositionAction,
  LeftClickAction,
  RightClickAction,
  MiddleClickAction,
  DoubleClickAction,
  KeyAction,
  TypeAction,
  ScreenshotAction,
  ComputerParams,
  ComputerAction,
  ComputerToolError,
};
