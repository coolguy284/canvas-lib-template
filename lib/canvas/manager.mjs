import Enum from '../enum.mjs';

export const CanvasMode = Enum([
  'NONE',
  'BASIC', // 2d
  'WEBGL1',
  'WEBGL2',
  'WEBGL_FULL_CANVAS_SHADER',
]);

export class CanvasManager {
  #canvasMode = CanvasMode.NONE;
  #canvasPixelsPerDisplayPixel = 1;
  
  getCanvasPixelsPerDisplayPixel() {
    return this.#canvasPixelsPerDisplayPixel;
  }
  
  setCanvasPixelsPerDisplayPixel(value) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Value ${value} invalid`);
    }
    
    this.#canvasPixelsPerDisplayPixel = value;
  }
}
