export class CanvasManager {
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
