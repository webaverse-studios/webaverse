import Composite from '../core/Composite.js';
import {SUCCESS, FAILURE, RUNNING} from '../constants.js';

/**
 * https://arxiv.org/pdf/1709.00084.pdf
 * The Parallel node executes Algorithm 3, which corresponds to routing the ticks to
 * all its children and it returns Success if M children return Success, it returns Failure
 * if N − M +1 children return Failure, and it returns Running otherwise, where N is
 * the number of children and M ≤ N is a user defined threshold. The symbol of the
 * the Parallel node is a box containing the label “⇒”, shown in Figure 1.4.
 *
 * @module b3
 * @class Parallel
 * @extends Composite
 **/

export default class Parallel extends Composite {

  /**
   * Creates an instance of Parallel.
   * @param {Object} params 
   * @param {Array} params.children 
   * @memberof Parallel
   */
  constructor({children = [], title, M = 1} = {}){ // todo: M = children.length ?
    super({
      name: 'Parallel',
      children,
      title
    });
    this.M = M;
  }

  /**
   * Tick method.
   * @method tick
   * @param {b3.Tick} tick A tick instance.
   * @return {Constant} A state constant.
   **/
  tick(tick) {
    let successCount = 0;
    let failureCount = 0;
    const N = this.children.length;
    for (var i=0; i<N; i++) {
      var status = this.children[i]._execute(tick);

      if (status === SUCCESS) {
        successCount ++;
      } else if (status === FAILURE) {
        failureCount++;
      }
    }

    if (successCount >= this.M) {
      return SUCCESS;
    } else if (failureCount > N - this.M) {
      return FAILURE;
    }

    return RUNNING;
  }
};
