
import Terrains from './terrains.js'
import Chunks from './chunks.js'

export default class State
{
  static instance

  static getInstance()
  {
      return State.instance
  }

  constructor(player)
  {
    if(State.instance)
      return State.instance

    State.instance = this
    this.player = player;
    this.terrains = new Terrains();
    this.chunks = new Chunks();
  }
  
  update()
  {
    this.chunks.update()
  }
}