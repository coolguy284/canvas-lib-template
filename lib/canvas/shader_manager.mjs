// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context

export class ShaderManager {
  #gl = null;
  #shaders = new Set();
  
  constructor(gl) {
    this.#gl = gl;
  }
  
  loadShaderFromString(shaderType, sourceString) {
    let shader = this.#gl.createShader(shaderType);
    
    this.#gl.shaderSource(shader, sourceString);
    this.#gl.compileShader(shader);
    
    if (!this.#gl.getShaderParameter(shader, this.#gl.COMPILE_STATUS)) {
      let info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compilation error: ${info}`);
    }
    
    this.#shaders.add(shader);
    
    return shader;
  }
  
  deleteShader(shader) {
    this.#shaders.remove(shader);
  }
}
