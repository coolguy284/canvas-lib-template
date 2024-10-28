import Enum from '../enum.mjs';

export const CanvasMode = Enum([
  'NONE',
  'BASIC', // 2d
  'WEBGL1',
  'WEBGL2',
  'WEBGL_FULL_CANVAS_SHADER',
]);

export class CanvasManager {
  #canvasContainer = null;
  #canvasMode = CanvasMode.NONE;
  #canvasPixelsPerDisplayPixel = 1;
  
  getCanvasContainer() {
    return this.#canvasContainer;
  }
  
  setCanvasContainer(newContainer) {
    if (newContainer instanceof HTMLElement || newContainer == null) {
      if (this.getCanvasMode() != CanvasMode.NONE) {
        throw new Error('Cannot update canvas container if canvas mode is not none');
      }
      
      this.#canvasContainer = newContainer;
    } else {
      throw new Error('Canvas container not a html element');
    }
  }
  
  getCanvasMode() {
    return this.#canvasMode;
  }
  
  setCanvasMode(newMode) {
    if (typeof newMode == 'string' && newMode in CanvasMode) {
      if (this.getCanvasContainer() == null && newMode != CanvasMode.NONE) {
        throw new Error('Cannot change canvas mode to not null if canvas container is null');
      }
      
      this.#canvasMode = newMode;
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
}
