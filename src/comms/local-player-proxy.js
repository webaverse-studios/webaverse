import {Vector3, Quaternion} from 'three';

export class LocalPlayerProxy {
    position = new Vector3()
    quaternion = new Quaternion()
    constructor(messageInterface){
        this.messageInterface = messageInterface;
    }

    addEventListener (e, fn) {
        console.log('addEventListener called', e, fn);
    }

    removeEventListener (e, fn) {
        console.log('removeEventListener called', e, fn);
    }

    characterHups = {
        addEventListener: (e, fn) => {
            console.log('addEventListener called', e, fn);
        },
        removeEventListener: (e, fn) => {
            console.log('removeEventListener called', e, fn);
        },
    }

    characterPhysics = {
        velocity: new Vector3(),
    }

    voicer = {
        start: () => { console.log('voicer start'); },
        stop: () => { console.log('voicer stop'); },
        preloadMessage: message => { console.log('voicer preload message', message); },
    }

    async setPlayerSpec (character) {
        console.log('Local Player Proxy: setPlayerSpec called', character);
        this.messageInterface.postMessage('setLocalPlayerSpec', character);

        // send a message on the postMessageInterface

            //   const [
            //     _setPlayerSpec,
            //     result,
            //   ] = await Promise.all([
            //       this.setPlayerSpec(character),
            //       characterIntroLoader.loadItem(character.avatarUrl, character, {
            //           // signal,
            //       }),
            //   ]);
              
            //   if (result) {
            //       const {preloadedOnSelectMessage} = result;
          
            //       npcPlayer && npcPlayer.voicer.stop();
            //       const localPlayer = metaversefile.useLocalPlayer();
            //       localPlayer.voicer.stop();
            //       await chatManager.waitForVoiceTurn(() => {
            //           return localPlayer.voicer.start(preloadedOnSelectMessage);
            //       });
            //   }
    }

    getActionsState () {
        return {
            moveForward: false,
            moveBackward: false,
            moveLeft: false,
            moveRight: false,
            jump: false,
            crouch: false,
            sprint: false,
        };
    }

    getActionsArray () {
        return [];
    }

    getCardsImage (
        start_url,
        {
            width, signal,
        }) {
        console.log('get cards image', start_url, width, signal);
        return null;
    }

    setVolume (volume) {
        console.log('set volume', volume);
    }

    saveSettings (settings) {
        console.log('save settings');
    }

    getSettings () {
        return {};
    }

    convertCharacterQualityToValue (characterDetails) {
        return 0;
    }

    setAvatarQuality (avatarStyle) {
        console.log('set avatar quality', avatarStyle);
    }

    getCharacterQuality () {
        return null;
    }

    addSettingsListener (type, fn) {
        console.log('add settings listener', type, fn);
    }

    async getSpriteAnimationForAppUrlAsync (url, options) {
        console.log('get sprite animation for app url async', url, options);
        return null;
    }
};