import React, { Component, Fragment, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { FlatList, Text, View } from 'react-native';
import PropTypes from 'prop-types';
import { ScrollMode } from '../../../ts/store/EventsStore';
import { EventView } from './EventView';
import { MoreEventsIndicator } from './MoreEventsIndicator';

export const EventsView = observer(({ eventsStore }) => {
  const eventStores = eventsStore.eventStores.slice();
  const flatList = useRef(null);
  return (
    <Fragment>
      <FlatList
        ref={flatList}
        onContentSizeChange={() => handleContentSizeChange({ eventsStore, flatList })}
        onScrollBeginDrag={() => handleScrollBeginDrag({ eventsStore })}
        onEndReachedThreshold={.1}
        onEndReached={() => handleOnEndReached({ eventsStore })}
        data={eventStores}
        renderItem={(
          { item, index }) => <EventView eventStore={item} />
        }
        keyExtractor={eventStore => eventStore.event.id}
        ListEmptyComponent={emptyList()}
      />
      <MoreEventsIndicator eventsStore={eventsStore} onPress={() => handleOnPressMoreEvents({ eventsStore, flatList })} />
    </Fragment>
  );
});

const emptyList = () => (<View style={{ padding: 50, flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
  <Text style={{ fontSize: 20 }}>No Messages Yet</Text>
</View>);

const handleContentSizeChange = ({ eventsStore, flatList }) => {
  const { scrollMode } = eventsStore;
  if (scrollMode === ScrollMode.AUTO) {
    flatList.current.scrollToEnd();
  }
}

const handleScrollBeginDrag = ({ eventsStore }) => {
  eventsStore.setScrollMode(ScrollMode.FREE);
}

const handleOnEndReached = ({ eventsStore }) => {
  const { scrollMode } = eventsStore;
  if (scrollMode === ScrollMode.FREE) {
    eventsStore.setScrollMode(ScrollMode.AUTO);
  }
  eventsStore.resetUnseenEvents();
}

const handleOnPressMoreEvents = ({ eventsStore, flatList }) => {
  eventsStore.setScrollMode(ScrollMode.AUTO);
  flatList.current.scrollToEnd();
}

EventsView.propTypes = {
  eventsStore: PropTypes.object
}
