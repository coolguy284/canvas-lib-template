import { removeNode } from '../dom_tools.mjs';
import { Enum } from '../enum.mjs';
import { Lock } from '../lock.mjs';
import { ShaderManager } from './shader_manager.mjs';

// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context
const VERTEX_SHADER_XY_ONLY_TEXT = `
  #version 330 es
  precision highp float;
  
  attribute vec4 aVertexPosition;
  void main() {
    gl_Position = vec4(aVertexPosition.xy, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_PREFIX = `
  #version 330 es
  precision highp float;
`;

export const CanvasMode = Enum([
  'NONE',
  '2D',
  'WEBGL1',
  'WEBGL2',
  'WEBGL_FULL_CANVAS_SHADER',
]);

export const FrameRateMode = Enum([
  'NONE',
  'RESIZE_ONLY',
  'FRAME_MULT',
  'MILLISECOND',
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
  #frameRate = null;
  #skipRenderLoopWaitSentinel = false;
  #stopRenderLoopSentinel = false;
  #skipRenderLoopWaitResolveFunc = null;
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
        break;
      
      default:
        throw new Error('default case should not be triggered');
    }
    
    this.#queueForceRender();
  }
  
  #parseFrameRate(frameRate) {
    let parsedFrameRate = {};
    
    if (typeof frameRate != 'object' && frameRate != null) {
      throw new Error('frameRate must be object');
    }
    
    if (typeof frameRate.mode == 'string' && frameRate.mode in FrameRateMode) {
      parsedFrameRate.mode = frameRate.mode;
    } else {
      throw new Error(`frameRate.mode not known: ${frameRate.mode}`);
    }
    
    switch (frameRate.mode) {
      case FrameRateMode.NONE:
      case FrameRateMode.RESIZE_ONLY:
        // no additional settings
        break;
      
      case FrameRateMode.FRAME_MULT:
        if (Number.isSafeInteger(frameRate.frameSkips) && frameRate.frameSkips >= 0) {
          parsedFrameRate.frameSkips = frameRate.frameSkips;
        } else {
          throw new Error(`frameRate.frameSkips bad value: ${frameRate.frameSkips}`);
        }
        break;
      
      case FrameRateMode.MILLISECOND:
        if (Number.isSafeInteger(frameRate.delay) && frameRate.delay > 0) {
          parsedFrameRate.delay = frameRate.delay;
        } else {
          throw new Error(`frameRate.delay bad value: ${frameRate.delay}`);
        }
        break;
      
      default:
        throw new Error('default case should not be triggered, all options accounted for');
    }
    
    return parsedFrameRate;
  }
  
  #copyFrameRate(frameRate) {
    let frameRateCopy = {
      mode: frameRate.mode,
    };
    
    switch (frameRate.mode) {
      case FrameRateMode.NONE:
      case FrameRateMode.RESIZE_ONLY:
        // no additional settings
        break;
      
      case FrameRateMode.FRAME_MULT:
        frameRateCopy.frameSkips = frameRate.frameSkips;
        break;
      
      case FrameRateMode.MILLISECOND:
        frameRateCopy.delay = frameRate.delay;
        break;
      
      default:
        throw new Error('default case should not be triggered, all options accounted for');
    }
    
    return frameRateCopy;
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
    let frameRate = this.#parseFrameRate(opts.frameRate);
    
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
    
    if (typeof opts.triggers.render == 'function') {
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
    
    this.#frameRate = frameRate;
    this.#triggers = triggers;
    
    let canvas = document.createElement('canvas');
    
    this.#canvasContainer.appendChild(canvas);
    this.#canvas = canvas;
    
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
          this.#fullCanvasShaderData = {};
          
          this.#fullCanvasShaderData.shaderManager = new ShaderManager(gl);
          
          this.#fullCanvasShaderData.shaderManager.loadShaderFromString(gl.VERTEX_SHADER, VERTEX_SHADER_XY_ONLY_TEXT);
          
          let fragmentShaderSource = [
            FRAGMENT_SHADER_PREFIX,
            ...shaderSegmentStrings
          ].join('\n');
          
          this.#fullCanvasShaderData.shaderManager.loadShaderFromString(gl.FRAGMENT_SHADER, fragmentShaderSource);
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
    
    this.#startRenderLoop();
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
        break;
      case CanvasMode.WEBGL1:
        break;
      case CanvasMode.WEBGL2:
        break;
      
      case CanvasMode.WEBGL_FULL_CANVAS_SHADER:
        this.#fullCanvasShaderData.shaderManager.deleteAllShaders();
        this.#fullCanvasShaderData.shaderManager = null;
        
        this.#fullCanvasShaderData = null;
        break;
      
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
  }
  
  async #renderLoop() {
    let resolveToCall = null;
    
    if (this.#stopRenderLoopSentinel) {
      this.#stopRenderLoopSentinel = false;
      return;
    } else if (this.#skipRenderLoopWaitSentinel) {
      this.#skipRenderLoopWaitSentinel = false;
    }
    
    while (true) {
      try {
        await this.#triggers.render();
      } catch (err) {
        console.error(err);
        this.gracefulShutdown();
      }
      
      if (this.#stopRenderLoopSentinel) {
        break;
      } else if (this.#skipRenderLoopWaitSentinel) {
        this.#skipRenderLoopWaitSentinel = false;
        
        // resolveToCall should never be set here so no need to call
        continue;
      }
      
      switch (this.#frameRate.mode) {
        case FrameRateMode.FRAME_MULT:
          let frameSkips = this.#frameRate.frameSkips;
          
          for (let i = 0; i < frameSkips; i++) {
            resolveToCall = await new Promise(r => {
              requestAnimationFrame(r);
              this.#skipRenderLoopWaitResolveFunc = r;
            });
            
            this.#skipRenderLoopWaitResolveFunc = null;
            
            if (this.#stopRenderLoopSentinel || this.#skipRenderLoopWaitSentinel) {
              break;
            }
          }
          break;
        
        case FrameRateMode.MILLISECOND:
          resolveToCall = await new Promise(r => {
            setTimeout(r, this.#frameRate.delay);
            this.#skipRenderLoopWaitResolveFunc = r;
          });
          
          this.#skipRenderLoopWaitResolveFunc = null;
          break;
        
        default:
          throw new Error('default case should not be triggered');
      }
      
      if (this.#stopRenderLoopSentinel) {
        break;
      } else if (this.#skipRenderLoopWaitSentinel) {
        // no need to continue at end of loop
        this.#skipRenderLoopWaitSentinel = false;
        
        if (resolveToCall) {
          resolveToCall();
          resolveToCall = null;
        }
      }
    }
    
    if (this.#stopRenderLoopSentinel) {
      this.#stopRenderLoopSentinel = false;
        
      if (resolveToCall) {
        resolveToCall();
        resolveToCall = null;
      }
    }
  }
  
  #startRenderLoop() {
    if (this.#frameRate.mode == FrameRateMode.FRAME_MULT || this.#frameRate.mode == FrameRateMode.MILLISECOND) {
      this.#renderLoop();
    }
  }
  
  async #skipRenderLoopWait(haltLoop) {
    if (haltLoop == null) {
      throw new Error('haltLoop must be false or true');
    }
    
    switch (this.#frameRate.mode) {
      case FrameRateMode.NONE:
      case FrameRateMode.RESIZE_ONLY:
        // do nothing
        break;
      
      case FrameRateMode.FRAME_MULT:
      case FrameRateMode.MILLISECOND:
        if (this.#skipRenderLoopWaitResolveFunc) {
          if (haltLoop) {
            this.#stopRenderLoopSentinel = true;
          } else {
            this.#skipRenderLoopWaitSentinel = true;
          }
          await new Promise(r => { this.#skipRenderLoopWaitResolveFunc(r); });
        }
        break;
      
      default:
        throw new Error('default case should not be triggered, all options accounted for');
    }
  }
  
  async #endRenderLoop() {
    switch (this.#frameRate.mode) {
      case FrameRateMode.NONE:
      case FrameRateMode.RESIZE_ONLY:
        // do nothing
        break;
      
      case FrameRateMode.FRAME_MULT:
      case FrameRateMode.MILLISECOND:
        await this.#skipRenderLoopWait(true);
        break;
      
      default:
        throw new Error('default case should not be triggered, all options accounted for');
    }
  }
  
  async #forceRender() {
    switch (this.#frameRate.mode) {
      case FrameRateMode.NONE:
        // do nothing
        break;
      
      case FrameRateMode.RESIZE_ONLY:
        await this.#triggers.render();
        break;
      
      case FrameRateMode.FRAME_MULT:
      case FrameRateMode.MILLISECOND:
        await this.#skipRenderLoopWait(false);
        break;
      
      default:
        throw new Error('default case should not be triggered, all options accounted for');
    }
  }
  
  #queueForceRender() {
    (async () => {
      await this.#editLock.awaitAcquirable();
      await this.#forceRender();
    })();
  }
  
  // public functions
  
  constructor(canvasContainer) {
    if (canvasContainer instanceof HTMLElement) {
      this.#canvasContainer = canvasContainer;
    } else {
      throw new Error('Canvas container not a html element');
    }
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
        await this.#endRenderLoop();
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
    this.#editLock.errorIfAcquired();
    
    if (this.#canvasMode == CanvasMode.NONE) {
      throw new Error('Cannot get canvas if mode is none');
    }
    
    return this.#canvas;
  }
  
  getContext() {
    this.#editLock.errorIfAcquired();
    
    if (this.#canvasMode == CanvasMode.NONE) {
      throw new Error('Cannot get context if mode is none');
    }
    
    return this.#canvasContext;
  }
  
  getCanvasSize() {
    this.#editLock.errorIfAcquired();
    
    return [this.#canvasWidth, this.#canvasHeight];
  }
  
  getFrameRate() {
    this.#editLock.errorIfAcquired();
    
    return this.#copyFrameRate(this.#frameRate);
  }
  
  async setFrameRate(newFrameRate) {
    this.#editLock.acquire();
    
    try {
      let frameRate = this.#parseFrameRate(newFrameRate);
      
      await this.#endRenderLoop();
      
      this.#frameRate = frameRate;
      
      this.#startRenderLoop();
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