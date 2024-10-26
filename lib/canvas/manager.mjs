class CanvasManager {
  #drawMode;
  #container;
  #drawer;
  #pixelRatio = 1;
  
  // setup commands
  
  constructor(canvasContainer) {
    this.#container = canvasContainer;
  }
  
  setPixelRatio(ratio) {
    this.#pixelRatio = ratio;
    if (this.#drawer != null) {
      this.#drawer.updateCanvasSize(this.#pixelRatio);
    }
  }
  
  async setDrawMode(drawMode) {
    switch (drawMode) {
      case undefined:
      case null:
        if (this.#drawMode != null) {
          // remove canvas
          this.#drawer.destroy();
          this.#drawer = null;
          this.#drawMode = null;
        }
        break;
      
      case '2d':
        // setup 2d canvas drawer
        this.#drawer = new CanvasDrawer2D(this.#container, this.#pixelRatio);
        this.#drawMode = '2d';
        break;
      
      case 'shader':
        // setup shader drawer
        this.#drawer = new CanvasDrawerShader(this.#container, this.#pixelRatio);
        this.#drawMode = 'shader';
        await this.#drawer.init();
        break;
    }
  }
  
  // drawing commands
  
  getWidth() {
    return this.#drawer.getWidth();
  }
  
  getHeight() {
    return this.#drawer.getHeight();
  }
  
  setBackgroundColor(color) {
    this.#container.style.backgroundColor = color;
  }
  
  clear() {
    this.#drawer.clear();
  }
  
  setPixel(x, y, color) {
    this.#drawer.setPixel(x, y, color);
  }
  
  draw() {
    this.#drawer.draw();
  }
  
  getDrawer() {
    return this.#drawer;
  }
}
