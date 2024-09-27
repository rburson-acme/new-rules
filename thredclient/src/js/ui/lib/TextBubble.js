import React from 'react';
import { View, Text } from 'react-native';
import PropTypes from 'prop-types';

export const TextBubble = ({ titleText, text, bubbleStyle, titleTextStyle, textStyle}) => {
    return (
        <View style={{...defaultBubbleStyle, ...bubbleStyle}}>
            { titleText && <Text style={{ ...defaultTitleTextStyle, ...titleTextStyle }} numberOfLines={1}>{ titleText }</Text> }
            { text && <Text style={{...defaultTextStyle, ...textStyle}}>{text}</Text> }
        </View>
    )
}

TextBubble.propTypes = {
    text: PropTypes.string,
    titleText: PropTypes.string,
    bubbleStyle: PropTypes.object,
    textStyle: PropTypes.object,
    titleTextStyle: PropTypes.object
}

const defaultBubbleStyle = {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'stretch',
    flexShrink: 1,
    flexGrow: 1,
    marginRight: '30%',
    backgroundColor: '#f3f3f3',
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 8,
    paddingRight: 8,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius:10 

}

const defaultTitleTextStyle = {
    fontSize: 13,
    flexShrink: 1,
    color: 'black'
}

const defaultTextStyle = {
    fontSize: 13,
    flexShrink: 1,
    color: 'black'
}