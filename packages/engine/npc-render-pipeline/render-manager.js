import {NpcRenderer} from './npc-renderer.js'
import {NpcCamera} from './npc-camera.js'


export class NpcRenderManager {
  constructor() {
    this.npc_renderers = {}
    this.npc_cameras   = {}
  }

  addNpc(npc) {
    console.log('adding NPC', this.npc_renderers, npc)
    this.npc_renderers[npc.id] = new NpcRenderer(npc)
    this.npc_cameras[npc.id]   = new NpcCamera(npc)
    console.log('added NPC', this.npc_renderers, npc)
  }

  removeNpc(npc) {
    // still needs to be added somewhere for cleanup
    delete this.npc_renderers[npc.id]
    delete this.npc_cameras[npc.id]
  }

  updateNpc(npc) {
    // if npc in npc_cameras set position and rotation
    if ( this.npc_cameras[npc.id] ) {
      this.npc_cameras[npc.id].position.set(npc.position.x, npc.position.y + 1.5, npc.position.z)
      this.npc_cameras[npc.id].rotation.set(npc.rotation.x, npc.rotation.y, npc.rotation.z)
    }
  }

  async render(scene, smart_npcs) {
    //   iterate over all the renderers
    for ( const smart_npc of smart_npcs ) {
      if ( this.npc_renderers[smart_npc.id] ) {
        // update camera position and rotation
        this.npc_cameras[smart_npc.id].position.set(smart_npc.position.x, smart_npc.position.y + 1.5, smart_npc.position.z)
        this.npc_cameras[smart_npc.id].rotation.set(smart_npc.rotation.x, smart_npc.rotation.y, smart_npc.rotation.z)
        this.npc_renderers[smart_npc.id].renderer.clear()
        this.npc_renderers[smart_npc.id].renderer.render(scene, this.npc_cameras[smart_npc.id])
        const canvas = this.npc_renderers[smart_npc.id].offscreenCanvas
        return await canvas.convertToBlob({type: 'image/png'})

        // debugger
      } else {
        console.log('no renderer for npc', smart_npc)
      }
    }
  }
}
