import Terrains from './terrains.js';

export default class View {
  static instance

  static getInstance() {
    return View.instance
  }

  constructor(player, scene, physics) {
    if(View.instance)
      return View.instance

    View.instance = this;
    this.player = player;
    this.scene = scene;
    this.physics = physics;
    this.terrains = new Terrains();
    
  }
  
  update(timestamp) {
    this.terrains.update(timestamp);
  }

  destroy() {
  }
}