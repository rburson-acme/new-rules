import React, { Fragment } from 'react';
import { View } from 'react-native';
import PropTypes from 'prop-types';
import { EventSourceView } from './EventSourceView';
import { EventDataCompactView } from './EventDataCompactView';
import { ChatWait } from '../lib/ChatWait';

export const EventView = ({ eventStore }) => {
    const { source, data, type, time } = eventStore.event;
    return (
        <Fragment>
            <View style={containerStyle}>
                <EventSourceView source={source} display={data?.display} eventType={type} />
                <EventDataCompactView eventStore = { eventStore }/>
            </View>
        </Fragment>
    )
}


EventView.propTypes = {
    eventStore: PropTypes.object
}

const containerStyle = {
    flexDirection: 'row',
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    backgroundColor: 'white',
    paddingTop: 15,
    paddingRight: 10,
    paddingBottom: 20,
    paddingLeft: 5
}