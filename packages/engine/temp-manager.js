class TempManagerArray {
  constructor(cons) {
    this.cons = cons;

    this.array = [];
    this.startIndex = 0;
    this.endIndex = 0;
  }
  get() {
    const item = this.array[this.startIndex];
    if (item) {
      this.array[this.startIndex] = null;
      this.startIndex = (this.startIndex + 1) % this.array.length;
      return item;
    } else {
      return new this.cons();
    }
  }
  release(item) {
    this.array[this.endIndex] = item;
    this.endIndex = (this.endIndex + 1) % this.array.length;
  }
}

export class TempManager {
  constructor() {
    this.cache = new Map();
  }
  getCache(cons) {
    let array = this.cache.get(cons);
    if (!array) {
      array = new TempManagerArray(cons);
      this.cache.set(cons, array);
    }
    return array;
  }
  get(cons) {
    const array = this.getCache(cons);
    return array.get();
  }
  release(value) {
    const cons = value.constructor;
    const array = this.getCache(cons);
    array.release(value);
  }
}
// const tempManager = new TempManager();
// export default tempManager;