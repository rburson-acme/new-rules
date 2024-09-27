import React from 'react';
import { View } from 'react-native';
import PropTypes from 'prop-types';
import { EventSourceView } from './EventSourceView';
import { EventDataCompactView } from './EventDataCompactView';
import { EventAttachmentView } from './EventAttachment';

export const EventView = ({ eventStore }) => {
    const { source, data, type, time } = eventStore.event;
    return (
        <View style={containerStyle}>
            <EventSourceView source={source} display={data?.display} eventType={type} />
            <EventDataCompactView data={data} time={time} onPress={() => {
                eventStore.setOpenEventStore(eventStore);
            }} />
            <EventAttachmentView />
        </View>
    )
}


EventView.propTypes = {
    eventStore: PropTypes.object,
}

const containerStyle = {
    flexDirection: 'row',
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingTop: 15,
    paddingRight: 5,
    paddingBottom: 20,
    paddingLeft: 5
}