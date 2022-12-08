import Decorator from '../core/Decorator.js';
import {RUNNING, ERROR} from '../constants.js';

/**
 * The Runnor decorator always returning `RUNNING`.
 *
 * @module b3
 * @class Runnor
 * @extends Decorator
 **/

export default class Runnor extends Decorator {

  /**
   * Creates an instance of Runnor.
   * @param {Object} params
   * @param {BaseNode} params.child The child node.
   * @memberof Runnor
   */
  constructor({child = null, title} = {}){
    super({
      child,
      name: 'Runnor',
      title
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

    return RUNNING;
  }
};
