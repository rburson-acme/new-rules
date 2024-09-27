import React from 'react';
import { View, Text } from 'react-native';
import PropTypes from 'prop-types';
import { EventSourceView } from './EventSourceView';
import { EventDataCompactView } from './EventDataCompactView';

export const OpenEventHeader = ({ event }) => {
    const { source, data, type, time } = event;
    const { title } = data;
    return (
            <View style={containerStyle}>
                <EventSourceView source={source} display={event?.data?.display} eventType={type}/>
                <View style={titleContainerStyle}>
                    <View style={ textContainerStyle }><Text style={ textTitleStyle } numberOfLines={1}>{  title }</Text></View>
                    <Text style={ textTimeStyle }>{ (new Date(time)).toLocaleTimeString() }</Text>
                </View>
            </View>
    )
}

OpenEventHeader.propTypes = {
    event: PropTypes.object
}

const containerStyle = {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
}

const titleContainerStyle = {
    flexDirection: 'row',
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
}

const textContainerStyle = {
    flexDirection: 'row',
    flexGrow: 1,
    paddingLeft: 20,
    justifyContent: 'flex-start'
}

const textTitleStyle = {
    fontSize: 15,
    padding: 1,
    fontWeight: 'bold',
}
const textTimeStyle = {
    fontSize: 9,
    padding: 1,
    color: '#aaaaaf'
}
