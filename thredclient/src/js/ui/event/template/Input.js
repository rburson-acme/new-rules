import React from 'react';
import PropTypes from 'prop-types';
import { Text } from './Text';

export const Input = ({ name, type, display, style }) => {
    return typeof (display) === 'string' ?
        <Text value={display} style={{...styles.style, ...style}} /> :
        display;

}
Input.propTypes = {
    name: PropTypes.string,
    type: PropTypes.oneOf(['constant', 'nominal', 'ordinal', 'boolean']),
    display: PropTypes.oneOfType([
        PropTypes.string, PropTypes.element
    ]),
    style: PropTypes.object
}

const styles = {
    style: {
        padding: 5,
    }
}