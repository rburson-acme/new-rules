import React from 'react';
import { View, Text } from 'react-native';
import PropTypes from 'prop-types';
import { EventSourceAvatar } from './EventSourceAvatar';

export const EventSourceView = ({ source, display, eventType }) => {
    return (
        <View style={containerStyle}>
            <EventSourceAvatar uri={display?.uri || source?.uri} eventType={eventType}/>
        </View>
    )
}
            // <Text style={ textStyle } numberOfLines={1}>{ source.name }</Text>
 EventSourceView.propTypes = { source: PropTypes.object,
    eventType: PropTypes.string,
    display: PropTypes.object
} 
 
const containerStyle = {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    flexGrow:0,
    flexShrink: 0,
    flexBasis: 50,
    paddingTop: 40
}

const textStyle = {
    fontSize: 9,
}
