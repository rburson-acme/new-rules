import { Transformer } from '../thredlib/index.js';
import { PublishModel } from '../thredlib/index.js';
import { Address } from '../thredlib/index.js';
import { ThredContext } from './ThredContext.js';
import { Event } from '../thredlib/index.js';
import { ThredStore } from './store/ThredStore.js';

/*
    @IMPORTANT any mutations here must be made in the Store
    This is part of the 'stateless' tree that gets shared across processes
*/
export class Publish {
  to: Address;

  constructor(publish: PublishModel) {
    this.to = publish.to;
  }

  async apply(event: Event, thredStore: ThredStore): Promise<Address> {
    const { to } = this;
    const context = thredStore.thredContext;
    const expressionParams = { event, context };
    try {
      // evaluate any expressions in the 'to' field
      const transformedTo = await Transformer.transformObject(to, expressionParams);
      // if an array, flattening allows for multiple array matches to be nested in the 'to' field
      // if a string we'll need to return an array of one
      // otherwise, assume it's an Address object
      return Array.isArray(transformedTo)
        ? [].concat(...transformedTo)
        : typeof transformedTo === 'string'
          ? [transformedTo]
          : transformedTo;
    } catch (e) {
      throw Error(`publish.apply(): Failed to transform expr ${to}`);
    }
  }
}
