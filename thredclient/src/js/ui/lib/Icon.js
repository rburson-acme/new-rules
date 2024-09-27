import React from 'react';
import PropTypes from 'prop-types';
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { View } from 'react-native';

export const Icon = ({ name, style }) => {
    //return <MaterialCommunityIcons name={name} style={style} />;
    return <View></View>
}

Icon.propTypes = {
    name: PropTypes.string,
    style: PropTypes.object
}