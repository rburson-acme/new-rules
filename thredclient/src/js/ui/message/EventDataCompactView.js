import React from 'react';
import { View, Text } from 'react-native';
import PropTypes from 'prop-types';
import { EventHeaderView } from './EventHeaderView';
import { Content } from './Content';
import { ChatWait } from '../lib/ChatWait';

export const EventDataCompactView = ({ onPress, eventStore }) => {
    const { source, data, type, time } = eventStore.event;
    return (
        <View style={containerStyle} onPress={onPress}>
            <Text style={ textTimeStyle }>{ (new Date(time)).toLocaleTimeString() }</Text>
            <EventHeaderView data={data} source={source} type={type}/>
            <Content eventStore={eventStore} />
            <ChatWait isVisible={ () => eventStore.isPublishing } containerStyle={chatWaitContainerStyle}/>
        </View>
    )
}
 EventDataCompactView.propTypes = { source: PropTypes.object,
    onPress: PropTypes.func,
    eventStore: PropTypes.object
} 

const containerStyle = {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'stretch',
    flexShrink: 1,
    flexGrow: 1,
    backgroundColor: "white"
}

const textTimeStyle = {
    fontSize: 10,
    padding: 5,
    flexShrink: 0,
    color: '#99999f',
    alignSelf: 'center'
}

const chatWaitContainerStyle = {
    alignSelf: 'flex-start'
}
