import * as THREE from 'three';
import {mod} from './util.js';

export class ScalarInterpolant {
  constructor(fn, minValue, maxValue) {
    this.fn = fn;
    this.value = minValue;
    this.minValue = minValue;
    this.maxValue = maxValue;
  }

  get() {
    return this.value;
  }

  getNormalized() {
    return this.value / (this.maxValue - this.minValue);
  }

  getInverse() {
    return this.maxValue - this.value;
  }
}

// bidirectional linear; goes forward and backward
export class BiActionInterpolant extends ScalarInterpolant {
  constructor(fn, minValue, maxValue) {
    super(fn, minValue, maxValue);
  }

  update(timeDiff) {
    this.value += (this.fn() ? 1 : -1) * timeDiff;
    this.value = Math.min(Math.max(this.value, this.minValue), this.maxValue);
  }
}

// unidirectional linear; goes forward and snaps back
export class UniActionInterpolant extends ScalarInterpolant {
  constructor(fn, minValue, maxValue) {
    super(fn, minValue, maxValue);
  }

  update(timeDiff) {
    if (this.fn()) {
      this.value += timeDiff;
      this.value = Math.min(Math.max(this.value, this.minValue), this.maxValue);
    } else {
      this.value = this.minValue;
    }
  }
}

// infinite linear; goes forward only
export class InfiniteActionInterpolant extends ScalarInterpolant {
  constructor(fn, minValue) {
    super(fn, minValue, Infinity);
  }

  update(timeDiff) {
    if (this.fn()) {
      this.value += timeDiff;
    } else {
      this.value = this.minValue;
    }
  }
}

const _makeSnapshots = (constructor, numFrames) => {
  const result = Array(numFrames);
  for (let i = 0; i < numFrames; i++) {
    result[i] = {
      startValue: constructor(),
      // endValue: constructor(),
      // startTime: 0,
      endTime: 0,
    };
  }
  return result;
};
// snapshot interpolant maintains a ring buffer of previous states and seeks between them to interpolate
export class SnapshotInterpolant {
  constructor(fn, timeDelay, numFrames, constructor, readFn, seekFn) {
    this.fn = fn;
    this.timeDelay = timeDelay;
    this.numFrames = numFrames;
    this.readFn = readFn;
    this.seekFn = seekFn;
    
    this.readTime = 0;
    // this.writeTime = 0;

    this.snapshots = _makeSnapshots(constructor, numFrames);
    this.snapshotWriteIndex = 0;

    this.value = constructor();
    this.#tmpValue = constructor();
  }
  #tmpValue;

  update(timestamp/*, remoteTimeBias*/) {
    // if (remoteTimeBias !== undefined) {
    //   debugger;
    // }
    this.readTime = timestamp;

    let effectiveReadTime = this.readTime - this.timeDelay;
    
    let minEndTime = Infinity;
    let maxEndTime = -Infinity;
    for (let i = 0; i < this.numFrames; i++) {
      const snapshot = this.snapshots[i];
      if (snapshot.endTime < minEndTime) {
        minEndTime = snapshot.endTime;
      }
      if (snapshot.endTime > maxEndTime) {
        maxEndTime = snapshot.endTime;
      }
    }

    if (maxEndTime > 0) { // if we had at least one snapshot
      effectiveReadTime = THREE.MathUtils.clamp(effectiveReadTime, minEndTime, maxEndTime);
      this.seekTo(effectiveReadTime);
    }
  }

  seekTo(t) {
    for (let i = -(this.numFrames - 1); i < 0; i++) {
      const index = this.snapshotWriteIndex + i;
      const snapshot = this.snapshots[mod(index, this.numFrames)];
      if (t <= snapshot.endTime) {
        const prevSnapshot = this.snapshots[mod(index - 1, this.numFrames)];
        const startTime = prevSnapshot.endTime;
        if (t >= startTime) {
          const duration = snapshot.endTime - startTime;
          const f = (duration > 0 && duration < Infinity) ? ((t - startTime) / duration) : 0;
          const {startValue} = prevSnapshot;
          const {startValue: endValue} = snapshot;
          this.value = this.seekFn(this.value, startValue, endValue, f);
          return;
        }
      }
    }
    // globalThis.snap = this.snapshots;
    console.warn('could not seek to time', t, JSON.parse(JSON.stringify(this.snapshots)));
  }

  snapshot(remoteTimestamp) {
    const value = this.fn(this.#tmpValue);
    // console.log('got value', value.join(','), timeDiff);
    const writeSnapshot = this.snapshots[this.snapshotWriteIndex];
    
    writeSnapshot.startValue = this.readFn(writeSnapshot.startValue, value);
    writeSnapshot.endTime = remoteTimestamp;
    
    this.snapshotWriteIndex = mod(this.snapshotWriteIndex + 1, this.numFrames);
  }

  get() {
    return this.value;
  }
}

export class BinaryInterpolant extends SnapshotInterpolant {
  constructor(fn, timeDelay, numFrames) {
    super(fn, timeDelay, numFrames, () => false, (target, value) => {
      // console.log('read value', value);
      return value;
    }, (target, src, dst, f) => {
      // console.log('seek', target, src, dst, f);
      return src;
    });
  }
  /* snapshot(timeDiff) {
    debugger;
  } */
}

export class PositionInterpolant extends SnapshotInterpolant {
  constructor(fn, timeDelay, numFrames) {
    super(fn, timeDelay, numFrames, () => new THREE.Vector3(), (target, value) => {
      return target.fromArray(value);
      // if (isNaN(target.x) || isNaN(target.y) || isNaN(target.z)) {
      //   throw new Error('target is NaN');
      // }
      // return target;
    }, (target, src, dst, f) => {
      return target.copy(src).lerp(dst, f);
      // if (isNaN(target.x) || isNaN(target.y) || isNaN(target.z)) {
      //   throw new Error('target is NaN');
      // }
      // return target;
    });
  }
}

export class QuaternionInterpolant extends SnapshotInterpolant {
  constructor(fn, timeDelay, numFrames) {
    super(fn, timeDelay, numFrames, () => new THREE.Quaternion(), (target, value) => {
      return target.fromArray(value);
    },
    (target, src, dst, f) => {
      return target.copy(src).slerp(dst, f);
    });
  }
}


export class VelocityInterpolant extends SnapshotInterpolant {
  constructor(fn, timeDelay, numFrames) {
    super(fn, timeDelay, numFrames, () => new THREE.Vector3(), (target, value) => {
      target.fromArray(value);
      // if (isNaN(target.x) || isNaN(target.y) || isNaN(target.z)) {
      //   throw new Error('target is NaN');
      // }
      return target;
    }, (target, src, dst, f) => {
      return target.copy(src); // .lerp(dst, f);
      // if (isNaN(target.x) || isNaN(target.y) || isNaN(target.z)) {
      //   throw new Error('target is NaN');
      // }
      // return target;
    });
  }
}

//

export class QueueInterpolant extends EventTarget {
  constructor(timeDelay, bufferSize) {
    super();
    
    this.timeDelay = timeDelay;
    this.bufferSize = bufferSize;

    this.snapshots = _makeSnapshots(() => ({
      state: null,
      timestamp: 0,
    }), bufferSize);
    this.snapshotWriteIndex = 0;
    this.numSnapshots = 0;
  }

  update(timestamp) {
    const effectiveReadTime = timestamp - this.timeDelay;

    const snapshotStartIndex = mod(this.snapshotWriteIndex - this.numSnapshots, this.bufferSize);
    const snapshotEndIndex = this.snapshotWriteIndex;
    for (let i = snapshotStartIndex; i !== snapshotEndIndex; i = mod(i + 1, this.bufferSize)) {
      const snapshot = this.snapshots[i];
      if (effectiveReadTime >= snapshot.timestamp) {
        this.dispatchEvent(new MessageEvent('statechange', {
          data: snapshot.state,
        }));
        this.numSnapshots--;
      } else {
        break;
      }
    }
  }

  /* seekTo(t) {
    for (let i = -(this.numFrames - 1); i < 0; i++) {
      const index = this.snapshotWriteIndex + i;
      const snapshot = this.snapshots[mod(index, this.numFrames)];
      if (t <= snapshot.endTime) {
        const prevSnapshot = this.snapshots[mod(index - 1, this.numFrames)];
        const startTime = prevSnapshot.endTime;
        if (t >= startTime) {
          const duration = snapshot.endTime - startTime;
          const f = (duration > 0 && duration < Infinity) ? ((t - startTime) / duration) : 0;
          const {startValue} = prevSnapshot;
          const {startValue: endValue} = snapshot;
          this.value = this.seekFn(this.value, startValue, endValue, f);
          return;
        }
      }
    }
    // globalThis.snap = this.snapshots;
    // console.warn('could not seek to time', t, JSON.parse(JSON.stringify(this.snapshots)));
  } */

  snapshot(state, timestamp) {
    if (this.numSnapshots < this.bufferSize) {
      const writeSnapshot = this.snapshots[this.snapshotWriteIndex];
      writeSnapshot.state = state;
      writeSnapshot.timestamp = timestamp;

      this.snapshotWriteIndex = mod(this.snapshotWriteIndex + 1, this.bufferSize);
      this.numSnapshots++;
      // console.log('push snapshot', {
      //   state,
      //   timestamp,
      //   numSnapshots: this.numSnapshots,
      // });

      /* const value = this.fn(this.#tmpValue);
      const writeSnapshot = this.snapshots[this.snapshotWriteIndex];
      
      writeSnapshot.startValue = this.readFn(writeSnapshot.startValue, value);
      writeSnapshot.endTime = remoteTimestamp;
      
      this.snapshotWriteIndex = mod(this.snapshotWriteIndex + 1, this.numFrames); */
    } else {
      console.warn('queue interpolant overflow', {
        snapshots: this.snapshots,
        snapshotWriteIndex: this.snapshotWriteIndex,
        numSnapshots: this.numSnapshots,
      });
      throw new Error('queue interpolant overflow');
    }
  }

  /* get() {
    return this.value;
  } */
}

export class ActionInterpolant extends QueueInterpolant {
  constructor(timeDelay, bufferSize) {
    super(timeDelay, bufferSize);
  }
  pushAction(action, timestamp) {
    this.snapshot(action, timestamp);
  }
}