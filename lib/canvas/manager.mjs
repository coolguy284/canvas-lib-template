import { Enum } from '../enum.mjs';
import { Lock } from '../lock.mjs';
import { removeNode } from '../dom_tools.mjs';

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
  
  // helper functions
  
  async #updateCanvasSize() {
    this.#canvasWidth = parseInt(this.#canvasStyle.width) * window.devicePixelRatio * this.#canvasPixelsPerDisplayPixel;
    this.#canvasHeight = parseInt(this.#canvasStyle.height) * window.devicePixelRatio * this.#canvasPixelsPerDisplayPixel;
    
    this.#canvas.width = this.#canvasWidth;
    this.#canvas.height = this.#canvasHeight;
    
    await this.#forceRender();
  }
  
  #parseFrameRate(frameRate) {
    let parsedFrameRate = {};
    
    if (typeof frameRate != 'object' && frameRate != null) {
      throw new Error('frameRate must be object');
    }
    
    if (typeof frameRate.mode == 'string' && frameRate.mode in FrameRate) {
      parsedFrameRate.mode = frameRate.mode;
    } else {
      throw new Error(`frameRate.mode not known: ${frameRate.mode}`);
    }
    
    switch (frameRate.mode) {
      case FrameRate.NONE:
      case FrameRate.RESIZE_ONLY:
        // no additional settings
        break;
      
      case FrameRate.FRAME_MULT:
        if (Number.isSafeInteger(frameRate.frameSkips) && frameRate.frameSkips >= 0) {
          parsedFrameRate.frameSkips = frameRate.frameSkips;
        } else {
          throw new Error(`frameRate.frameSkips bad value: ${frameRate.frameSkips}`);
        }
        break;
      
      case FrameRate.MILLISECOND:
        if (Number.isSafeInteger(frameRate.delay) && frameRate.delay > 0) {
          parsedFrameRate.delay = frameRate.delay;
        } else {
          throw new Error(`frameRate.delay bad value: ${frameRate.delay}`);
        }
        break;
    }
    
    return parsedFrameRate;
  }
  
  #copyFrameRate(frameRate) {
    let frameRateCopy = {
      mode: frameRate.mode,
    };
    
    switch (frameRate.mode) {
      case FrameRate.NONE:
      case FrameRate.RESIZE_ONLY:
        // no additional settings
        break;
      
      case FrameRate.FRAME_MULT:
        frameRateCopy.frameSkips = frameRate.frameSkips;
        break;
      
      case FrameRate.MILLISECOND:
        frameRateCopy.delay = frameRate.delay;
        break;
    }
    
    return frameRateCopy;
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
    
    removeNode(this.#canvas);
    
    this.#canvas = null;
    this.#canvasContext = null;
    this.#canvasWidth = null;
    this.#canvasHeight = null;
    this.#canvasStyle = null;
    this.#resizeObserver.unobserve(this.#canvas);
    this.#resizeObserver = null;
    
    switch (this.#canvasMode) {
      case CanvasMode['2D']:
        break;
      
      case CanvasMode.WEBGL1:
        break;
      case CanvasMode.WEBGL2:
        break;
      case CanvasMode.WEBGL_FULL_CANVAS_SHADER:
        break;
    }
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
        case FrameRate.FRAME_MULT:
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
        
        case FrameRate.MILLISECOND:
          resolveToCall = await new Promise(r => {
            setTimeout(r, this.#frameRate.delay);
            this.#skipRenderLoopWaitResolveFunc = r;
          });
          
          this.#skipRenderLoopWaitResolveFunc = null;
          break;
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
    if (this.#frameRate.mode == FrameRate.FRAME_MULT || this.#frameRate.mode == FrameRate.MILLISECOND) {
      this.#renderLoop();
    }
  }
  
  async #skipRenderLoopWait(haltLoop) {
    if (haltLoop == null) {
      throw new Error('haltLoop must be false or true');
    }
    
    switch (this.#frameRate.mode) {
      case FrameRate.NONE:
      case FrameRate.RESIZE_ONLY:
        // do nothing
        break;
      
      case FrameRate.FRAME_MULT:
      case FrameRate.MILLISECOND:
        if (this.#skipRenderLoopWaitResolveFunc) {
          if (haltLoop) {
            this.#stopRenderLoopSentinel = true;
          } else {
            this.#skipRenderLoopWaitSentinel = true;
          }
          await new Promise(r => { this.#skipRenderLoopWaitResolveFunc(r); });
        }
        break;
    }
  }
  
  async #endRenderLoop() {
    switch (this.#frameRate.mode) {
      case FrameRate.NONE:
      case FrameRate.RESIZE_ONLY:
        // do nothing
        break;
      
      case FrameRate.FRAME_MULT:
      case FrameRate.MILLISECOND:
        await this.#skipRenderLoopWait(true);
        break;
    }
  }
  
  async #forceRender() {
    switch (this.#frameRate.mode) {
      case FrameRate.NONE:
        // do nothing
        break;
      
      case FrameRate.RESIZE_ONLY:
        await this.#triggers.render();
        break;
      
      case FrameRate.FRAME_MULT:
      case FrameRate.MILLISECOND:
        await this.#skipRenderLoopWait(false);
        break;
    }
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
      await this.#endRenderLoop();
      
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
  
  gracefulShutdown() {
    this.awaitManagerEditable();
    this.setCanvasMode({ mode: CanvasMode.NONE });
  }
}
