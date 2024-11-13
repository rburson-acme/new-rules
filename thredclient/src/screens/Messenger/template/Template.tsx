import { observer } from 'mobx-react-lite';
import React, { Fragment } from 'react';
import { Interaction } from './Interaction';
import { getComponentTypes } from './componentTypes';
import { EventStore } from '@/src/stores/EventStore';

type TemplateProps = {
  eventStore: EventStore;
};
export const Template = observer(({ eventStore }: TemplateProps) => {
  const { openTemplateStore: templateStore } = eventStore;

  if (!templateStore) return null;
  const { name } = templateStore.template;
  const { completedInteractionStores } = templateStore;
  const completedInteractions = completedInteractionStores.map((interactionStore, index) => {
    return <Interaction key={index} interactionStore={interactionStore} componentTypes={getComponentTypes()} />;
  });
  const interactionStore = templateStore.nextInteractionStore;
  return (
    <Fragment>
      {completedInteractions}
      {interactionStore && (
        <Interaction
          key={completedInteractions.length}
          interactionStore={interactionStore}
          componentTypes={getComponentTypes()}
        />
      )}
    </Fragment>
  );
});
