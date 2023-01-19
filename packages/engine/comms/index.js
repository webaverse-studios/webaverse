import {PostMessageInterface} from '../PostMessageInterface.js';
import {LocalPlayerCommsManager} from './localplayer-comms-manager.js';
import {DioramaCommsManager} from './diorama-comms-manager.js';
import {InterfaceCommsManager} from './interface-comms-manager.js';

const messageInterface = new PostMessageInterface({targetWindow: 'interface'});

export const localPlayerCommsManager = new LocalPlayerCommsManager(messageInterface);
export const dioramaCommsManager = new DioramaCommsManager(messageInterface);
export const engineCommsManager = new InterfaceCommsManager(messageInterface);