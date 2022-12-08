import cameraManager from '../camera-manager.js';

export class InterfaceCommsManager {
  constructor(messageInterface) {
    this.messageInterface = messageInterface;
    this.messageInterface.addListener('setInterfaceEnabled', this.setInterfaceEnabled.bind(this));
  }

  setInterfaceEnabled(enable) {
    const iframe = document.getElementById('interface-iframe');
    iframe.style.pointerEvents = enable ? 'all' : 'none';
    if (!enable) {
      cameraManager.requestPointerLock();
    }
  }
}