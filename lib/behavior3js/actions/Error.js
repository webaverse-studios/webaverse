import {ERROR} from '../constants.js';
import Action from '../core/Action.js';

/**
 * This action node returns `ERROR` always.
 *
 * @module b3
 * @class Error
 * @extends Action
 **/
export default class Error extends Action {

  /**
   * Creates an instance of Error.
   * @memberof Error
   */
  constructor(){
    super({name: 'Error'});
  }

  /**
   * Tick method.
   * @method tick
   * @param {b3.Tick} tick A tick instance.
   * @return {Constant} Always return `ERROR`.
   **/
  tick(tick) {
    return ERROR;
  }
};