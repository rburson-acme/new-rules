import React, { Component, Fragment, RefObject, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { FlatList, Text, View } from 'react-native';
import { EventView } from './EventView';
import { MoreEventsIndicator } from './MoreEventsIndicator';
import { EventsStore, ScrollMode } from '@/src/stores/EventsStore';
import { EventStore } from '@/src/stores/EventStore';

type EventsViewProps = {
  eventsStore: EventsStore;
};

export const EventsView = observer(({ eventsStore }: EventsViewProps) => {
  const eventStores = eventsStore.eventStores.slice();
  const flatList = useRef<FlatList<EventStore>>(null);
  return (
    <Fragment>
      <FlatList
        ref={flatList}
        onContentSizeChange={() => handleContentSizeChange({ eventsStore, flatList })}
        onScrollBeginDrag={() => handleScrollBeginDrag({ eventsStore })}
        onEndReachedThreshold={0.1}
        onEndReached={() => handleOnEndReached({ eventsStore })}
        data={eventStores}
        renderItem={({ item, index }) => <EventView eventStore={item} />}
        ListEmptyComponent={emptyList()}
      />
      <MoreEventsIndicator
        eventsStore={eventsStore}
        onPress={() => handleOnPressMoreEvents({ eventsStore, flatList })}
      />
    </Fragment>
  );
});

const emptyList = () => (
  <View style={{ padding: 50, flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 20 }}>No Messages Yet</Text>
  </View>
);

type HandlerProps = { eventsStore: EventsStore };
const handleContentSizeChange = ({
  eventsStore,
  flatList,
}: HandlerProps & { flatList: RefObject<FlatList<EventStore>> }) => {
  const { scrollMode } = eventsStore;
  if (scrollMode === ScrollMode.AUTO) {
    flatList.current?.scrollToEnd();
  }
};

const handleScrollBeginDrag = ({ eventsStore }: HandlerProps) => {
  eventsStore.setScrollMode(ScrollMode.FREE);
};

const handleOnEndReached = ({ eventsStore }: HandlerProps) => {
  const { scrollMode } = eventsStore;
  if (scrollMode === ScrollMode.FREE) {
    eventsStore.setScrollMode(ScrollMode.AUTO);
  }
  eventsStore.resetUnseenEvents();
};

const handleOnPressMoreEvents = ({
  eventsStore,
  flatList,
}: HandlerProps & { flatList: RefObject<FlatList<EventStore>> }) => {
  eventsStore.setScrollMode(ScrollMode.AUTO);
  flatList.current?.scrollToEnd();
};
