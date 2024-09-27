import React from 'react';
import { View, Text, Image } from 'react-native';
import PropTypes from 'prop-types';
import { Menu } from '../lib/Menu';

const logo = require('../../../../assets/workthreds_logo.png');

export const ThredHeader = ({ rootStore }) => {
    const { authStore } = rootStore;
    return (
        <View style={containerStyle}>
            <Image source={logo} style={logoStyle} />
           {
            // Need to align this correctly
            // <Text style={ { ...textStyle }  }>{`${authStore.name}`}</Text>
           }
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
    paddingLeft: 10
}

const textStyle = {
    fontSize: 13,
    paddingLeft: 20,
    color: "black"
}

const logoStyle = {
    width: 200,
    resizeMode: 'contain',
    margin: 0,
    padding: 0 
}