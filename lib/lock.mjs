export class Lock {
  #acquired = false;
  
  errorIfAcquired() {
    if (this.#acquired) {
      throw new Error('Lock already acquired');
    }
  }
  
  acquire() {
    this.errorIfAcquired();
    
    this.#acquired = true;
  }
  
  release() {
    if (!this.#acquired) {
      throw new Error('Lock already released');
    }
    
    this.#acquired = false;
  }
}
