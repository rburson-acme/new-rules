import React, { Component, Fragment } from 'react';
import { observer } from 'mobx-react-lite';
import { FlatList, Text, View } from 'react-native';
import PropTypes from 'prop-types';
import { ScrollMode } from '../../../ts/store/EventsStore';
import { EventView  } from './EventView';
import { MoreEventsIndicator } from './MoreEventsIndicator';

export const EventsView = observer(class EventsView extends Component {

  render() {
    const { eventsStore } = this.props;
    const eventStores = eventsStore.eventStores.slice();
    return (
      <Fragment>
          <FlatList
            ref={ (ref) => { this.flatList = ref } }
            onContentSizeChange={this.handleContentSizeChange}
            onScrollBeginDrag={this.handleScrollBeginDrag}
            onEndReachedThreshold={ .1 }
            onEndReached={this.handleOnEndReached}
            data={ eventStores }
            renderItem={(
              { item, index }) => <EventView eventStore={ item }/>
            }
            keyExtractor={eventStore => eventStore.event.id}
            ListEmptyComponent={ this.emptyList() }
          />
          <MoreEventsIndicator eventsStore={eventsStore} onPress={this.handleOnPressMoreEvents}/>
      </Fragment>
    );
  }

  emptyList = () => (<View style={{ padding: 50, flexGrow: 1, justifyContent: 'center', alignItems: 'center'}}>
    <Text style={{ fontSize: 20 }}>No Messages Yet</Text>
 </View>);

  handleContentSizeChange = () => {
    const { eventsStore } = this.props;
    const { scrollMode } = eventsStore;
    if(scrollMode === ScrollMode.AUTO) {
      this.flatList.scrollToEnd();
    }
  }

  handleScrollBeginDrag = () => {
    const { eventsStore } = this.props;
    eventsStore.setScrollMode(ScrollMode.FREE);
  }

  handleOnEndReached = () => {
    const { eventsStore } = this.props;
    const { scrollMode } = eventsStore;
    if(scrollMode === ScrollMode.FREE) {
      eventsStore.setScrollMode(ScrollMode.AUTO);
    }
    eventsStore.resetUnseenEvents();
  }

  handleOnPressMoreEvents = () => {
    const { eventsStore } = this.props;
    eventsStore.setScrollMode(ScrollMode.AUTO);
    this.flatList.scrollToEnd();
  }

});;

EventsView.propTypes = {
  eventsStore: PropTypes.object
}
