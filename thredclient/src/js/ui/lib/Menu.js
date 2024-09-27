import React from 'react';
import { View } from 'react-native';
import PropTypes from 'prop-types';
import { Icon } from './Icon';

export const Menu = ({ stores, containerStyle, iconStyle }) => {
    return (
        <View style={{ ...styles.containerStyle, ...containerStyle }}>
             <Icon name={'menu'} style={{ ...styles.iconStyle, ...iconStyle }} />
        </View>
    )
}

Menu.propTypes = {
    stores: PropTypes.object,
    containerStyle: PropTypes.object,
    iconStyle: PropTypes.object
}

const styles = {
    containerStyle: {
    },
    iconStyle: {
        fontSize: 25
    }
}
