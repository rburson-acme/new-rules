import React from 'react';
import { View, Text as RNText } from 'react-native';
import PropTypes from 'prop-types';

export const Text = ({value, style}) => {
    return <RNText style={style}>{value}</RNText>
}
Text.propTypes = {
    value: PropTypes.string,
    style: PropTypes.object
} 

const styles = {
    containerStyle: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'stretch',
    }
}