import React, { Component, Fragment, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { FlatList } from 'react-native';
import PropTypes from 'prop-types';
import { ScrollMode } from '../../../ts/store/EventsStore';
import { EventView  } from './EventView';
import { MoreEventsIndicator } from './MoreEventsIndicator';

export const EventsView = observer(({ eventsStore}) => {
    const eventStores = eventsStore.eventStores.slice();
    const flatList = useRef(null);
    return (
      <Fragment>
          <FlatList
            ref={flatList}
            onContentSizeChange={handleContentSizeChange}
            onScrollBeginDrag={handleScrollBeginDrag}
            onEndReachedThreshold={ .1 }
            onEndReached={handleOnEndReached}
            data={ eventStores }
            renderItem={(
              { item, index }) => <EventView eventStore={ item }/>
            }
            keyExtractor={eventStore => eventStore.event.id}
          />
          <MoreEventsIndicator eventsStore={eventsStore} onPress={handleOnPressMoreEvents}/>
      </Fragment>
    );
  });

  const handleContentSizeChange = ({eventsStore, flatList}) => {
    const { scrollMode } = eventsStore;
    if(scrollMode === ScrollMode.AUTO) {
      flatList.current.scrollToEnd();
    }
  }

  const handleScrollBeginDrag = ({eventsStore}) => {
    eventsStore.setScrollMode(ScrollMode.FREE);
  }

  const handleOnEndReached = ({eventsStore}) => {
    const { scrollMode } = eventsStore;
    if(scrollMode === ScrollMode.FREE) {
      eventsStore.setScrollMode(ScrollMode.AUTO);
    }
    eventsStore.resetUnseenEvents();
  }

  const handleOnPressMoreEvents = ({eventsStore, flatList}) => {
    eventsStore.setScrollMode(ScrollMode.AUTO);
    flatList.current.scrollToEnd();
  }

EventsView.propTypes = {
  eventStore: PropTypes.object
}
