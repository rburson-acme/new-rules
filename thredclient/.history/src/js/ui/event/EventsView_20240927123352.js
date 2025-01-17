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
            onContentSizeChange={this.handleContentSizeChange}
            onScrollBeginDrag={this.handleScrollBeginDrag}
            onEndReachedThreshold={ .1 }
            onEndReached={this.handleOnEndReached}
            data={ eventStores }
            renderItem={(
              { item, index }) => <EventView eventStore={ item }/>
            }
            keyExtractor={eventStore => eventStore.event.id}
          />
          <MoreEventsIndicator eventsStore={eventsStore} onPress={this.handleOnPressMoreEvents}/>
      </Fragment>
    );
  });

  const handleContentSizeChange = () => {
    const { eventsStore } = this.props;
    const { scrollMode } = eventsStore;
    if(scrollMode === ScrollMode.AUTO) {
      this.flatList.current.scrollToEnd();
    }
  }

  const handleScrollBeginDrag = () => {
    const { eventsStore } = this.props;
    eventsStore.setScrollMode(ScrollMode.FREE);
  }

  const handleOnEndReached = () => {
    const { eventsStore } = this.props;
    const { scrollMode } = eventsStore;
    if(scrollMode === ScrollMode.FREE) {
      eventsStore.setScrollMode(ScrollMode.AUTO);
    }
    eventsStore.resetUnseenEvents();
  }

  const handleOnPressMoreEvents = () => {
    const { eventsStore } = this.props;
    eventsStore.setScrollMode(ScrollMode.AUTO);
    this.flatList.current.scrollToEnd();
  }

EventsView.propTypes = {
  eventStore: PropTypes.object
}
