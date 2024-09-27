import React from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react-lite';
import { EventsView } from './EventsView';
import { OpenEventView } from './OpenEventView';
import { EventsStore } from '../../../ts/store/EventsStore';

export const EventsLayout = observer(({ rootStore }) => {
    const { thredsStore } = rootStore;
    const { currentThredStore } = thredsStore;
    const eventsStore = currentThredStore ? currentThredStore.eventsStore : new EventsStore(rootStore);
    const openEvent = eventsStore.openEventStore?.event;
    if(openEvent) {
        // @TODO change this to use a the eventStore instead of the event
        return <OpenEventView rootStore={rootStore} event={openEvent}/>;
    }
    // if there are no threds, create an empty event store
    return <EventsView eventsStore={ eventsStore }/>;
});

EventsLayout.propTypes = {
    rootStore: PropTypes.object
}