// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context

export class ShaderManager {
  #gl = null;
  #shaders = new Set();
  
  constructor(gl) {
    if (!(gl instanceof WebGLRenderingContext || gl instanceof WebGL2RenderingContext)) {
      throw new Error('GL object must be a WebGL rendering context');
    }
    
    this.#gl = gl;
  }
  
  shaderStored(shader) {
    if (!(shader instanceof WebGLShader)) {
      throw new Error('Shader is not a WebGL shader object');
    }
    
    return this.#shaders.has(shader);
  }
  
  getShaders() {
    return Array.from(this.#shaders);
  }
  
  loadShaderFromString(shaderType, sourceString) {
    if (
      !Number.isSafeInteger(shaderType) ||
      (
        shaderType != this.#gl.VERTEX_SHADER &&
        shaderType != this.#gl.FRAGMENT_SHADER
      )
    ) {
      throw new Error(`ShaderType must be gl.VERTEX_SHADER or gl.FRAGMENT_SHADER`);
    }
    
    if (typeof sourceString != 'string') {
      throw new Error('SourceString must be a string');
    }
    
    let shader = this.#gl.createShader(shaderType);
    
    this.#gl.shaderSource(shader, sourceString);
    this.#gl.compileShader(shader);
    
    if (!this.#gl.getShaderParameter(shader, this.#gl.COMPILE_STATUS)) {
      let info = this.#gl.getShaderInfoLog(shader);
      this.#gl.deleteShader(shader);
      throw new Error(`Shader compilation error: ${info}`);
    }
    
    this.#shaders.add(shader);
    
    return shader;
  }
  
  deleteShader(shader) {
    if (!(shader instanceof WebGLShader)) {
      throw new Error('Shader is not a WebGL shader object');
    }
    
    if (!this.#shaders.has(shader)) {
      throw new Error('Shader cannot be removed as it was not part of shader store');
    }
    
    this.#gl.deleteShader(shader);
    this.#shaders.remove(shader);
  }
  
  deleteAllShaders() {
    for (let shader of this.#shaders) {
      this.deleteShader(shader);
    }
  }
}
