import dioramaManager from '../diorama/diorama-manager.js';

export class DioramaCommsManager {
  dioramas = new Map();
  constructor(messageInterface) {
    this.messageInterface = messageInterface;
    this.messageInterface.addListener('createDiorama', this.handleCreateDiorama.bind(this));
    this.messageInterface.addListener('destroyDiorama', this.handleDestroyDiorama.bind(this));
    this.messageInterface.addListener('addCanvasToEngine', this.handleAddCanvas.bind(this));
    this.messageInterface.addListener('removeCanvas', this.handleRemoveCanvas.bind(this));
    this.messageInterface.addListener('setSize', this.setSize.bind(this));
  }

  async handleCreateDiorama(opts) {
    const newDiorama = dioramaManager.createDiorama(opts);
    this.dioramas.set(opts.dioramaId, newDiorama);
  }

  async handleDestroyDiorama(opts) {
    const diorama = this.dioramas.get(opts.dioramaId);
    if (diorama) {
      diorama.destroy();
      this.dioramas.delete(opts.dioramaId);
    }
  }

  handleAddCanvas(opts) {
    const diorama = this.dioramas.get(opts.dioramaId);
    diorama.addCanvas(opts);
  }

  handleRemoveCanvas(opts) {
    const diorama = this.dioramas.get(opts.dioramaId);
    diorama.removeCanvas(opts.canvasId);
  }

  setSize(opts) {
    const diorama = this.dioramas.get(opts.dioramaId);
    diorama.setSize(opts);
  }

  updateDioramaCanvas(canvas) {
    this.messageInterface.postMessage('updateCanvas', canvas, [canvas.imageBitmap]);
  }
}