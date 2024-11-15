import { Enum } from '../misc/enum.mjs';
import { ReadOnlyMap } from '../misc/read_only_map.mjs';

// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context

export const VERTEX_SHADER_POSITION_VAR = 'a_vertexPosition';
export const FRAGMENT_SHADER_RESOLUTION_VAR = 'u_resolution';
export const FRAGMENT_SHADER_TEXTURE_RESOLUTION_SUFFIX = '_resolution';

const ALL_SHADER_PREFIX = `
  #version 300 es
  precision highp float;
`.trim();

export const VERTEX_SHADER_XY_ONLY_TEXT =
  ALL_SHADER_PREFIX + `
  in vec4 ${VERTEX_SHADER_POSITION_VAR};
  
  void main() {
    gl_Position = vec4(${VERTEX_SHADER_POSITION_VAR}.xy, 0.0, 1.0);
  }
`.trim();

export const FRAGMENT_SHADER_PREFIX =
  ALL_SHADER_PREFIX + `
  uniform vec2 ${FRAGMENT_SHADER_RESOLUTION_VAR};
`;

export const UniformType_ArraySuffix = '_ARRAY';

// format: [enum name, [corresponding glsl type string, ...]]
const uniformTypeData = Object.freeze([
  // scalars / vectors
  ['BOOLEAN', ['boolean']],
  ['BVEC2', ['bvec2']],
  ['BVEC3', ['bvec3']],
  ['BVEC4', ['bvec4']],
  ['UINT', ['uint']],
  ['UVEC2', ['uvec2']],
  ['UVEC3', ['uvec3']],
  ['UVEC4', ['uvec4']],
  ['FLOAT', ['float']],
  ['VEC2', ['vec2']],
  ['VEC3', ['vec3']],
  ['VEC4', ['vec4']],
  ['INT', ['int']],
  ['IVEC2', ['ivec2']],
  ['IVEC3', ['ivec3']],
  ['IVEC4', ['ivec4']],
  ['BOOLEAN' + UniformType_ArraySuffix, []],
  ['BVEC2' + UniformType_ArraySuffix, []],
  ['BVEC3' + UniformType_ArraySuffix, []],
  ['BVEC4' + UniformType_ArraySuffix, []],
  ['UINT' + UniformType_ArraySuffix, []],
  ['UVEC2' + UniformType_ArraySuffix, []],
  ['UVEC3' + UniformType_ArraySuffix, []],
  ['UVEC4' + UniformType_ArraySuffix, []],
  ['FLOAT' + UniformType_ArraySuffix, []],
  ['VEC2' + UniformType_ArraySuffix, []],
  ['VEC3' + UniformType_ArraySuffix, []],
  ['VEC4' + UniformType_ArraySuffix, []],
  ['INT' + UniformType_ArraySuffix, []],
  ['IVEC2' + UniformType_ArraySuffix, []],
  ['IVEC3' + UniformType_ArraySuffix, []],
  ['IVEC4' + UniformType_ArraySuffix, []],
  
  // matrices
  ['MAT22', ['mat2', 'mat2x2']],
  ['MAT23', ['mat2x3']],
  ['MAT24', ['mat2x4']],
  ['MAT32', ['mat3x2']],
  ['MAT33', ['mat3', 'mat3x3']],
  ['MAT34', ['mat3x4']],
  ['MAT42', ['mat4x2']],
  ['MAT43', ['mat4x3']],
  ['MAT44', ['mat4', 'mat4x4']],
  ['MAT22' + UniformType_ArraySuffix, []],
  ['MAT23' + UniformType_ArraySuffix, []],
  ['MAT24' + UniformType_ArraySuffix, []],
  ['MAT32' + UniformType_ArraySuffix, []],
  ['MAT33' + UniformType_ArraySuffix, []],
  ['MAT34' + UniformType_ArraySuffix, []],
  ['MAT42' + UniformType_ArraySuffix, []],
  ['MAT43' + UniformType_ArraySuffix, []],
  ['MAT44' + UniformType_ArraySuffix, []],
  
  // textures
  ['SAMPLER2D', ['sampler2D']],
  ['SAMPLER2D' + UniformType_ArraySuffix, []],
]);

export const UniformType = Enum(uniformTypeData.map(x => x[0]));

export const UNIFORM_ENUM_TO_PREFERRED_GLSL_NAME = new ReadOnlyMap(
  uniformTypeData
    .filter(([_, glslNames]) => glslNames.length > 0)
    .map(([enumName, glslNames]) => [enumName, glslNames[0]])
);

export const UNIFORM_GLSL_NAME_TO_ENUM = new ReadOnlyMap(
  uniformTypeData.map(
    ([enumName, glslNames]) => glslNames.map(x => [x, enumName])
  ).flat()
);
