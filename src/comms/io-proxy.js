import {Vector3} from 'three';

const currentState = {
    inputoFocused: false,
    mouseHoverObject: null,
    equipmentHoverObject: null,
    scene: null,
    camera: null,
    renderer: null,
};

export class IoHandlerProxy {
    pointerLockElement = null
    messageInterface = null;
    constructor(messageInterface){
        this.messageInterface = messageInterface;
    }

    addListener (type, fn) {
        this.messageInterface.addListener(type, fn);
    }

    removeListener (type, fn) {
        this.messageInterface.removeListener(type, fn);
    }

    inputFocused () {
        return false;
    }

    setMouseSelectedObject (app, physicsId, position) {
        console.log('set mouse selected object', app, physicsId, position);
    }

    getMouseHoverObject () {
        return null;
    }

    getMouseHoverPhysicsId () {
        return 0;
    }

    getMouseHoverPosition () {
        return [0, 0];
    }

    getMouseDomEquipmentHoverObject () {
        return null;
    }

    setMouseDomEquipmentHoverObject = currentObject => {
        console.log('set mouse dom equipment hover object', currentObject);
    }

    setHoverEnabled = enabled => {
        console.log('set hover enabled', enabled);
    }

    getMouseSelectedPosition = () => {
        return new Vector3();
    }

    handleDropJsonToPlayer = obj => {
        console.log('handle drop json to player', obj);
    }

    setAvatarQuality = quality => {
        console.log('set avatar quality', quality);
    }

    clearMouseHoverObject = () => {
        console.log('clear mouse hover object');
    }

    setMouseDomHoverObject = (targetApp, physicsId) => {
        console.log('set mouse dom hover object', targetApp, physicsId);
    }

    dropSelectedApp = () => {
        console.log('drop selected app');
    }

    deleteSelectedApp = () => {
        console.log('delete selected app');
    }

    handleDropJsonItemToPlayer = (item, index) => {
        console.log('handle drop json item to player', item, index);
    }

    getDetachedNpcByApp = app => {
        return null;
    }

    setSelectedLoadoutIndex = index => {
        console.log('set selected loadout index', index);
    }

    getHotbarRenderer = index => {
        return null;
    }

    fetchThemeSong = targetCharacter => {
        return null;
    }

    getWorldApps = () => {
        return [];
    }

    importAppToWorld = app => {
        console.log('import app to world', app);
    }

    requestPointerLock = () => {
        console.log('request pointer lock');
    }

    exitPointerLock = () => {
        console.log('exit pointer lock');
    }

    // metaversefile
    createAppAsync = async ({
        start_url: u, type, content, in_front, components,
    }) => {
        console.log('create app async', u, in_front, components);
        return null;
    }

    createModule = output => {
        console.log('create module', output);
    }

    generateCharacterIntroPrompt = async (name, bio) => {
        console.log('generate character intro prompt', name, bio);
    }

    waitForSceneLoaded = async () => {
        console.log('wait for scene loaded');
    }

    handleStoryKeyControls = e => {
        console.log('handle story key controls', e);
    }

    getConversation = () => {
        return null;
    }

    triggerEmote = emote => {
        console.log('trigger emote', emote);
    }

    getEmoteSpec = emote => {
        console.log('get emote spec', emote);
        return null;
    }

    loadCharactersMap = async () => {
        console.log('load characters map');
        return [];
    }

    waitForVoiceTurn = async () => {
        console.log('wait for voice turn');
    }

    playCurrentMusic = themeSong => {
        console.log('play current music', themeSong);
    }

    stopCurrentMusic = () => {
        console.log('stop current music');
    }

    addMessage = (text, {timeout}) => {
        console.log('add message', text, timeout);
    }

    addCanvasToHotBar = (canvas, index) => {
        console.log('add canvas to hot bar', canvas, index);
    }

    removeCanvasFromHotBar = canvas => {
        console.log('remove canvas from hot bar', canvas);
    }

    addCanvasToInfobox = canvas => {
        console.log('add canvas to hot bar', canvas);
    }

    removeCanvasFromInfobox = canvas => {
        console.log('remove canvas from hot bar', canvas);
    }

    getQuests = () => {
        return [];
    }

    addQuestListener = (type, fn) => {
        console.log('add quest listener', type, fn);
    }

    removeQuestListener = (type, fn) => {
        console.log('remove quest listener', type, fn);
    }

    getSceneNamesAsync = async () => {
        console.log('get scene names async');
        return [];
    }

    handleUrlUpdate = () => {
        console.log('handle url update');
    }

    disableInterface = () => {
        this.messageInterface.postMessage('setInterfaceEnabled', false);
    }

    enableInterface = () => {
        this.messageInterface.postMessage('setInterfaceEnabled', true);
    }

    getScene = () => {
        return currentState.scene;
    }

    getCamera = () => {
        return currentState.camera;
    }

    getRenderer = () => {
        return currentState.renderer;
    }
};