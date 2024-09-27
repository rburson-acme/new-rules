import React from 'react';
import PropTypes from 'prop-types';
import { TextBubble } from '../../lib/TextBubble';

export const Text = ({value, style}) => {
    return <TextBubble text={value} bubbleStyle={ bubbleStyle }/>
}
Text.propTypes = {
    value: PropTypes.string,
    style: PropTypes.object
} 

const styles = {
    containerStyle: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'stretch',
        paddingTop: 10,
        paddingBottom: 10
    }
}

const bubbleStyle = {
    marginTop: 10,
    marginBottom: 10 
}