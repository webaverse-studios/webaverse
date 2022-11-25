import * as THREE from 'three';

const localVector2D = new THREE.Vector2();

class OctreeNode {
  constructor(min = new THREE.Vector3(), lod = 1, lodArray = [0, 0]) {
    this.min = min;
    this.lod = lod;
    this.lodArray = lodArray;

    // this.onload = null;
  }
}

//

export class LodChunkTracker {
  constructor({
    chunkSize,
    minLod = 1,
    maxLod = 7,
    lod1Range = 2,
    pgWorkerManager = null,
    debug = false,
  } = {}) {
    this.chunkSize = chunkSize;
    this.minLod = minLod;
    this.maxLod = maxLod;
    this.lod1Range = lod1Range;
    this.pgWorkerManager = pgWorkerManager;

    this.tracker = null;
    this.chunks = [];
    this.displayChunks = []; // for debug mesh
    this.dataRequests = new Map(); // hash -> DataRequest
    this.lastUpdateCoord = new THREE.Vector2(NaN, NaN);
    this.lastMinLod = -1;
    this.lastMaxLod = -1;
    this.lastLod1Range = -1;

    this.isUpdating = false;
    this.queued = false;
    this.queuePosition = new THREE.Vector3();
    
    this.lastOctreeLeafNodes = [];
    this.liveTasks = [];
    
    this.listeners = {
      postUpdate: [],
      // chunkDataRequest: [],
      chunkAdd: [],
      chunkRemove: [],
    };

    this.debug = debug;
    if (debug) {
      const maxChunks = 4096;

      const instancedPlaneGeometry = new THREE.InstancedBufferGeometry();
      {
        const planeGeometry = new THREE.PlaneBufferGeometry(1, 1)
          // .scale(0.9, 0.9, 0.9)
          .translate(0.5, -0.5, 0)
          .rotateX(-Math.PI / 2);
        for (const k in planeGeometry.attributes) {
          instancedPlaneGeometry.setAttribute(k, planeGeometry.attributes[k]);
        }
        instancedPlaneGeometry.setIndex(planeGeometry.index);
      }

      const whiteMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        // wireframe: true,
        side: THREE.DoubleSide,
      });

      const debugMesh = new THREE.InstancedMesh(instancedPlaneGeometry, whiteMaterial, maxChunks);
      debugMesh.count = 0;
      debugMesh.frustumCulled = false;
      this.debugMesh = debugMesh;

      {
        const localVector = new THREE.Vector3();
        // const localVector2 = new THREE.Vector3();
        const localVector3 = new THREE.Vector3();
        const localQuaternion = new THREE.Quaternion();
        const localMatrix = new THREE.Matrix4();
        const localColor = new THREE.Color();

        const _getChunkColorHex = chunk => {
          const {lod} = chunk;
          if (lod === 1) {
            return 0xFF0000;
          } else if (lod === 2) {
            return 0x00FF00;
          } else if (lod === 4) {
            return 0x0000FF;
          } else {
            return 0x0;
          }
        };
        const _flushChunks = () => {
          debugMesh.count = 0;
          for (let i = 0; i < this.displayChunks.length; i++) {
            const chunk = this.displayChunks[i];
            const gapSize = 1;
            localMatrix.compose(
              localVector.set(chunk.min.x, 0, chunk.min.y)
                .multiplyScalar(this.chunkSize),
              localQuaternion.identity(),
              localVector3.set(1, 1, 1)
                .multiplyScalar(chunk.lod * this.chunkSize - gapSize)
            );
            localColor.setHex(_getChunkColorHex(chunk));
            debugMesh.setMatrixAt(debugMesh.count, localMatrix);
            debugMesh.setColorAt(debugMesh.count, localColor);
            debugMesh.count++;
          }
          debugMesh.instanceMatrix.needsUpdate = true;
          debugMesh.instanceColor && (debugMesh.instanceColor.needsUpdate = true);

          // console.log('new debug mesh', debugMesh.count, this.displayChunks, debugMesh);
        };
        this.onPostUpdate(_flushChunks);
      }
    }

    this.ensureTracker();
  }

  #getCurrentCoord(position, target) {
    const cx = Math.floor(position.x / this.chunkSize);
    const cz = Math.floor(position.z / this.chunkSize);
    return target.set(cx, cz);
  }

  // listeners
  onPostUpdate(fn) {
    this.listeners.postUpdate.push(fn);
  }

  onChunkAdd(fn) {
    this.listeners.chunkAdd.push(fn);
  }

  onChunkRemove(fn) {
    this.listeners.chunkRemove.push(fn);
  }

  // unlisteners
  offPostUpdate(fn) {
    const index = this.listeners.postUpdate.indexOf(fn);
    if (index !== -1) {
      this.listeners.postUpdate.splice(index, 1);
    }
  }

  // emitter
  postUpdate(position) {
    for (const listener of this.listeners.postUpdate) {
      listener(position);
    }
  }
  
  handleChunkAdd(dataRequest) {
    for (const listener of this.listeners.chunkAdd) {
      listener(dataRequest);
    }
  }

  handleChunkRemove(dataRequest) {
    for (const listener of this.listeners.chunkRemove) {
      listener(dataRequest);
    }
  }

  setOptions({
    minLod,
    maxLod,
    lod1Range,
  }) {
    // console.log('update options', [lods, this.lods, lod1Range, this.lod1Range]);
    if (minLod !== undefined) {
      this.minLod = minLod;
    }
    if (maxLod !== undefined) {
      this.maxLod = maxLod;
    }
    if (lod1Range !== undefined) {
      this.lod1Range = lod1Range;
    }
  }

  async waitForLoad() {
    await Promise.all(this.liveTasks.map(task => task.waitForLoad()));
  }

  async ensureTracker() {
    if (!this.tracker) {
      this.tracker = await this.pgWorkerManager.createTracker();
    }
  }

  async destroyTracker() {
    if(this.tracker) {
      await this.pgWorkerManager.destroyTracker(this.tracker);
      // console.log('Destroying Lod Tracker');
      this.tracker = null;
    }
  }

  async updateInternal(position, minLod, maxLod, lod1Range) {
    await this.ensureTracker();

    const trackerUpdateSpec = await this.pgWorkerManager.trackerUpdate(
      this.tracker,
      position,
      minLod,
      maxLod,
      lod1Range
    );
    let {
      leafNodes,
      newDataRequests,
      // keepDataRequests,
      cancelDataRequests,
    } = trackerUpdateSpec;

    const _reifyNode = nodeSpec => {
      const {min, lod, lodArray} = nodeSpec;
      return new OctreeNode(
        new THREE.Vector2().fromArray(min),
        lod,
        lodArray,
      );
    };
    if (this.debug) {
      leafNodes = leafNodes.map(_reifyNode);
      this.displayChunks = leafNodes;
    }
    newDataRequests = newDataRequests.map(_reifyNode);
    // keepDataRequests = keepDataRequests.map(_reifyNode);
    cancelDataRequests = cancelDataRequests.map(_reifyNode);

    for (const cancelDataRequest of cancelDataRequests) {
      this.handleChunkRemove(cancelDataRequest);
    }
    for (const newDataRequest of newDataRequests) {
      this.handleChunkAdd(newDataRequest);
    }

    this.postUpdate(position);
  }

  update(position) {
    // update coordinate
    if (!this.isUpdating) {
      const currentCoord = this.#getCurrentCoord(position, localVector2D);
      const {minLod, maxLod, lod1Range} = this;
      
      if (
        !this.lastUpdateCoord.equals(currentCoord) ||
        this.lastMinLod !== minLod ||
        this.lastMaxLod !== maxLod ||
        this.lastLod1Range !== lod1Range
      ) {
        (async () => {
          this.isUpdating = true;

          const positionClone = position.clone();
          // const currentCoordClone = currentCoord.clone();
          await this.updateInternal(positionClone, minLod, maxLod, lod1Range);

          this.isUpdating = false;

          if (this.queued) {
            this.queued = false;
            this.update(this.queuePosition);
          }
        })();

        this.lastUpdateCoord.copy(currentCoord);
        this.lastMinLod = minLod;
        this.lastMaxLod = maxLod;
        this.lastLod1Range = lod1Range;
      }
    } else {
      this.queued = true;
      this.queuePosition.copy(position);
    }
  }
}