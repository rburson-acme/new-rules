import React from 'react';
import { View } from 'react-native';
import PropTypes from 'prop-types';

export const EventAttachmentView = ({ attachment }) => {
    return (
        <View style={containerStyle}>
        </View>
    )
}
 EventAttachmentView.propTypes = {
    attachment: PropTypes.object,
} 
 
const containerStyle = {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: 20
}