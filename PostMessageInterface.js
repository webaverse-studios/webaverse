const postToSelf = true; // set to false for cross iframe comms with interface

// add a custom setter that logs the value of the listeners variable when it is changed
const listenersSet = new Set();
const listeners = new Proxy(listenersSet, {
    set(listeners, messageType, value) {
        listeners[messageType] = value;
        return true;
    },
    get(listeners, messageType) {
        return listeners[messageType];
    },
});

// communicate between the engine and the interface
// the interface is embedded in the engine-- we will post messages to the parent, which is the engine

export class PostMessageInterface extends EventTarget {
    // log listeners any time it is set
    constructor({targetWindow}) {
        super();
        this.targetWindow = targetWindow;
        globalThis.addEventListener('message', this.receiveMessage);
    }

    receiveMessage(e) {
        const {data} = e;
        const {messageType, targetWindow} = data;
        if (targetWindow === this.targetWindow)
            return; // ignore self messages
        if (listeners[messageType] !== undefined) {
            const l = listeners[messageType];
            for (const listener of l) {
                listener(data.payload);
            }
        }
    }

    addListener(messageType, listener) {
        if (!messageType || !listener)
            return console.warn('invalid listener', messageType, listener);
        if (!listeners[messageType]) {
            listeners[messageType] = [];
        }
        listeners[messageType].push(listener);
    }

    removeListener(messageType, listener) {
        if (!messageType || !listener)
            return console.warn('invalid listener', messageType, listener);
        // find listener in this.listeners[messageType] and remove it
        if (!listeners[messageType])
            return console.warn('invalid listener', messageType, listener);
        for (let i = 0; i < listeners[messageType].length; i++) {
            if (listeners[messageType][i] === listener) {
                listeners[messageType].splice(i, 1);
                break;
            }
        }
    }

    postMessage(messageType, payload, buffers) {
        if (postToSelf) {
            window.postMessage({payload, messageType, targetWindow: this.targetWindow}, '*', buffers);
            return;
        }
        window.parent.postMessage({payload, messageType, targetWindow: this.targetWindow}, '*', buffers);
    }
}