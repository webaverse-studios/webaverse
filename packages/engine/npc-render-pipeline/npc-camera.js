import * as THREE from 'three';
export class NpcCamera extends THREE.PerspectiveCamera {
  constructor(npc) {
    // position camera above npc
    super(75, 1, 0.1, 1000)
    this.position.set(npc.position.x, npc.position.y + 1.5, npc.position.z)
    this.rotation.set(npc.rotation.x, npc.rotation.y, npc.rotation.z)
  }
}
