import { removeNode } from '../misc/dom_tools.mjs';
import { Lock } from '../misc/lock.mjs';
import { CanvasMode } from './enums.mjs';
import { createFullCanvasShaderManager } from './gl_full_canvas_shader.mjs';
import { RenderLoop } from './render_loop.mjs';

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
  
  #fullCanvasShaderManager = null;
  
  // helper functions
  
  async #updateCanvasSize() {
    this.#canvasWidth = parseInt(this.#canvasStyle.width) * window.devicePixelRatio * this.#canvasPixelsPerDisplayPixel;
    this.#canvasHeight = parseInt(this.#canvasStyle.height) * window.devicePixelRatio * this.#canvasPixelsPerDisplayPixel;
    
    this.#canvas.width = this.#canvasWidth;
    this.#canvas.height = this.#canvasHeight;
    
    switch (this.#canvasMode) {
      case CanvasMode.NO_CONTEXT:
      case CanvasMode['2D']:
        break;
      
      case CanvasMode.WEBGL1:
      case CanvasMode.WEBGL2:
        this.#canvasContext.viewport(0, 0, this.#canvasWidth, this.#canvasHeight);
        break;
      
      case CanvasMode.WEBGL_FULL_CANVAS_SHADER:
        this.#fullCanvasShaderManager.resizeViewport(this.#canvasWidth, this.#canvasHeight);
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
    let triggers = {};
    
    if (opts.triggers != null) {
      if (typeof opts.triggers != 'object') {
        throw new Error('opts.triggers must be object or null');
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
    }
    
    this.#renderLoop.setFrameRate(opts.frameRate);
    
    try {
      let canvas = document.createElement('canvas');
      
      switch (opts.mode) {
        case CanvasMode.NO_CONTEXT:
          break;
        
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
          let fullCanvasShaderManager = await createFullCanvasShaderManager(gl, opts);
          
          this.#canvasContext = gl;
          this.#fullCanvasShaderManager = fullCanvasShaderManager;
          break;
        }
        
        default:
          throw new Error('default case should not be triggered');
      }
      
      this.#triggers = triggers;
      
      this.#canvasContainer.appendChild(canvas);
      this.#canvas = canvas;
      
      this.#canvasMode = opts.mode;
      
      this.#canvasStyle = getComputedStyle(this.#canvas);
      
      this.#resizeObserver = new ResizeObserver(() => { this.#resizeHandler(); });
      this.#resizeObserver.observe(this.#canvas);
      
      if (this.#triggers.setup != null) {
        try {
          // temporarily release lock during call to setup
          this.#editLock.release();
          try {
            await this.#triggers.setup();
          } finally {
            this.#editLock.acquire();
          }
        } catch (err) {
          this.#resizeObserver.unobserve(this.#canvas);
          this.#resizeObserver = null;
    
          this.#canvasWidth = null;
          this.#canvasHeight = null;
          
          this.#canvasStyle = null;
          
          this.#canvasMode = CanvasMode.NONE;
          
          removeNode(this.#canvas);
          this.#canvas = null;
          
          this.#triggers = null;
          
          if (opts.mode == CanvasMode.WEBGL_FULL_CANVAS_SHADER) {
            this.#fullCanvasShaderManager.tearDown();
            this.#fullCanvasShaderManager = null;
          }
          
          this.#canvasContext = null;
          
          throw err;
        }
      }
    } catch (err) {
      this.#renderLoop.clearFrameRate();
      
      throw err;
    }
  }
  
  // might get called to destroy canvas if mode not NONE
  async #destroyCanvas() {
    if (this.#triggers.tearDown != null) {
      try {
        // temporarily release lock during call to tearDown
        this.#editLock.release();
        try {
          await this.#triggers.tearDown();
        } finally {
          this.#editLock.acquire();
        }
      } catch (err) {
        console.error(err);
      }
    }
    
    switch (this.#canvasMode) {
      case CanvasMode.NO_CONTEXT:
      case CanvasMode['2D']:
      case CanvasMode.WEBGL1:
      case CanvasMode.WEBGL2:
        break;
      
      case CanvasMode.WEBGL_FULL_CANVAS_SHADER: {
        // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context
        
        this.#fullCanvasShaderManager.tearDown();
        this.#fullCanvasShaderManager = null;
        break;
      }
      
      default:
        throw new Error('default case should not be triggered');
    }
    
    this.#resizeObserver.unobserve(this.#canvas);
    this.#resizeObserver = null;
    
    this.#canvasWidth = null;
    this.#canvasHeight = null;
    
    this.#canvasStyle = null;
          
    this.#canvasMode = CanvasMode.NONE;
    
    removeNode(this.#canvas);
    this.#canvas = null;
    
    this.#triggers = null;
    
    this.#canvasContext = null;
    
    this.#renderLoop.clearFrameRate();
  }
  
  async #callRender() {
    try {
      switch (this.#canvasMode) {
        case CanvasMode.NO_CONTEXT:
        case CanvasMode['2D']:
        case CanvasMode.WEBGL1:
        case CanvasMode.WEBGL2:
          if (this.#triggers.render != null) {
            await this.#triggers.render();
          }
          break;
        
        case CanvasMode.WEBGL_FULL_CANVAS_SHADER: {
          if (this.#triggers.render != null) {
            await this.#triggers.render();
          }
          
          this.#fullCanvasShaderManager.render();
          break;
        }
        
        default:
          throw new Error('default case should not be triggered');
      }
    } catch (err) {
      this.gracefulShutdown();
      throw err;
    }
  }
  
  async #forceRender() {
    await this.#editLock.awaitAcquirable();
    await this.#renderLoop.forceRender();
  }
  
  #queueForceRender() {
    this.#forceRender();
  }
  
  // public functions
  
  constructor(canvasContainer) {
    if (canvasContainer instanceof HTMLElement) {
      this.#canvasContainer = canvasContainer;
    } else {
      throw new Error('Canvas container not a html element');
    }
    
    this.#renderLoop = new RenderLoop({
      renderFunc: this.#callRender.bind(this),
      errorSignalingFunc: this.gracefulShutdown.bind(this),
    });
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
          }
        }
      } finally {
        this.#editLock.release();
      }
      
      if (this.getCanvasMode() != CanvasMode.NONE) {
        this.#renderLoop.startRenderLoop();
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
  
  async forceRender() {
    await this.#forceRender();
  }
  
  async gracefulShutdown() {
    await this.awaitManagerEditable();
    await this.setCanvasMode({ mode: CanvasMode.NONE });
  }
  
  // webgl full canvas shader specific
  
  getUniform(uniformName) {
    if (this.getCanvasMode() != CanvasMode.WEBGL_FULL_CANVAS_SHADER) {
      throw new Error('Uniform get/set functions only available on full canvas shader mode');
    }
    
    return this.#fullCanvasShaderManager.getUniform(uniformName);
  }
  
  setUniform(uniformName, value) {
    if (this.getCanvasMode() != CanvasMode.WEBGL_FULL_CANVAS_SHADER) {
      throw new Error('Uniform get/set functions only available on full canvas shader mode');
    }
    
    this.#fullCanvasShaderManager.setUniform(uniformName, value);
  }
  
  currentTextureNames() {
    if (this.getCanvasMode() != CanvasMode.WEBGL_FULL_CANVAS_SHADER) {
      throw new Error('texture functions only available on full canvas shader mode');
    }
    
    return this.#fullCanvasShaderManager.currentTextureNames();
  }
  
  hasTexture(alias) {
    if (this.getCanvasMode() != CanvasMode.WEBGL_FULL_CANVAS_SHADER) {
      throw new Error('texture functions only available on full canvas shader mode');
    }
    
    return this.#fullCanvasShaderManager.hasTexture(alias);
  }
  
  async loadTexture(opts) {
    if (typeof opts == 'string') {
      opts = { data: opts };
    }
    
    let { data, alias } = opts;
    
    if (this.getCanvasMode() != CanvasMode.WEBGL_FULL_CANVAS_SHADER) {
      throw new Error('texture functions only available on full canvas shader mode');
    }
    
    await this.#fullCanvasShaderManager.loadTexture({ data, alias });
  }
  
  deleteTexture(alias) {
    if (this.getCanvasMode() != CanvasMode.WEBGL_FULL_CANVAS_SHADER) {
      throw new Error('texture functions only available on full canvas shader mode');
    }
    
    this.#fullCanvasShaderManager.deleteTexture(alias);
  }
  
  deleteAllTextures() {
    if (this.getCanvasMode() != CanvasMode.WEBGL_FULL_CANVAS_SHADER) {
      throw new Error('texture functions only available on full canvas shader mode');
    }
    
    this.#fullCanvasShaderManager.deleteAllTextures();
  }
  
  getTextureID(alias) {
    if (this.getCanvasMode() != CanvasMode.WEBGL_FULL_CANVAS_SHADER) {
      throw new Error('texture functions only available on full canvas shader mode');
    }
    
    return this.#fullCanvasShaderManager.getTextureID(alias);
  }
  
  getTextureDimensions(alias) {
    if (this.getCanvasMode() != CanvasMode.WEBGL_FULL_CANVAS_SHADER) {
      throw new Error('texture functions only available on full canvas shader mode');
    }
    
    return this.#fullCanvasShaderManager.getTextureDimensions(alias);
  }
}
