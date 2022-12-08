import metaversefile from 'metaversefile';

export class LocalPlayerCommsManager {
  constructor(messageInterface) {
    this.messageInterface = messageInterface;
    this.messageInterface.addListener('setLocalPlayerSpec', this.setPlayerSpec.bind(this));
  }

  setPlayerSpec(spec) {
    const localPlayer = metaversefile.useLocalPlayer();
    localPlayer.setPlayerSpec(spec);
  }
}