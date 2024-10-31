import { removeNode } from '../dom_tools.mjs';
import { Enum } from '../enum.mjs';
import { Lock } from '../lock.mjs';
import { RenderLoop } from './render_loop.mjs';
import { ShaderManager } from './shader_manager.mjs';

// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context

const ALL_SHADER_PREFIX = `
  #version 300 es
  precision highp float;
`.trim();

const VERTEX_SHADER_XY_ONLY_TEXT =
  ALL_SHADER_PREFIX + `
  in vec4 aVertexPosition;
  
  void main() {
    gl_Position = vec4(aVertexPosition.xy, 0.0, 1.0);
  }
`.trim();

const FRAGMENT_SHADER_PREFIX =
  ALL_SHADER_PREFIX + `
  uniform vec2 iResolution;
`;

export const CanvasMode = Enum([
  'NONE',
  '2D',
  'WEBGL1',
  'WEBGL2',
  'WEBGL_FULL_CANVAS_SHADER',
]);

export const ShaderSegmentType = Enum([
  'STRING',
  'URL',
]);

export class CanvasManager {
  // class variables
  
  #editLock = new Lock();
  #canvasContainer = null;
  #canvasMode = CanvasMode.NONE;
  #canvasPixelsPerDisplayPixel = 1;
  #canvas = null;
  #canvasContext = null;
  #canvasWidth = null;
  #canvasHeight = null;
  #canvasStyle = null;
  #resizeObserver = null;
  #triggers = null;
  #renderLoop = null;
  
  // class variables > webgl full canvas shader specific
  
  #fullCanvasShaderData = null;
  
  // helper functions
  
  async #updateCanvasSize() {
    this.#canvasWidth = parseInt(this.#canvasStyle.width) * window.devicePixelRatio * this.#canvasPixelsPerDisplayPixel;
    this.#canvasHeight = parseInt(this.#canvasStyle.height) * window.devicePixelRatio * this.#canvasPixelsPerDisplayPixel;
    
    this.#canvas.width = this.#canvasWidth;
    this.#canvas.height = this.#canvasHeight;
    
    switch (this.#canvasMode) {
      case CanvasMode['2D']:
        break;
      
      case CanvasMode.WEBGL1:
      case CanvasMode.WEBGL2:
        this.#canvasContext.viewport(0, 0, this.#canvasWidth, this.#canvasHeight);
        break;
      
      case CanvasMode.WEBGL_FULL_CANVAS_SHADER:
        this.#canvasContext.viewport(0, 0, this.#canvasWidth, this.#canvasHeight);
        
        // set resolution in uniform in program
          
        this.#canvasContext.useProgram(this.#fullCanvasShaderData.shaderProgram);
        this.#canvasContext.uniform2f(this.#fullCanvasShaderData.uniformLocations.iResolution, this.#canvasWidth, this.#canvasHeight);
        this.#canvasContext.useProgram(null);
        break;
      
      default:
        throw new Error('default case should not be triggered');
    }
    
    this.#queueForceRender();
  }
  
  async #resizeHandler() {
    // treated as a "public" function call in that the lock must be acquired
    
    await this.#editLock.awaitAcquire();
    
    try {
      await this.#updateCanvasSize();
    } finally {
      this.#editLock.release();
    }
  }
  
  async #createCanvas(opts) {
    this.#renderLoop.setFrameRate(opts.frameRate);
    
    let triggers = {};
    
    let shaderSegmentStrings;
    
    if (typeof opts.triggers != 'object' && opts.triggers != null) {
      throw new Error('opts.triggers must be object');
    }
    
    if (opts.triggers.setup == null || typeof opts.triggers.setup == 'function') {
      triggers.setup = opts.triggers.setup;
    } else {
      throw new Error(`opts.triggers.setup not function or null: ${typeof opts.triggers.setup}`);
    }
    
    if (opts.triggers.render == null || typeof opts.triggers.render == 'function') {
      triggers.render = opts.triggers.render;
    } else {
      throw new Error(`opts.triggers.render not function ${opts.triggers.render == null ? 'null / undefined' : typeof opts.triggers.render}`);
    }
    
    if (opts.triggers.tearDown == null || typeof opts.triggers.tearDown == 'function') {
      triggers.tearDown = opts.triggers.tearDown;
    } else {
      throw new Error(`opts.triggers.tearDown not function or null: ${typeof opts.triggers.tearDown}`);
    }
    
    if (opts.mode == CanvasMode.WEBGL_FULL_CANVAS_SHADER) {
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
              
              shaderSegmentStrings.push(await (await fetch(segment.url)).text());
              break;
          }
        }
      } else {
        throw new Error(`opts.triggers.tearDown not function or null: ${typeof opts.triggers.tearDown}`);
      }
    }
    
    this.#triggers = triggers;
    
    let canvas = document.createElement('canvas');
    
    this.#canvasContainer.appendChild(canvas);
    this.#canvas = canvas;
    
    this.#canvasMode = opts.mode;
    
    switch (opts.mode) {
      case CanvasMode['2D']:
        this.#canvasContext = canvas.getContext('2d');
        break;
      
      case CanvasMode.WEBGL1:
        this.#canvasContext = canvas.getContext('webgl1');
        break;
      
      case CanvasMode.WEBGL2:
        this.#canvasContext = canvas.getContext('webgl2');
        break;
      
      case CanvasMode.WEBGL_FULL_CANVAS_SHADER: {
        let gl = canvas.getContext('webgl2');
        
        this.#canvasContext = gl;
        
        try {
          // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context
          
          // shader creation
          
          this.#fullCanvasShaderData = {};
          
          let shaderManager = this.#fullCanvasShaderData.shaderManager = new ShaderManager(gl);
          
          let vertexShader = this.#fullCanvasShaderData.vertexShader = shaderManager.loadShaderFromString(gl.VERTEX_SHADER, VERTEX_SHADER_XY_ONLY_TEXT);
          
          let fragmentShaderSource = [
            FRAGMENT_SHADER_PREFIX,
            ...shaderSegmentStrings
          ].join('\n');
          
          let fragmentShader = this.#fullCanvasShaderData.fragmentShader = shaderManager.loadShaderFromString(gl.FRAGMENT_SHADER, fragmentShaderSource);
          
          // shader program creation
          
          let shaderProgram = this.#fullCanvasShaderData.shaderProgram = gl.createProgram();
          
          gl.attachShader(shaderProgram, vertexShader);
          gl.attachShader(shaderProgram, fragmentShader);
          gl.linkProgram(shaderProgram);
          
          if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            let info = gl.getProgramInfoLog(shaderProgram);
            gl.deleteProgram(shaderProgram);
            throw new Error(`Shader program initialization error: ${info}`);
          }
          
          // get variable positions
          
          let attribLocations = this.#fullCanvasShaderData.attribLocations = {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
          };
          
          this.#fullCanvasShaderData.uniformLocations = {
            iResolution: gl.getUniformLocation(shaderProgram, 'iResolution'),
          };
          
          // buffer for quad coordinates
          
          let positionBuffer = this.#fullCanvasShaderData.positionBuffer = gl.createBuffer();
          
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
          gl.vertexAttribPointer(attribLocations.vertexPosition, numComponents, type, normalize, stride, offset);
          gl.enableVertexAttribArray(attribLocations.vertexPosition);
          gl.bindBuffer(gl.ARRAY_BUFFER, null);
        } catch (err) {
          console.error(err);
          this.gracefulShutdown();
        }
        break;
      }
      
      default:
        throw new Error('default case should not be triggered');
    }
    
    this.#canvasStyle = getComputedStyle(this.#canvas);
    this.#resizeObserver = new ResizeObserver(() => { this.#resizeHandler(); });
    this.#resizeObserver.observe(this.#canvas);
    
    if (this.#triggers.setup != null) {
      try {
        await this.#triggers.setup();
      } catch (err) {
        console.error(err);
        this.gracefulShutdown();
      }
    }
    
    this.#renderLoop.startRenderLoop();
  }
  
  // might get called to destroy canvas if mode not NONE
  async #destroyCanvas() {
    if (this.#triggers.tearDown != null) {
      try {
        await this.#triggers.tearDown();
      } catch (err) {
        console.error(err);
      }
    }
    
    switch (this.#canvasMode) {
      case CanvasMode['2D']:
      case CanvasMode.WEBGL1:
      case CanvasMode.WEBGL2:
        break;
      
      case CanvasMode.WEBGL_FULL_CANVAS_SHADER: {
        // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context
        
        let gl = this.#canvasContext;
        
        gl.deleteBuffer(this.#fullCanvasShaderData.positionBuffer);
        this.#fullCanvasShaderData.positionBuffer = null;
        
        gl.deleteProgram(this.#fullCanvasShaderData.shaderProgram);
        this.#fullCanvasShaderData.shaderProgram = null;
        
        this.#fullCanvasShaderData.shaderManager.deleteAllShaders();
        this.#fullCanvasShaderData.vertexShader = null;
        this.#fullCanvasShaderData.fragmentShader = null;
        this.#fullCanvasShaderData.shaderManager = null;
        
        this.#fullCanvasShaderData = null;
        break;
      }
      
      default:
        throw new Error('default case should not be triggered');
    }
    
    removeNode(this.#canvas);
    
    this.#canvas = null;
    this.#canvasContext = null;
    this.#canvasWidth = null;
    this.#canvasHeight = null;
    this.#canvasStyle = null;
    this.#resizeObserver.unobserve(this.#canvas);
    this.#resizeObserver = null;
    this.#renderLoop.clearFrameRate();
  }
  
  async #callRender() {
    switch (this.#canvasMode) {
      case CanvasMode['2D']:
      case CanvasMode.WEBGL1:
      case CanvasMode.WEBGL2:
        break;
      
      case CanvasMode.WEBGL_FULL_CANVAS_SHADER: {
        // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context
        
        let gl = this.#canvasContext;
        
        // no need to clear screen if shader is drawing over full screen anyway
        
        //gl.clearColor(0.0, 0.0, 0.0, 1.0);
        //gl.clearDepth(1.0);
        //gl.clear(gl.COLOR_BUFFER_BIT, gl.DEPTH_BUFFER_BIT);
        
        gl.useProgram(this.#fullCanvasShaderData.shaderProgram);
        
        const offset = 0;
        const vertexCount = 4;
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
        
        gl.useProgram(null);
        break;
      }
      
      default:
        throw new Error('default case should not be triggered');
    }
    
    if (this.#triggers.render != null) {
      await this.#triggers.render();
    }
  }
  
  #queueForceRender() {
    (async () => {
      await this.#editLock.awaitAcquirable();
      await this.#renderLoop.forceRender();
    })();
  }
  
  // public functions
  
  constructor(canvasContainer) {
    if (canvasContainer instanceof HTMLElement) {
      this.#canvasContainer = canvasContainer;
    } else {
      throw new Error('Canvas container not a html element');
    }
    
    this.#renderLoop = new RenderLoop(this.#callRender.bind(this));
  }
  
  getCanvasContainer() {
    this.#editLock.errorIfAcquired();
    
    return this.#canvasContainer;
  }
  
  getCanvasMode() {
    this.#editLock.errorIfAcquired();
    
    return this.#canvasMode;
  }
  
  async setCanvasMode(opts) {
    let newMode = opts.mode;
    
    if (typeof newMode == 'string' && newMode in CanvasMode) {
      // it is a bit forbidden to check the canvasmode before acquiring the lock, but it is
      // probably imperative that the render loop be ended before the lock is acquired,
      // but the loop can only be ended if the canvas is set up in the first place
      if (this.#canvasMode != CanvasMode.NONE) {
        await this.#renderLoop.endRenderLoop();
      }
      
      this.#editLock.acquire();
      
      try {
        if (newMode != this.#canvasMode) {
          let oldMode = this.#canvasMode;
          
          if (oldMode != CanvasMode.NONE) {
            await this.#destroyCanvas();
          }
          
          if (newMode != CanvasMode.NONE) {
            await this.#createCanvas(opts);
          } else {
            this.#canvasMode = newMode;
          }
        }
      } finally {
        this.#editLock.release();
      }
    } else {
      throw new Error(`Canvas mode ${newMode} invalid`);
    }
  }
  
  getCanvasPixelsPerDisplayPixel() {
    this.#editLock.errorIfAcquired();
    
    return this.#canvasPixelsPerDisplayPixel;
  }
  
  setCanvasPixelsPerDisplayPixel(newValue) {
    if (!Number.isFinite(newValue) || newValue <= 0) {
      throw new Error(`Pixel ratio value ${newValue} invalid`);
    }
    
    this.#editLock.errorIfAcquired();
    
    this.#canvasPixelsPerDisplayPixel = newValue;
  }
  
  getCanvas() {
    //this.#editLock.errorIfAcquired();
    
    if (this.#canvasMode == CanvasMode.NONE) {
      throw new Error('Cannot get canvas if mode is none');
    }
    
    return this.#canvas;
  }
  
  getContext() {
    //this.#editLock.errorIfAcquired();
    
    if (this.#canvasMode == CanvasMode.NONE) {
      throw new Error('Cannot get context if mode is none');
    }
    
    return this.#canvasContext;
  }
  
  getCanvasSize() {
    //this.#editLock.errorIfAcquired();
    
    return [this.#canvasWidth, this.#canvasHeight];
  }
  
  getFrameRate() {
    this.#editLock.errorIfAcquired();
    
    return this.#renderLoop.getFrameRate();
  }
  
  async setFrameRate(newFrameRate) {
    this.#editLock.acquire();
    
    try {
      this.#renderLoop.setFrameRate(newFrameRate);
    } finally {
      this.#editLock.release();
    }
  }
  
  managerEditable() {
    return this.#editLock.isAcquired();
  }
  
  async awaitManagerEditable() {
    await this.#editLock.awaitAcquirable();
  }
  
  async gracefulShutdown() {
    await this.awaitManagerEditable();
    await this.setCanvasMode({ mode: CanvasMode.NONE });
  }
}
