import React from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react-lite';
import * as Animatable from 'react-native-animatable';
import { Text } from 'react-native';

export const ChatWait = observer(({ containerStyle, textStyle, isVisible }) => {

    const props = { style: { ...styles.containerStyle, ...containerStyle },
        animation:'rubberBand', duration: 1000, easing: 'ease-in',
        iterationCount: 'infinite', useNativeDriver: true };

    return isVisible && isVisible() ? (
        <Animatable.View {...props}>
            <Text style={{ ...styles.textStyle, ...textStyle }}>...</Text>
        </Animatable.View>
    ) : null;
});

ChatWait.propTypes = {
    containerStyle: PropTypes.object,
    textStyle: PropTypes.object,
    isVisible: PropTypes.func
}

const styles = {
    containerStyle: {
        marginTop: 15,
        paddingBottom: 5,
        paddingLeft: 12,
        paddingRight: 12,
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
        backgroundColor: '#f3f3f3',
    },
    textStyle: {
        fontSize: 30,
    }
}