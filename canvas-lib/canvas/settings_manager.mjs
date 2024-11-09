export class SettingsManager {
  // class variables
  
  #button;
  #div;
  
  // helper functions
  
  // public functions
  
  constructor(opts) {
    if (!(opts.button instanceof HTMLElement)) {
      throw new Error('button not instance of HTMLElement');
    }
    
    if (!(opts.div instanceof HTMLDivElement)) {
      throw new Error('div not instance of HTMLElement');
    }
    
    this.#button = opts.button;
    this.#div = opts.div;
    
    // TODO
  }
  
  settingsList() {
    // TODO
  }
  
  has(name) {
    // TODO
  }
  
  get(name) {
    // TODO
  }
  
  set(name, value) {
    // TODO
  }
}
