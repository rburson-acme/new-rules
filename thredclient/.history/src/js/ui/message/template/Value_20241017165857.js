import React from 'react';
import { View, Text } from 'react-native';
import PropTypes from 'prop-types';
import { Button } from '../../lib/Button';

// @TODO
// This will need to be a factory for different value types
export const Value = ({forInput, display, icon, set, interactionStore}) => {

    const { isComplete } = interactionStore;

    if(!isComplete) {
        if(set.length === 1) {
            return <Button content={display} iconName={icon} iconRight
                buttonStyle={{...styles.buttonStyle, ...styles.buttonNotClicked}}
                textStyle={styles.textStyle} iconStyle={styles.iconStyle} onPress={()=>{
                    interactionStore.setValue(forInput, set[0]);
            }}/>
        }
        return null;
    }

    // if this value was choosen, show the button as clicked
    const value = interactionStore.getValue(forInput);
    if(set.includes(value)) {
        return <Button content={display} iconName={icon} iconRight
            buttonStyle={{...styles.buttonStyle, ...styles.buttonClicked}}
            textStyle={styles.textStyle} iconStyle={styles.iconStyle} />
    }
    return null;
}
Value.propTypes = {
    forInput: PropTypes.string,
    display: PropTypes.string,
    icon: PropTypes.string,
    set: PropTypes.array,
    interactinStore: PropTypes.object,
} 

const styles = {
    buttonStyle: {
        marginTop: 15,
        paddingTop: 5,
        paddingBottom: 5,
        paddingLeft: 12,
        paddingRight: 12,
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
        alignSelf: "flex-end"
    },
    buttonNotClicked: {
        backgroundColor: '#4DB9CC',
    },
    buttonClicked: {
        backgroundColor: '#79CC4D',
        borderBottomRightRadius: 0,
    },
    textStyle: {
        color: '#fff'
    },
    iconStyle: {
        color: "#fff",
        paddingLeft: 5
    }
}