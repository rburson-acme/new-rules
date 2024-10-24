import React from 'react';
import { observer } from 'mobx-react-lite';
import { OpenEventView } from './OpenEventView';
import { RootStore } from '@/src/stores/rootStore';
import { EventsStore } from '@/src/stores/EventsStore';
import { EventsView } from './EventsView';

type EventsLayoutProps = {
  rootStore: RootStore;
};

export const EventsLayout = observer(({ rootStore }: EventsLayoutProps) => {
  const { thredsStore } = rootStore;
  const { currentThredStore } = thredsStore;
  const eventsStore = currentThredStore ? currentThredStore.eventsStore : new EventsStore(rootStore);

  const openEvent = eventsStore?.openEventStore?.event;
  const eventStore = eventsStore?.openEventStore;

  if (!eventStore) return null;
  if (openEvent) {
    return <OpenEventView rootStore={rootStore} eventStore={eventStore} />;
  }
  // if there are no threds, create an empty event store
  return <EventsView eventsStore={eventsStore} />;
});
