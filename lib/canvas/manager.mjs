import { Enum } from '../enum.mjs';

export const CanvasMode = Enum([
  'NONE',
  '2D',
  'WEBGL1',
  'WEBGL2',
  'WEBGL_FULL_CANVAS_SHADER',
]);

export class CanvasManager {
  #canvasContainer = null;
  #canvasMode = CanvasMode.NONE;
  #canvasPixelsPerDisplayPixel = 1;
  #canvas = null;
  #canvasContext = null;
  #canvasWidth = null;
  #canvasHeight = null;
  #resizeObserver = null;
  
  // variable adjustment
  
  constructor(canvasContainer) {
    if (canvasContainer instanceof HTMLElement) {
      this.#canvasContainer = canvasContainer;
    } else {
      throw new Error('Canvas container not a html element');
    }
  }
  
  getCanvasContainer() {
    return this.#canvasContainer;
  }
  
  getCanvasMode() {
    return this.#canvasMode;
  }
  
  setCanvasMode(newMode) {
    if (typeof newMode == 'string' && newMode in CanvasMode) {
      if (this.getCanvasContainer() == null && newMode != CanvasMode.NONE) {
        throw new Error('Cannot change canvas mode to not null if canvas container is null');
      }
      
      if (newMode != this.#canvasMode) {
        let oldMode = this.#canvasMode;
        
        if (oldMode != CanvasMode.NONE) {
          this.#destroyCanvas();
        }
        
        if (newMode != CanvasMode.NONE && newMode != CanvasMode['2D']) {
          throw new Error('webgl modes not supported');
        }
        
        this.#canvasMode = newMode;
        
        if (newMode != CanvasMode.NONE) {
          this.#createCanvas();
        }
      }
    } else {
      throw new Error(`Canvas mode ${newMode} invalid`);
    }
  }
  
  getCanvasPixelsPerDisplayPixel() {
    return this.#canvasPixelsPerDisplayPixel;
  }
  
  setCanvasPixelsPerDisplayPixel(newValue) {
    if (!Number.isFinite(newValue) || newValue <= 0) {
      throw new Error(`Pixel ratio value ${newValue} invalid`);
    }
    
    this.#canvasPixelsPerDisplayPixel = newValue;
  }
  
  getCanvas() {
    if (this.#canvasMode == CanvasMode.NONE) {
      throw new Error('Cannot get canvas if mode is none');
    }
    
    return this.#canvas;
  }
  
  getContext() {
    if (this.#canvasMode == CanvasMode.NONE) {
      throw new Error('Cannot get context if mode is none');
    }
    
    return this.#canvasContext;
  }
  
  // canvas helper functions
  
  #updateCanvasSize() {
    let style = getComputedStyle(this.#canvas);
    
    this.#canvasWidth = parseInt(style.width) * window.devicePixelRatio * this.#canvasPixelsPerDisplayPixel;
    this.#canvasHeight = parseInt(style.height) * window.devicePixelRatio * this.#canvasPixelsPerDisplayPixel;
    
    this.#canvas.width = this.#canvasWidth;
    this.#canvas.height = this.#canvasHeight;
  }
  
  // might get called to destroy canvas if mode not NONE
  #destroyCanvas() {
    switch (this.#canvasMode) {
      case CanvasMode['2D']:
        this.#canvasContainer.removeChild(0);
        
        this.#canvas = null;
        this.#canvasContext = null;
        this.#canvasWidth = null;
        this.#canvasHeight = null;
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
  
  #createCanvas() {
    switch (this.#canvasMode) {
      case CanvasMode['2D']: {
        let canvas = document.createElement('canvas');
        
        this.#canvasContainer.appendChild(canvas);
        this.#canvas = canvas;
        this.#canvasContext = canvas.getContext('2d');
        break;
      }
      
      case CanvasMode.WEBGL1:
        break;
      case CanvasMode.WEBGL2:
        break;
      case CanvasMode.WEBGL_FULL_CANVAS_SHADER:
        break;
    }
    
    this.#updateCanvasSize();
    
    this.#resizeObserver = new ResizeObserver(() => { this.#updateCanvasSize(); });
    this.#resizeObserver.observe(this.#canvas);
  }
  
  // canvas public functions
  
  getCanvasSize() {
    return [this.#canvasWidth, this.#canvasHeight];
  }
}
