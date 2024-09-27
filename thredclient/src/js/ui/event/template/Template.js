import React from 'react';
import { View, Text } from 'react-native';
import PropTypes from 'prop-types';
import { Interaction } from './Interaction';
import { getComponentTypes } from './componentTypes';

export const Template = ({ stores }) => {
    const { thredsStore, rootStore } = stores;
    const { openTemplateStore: templateStore } = thredsStore?.openEventStore;
    if(templateStore) {
        const { name, style } = templateStore.template;
        return (
            <View style={{...styles.containerStyle, ...style }}>
                <Interaction stores={{ ...stores, templateStore }} componentTypes={getComponentTypes()}/>
            </View>
        )
    }
    return null;
}

 Template.propTypes = { source: PropTypes.object,
    stores: PropTypes.object,
} 

const styles = {
    containerStyle: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        borderWeight: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        backgroundColor: '#ddd',
        marginTop: 8,
        paddingTop: 5,
        paddingBottom: 5,
        paddingLeft: 5,
    },
    textDescriptionStyle: {
        fontSize: 12,
        padding: 1
    }
}
