export class Lock {
  #acquired = false;
  #releaseAwaitors = [];
  
  isAcquired() {
    return this.#acquired;
  }
  
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
      // only the first function to call awaitAcquirable gets to run
      this.#releaseAwaitors.splice(0, 1)[0]();
    }
  }
  
  async awaitAcquirable() {
    if (this.#acquired) {
      await new Promise(r => {
        this.#releaseAwaitors.push(r);
      });
    }
  }
  
  async awaitAcquire() {
    await this.awaitAcquirable();
    this.acquire();
  }
}
