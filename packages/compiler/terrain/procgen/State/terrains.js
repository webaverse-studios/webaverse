import EventEmitter from '../utils/events.js';
import Terrain from './terrain.js'
import alea from '../utils/alea.js';
import State from './state.js';

export default class Terrains
{
  static ITERATIONS_FORMULA_MAX = 1;
  static ITERATIONS_FORMULA_MIN = 2;
  static ITERATIONS_FORMULA_MIX = 3;
  static ITERATIONS_FORMULA_POWERMIX = 4;

  constructor() {
    this.state = State.getInstance();
    this.seed = 'webaverse';
    this.random = alea(this.seed);
    
    this.subdivisions = 40;
    this.lacunarity = 2.05;
    this.persistence = 0.45;
    this.maxIterations = 6;
    this.baseFrequency = 0.003;
    this.baseAmplitude = 90;
    this.power = 2.5;
    this.elevationOffset = 2;

    this.segments = this.subdivisions + 1;
    this.iterationsFormula = Terrains.ITERATIONS_FORMULA_POWERMIX;

    this.lastId = 0;
    this.terrains = new Map();

    this.events = new EventEmitter();
    
    // Iterations offsets
    this.iterationsOffsets = [];

    for (let i = 0; i < this.maxIterations; i ++)
      this.iterationsOffsets.push([(this.random() - 0.5) * 200000, (this.random() - 0.5) * 200000]);

    this.setWorkers();
  }

  setWorkers() {
    // this.worker = new Worker('./terrain-worker.js');

    this.worker = this.state.terrainWorker;
    
    this.worker.onmessage = (event) => {
      const terrain = this.terrains.get(event.data.id);

      if (terrain) {
        terrain.create(event.data);
      }
    }
  }

  getIterationsForPrecision(precision) {
    if(this.iterationsFormula === Terrains.ITERATIONS_FORMULA_MAX)
      return this.maxIterations;

    if(this.iterationsFormula === Terrains.ITERATIONS_FORMULA_MIN)
      return Math.floor((this.maxIterations - 1) * precision) + 1;

    if(this.iterationsFormula === Terrains.ITERATIONS_FORMULA_MIX)
      return Math.round((this.maxIterations * precision + this.maxIterations) / 2);

    if(this.iterationsFormula === Terrains.ITERATIONS_FORMULA_POWERMIX)
      return Math.round((this.maxIterations * (precision, 1 - Math.pow(1 - precision, 2)) + this.maxIterations) / 2);
  }

  create(size, x, z, precision) {
    
    // Create id
    const id = this.lastId ++;
    
    // Create terrain
    const iterations = this.getIterationsForPrecision(precision);
    const terrain = new Terrain(this, id, size, x, z, precision);
    this.terrains.set(terrain.id, terrain);

    // Post to worker
    this.worker.postMessage({
      id: terrain.id,
      x,
      z,
      seed: this.seed,
      subdivisions: this.subdivisions,
      size: size,
      lacunarity: this.lacunarity,
      persistence: this.persistence,
      iterations: iterations,
      baseFrequency: this.baseFrequency,
      baseAmplitude: this.baseAmplitude,
      power: this.power,
      elevationOffset: this.elevationOffset,
      iterationsOffsets: this.iterationsOffsets,
      maxIterations: this.maxIterations,
    })
    
    this.events.emit('create', terrain);

    return terrain;
  }

  destroyTerrain(id) {
    const terrain = this.terrains.get(id);

    if(terrain) {
      terrain.destroy();
      this.terrains.delete(id);
    }
  }
  
}