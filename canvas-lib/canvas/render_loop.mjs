import { FrameRateMode } from './enums.mjs';

export class RenderLoop {
  // class variables
  
  #frameRate = null;
  #renderFunc = null;
  #errorSignalingFunc = null;
  #renderLoopRunning = false;
  #boundVisibilityChangeListener = null;
  #skipRenderLoopWaitSentinel = false;
  #stopRenderLoopSentinel = false;
  #skipRenderLoopWaitResolveFunc = null;
  
  // helper functions
  
  static #parseFrameRate(frameRate) {
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
  
  static #copyFrameRate(frameRate) {
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
  
  async #renderLoop() {
    if (this.#renderLoopRunning) {
      throw new Error('Render loop start called when render loop is running');
    }
    
    let resolveToCall = null;
    
    if (this.#stopRenderLoopSentinel) {
      this.#stopRenderLoopSentinel = false;
      return;
    } else if (this.#skipRenderLoopWaitSentinel) {
      this.#skipRenderLoopWaitSentinel = false;
    }
    
    this.#renderLoopRunning = true;
    
    try {
      while (true) {
        if (document.visibilityState == 'hidden') {
          await new Promise(r => {
            this.#skipRenderLoopWaitResolveFunc = r;
          });
          
          this.#skipRenderLoopWaitResolveFunc = null;
          continue;
        }
        
        try {
          await this.#renderFunc();
        } catch (err) {
          if (this.#errorSignalingFunc != null) {
            this.#errorSignalingFunc(err);
          }
          console.error(err);
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
            
            for (let i = 0; i < frameSkips + 1; i++) {
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
              let timeoutID = setTimeout(() => {
                r();
                this.#skipRenderLoopWaitResolveFunc = null;
              }, this.#frameRate.delay);
              
              this.#skipRenderLoopWaitResolveFunc = () => {
                r();
                clearTimeout(timeoutID);
                this.#skipRenderLoopWaitResolveFunc = null;
              };
            });
            
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
    } finally {
      this.#renderLoopRunning = false;
    }
    
    if (this.#stopRenderLoopSentinel) {
      this.#stopRenderLoopSentinel = false;
        
      if (resolveToCall) {
        resolveToCall();
        resolveToCall = null;
      }
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
  
  async #visibilityChangeListener() {
    await this.#skipRenderLoopWait(false);
  }
  
  // public functions
  
  constructor({ renderFunc, errorSignalingFunc }) {
    if (typeof renderFunc != 'function' && renderFunc != null) {
      throw new Error('errorSignalingFunc invalid type');
    }
    
    if (typeof errorSignalingFunc != 'function' && errorSignalingFunc != null) {
      throw new Error('errorSignalingFunc invalid type');
    }
    
    this.#renderFunc = renderFunc;
    this.#errorSignalingFunc = errorSignalingFunc;
    
    this.#boundVisibilityChangeListener = this.#visibilityChangeListener.bind(this);
  }
  
  getFrameRate() {
    return this.#frameRate == null ? null : RenderLoop.#copyFrameRate(this.#frameRate);
  }
  
  async setFrameRate(newFrameRate) {
    let frameRate = RenderLoop.#parseFrameRate(newFrameRate);
    
    if (this.renderLoopRunning()) {
      await this.endRenderLoop();
      
      this.#frameRate = frameRate;
      
      this.startRenderLoop();
    } else {
      this.#frameRate = frameRate;
    }
  }
  
  clearFrameRate() {
    if (this.renderLoopRunning()) {
      throw new Error('Cannot reset framerate to null unless render loop is stopped');
    }
    
    this.#frameRate = null;
  }
  
  async forceRender() {
    switch (this.#frameRate.mode) {
      case FrameRateMode.NONE:
        // do nothing
        break;
      
      case FrameRateMode.RESIZE_ONLY:
        await this.#renderFunc();
        break;
      
      case FrameRateMode.FRAME_MULT:
      case FrameRateMode.MILLISECOND:
        await this.#skipRenderLoopWait(false);
        break;
      
      default:
        throw new Error('default case should not be triggered, all options accounted for');
    }
  }
  
  renderLoopRunning() {
    return this.#renderLoopRunning;
  }
  
  startRenderLoop() {
    if (this.#frameRate == null) {
      throw new Error('Cannot start render loop when framerate is null');
    }
    
    if (this.#frameRate.mode == FrameRateMode.FRAME_MULT || this.#frameRate.mode == FrameRateMode.MILLISECOND) {
      document.addEventListener('visibilitychange', this.#boundVisibilityChangeListener);
      
      this.#renderLoop();
    }
  }
  
  async endRenderLoop() {
    switch (this.#frameRate.mode) {
      case FrameRateMode.NONE:
      case FrameRateMode.RESIZE_ONLY:
        // do nothing
        break;
      
      case FrameRateMode.FRAME_MULT:
      case FrameRateMode.MILLISECOND:
        await this.#skipRenderLoopWait(true);
    
        document.removeEventListener('visibilitychange', this.#boundVisibilityChangeListener);
        break;
      
      default:
        throw new Error('default case should not be triggered, all options accounted for');
    }
  }
}
