import React from 'react';
import { View, Text } from 'react-native';
import PropTypes from 'prop-types';
import { TextBubble } from '../lib/TextBubble';
import { EventSourceView } from './EventSourceView';

export const EventHeaderView = ({ data, source, type }) => {
    const { title, description } = data;
    return (
        <View style={containerStyle}>
            <TextBubble titleText={title} text={description} />
        </View>
    )
}

EventHeaderView.propTypes = {
    data: PropTypes.object,
    source: PropTypes.object,
    type: PropTypes.string,
}

const containerStyle = {
    flexDirection: 'row',
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 10
}