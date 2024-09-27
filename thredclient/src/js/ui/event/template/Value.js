import React from 'react';
import { View, Text } from 'react-native';
import PropTypes from 'prop-types';
import { Button } from '../../lib/Button';

export const Value = ({forInput, display, set, stores}) => {

    const { templateStore } = stores;

    if(set.length === 1) {
        return <Button content={display} buttonStyle={styles.buttonStyle} textStyle={styles.textStyle} onPress={()=>{
            templateStore.setValueForInteraction(forInput, set[0]);
        }}/>
    }
}
Value.propTypes = {
    forInput: PropTypes.string,
    display: PropTypes.string,
    set: PropTypes.array,
    interactionStore: PropTypes.array,
} 

const styles = {
    buttonStyle: {
        margin: 10,
        padding: 5,
        width: 100,
        backgroundColor: '#4DB9CC',
    },
    textStyle: {
        color: '#fff'
    }
}