import { Enum } from '../enum.mjs';
import { Lock } from '../lock.mjs';

export const CanvasMode = Enum([
  'NONE',
  '2D',
  'WEBGL1',
  'WEBGL2',
  'WEBGL_FULL_CANVAS_SHADER',
]);

export const FrameRate = Enum([
  'NONE',
  'RESIZE_ONLY',
  'FRAME_MULT',
  'MILLISECOND',
]);

export class CanvasManager {
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
  
  // variable adjustment
  
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
    this.#editLock.acquire();
    
    try {
      if (typeof opts.mode == 'string' && opts.mode in CanvasMode) {
        if (opts.mode != this.#canvasMode) {
          let oldMode = this.#canvasMode;
          
          if (oldMode != CanvasMode.NONE) {
            await this.#destroyCanvas();
          }
          
          if (opts.mode != CanvasMode.NONE) {
            await this.#createCanvas(opts);
            this.#canvasMode = opts.mode;
          }
        }
      } else {
        throw new Error(`Canvas mode ${opts.mode} invalid`);
      }
    } finally {
      this.#editLock.release();
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
  
  // canvas helper functions
  
  #updateCanvasSize() {
    this.#canvasWidth = parseInt(this.#canvasStyle.width) * window.devicePixelRatio * this.#canvasPixelsPerDisplayPixel;
    this.#canvasHeight = parseInt(this.#canvasStyle.height) * window.devicePixelRatio * this.#canvasPixelsPerDisplayPixel;
    
    this.#canvas.width = this.#canvasWidth;
    this.#canvas.height = this.#canvasHeight;
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
        this.#canvasContainer.removeChild(0);
        
        this.#canvas = null;
        this.#canvasContext = null;
        this.#canvasWidth = null;
        this.#canvasHeight = null;
        this.#canvasStyle = null;
        this.#resizeObserver.unobserve(this.#canvas);
        this.#resizeObserver = null;
        break;
      
      case CanvasMode.WEBGL1:
        break;
      case CanvasMode.WEBGL2:
        break;
      case CanvasMode.WEBGL_FULL_CANVAS_SHADER:
        break;
    }
  }
  
  async #createCanvas(opts) {
    let frameRate = {};
    
    if (typeof opts.frameRate != 'object' && opts.frameRate != null) {
      throw new Error('opts.frameRate must be object');
    }
    
    if (typeof opts.frameRate.mode == 'string' && opts.frameRate.mode in FrameRate) {
      frameRate.mode = opts.frameRate.mode;
    } else {
      throw new Error(`opts.frameRate.mode not known: ${opts.frameRate.mode}`);
    }
    
    switch (frameRate.mode) {
      case FrameRate.NONE:
      case FrameRate.RESIZE_ONLY:
        // no additional settings
        break;
      
      case FrameRate.FRAME_MULT:
        if (Number.isSafeInteger(opts.frameRate.frameSkips) && opts.frameRate.frameSkips >= 0) {
          frameRate.frameSkips = opts.frameRate.frameSkips;
        } else {
          throw new Error(`opts.frameRate.frameSkips bad value: ${opts.frameRate.frameSkips}`);
        }
        break;
      
      case FrameRate.MILLISECOND:
        if (Number.isSafeInteger(opts.frameRate.delay) && opts.frameRate.delay > 0) {
          frameRate.delay = opts.frameRate.delay;
        } else {
          throw new Error(`opts.frameRate.delay bad value: ${opts.frameRate.delay}`);
        }
        break;
    }
    
    let triggers = {};
    
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
    
    this.#frameRate = frameRate;
    this.#triggers = triggers;
    
    switch (this.#canvasMode) {
      case CanvasMode['2D']: {
        let canvas = document.createElement('canvas');
        
        this.#canvasContainer.appendChild(canvas);
        this.#canvas = canvas;
        this.#canvasContext = canvas.getContext('2d');
        break;
      }
      
      case CanvasMode.WEBGL1:
        throw new Error('webgl modes not supported');
      case CanvasMode.WEBGL2:
        throw new Error('webgl modes not supported');
      case CanvasMode.WEBGL_FULL_CANVAS_SHADER:
        throw new Error('webgl modes not supported');
    }
    
    this.#canvasStyle = getComputedStyle(this.#canvas);
    this.#resizeObserver = new ResizeObserver(() => { this.#updateCanvasSize(); });
    this.#resizeObserver.observe(this.#canvas);
    
    if (this.#triggers.setup != null) {
      try {
        await this.#triggers.setup();
      } catch (err) {
        console.error(err);
      }
    }
  }
  
  // canvas public functions
  
  getCanvasSize() {
    this.#editLock.errorIfAcquired();
    
    return [this.#canvasWidth, this.#canvasHeight];
  }
}
