import {Winds} from './simulation/wind.js';

export class EnvironmentManager {
  wind = new Winds();
  #winds = [];
  #mirrors = [];
  constructor() {
  }
  getWinds() {
    debugger;
    return this.#winds;
  }
  getMirrors() {
    return this.#mirrors;
  }
}