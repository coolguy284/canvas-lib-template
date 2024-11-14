export class TextureManager {
  // class variables
  
  #gl;
  #texturesByAlias = new Map();
  #texturesByID = new Map();
  
  // helper functions
  
  #nextUnusedTextureUnitID() {
    for (let i = 0; i < this.#gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS; i++) {
      if (!this.#texturesByID.has(i)) {
        return i;
      }
    }
    
    throw new Error(`all ${this.#gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS} texture units bound`);
  }
  
  // public functions
  
  constructor(gl) {
    if (!(gl instanceof WebGL2RenderingContext)) {
      throw new Error('gl must be a WebGL2 rendering context');
    }
    
    this.#gl = gl;
  }
  
  currentTextureNames() {
    return Array.from(this.#texturesByAlias.keys());
  }
  
  hasTexture(alias) {
    if (typeof alias != 'string') {
      throw new Error(`alias not string: ${typeof alias}`);
    }
    
    return this.#texturesByAlias.has(alias);
  }
  
  async loadTexture({ data, alias }) {
    let parsedAlias;
    let imageSource;
    
    if (typeof data == 'string') {
      if (typeof alias != 'string' && alias != null) {
        throw new Error(`alias not string or null: ${typeof alias}`);
      }
      
      parsedAlias = alias != null ? alias : data;
    
      if (this.#texturesByAlias.has(parsedAlias)) {
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
    
      if (this.#texturesByAlias.has(parsedAlias)) {
        throw new Error(`texture alias already exists: ${parsedAlias}`);
      }
      
      imageSource = data;
    }
    
    let textureEntry = {
      texture: null,
      bindPointID: null,
      width: null,
      height: null,
    };
    
    // all valid classes for textureEntry have a width and height property
    textureEntry.width = imageSource.width;
    textureEntry.height = imageSource.height;
    
    // https://webgl2fundamentals.org/webgl/lessons/webgl-image-processing.html
    
    textureEntry.texture = this.#gl.createTexture();
    
    textureEntry.bindPointID = this.#nextUnusedTextureUnitID();
      
    this.#gl.activeTexture(this.#gl.TEXTURE0 + textureEntry.bindPointID);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, textureEntry.texture);
    
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
      imageSource
    );
    
    this.#gl.activeTexture(this.#gl.TEXTURE0);
    
    Object.freeze(textureEntry);
    
    this.#texturesByAlias.set(parsedAlias, textureEntry);
    this.#texturesByID.set(textureEntry.bindPointID, textureEntry);
  }
  
  deleteTexture(alias) {
    if (typeof alias != 'string') {
      throw new Error(`alias not string: ${typeof alias}`);
    }
    
    if (!this.#texturesByAlias.has(alias)) {
      throw new Error(`no texture with given alias: ${alias}`);
    }
    
    let textureEntry = this.#texturesByAlias.get(alias);
    
    this.#gl.activeTexture(this.#gl.TEXTURE0 + textureEntry.bindPointID);
    this.#gl.bindTexture(this.#gl.TEXTURE_2D, null);
    
    this.#gl.activeTexture(this.#gl.TEXTURE0);
    
    this.#gl.deleteTexture(textureEntry.texture);
    
    this.#texturesByAlias.delete(alias);
    this.#texturesByID.delete(textureEntry.bindPointID);
  }
  
  deleteAllTextures() {
    for (let alias of this.#texturesByAlias.keys()) {
      this.deleteTexture(alias);
    }
  }
  
  getIDOfTexture(alias) {
    if (typeof alias != 'string') {
      throw new Error(`alias not string: ${typeof alias}`);
    }
    
    if (!this.#texturesByAlias.has(alias)) {
      throw new Error(`no texture with given alias: ${alias}`);
    }
    
    return this.#texturesByAlias.get(alias).bindPointID;
  }
}
