import React from 'react';
import PropTypes from 'prop-types';
import { TextBubble } from '../../lib/TextBubble';

export const Input = ({ name, type, display, style }) => {
    return typeof (display) === 'string' ?
        <TextBubble text={display} bubbleStyle={bubbleStyle}/> :
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

const bubbleStyle = {
    marginTop: 10,
    marginBottom: 10,
    alignSelf: 'flex-end'
}