import React from 'react';
import { View, Text } from 'react-native';
import PropTypes from 'prop-types';

export const Group = ({ style, children }) => {
    return (
        <View style={{...styles.containerStyle, ...style }}>
            { children }
        </View>
    )
}
Group.propTypes = { source: PropTypes.object,
    children: PropTypes.node,
    style: PropTypes.object,
} 

const styles = {
    containerStyle: {
        flexDirection: 'column',
        alignItems: 'flex-end',
    }
}