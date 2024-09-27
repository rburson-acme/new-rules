import React from 'react';
import { View, Text } from 'react-native';
import PropTypes from 'prop-types';
import { Menu } from '../lib/Menu';

export const ThredHeader = ({ rootStore }) => {
    const { thredsStore } = rootStore;
    return (
        <View style={containerStyle}>
            <Text style={ { ...textStyle }  }>Downtime Notification</Text>
            <Menu />
        </View>
    )
}


ThredHeader.propTypes = {
    rootStore: PropTypes.object,
}

const containerStyle = {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    height: 50,
    paddingTop: 3,
    paddingRight: 5,
    paddingBottom: 3,
    paddingLeft: 5
}

const textStyle = {
    fontSize: 13,
    paddingLeft: 20,
    color: "black"
}