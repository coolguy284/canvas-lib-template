export class TextureManager {
  // class variables
  
  #gl;
  #textures = new Map();
  #usedTextureUnits = [];
  
  // helper functions
  
  #nextUnusedTextureUnitID() {
    this.#usedTextureUnits
    
    // TODO
  }
  
  // public functions
  
  constructor(gl) {
    this.#gl = gl;
  }
  
  async loadTexture({
    data,
    alias,
    bindToTextureUnit,
  }) {
    let parsedAlias;
    let imageSource;
    
    if (typeof data == 'string') {
      if (typeof alias != 'string' && alias != null) {
        throw new Error(`alias not string or null: ${typeof alias}`);
      }
      
      parsedAlias = alias != null ? alias : data;
    
      if (this.#textures.has(parsedAlias)) {
        throw new Error(`texture alias already exists: ${parsedAlias}`);
      }
      
      imageSource = await new Promise((r, j) => {
        let image = new Image();
        image.src = data;
        image.addEventListener('load', () => r(image), { once: true });
        image.addEventListener('error', err => j(err), { once: true });
      });
    } else {
      if (typeof alias != 'string') {
        throw new Error(`alias not string despite data is not url, alias is instead: ${typeof alias}`);
      }
      
      if (!(data instanceof Image || data instanceof ImageBitmap || data instanceof ImageData || data instanceof HTMLCanvasElement || data instanceof OffscreenCanvas || data instanceof HTMLVideoElement)) {
        throw new Error('Can only load texture from url string, Image, ImageBitmap, ImageData, HTMLCanvasElement, OffscreenCanvas, HTMLVideoElement');
      }
      
      parsedAlias = alias;
    
      if (this.#textures.has(parsedAlias)) {
        throw new Error(`texture alias already exists: ${parsedAlias}`);
      }
      
      imageSource = data;
    }
    
    if (typeof bindToTextureUnit != 'boolean') {
      throw new Error(`bindToTextureUnit not boolean: ${typeof bindToTextureUnit}`);
    }
    
    let textureEntry = {
      texture: null,
      width: null,
      height: null,
    };
    
    // https://webgl2fundamentals.org/webgl/lessons/webgl-image-processing.html
    
    textureEntry.texture = this.#gl.createTexture();
    
    const texTarget = this.#gl.TEXTURE_2D;
    const texLevel = 0; // mipmap level
    const texInternalFormat = this.#gl.RGBA; // memory format
    const texFormat = this.#gl.RGBA; // disk format arrangement
    const texType = this.#gl.UNSIGNED_BYTE; // disk format type
    this.#gl.texImage2D(
      texTarget,
      texLevel,
      texInternalFormat,
      texFormat,
      texType,
      image
    );
    
    if (bindToTextureUnit) {
      let nextUnitID = this.#nextUnusedTextureUnitID();
      
      this.#gl.activeTexture(this.#gl.TEXTURE0 + nextUnitID);
      this.#gl.bindTexture(this.#gl.TEXTURE_2D, texture);
    }
    
    Object.freeze(textureEntry);
    
    this.#textures.set(alias, textureEntry);
  }
  
  deleteTexture(alias) {
    
  }
  
  deleteAllTextures() {
    
  }
}
