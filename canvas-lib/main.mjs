// primary exports
export { CanvasManager } from './canvas/canvas_manager.mjs';
export { SettingsManager } from './canvas/settings_manager.mjs';

// convenience exports
export {
  CanvasMode,
  FrameRateMode,
  SettingEnumUIType,
  SettingType,
  SettingType_TrueSettings,
  ShaderSegmentType,
} from './canvas/enums.mjs';
export {
  FRAGMENT_SHADER_RESOLUTION_VAR,
  FRAGMENT_SHADER_TEXTURE_RESOLUTION_SUFFIX,
  UniformType,
  UniformType_ArraySuffix,
} from './canvas/gl_constants.mjs';
export { RenderLoop } from './canvas/render_loop.mjs';
export { ShaderManager } from './canvas/shader_manager.mjs';
export { TextureManager } from './canvas/texture_manager.mjs';
export {
  removeAllNodes /* TODO: Currently unused */,
  removeNode,
} from './misc/dom_tools.mjs';
export {
  Enum,
  isEnum,
} from './misc/enum.mjs';
export { Lock } from './misc/lock.mjs';
export { fetchAsText } from './misc/network_tools.mjs';
export { ReadOnlyMap } from './misc/read_only_map.mjs';
export { ReadOnlySet } from './misc/read_only_set.mjs';

/*
internal constants that are not exported from module collection for cleanliness:

export {
  UNIFORM_ENUM_TO_PREFERRED_GLSL_NAME,
  UNIFORM_GLSL_NAME_TO_ENUM,
  VERTEX_SHADER_POSITION_VAR,
  VERTEX_SHADER_XY_ONLY_TEXT,
} from './canvas/gl_constants.mjs';
*/
