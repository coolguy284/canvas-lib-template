export class Lock {
  #acquired = false;
  #releaseAwaitors = [];
  
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
    
    if (this.#releaseAwaitors.length > 0) {
      // only the first function to call awaitAcquire gets to run
      this.#releaseAwaitors.splice(0, 1)[0]();
    }
  }
  
  async awaitAcquire() {
    if (this.#acquired) {
      await new Promise(r => {
        this.#releaseAwaitors.push(r);
      });
    }
  }
}
