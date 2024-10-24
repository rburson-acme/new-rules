import React from 'react';
import { observer } from 'mobx-react-lite';
import { EventsView } from './EventsView';
import { RootStore } from '@/src/stores/rootStore';
import { EventsStore } from '@/src/stores/EventsStore';

type EventsLayoutProps = {
  rootStore: RootStore;
};
export const EventsLayout = observer(({ rootStore }: EventsLayoutProps) => {
  const { thredsStore } = rootStore;
  const { currentThredStore } = thredsStore;
  // if there are no threds, create an empty event store
  const eventsStore = currentThredStore ? currentThredStore.eventsStore : new EventsStore(rootStore);
  if (eventsStore) {
    return <EventsView eventsStore={eventsStore} />;
  } else return null;
});
