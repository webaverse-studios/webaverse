import Decorator from '../core/Decorator.js';
import {SUCCESS, ERROR} from '../constants.js';

/**
 * The Succeedor decorator always returning `SUCCESS`.
 *
 * @module b3
 * @class Succeedor
 * @extends Decorator
 **/

export default class Succeedor extends Decorator {

  /**
   * Creates an instance of Succeedor.
   * @param {Object} params
   * @param {BaseNode} params.child The child node.
   * @memberof Succeedor
   */
  constructor({child = null} = {}){
    super({
      child,
      name: 'Succeedor',
    });
  }

  /**
   * Tick method.
   * @method tick
   * @param {Tick} tick A tick instance.
   * @return {Constant} A state constant.
   **/
  tick(tick) {
    if (!this.child) {
      return ERROR;
    }

    this.child._execute(tick);

    return SUCCESS;
  }
};
