import React from 'react';
import PropTypes from 'prop-types';
import { ComponentTree } from '../../../tranformer/ComponentTree';
import { typeConfig } from './typeConfig';

export const Interaction = ({ interactionStore, componentTypes }) => {
 
    if(!interactionStore) {
        return null;
    }
    const { name, style, content } = interactionStore.interaction;

    return <ComponentTree root={content} typeConfig={typeConfig} componentTypes={ componentTypes } props={{ interactionStore }}/>;
};
Interaction.propTypes = { source: PropTypes.object,
    interactionStore: PropTypes.object,
} 