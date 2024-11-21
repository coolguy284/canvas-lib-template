import { fetchAsText } from '../misc/network_tools.mjs';
import { ShaderSegmentType } from './enums.mjs';
import {
  FRAGMENT_SHADER_PREFIX,
  FRAGMENT_SHADER_RESOLUTION_VAR,
  FRAGMENT_SHADER_TEXTURE_RESOLUTION_SUFFIX,
  UNIFORM_ENUM_TO_PREFERRED_GLSL_NAME,
  UNIFORM_GLSL_NAME_TO_ENUM,
  UniformType,
  UniformType_ArraySuffix,
  VERTEX_SHADER_POSITION_VAR,
  VERTEX_SHADER_XY_ONLY_TEXT,
} from './gl_constants.mjs';
import { ShaderManager } from './shader_manager.mjs';
import { TextureManager } from './texture_manager.mjs';

class FullCanvasShaderManager {
  // class variables
  
  #gl;
  #textureManager;
  #shaderManager;
  //#vertexShader;
  //#fragmentShader;
  #shaderProgram;
  //#vertexAttribLocation;
  #resolutionUniformLocation;
  #customUniforms;
  #customUniformsInternal;
  #positionBuffer;
  
  // helper functions
  
  static #parseUniformEntry(uniformEntry) {
    let parsedUniformEntry = {};
    
    if (typeof uniformEntry.name == 'string') {
      parsedUniformEntry.name = uniformEntry.name;
    } else {
      throw new Error(`uniformEntry.name not string: ${typeof uniformEntry.name}`);
    }
    
    if (typeof uniformEntry.type == 'string' && uniformEntry.type in UniformType) {
      parsedUniformEntry.type = uniformEntry.type;
    } else {
      throw new Error(`uniformEntry.type not known: ${uniformEntry.type}`);
    }
    
    if (uniformEntry.type.endsWith(UniformType_ArraySuffix)) {
      if (Number.isSafeInteger(uniformEntry.length) && uniformEntry.length > 1) {
        parsedUniformEntry.length = uniformEntry.length;
      } else {
        throw new Error(`uniformEntry.length unknown type or invalid value: ${uniformEntry.type}`);
      }
    }
    
    parsedUniformEntry.internal = false;
    
    return parsedUniformEntry;
  }
  
  static #parseUniformEntryString_regex = /^([^ \[\]]+)(?:\[([1-9]\d*)\])?$/;
  
  static #parseUniformEntryString(uniformString) {
    let [ glslType, ...rest ] = uniformString.split(' ');
    
    if (rest.length != 1) {
      throw new Error(`uniformString invalid format: ${uniformString}`);
    }
    
    let end = rest[0];
    
    let match;
    
    if (!(match = FullCanvasShaderManager.#parseUniformEntryString_regex.exec(end))) {
      throw new Error(`uniformString invalid format: ${uniformString}`);
    }
    
    if (!UNIFORM_GLSL_NAME_TO_ENUM.has(glslType)) {
      throw new Error(`uniformString type unrecognized: ${glslType}`);
    }
    
    let enumType = UNIFORM_GLSL_NAME_TO_ENUM.get(glslType);
    
    let varName = match[1];
    
    let uniformEntry = {
      name: varName,
      type: null,
    };
    
    if (match[2]) {
      enumType += UniformType_ArraySuffix;
    
      uniformEntry.length = parseInt(match[2]);
    }
    
    uniformEntry.type = enumType;
    
    uniformEntry.internal = false;
    
    return uniformEntry;
  }
  
  static #uniformEntryToString(uniformEntry) {
    if ('length' in uniformEntry) {
      return `${UNIFORM_ENUM_TO_PREFERRED_GLSL_NAME.get(uniformEntry.type.slice(0, -UniformType_ArraySuffix.length))} ${uniformEntry.name}[${uniformEntry.length}]`;
    } else {
      return `${UNIFORM_ENUM_TO_PREFERRED_GLSL_NAME.get(uniformEntry.type)} ${uniformEntry.name}`;
    }
  }
  
  static #uniformEntryArrToMap(gl, shaderProgram, uniforms) {
    return new Map(uniforms.map(uniformEntry => {
      if ('length' in uniformEntry) {
        return [
          uniformEntry.name,
          {
            type: uniformEntry.type,
            length: uniformEntry.length,
            location: gl.getUniformLocation(shaderProgram, uniformEntry.name),
          },
        ];
      } else {
        return [
          uniformEntry.name,
          {
            type: uniformEntry.type,
            location: gl.getUniformLocation(shaderProgram, uniformEntry.name),
          },
        ];
      }
    }));
  }
  
  async #initialize(gl, opts) {
    // validation and pre parsing
    
    if (!(gl instanceof WebGL2RenderingContext)) {
      throw new Error('gl not instance of WebGL2RenderingContext');
    }
    
    if (typeof opts != 'object' && opts != null) {
      throw new Error(`opts not object: ${opts == null ? 'null' : typeof opts}`);
    }
    
    let uniforms = [];
      
    if (opts.uniforms != null) {
      if (Array.isArray(opts.uniforms)) {
        let uniformNames = new Set();
        
        for (let i = 0; i < opts.uniforms.length; i++) {
          let uniformEntry = opts.uniforms[i];
          
          if (typeof uniformEntry == 'object' && uniformEntry != null) {
            uniformEntry = FullCanvasShaderManager.#parseUniformEntry(uniformEntry);
          } else if (typeof uniformEntry == 'string') {
            uniformEntry = FullCanvasShaderManager.#parseUniformEntryString(uniformEntry);
          } else {
            throw new Error(`opts.uniforms[${i}] unrecognized type: ${typeof uniformEntry}`);
          }
          
          if (uniformEntry.name == FRAGMENT_SHADER_RESOLUTION_VAR) {
            throw new Error(`opts.uniforms[${i}].name '${FRAGMENT_SHADER_RESOLUTION_VAR}' is internal, reserved for screen resolution`);
          }
          
          if (uniformNames.has(uniformEntry.name)) {
            throw new Error(`opts.uniforms[${i}].name taken: ${uniformEntry.name}`);
          }
          
          uniforms.push(uniformEntry);
          uniformNames.add(uniformEntry.name);
          
          if (uniformEntry.type == UniformType['SAMPLER2D']) {
            let resolutionUniformEntry = {
              name: `${uniformEntry.name}${FRAGMENT_SHADER_TEXTURE_RESOLUTION_SUFFIX}`,
              type: UniformType['VEC2'],
              internal: true,
            };
            
            if (uniformNames.has(resolutionUniformEntry.name)) {
              throw new Error(`(opts.uniforms[${i}].name + '${FRAGMENT_SHADER_TEXTURE_RESOLUTION_SUFFIX}') taken: ${resolutionUniformEntry.name}`);
            }
            
            uniforms.push(resolutionUniformEntry);
            uniformNames.add(resolutionUniformEntry.name);
          } else if (uniformEntry.type == UniformType['SAMPLER2D' + UniformType_ArraySuffix]) {
            let resolutionUniformEntry = {
              name: `${uniformEntry.name}${FRAGMENT_SHADER_TEXTURE_RESOLUTION_SUFFIX}`,
              type: UniformType['VEC2' + UniformType_ArraySuffix],
              length: uniformEntry.length,
              internal: true,
            };
            
            if (uniformNames.has(resolutionUniformEntry.name)) {
              throw new Error(`(opts.uniforms[${i}].name + '${FRAGMENT_SHADER_TEXTURE_RESOLUTION_SUFFIX}') taken: ${resolutionUniformEntry.name}`);
            }
            
            uniforms.push(resolutionUniformEntry);
            uniformNames.add(resolutionUniformEntry.name);
          }
        }
      } else {
        throw new Error('opts.uniforms must be Array or null');
      }
    }
    
    let shaderSegmentStrings;
    
    if (Array.isArray(opts.shaderSegments)) {
      shaderSegmentStrings = [];
      
      for (let i = 0; i < opts.shaderSegments.length; i++) {
        let segment = opts.shaderSegments[i];
        
        if (typeof segment.type != 'string' || !(segment.type in ShaderSegmentType)) {
          throw new Error(`opts.shaderSegments[${i}].type value ${segment.type} invalid`);
        }
        
        switch (segment.type) {
          case ShaderSegmentType.STRING:
            if (typeof segment.content != 'string') {
              throw new Error(`opts.shaderSegments[${i}].content not string`);
            }
            
            shaderSegmentStrings.push(segment.content);
            break;
          
          case ShaderSegmentType.URL:
            if (typeof segment.url != 'string') {
              throw new Error(`opts.shaderSegments[${i}].url not string`);
            }
            
            shaderSegmentStrings.push(await fetchAsText(segment.url));
            break;
        }
      }
    } else {
      throw new Error(`opts.shaderSegments not function or null: ${typeof opts.shaderSegments}`);
    }
    
    // gl context setup
    
    // gl context setup > https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context
    
    // gl context setup > shader creation
    
    this.#textureManager = new TextureManager(gl);
    
    let shaderManager = this.#shaderManager = new ShaderManager(gl);
    
    let vertexShader = shaderManager.loadShaderFromString(gl.VERTEX_SHADER, VERTEX_SHADER_XY_ONLY_TEXT);
    //this.#vertexShader = vertexShader;
    
    let fragmentShaderSource = [
      FRAGMENT_SHADER_PREFIX,
      ...uniforms.map(x => `uniform ${FullCanvasShaderManager.#uniformEntryToString(x)};`),
      ...shaderSegmentStrings
    ].join('\n');
    
    let fragmentShader = shaderManager.loadShaderFromString(gl.FRAGMENT_SHADER, fragmentShaderSource);
    //this.#fragmentShader = fragmentShader;
    
    // gl context setup > shader program creation
    
    let shaderProgram = this.#shaderProgram = gl.createProgram();
    
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      let info = gl.getProgramInfoLog(shaderProgram);
      gl.deleteProgram(shaderProgram);
      throw new Error(`Shader program initialization error: ${info}`);
    }
    
    // gl context setup > get variable positions
    
    let vertexAttribLocation = gl.getAttribLocation(shaderProgram, VERTEX_SHADER_POSITION_VAR);
    //this.#vertexAttribLocation = vertexAttribLocation;
    this.#resolutionUniformLocation = gl.getUniformLocation(shaderProgram, FRAGMENT_SHADER_RESOLUTION_VAR);
    
    let normalUniforms = [];
    let internalUniforms = [];
    
    uniforms.forEach(uniformEntry => {
      if (uniformEntry.internal) {
        internalUniforms.push(uniformEntry);
      } else {
        normalUniforms.push(uniformEntry);
      }
      delete uniformEntry.internal;
    });
    
    this.#customUniforms = FullCanvasShaderManager.#uniformEntryArrToMap(gl, shaderProgram, normalUniforms);
    this.#customUniformsInternal = FullCanvasShaderManager.#uniformEntryArrToMap(gl, shaderProgram, internalUniforms);
    
    // gl context setup > buffer for quad coordinates
    
    let positionBuffer = this.#positionBuffer = gl.createBuffer();
    
    const positionData = new Float32Array([
      1, 1,
      -1, 1,
      1, -1,
      -1, -1,
    ]);
    
    const numComponents = 2; // pull out 2 values per iteration
    const type = gl.FLOAT; // the data in the buffer is 32bit floats
    const normalize = false; // don't normalize
    const stride = 0; // how many bytes to get from one set of values to the next
    // 0 = use type and numComponents above
    const offset = 0; // how many bytes inside the buffer to start from
    
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positionData, gl.STATIC_DRAW);
    gl.vertexAttribPointer(vertexAttribLocation, numComponents, type, normalize, stride, offset);
    gl.enableVertexAttribArray(vertexAttribLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    
    // variable setting
    
    this.#gl = gl;
    
    // return successfully constructed this
    
    return this;
  }
  
  #setResolutionUniform(width, height) {
    this.#gl.useProgram(this.#shaderProgram);
    this.#gl.uniform2f(this.#resolutionUniformLocation, width, height);
    this.#gl.useProgram(null);
  }
  
  // public functions
  
  // This function is async as it calls an async helper and returns the corresponding promise
  constructor(gl, opts) {
    return this.#initialize(gl, opts);
  }
  
  resizeViewport(width, height) {
    if (!Number.isFinite(width) || width < 0) {
      throw new Error(`width not finite nonnegative number: ${width}`);
    }
    
    if (!Number.isFinite(height) || height < 0) {
      throw new Error(`height not finite nonnegative number: ${height}`);
    }
    
    if (this.#gl == null) {
      throw new Error('Cannot resize viewport, gl context destroyed');
    }
    
    // update viewport
    this.#gl.viewport(0, 0, width, height);
    
    // set resolution in uniform in program
    this.#setResolutionUniform(width, height);
  }
  
  tearDown() {
    if (this.#gl == null) {
      throw new Error('GL context already destroyed');
    }
    
    let gl = this.#gl;
    
    gl.deleteBuffer(this.#positionBuffer);
    this.#positionBuffer = null;
    
    gl.deleteProgram(this.#shaderProgram);
    this.#shaderProgram = null;
    
    this.#shaderManager.deleteAllShaders();
    //this.#vertexShader = null;
    //this.#fragmentShader = null;
    this.#shaderManager = null;
    //this.#vertexAttribLocation = null;
    this.#resolutionUniformLocation = null;
    this.#customUniforms = null;
    this.#customUniformsInternal = null;
    
    this.#textureManager.deleteAllTextures();
    this.#textureManager = null;
    
    this.#gl = null;
  }
  
  render() {
    if (this.#gl == null) {
      throw new Error('Cannot render, gl context destroyed');
    }
    
    // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context
        
    let gl = this.#gl;
        
    // no need to clear screen if shader is drawing over full screen anyway
    
    //gl.clearColor(0.0, 0.0, 0.0, 1.0);
    //gl.clearDepth(1.0);
    //gl.clear(gl.COLOR_BUFFER_BIT, gl.DEPTH_BUFFER_BIT);
    
    gl.useProgram(this.#shaderProgram);
    
    const offset = 0;
    const vertexCount = 4;
    gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    
    gl.useProgram(null);
  }
  
  getUniform(uniformName) {
    if (typeof uniformName != 'string') {
      throw new Error(`Error: uniformName not string: ${typeof uniformName}`);
    }
    
    if (this.#gl == null) {
      throw new Error('Cannot get uniform value, gl context destroyed');
    }
    
    if (!this.#customUniforms.has(uniformName)) {
      throw new Error(`Uniform ${uniformName} does not exist or was not user set`);
    }
    
    let uniformEntry = this.#customUniforms.get(uniformName);
    
    return this.#gl.getUniform(
      this.#shaderProgram,
      uniformEntry.location
    );
  }
  
  setUniform(uniformName, value) {
    if (typeof uniformName != 'string') {
      throw new Error(`Error: uniformName not string: ${typeof uniformName}`);
    }
    
    if (this.#gl == null) {
      throw new Error('Cannot set uniform value, gl context destroyed');
    }
    
    if (!this.#customUniforms.has(uniformName)) {
      throw new Error(`Uniform ${uniformName} does not exist or was not user set`);
    }
    
    let uniformEntry = this.#customUniforms.get(uniformName);
    
    let gl = this.#gl;
    let loc = uniformEntry.location;
    
    gl.useProgram(this.#shaderProgram);
    
    try {
      // for setting boolean uniforms, apparently any uniform function can be used,
      // and 0 = false and nonzero = true?:
      // https://stackoverflow.com/questions/33690186/opengl-bool-uniform/33690786#33690786
      // here, the signed-integer uniform functions are used
      
      switch (uniformEntry.type) {
        // scalars / vectors
        
        case UniformType['BOOLEAN']:
          gl.uniform1i(loc, value);
          break;
        
        case UniformType['BVEC2']:
          gl.uniform2i(loc, ...value);
          break;
        
        case UniformType['BVEC3']:
          gl.uniform3i(loc, ...value);
          break;
        
        case UniformType['BVEC4']:
          gl.uniform4i(loc, ...value);
          break;
        
        case UniformType['UINT']:
          gl.uniform1ui(loc, value);
          break;
        
        case UniformType['UVEC2']:
          gl.uniform2ui(loc, ...value);
          break;
        
        case UniformType['UVEC3']:
          gl.uniform3ui(loc, ...value);
          break;
        
        case UniformType['UVEC4']:
          gl.uniform4ui(loc, ...value);
          break;
        
        case UniformType['FLOAT']:
          gl.uniform1f(loc, value);
          break;
        
        case UniformType['VEC2']:
          gl.uniform2f(loc, ...value);
          break;
        
        case UniformType['VEC3']:
          gl.uniform3f(loc, ...value);
          break;
        
        case UniformType['VEC4']:
          gl.uniform4f(loc, ...value);
          break;
        
        case UniformType['INT']:
          gl.uniform1i(loc, value);
          break;
        
        case UniformType['IVEC2']:
          gl.uniform2i(loc, ...value);
          break;
        
        case UniformType['IVEC3']:
          gl.uniform3i(loc, ...value);
          break;
        
        case UniformType['IVEC4']:
          gl.uniform4i(loc, ...value);
          break;
        
        case UniformType['BOOLEAN' + UniformType_ArraySuffix]:
          gl.uniform1iv(loc, value);
          break;
        
        case UniformType['BVEC2' + UniformType_ArraySuffix]:
          gl.uniform2iv(loc, value);
          break;
        
        case UniformType['BVEC3' + UniformType_ArraySuffix]:
          gl.uniform3iv(loc, value);
          break;
        
        case UniformType['BVEC4' + UniformType_ArraySuffix]:
          gl.uniform4iv(loc, value);
          break;
        
        case UniformType['UINT' + UniformType_ArraySuffix]:
          gl.uniform1uiv(loc, value);
          break;
        
        case UniformType['UVEC2' + UniformType_ArraySuffix]:
          gl.uniform2uiv(loc, value);
          break;
        
        case UniformType['UVEC3' + UniformType_ArraySuffix]:
          gl.uniform3uiv(loc, value);
          break;
        
        case UniformType['UVEC4' + UniformType_ArraySuffix]:
          gl.uniform4uiv(loc, value);
          break;
        
        case UniformType['FLOAT' + UniformType_ArraySuffix]:
          gl.uniform1fv(loc, value);
          break;
        
        case UniformType['VEC2' + UniformType_ArraySuffix]:
          gl.uniform2fv(loc, value);
          break;
        
        case UniformType['VEC3' + UniformType_ArraySuffix]:
          gl.uniform3fv(loc, value);
          break;
        
        case UniformType['VEC4' + UniformType_ArraySuffix]:
          gl.uniform4fv(loc, value);
          break;
        
        case UniformType['INT' + UniformType_ArraySuffix]:
          gl.uniform1iv(loc, value);
          break;
        
        case UniformType['IVEC2' + UniformType_ArraySuffix]:
          gl.uniform2iv(loc, value);
          break;
        
        case UniformType['IVEC3' + UniformType_ArraySuffix]:
          gl.uniform3iv(loc, value);
          break;
        
        case UniformType['IVEC4' + UniformType_ArraySuffix]:
          gl.uniform4iv(loc, value);
          break;
        
        // matrices
        
        case ['MAT22']:
          gl.uniformMatrix2fv(loc, false, value);
          break;
        
        case ['MAT23']:
          gl.uniformMatrix2x3fv(loc, false, value);
          break;
        
        case ['MAT24']:
          gl.uniformMatrix2x4fv(loc, false, value);
          break;
        
        case ['MAT32']:
          gl.uniformMatrix3x2fv(loc, false, value);
          break;
        
        case ['MAT33']:
          gl.uniformMatrix3fv(loc, false, value);
          break;
        
        case ['MAT34']:
          gl.uniformMatrix3x4fv(loc, false, value);
          break;
        
        case ['MAT42']:
          gl.uniformMatrix4x2fv(loc, false, value);
          break;
        
        case ['MAT43']:
          gl.uniformMatrix4x3fv(loc, false, value);
          break;
        
        case ['MAT44']:
          gl.uniformMatrix4fv(loc, false, value);
          break;
        
        case ['MAT22' + UniformType_ArraySuffix]:
          gl.uniformMatrix2fv(loc, false, value);
          break;
        
        case ['MAT23' + UniformType_ArraySuffix]:
          gl.uniformMatrix2x3fv(loc, false, value);
          break;
        
        case ['MAT24' + UniformType_ArraySuffix]:
          gl.uniformMatrix2x4fv(loc, false, value);
          break;
        
        case ['MAT32' + UniformType_ArraySuffix]:
          gl.uniformMatrix3x2fv(loc, false, value);
          break;
        
        case ['MAT33' + UniformType_ArraySuffix]:
          gl.uniformMatrix3fv(loc, false, value);
          break;
        
        case ['MAT34' + UniformType_ArraySuffix]:
          gl.uniformMatrix3x4fv(loc, false, value);
          break;
        
        case ['MAT42' + UniformType_ArraySuffix]:
          gl.uniformMatrix4x2fv(loc, false, value);
          break;
        
        case ['MAT43' + UniformType_ArraySuffix]:
          gl.uniformMatrix4x3fv(loc, false, value);
          break;
        
        case ['MAT44' + UniformType_ArraySuffix]:
          gl.uniformMatrix4fv(loc, false, value);
          break;
        
        case UniformType['SAMPLER2D']: {
          let texID;
          
          try {
            texID = this.#textureManager.getTextureID(value);
          } catch (err) {
            throw new Error(`value[${i}] invalid, error resulted: ${err.toString()}`);
          }
          
          let { width, height } = this.#textureManager.getTextureDimensions(value);
          
          let resolutionLoc = this.#customUniformsInternal.get(`${uniformName}${FRAGMENT_SHADER_TEXTURE_RESOLUTION_SUFFIX}`).location;
          
          gl.uniform1i(loc, texID);
          gl.uniform2f(resolutionLoc, width, height);
          break;
        }
        
        case UniformType['SAMPLER2D' + UniformType_ArraySuffix]: {
          if (!Array.isArray(value)) {
            throw new Error(`Sampler2d[] (array) enum must be set with array of texture names`);
          }
          
          let texIDs = [];
          let widthAndHeight = [];
          
          for (let i = 0; i < value.length; i++) {
            let textureAlias = value[i];
            
            let texID;
            
            try {
              texID = this.#textureManager.getTextureID(textureAlias);
            } catch (err) {
              throw new Error(`value[${i}] invalid, error resulted: ${err.toString()}`);
            }
            
            let { width, height } = this.#textureManager.getTextureDimensions(value);
            
            texIDs.push(texID);
            widthAndHeight.push({ width, height });
          }
          
          let resolutionLoc = this.#customUniformsInternal.get(`${uniformName}${FRAGMENT_SHADER_TEXTURE_RESOLUTION_SUFFIX}`).location;
          
          gl.uniform1iv(loc, texIDs);
          gl.uniform1fv(resolutionLoc, widthAndHeight.map(({ width, height}) => [width, height]).flat());
          break;
        }
        
        default:
          throw new Error(`Uniform setting not implemented for type ${uniformEntry.type}`);
      }
    } finally {
      gl.useProgram(null);
    }
  }
  
  currentTextureNames() {
    if (this.#gl == null) {
      throw new Error('Cannot perform texture functions, gl context destroyed');
    }
    
    return this.#textureManager.currentTextureNames();
  }
  
  hasTexture(alias) {
    if (this.#gl == null) {
      throw new Error('Cannot perform texture functions, gl context destroyed');
    }
    
    return this.#textureManager.hasTexture(alias);
  }
  
  async loadTexture(opts) {
    if (typeof opts == 'string') {
      opts = { data: opts };
    }
    
    let { data, alias } = opts;
    
    if (this.#gl == null) {
      throw new Error('Cannot perform texture functions, gl context destroyed');
    }
    
    await this.#textureManager.loadTexture({ data, alias });
  }
  
  deleteTexture(alias) {
    if (this.#gl == null) {
      throw new Error('Cannot perform texture functions, gl context destroyed');
    }
    
    this.#textureManager.deleteTexture(alias);
  }
  
  deleteAllTextures() {
    if (this.#gl == null) {
      throw new Error('Cannot perform texture functions, gl context destroyed');
    }
    
    this.#textureManager.deleteAllTextures();
  }
  
  getTextureID(alias) {
    if (this.#gl == null) {
      throw new Error('Cannot perform texture functions, gl context destroyed');
    }
    
    return this.#textureManager.getTextureID(alias);
  }
  
  getTextureDimensions(alias) {
    if (this.#gl == null) {
      throw new Error('Cannot perform texture functions, gl context destroyed');
    }
    
    return this.#textureManager.getTextureDimensions(alias);
  }
}

export async function createFullCanvasShaderManager(gl, opts) {
  return await new FullCanvasShaderManager(gl, opts);
}
