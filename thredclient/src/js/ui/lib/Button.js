import React, { Fragment } from 'react';
import { TouchableOpacity, Text, View } from 'react-native';
import PropTypes from 'prop-types';
import { Icon } from '../lib/Icon';

export const Button = ({ content, onPress, buttonStyle, textStyle, iconName, iconStyle, iconRight }) => {
    const contentElem = typeof content === 'string' ? <Text style={{ ...styles.text, ...textStyle }}>{content}</Text> : content;
    const buttonContent = (
        <Fragment>
            { !iconRight && <Icon name={iconName} style={{ ...styles.iconStyle, paddingRight: 3, ...iconStyle }} /> }
            {contentElem}
            { iconRight && <Icon name={iconName} style={{ ...styles.iconStyle, paddingLeft: 3, ...iconStyle }} /> }
        </Fragment>
    );
    return (
        <TouchableOpacity style={{ ...styles.button, ...buttonStyle }} onPress={onPress}>
            {buttonContent}
        </TouchableOpacity>
    );
}

Button.propTypes = {
    content: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
    onPress: PropTypes.func,
    buttonStyle: PropTypes.object, 
    textStyle: PropTypes.object,
    iconStyle: PropTypes.object,
    iconName: PropTypes.string,
    iconRight: PropTypes.bool
}

const styles = {
    button: {
        flexDirection: 'row',
        backgroundColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        paddingTop: 3,
        paddingBottom: 3,
        paddingLeft: 7,
        paddingRight: 7
    },
    text: {
        color: "#777",
        fontSize: 13,
    },
    iconStyle: {
        color: '#fff',
        fontSize: 13,
    }

};