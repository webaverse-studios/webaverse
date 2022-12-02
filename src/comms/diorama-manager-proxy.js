function makeId(length) {
    let result = '';
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

class DioramaProxy {
    canvases = new Map();
    constructor(opts, messageInterface) {
        this.opts = opts;
        this.messageInterface = messageInterface;
    }

    addCanvas(canvas){
        // randomly generate a canvas id, 
        const canvasId = makeId(5);
        this.canvases.set(canvas, canvasId);
        // send the canvas to the diorama manager
        this.messageInterface.postMessage('addCanvasToEngine', {
            dioramaId: this.opts.dioramaId,
            canvasId,
            height: canvas.height,
            width: canvas.width,
        });
    }

    removeCanvas(canvas){
        this.messageInterface.postMessage('removeCanvas', {
            dioramaId: this.opts.dioramaId,
            canvasId: this.canvases.get(canvas),
        });
        this.canvases.delete(canvas);
    }

    resetCanvases(){
        // for each canvas in this.canvases, call removeCanvas
        this.messageInterface.postMessage('resetCanvases', {
            dioramaId: this.opts.dioramaId,
        });
        this.canvases.clear();
    }

    setSize(width, height){
        this.messageInterface.postMessage('setSize', {
            dioramaId: this.opts.dioramaId,
            width,
            height,
        });
    }

    destroy(){
        this.messageInterface.postMessage('destroyDiorama', {
            dioramaId: this.opts.dioramaId,
        });
        this.canvases.clear();
    }
}

export class DioramaManagerProxy {
    constructor(messageInterface){
        this.messageInterface = messageInterface;
        // TODO: register with the postMessage interface
        this.messageInterface.addListener('updateCanvas', this.handleUpdateCanvas.bind(this));
    }

    dioramas = new Map();

    createDiorama(opts) {
        if(!opts.dioramaId) {
            throw new Error('opts.dioramaId is required');
        }

        if(this.dioramas.has(opts.dioramaId)) {
            return this.dioramas.get(opts.dioramaId);
        }

        const proxy = new DioramaProxy(opts, this.messageInterface);
        this.dioramas.set(opts.dioramaId, proxy);
        this.messageInterface.postMessage('createDiorama', opts);
        return proxy;
    }

    destroyDiorama(opts) {
        if(!opts.dioramaId) {
            throw new Error('opts.dioramaId is required');
        }
        // check if diorama exists, if it does call destroy on it
        // then remove it from the map
        if(this.dioramas.has(opts.dioramaId)) {
            this.dioramas.get(opts.dioramaId).destroy();
            this.dioramas.delete(opts.dioramaId);
        }
    }

    async handleUpdateCanvas(canvasData){
        const imageBitmap = await createImageBitmap(canvasData.imageBitmap, 0, canvasData.imageBitmap.height-(canvasData.height/2), canvasData.width/2, (canvasData.height/2));

        if(!this.dioramas.has(canvasData.dioramaId)) {
            return; // if the canvas was deleted last frame, we don't need to update it
        }

        const diorama = this.dioramas.get(canvasData.dioramaId);
        for (const [canvas] of diorama.canvases.entries()) {
            // draw the imageBitmap onto the canvas
            const ctx = canvas.getContext('bitmaprenderer');
            ctx.transferFromImageBitmap(imageBitmap);
        }
    }


    getDiorama(opts) {
        return this.createDiorama(opts);
    }
}