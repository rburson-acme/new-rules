import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import PropTypes from 'prop-types';

export const EventDataCompactView = ({ data, time, onPress }) => {
    const { title, description } = data;
    return (
        <TouchableOpacity style={containerStyle} onPress={onPress}>
            <View style={titleContainerStyle}>
                <Text style={ textTitleStyle } numberOfLines={1}>{  title }</Text>
                <Text style={ textTimeStyle }>{ (new Date(time)).toLocaleTimeString() }</Text>
            </View>
            <Text style={ textDescriptionStyle}>{ description }</Text>
        </TouchableOpacity>
    )
}
 EventDataCompactView.propTypes = { source: PropTypes.object,
    data: PropTypes.object,
    time: PropTypes.number,
    onPress: PropTypes.func
} 

const containerStyle = {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'stretch',
    flexShrink: 1,
    flexGrow: 1,
}

const titleContainerStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
}

const textTitleStyle = {
    fontSize: 14,
    padding: 1,
    fontWeight: 'bold',
    flexShrink: 1,
}

const textDescriptionStyle = {
    fontSize: 12,
    padding: 1
}
const textTimeStyle = {
    fontSize: 9,
    padding: 1,
    flexShrink: 0,
    color: '#aaaaaf'
}
