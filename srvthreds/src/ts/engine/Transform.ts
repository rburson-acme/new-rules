import { Expression, eventTypes } from '../thredlib/index.js';
import { Transformer } from '../thredlib/index.js';
import { TransformModel } from '../thredlib/index.js';
import { ThredContext } from './ThredContext.js';
import { Event, EventData } from '../thredlib/index.js';
import { Id } from '../thredlib/core/Id.js';
import { ThredStore } from './store/ThredStore.js';

/*
    @IMPORTANT any mutations here must be made in the Store
    This is part of the 'stateless' tree that gets shared across processes
*/
export class Transform {
  private readonly eventDataTemplate?: EventData;
  private readonly templateXpr?: Expression;

  constructor(transformModel: TransformModel) {
    this.eventDataTemplate = transformModel.eventDataTemplate;
    // note: we could defer compilation here until first use
    // it'll be a pattern startup time vs. application time decision
    if (transformModel.templateXpr) {
      this.templateXpr = new Expression(transformModel.templateXpr);
    }
  }

  async apply(event: Event, thredStore: ThredStore): Promise<Event> {
    const { eventDataTemplate, templateXpr } = this;
    const context = thredStore.thredContext;
    const expressionParams = { event, context };
    let data;

    if (eventDataTemplate) {
      data = await Transformer.transformObject(eventDataTemplate, expressionParams);
    } else if (templateXpr) {
      data = await templateXpr.apply(expressionParams);
    } else {
      throw Error('No eventDataTemplate or template expression provided to transform directive');
    }

    const newEvent: Event = {
      id: Id.nextEventId,
      thredId: context.thredId,
      type: eventTypes.system.type,
      time: Date.now(),
      source: eventTypes.system.source,
      data,
    };

    return newEvent;
  }
}
