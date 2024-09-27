import React from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react-lite';
import { EventsView } from './EventsView';
import { EventsStore } from '../../../ts/store/EventsStore';

export const EventsLayout = observer(({ rootStore }) => {
    const { thredsStore } = rootStore;
    const { currentThredStore } = thredsStore;
    // if there are no threds, create an empty event store
    const eventsStore = currentThredStore ? currentThredStore.eventsStore : new EventsStore(rootStore);
    return <EventsView eventsStore={ eventsStore } />;
});

EventsLayout.propTypes = {
    rootStore: PropTypes.object
}