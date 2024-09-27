import React from 'react';
import PropTypes from 'prop-types';
import { Template } from './template/Template'
import { View } from 'react-native';

export const Content = ({ eventStore, containerStyle }) => {
   return (
        <View style={{ ...defaultContainerStyle, ...containerStyle}}>
            <Template eventStore={eventStore} />
        </View>
        );
}

Content.propTypes = {
    eventStore: PropTypes.object,
    containerStyle: PropTypes.object,
}

const defaultContainerStyle = {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'stretch',
    flexShrink: 1,
    flexGrow: 1,
    paddingTop: 10,
    paddingBottom: 10
};
