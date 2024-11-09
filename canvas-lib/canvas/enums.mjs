import { Enum } from '../misc/enum.mjs';

export const FrameRateMode = Enum([
  'NONE',
  'RESIZE_ONLY',
  'FRAME_MULT',
  'MILLISECOND',
]);

export const SettingType = Enum([
  // actual settings
  'BOOLEAN',
  'ENUM_SELECT',
  'ENUM_RADIO',
  'INTEGER',
  'NUMBER',
  'TEXT',
  
  // informational / dividers
  'HEADER',
  'INFO_TEXT',
  'SEPARATOR',
  
  // active
  'BUTTON',
]);
