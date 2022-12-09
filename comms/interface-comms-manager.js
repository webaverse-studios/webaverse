import cameraManager from '../camera-manager.js';
import webaverse from '../webaverse.js';

export class InterfaceCommsManager {
  constructor(messageInterface) {
    this.messageInterface = messageInterface;
    this.messageInterface.addListener('setInterfaceEnabled', this.setInterfaceEnabled.bind(this));

    // subscribe to the loadProgress event on webaverse object (from webavberse.js)
    // and send it to the interface
    webaverse.addEventListener('loadProgress', (progress) => {
      this.messageInterface.send('loadProgress', progress);
      console.log('sending update progress to frontend', progress);
    });
  }

  setInterfaceEnabled(enable) {
    const iframe = document.getElementById('interface-iframe');
    iframe.style.pointerEvents = enable ? 'all' : 'none';
    if (!enable) {
      cameraManager.requestPointerLock();
    }
  }
}