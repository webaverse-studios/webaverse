// import {
//   ZineData,
// } from '../zine/zine-format.js';

import {makeId} from './util.js';

//

export class ActionManager extends EventTarget {
  constructor() {
    super();
  }
  #actionByType = new Map(); // type -> [action]
  #actionByActionId = new Map(); // actionId -> action
  
  addAction(action) {
    if (typeof action.type !== 'string') {
      console.warn('type must be a string', action);
      debugger;
    }

    action = {
      ...action,
    };
    if (action.actionId === undefined) {
      action.actionId = makeId(8);
    }

    let actionTypesArray = this.#actionByType.get(action.type);
    if (!actionTypesArray) {
      actionTypesArray = [];
      this.#actionByType.set(action.type, actionTypesArray);
    }
    actionTypesArray.push(action);

    if (this.#actionByActionId.has(action.actionId)) {
      debugger;
    }
    this.#actionByActionId.set(action.actionId, action);

    this.dispatchEvent(new MessageEvent('actionadded', {
      data: {
        action,
      },
    }));

    return action;
  }
  removeAction(action) {
    const actionTypesArray = this.#actionByType.get(action.type);
    if (!actionTypesArray) {
      debugger;
    }
    const actionIndex = actionTypesArray.indexOf(action);
    if (actionIndex === -1) {
      debugger;
    }
    actionTypesArray.splice(actionIndex, 1);
    if (actionTypesArray.length === 0) {
      this.#actionByType.delete(action.type);
    }

    if (!this.#actionByActionId.has(action.actionId)) {
      debugger;
    }
    this.#actionByActionId.delete(action.actionId);

    this.dispatchEvent(new MessageEvent('actionremoved', {
      data: {
        action,
      },
    }));
  }
  removeActionType(type) {
    if (typeof type !== 'string') {
      console.warn('type must be a string', type);
      debugger;
    }

    // get the first action of the type
    const actionTypesArray = this.#actionByType.get(type);
    if (actionTypesArray) {
      const action = actionTypesArray.shift();
      if (actionTypesArray.length === 0) {
        this.#actionByType.delete(type);
      }

      if (!this.#actionByActionId.has(action.actionId)) {
        debugger;
      }
      this.#actionByActionId.delete(action.actionId);

      this.dispatchEvent(new MessageEvent('actionremoved', {
        data: {
          action,
        },
      }));
    } else {
      debugger;
    }
  }
  removeActionId(actionId) {
    if (typeof actionId !== 'string') {
      console.warn('action id must be a string', actionId);
      debugger;
    }

    // get the first action of the type
    const action = this.#actionByActionId.get(actionId);
    if (action) {
      this.removeAction(action);

      // const action = actionTypesArray.shift();
      // if (actionTypesArray.length === 0) {
      //   this.#actionByType.delete(type);
      // }

      // if (!this.#actionByActionId.has(action.actionId)) {
      //   debugger;
      // }
      // this.#actionByActionId.delete(action.actionId);

      // this.dispatchEvent(new MessageEvent('actionremoved', {
      //   data: {
      //     action,
      //   },
      // }));
    } else {
      debugger;
    }
  }
  getActionType(type) {
    if (typeof type !== 'string') {
      console.warn('type must be a string', type);
      debugger;
    }
    const actionTypesArray = this.#actionByType.get(type);
    if (actionTypesArray) {
      return actionTypesArray[0];
    } else {
      return null;
    }
  }
  hasActionType(type) {
    if (typeof type !== 'string') {
      console.warn('type must be a string', type);
      debugger;
    }
    return this.#actionByType.has(type);
  }
  findAction(pred) {
    for (const actionTypesArray of this.#actionByType.values()) {
      for (const action of actionTypesArray) {
        if (pred(action)) {
          return action;
        }
      }
    }
    return null;
  }

  getActionsArray() {
    const result = [];
    for (const actionTypesArray of this.#actionByType.values()) {
      for (const action of actionTypesArray) {
        result.push(action);
      }
    }
    return result;
  }
}