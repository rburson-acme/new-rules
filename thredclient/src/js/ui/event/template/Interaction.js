import React from 'react';
import { View, Text } from 'react-native';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react-lite';
import { ComponentTree } from '../../../tranformer/ComponentTree';
import { typeConfig } from './typeConfig';

export const Interaction = observer(({ stores, componentTypes }) => {
 
    const { templateStore } = stores;
    const interactionStore = templateStore.currentInteractionStore;
    if(!interactionStore) {
        return null;
    }
    const { name, style, content } = interactionStore.interaction;

    return (
        <View style={{...styles.containerStyle, ...style }}>
            <ComponentTree root={content} typeConfig={typeConfig} componentTypes={componentTypes} props={{ stores }}/>
        </View>
    )
});
Interaction.propTypes = { source: PropTypes.object,
    stores: PropTypes.object,
} 

const styles = {
    containerStyle: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'stretch',
    },
    textDescriptionStyle: {
        fontSize: 12,
        padding: 1
    }
}