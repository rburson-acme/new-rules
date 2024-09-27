import React from 'react';
import { View, Text } from 'react-native';
import PropTypes from 'prop-types';

export const Image = () => {
    return (
        <View style={{...styles.containerStyle }}>
        </View>
    )
}
Image.propTypes = {
} 

const styles = {
    containerStyle: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'stretch',
    }
}
