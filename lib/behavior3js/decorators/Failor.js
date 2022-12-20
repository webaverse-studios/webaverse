import Decorator from '../core/Decorator.js';
import {FAILURE, ERROR} from '../constants.js';

/**
 * The Failor decorator always returning `FAILURE`.
 *
 * @module b3
 * @class Failor
 * @extends Decorator
 **/

export default class Failor extends Decorator {

  /**
   * Creates an instance of Failor.
   * @param {Object} params
   * @param {BaseNode} params.child The child node.
   * @memberof Failor
   */
  constructor({child = null, title} = {}){
    super({
      child,
      name: 'Failor',
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

    return FAILURE;
  }
};