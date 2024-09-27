import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import PropTypes from 'prop-types';

export const Bar = ({ content, style }) => {
    return <View style={ {...styles.container, ...style }}>{ content }</View>
}

Bar.propTypes = {
    content: PropTypes.element,
    style: PropTypes.object
}

const styles = {
    container: {
        flexDirection: 'row',
        backgroundColor: '#4DB9CC',
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 5,
        paddingBottom: 5 ,
        paddingLeft: 7,
        paddingRight: 7,
        borderTopLeftRadius: 5,
        borderTopRightRadius: 5,
        height: 30
    },
};