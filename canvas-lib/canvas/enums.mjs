import { Enum } from '../misc/enum.mjs';
import { ReadOnlySet } from '../misc/read_only_set.mjs';

export const FrameRateMode = Enum([
  'NONE',
  'RESIZE_ONLY',
  'FRAME_MULT',
  'MILLISECOND',
]);

export const SettingType = Enum([
  // actual settings
  'BOOLEAN',
  'ENUM',
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

export const SettingEnumUIType = Enum([
  'SELECT',
  'RADIO',
]);

export const SettingType_TrueSettings = new ReadOnlySet([
  SettingType.BOOLEAN,
  SettingType.ENUM,
  SettingType.INTEGER,
  SettingType.NUMBER,
  SettingType.TEXT,
]);
