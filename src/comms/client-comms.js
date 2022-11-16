import {PostMessageInterface} from '../../PostMessageInterface';
import {IoHandlerProxy} from './io-proxy.js';
import {LocalPlayerProxy} from './local-player-proxy.js'
import {DioramaManagerProxy} from './diorama-manager-proxy.js';

const messageInterface = new PostMessageInterface({targetWindow: 'engine'});

const dioramaManager = new DioramaManagerProxy(messageInterface);
const localPlayer = new LocalPlayerProxy(messageInterface);
const ioHandler = new IoHandlerProxy(messageInterface);

export {dioramaManager, ioHandler, localPlayer};