import { Enum } from '../misc/enum.mjs';
import { ReadOnlySet } from '../misc/read_only_set.mjs';

// CanvasManager enums

export const CanvasMode = Enum([
  'NONE',
  'NO_CONTEXT',
  '2D',
  'WEBGL1',
  'WEBGL2',
  'WEBGL_FULL_CANVAS_SHADER',
]);

// RenderLoop enums

export const FrameRateMode = Enum([
  'NONE',
  'RESIZE_ONLY',
  'FRAME_MULT',
  'MILLISECOND',
]);

// WebGL enums

export const ShaderSegmentType = Enum([
  'STRING',
  'URL',
]);

// SettingsManager enums

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

export const SettingVisibility = Enum([
  'ALL_EXCLUDING_OWN',
  'ALL',
]);
