import { observer } from 'mobx-react-lite';
import PropTypes from 'prop-types';
import React, { Fragment } from 'react';
import { Interaction } from './Interaction';
import { getComponentTypes } from './componentTypes';

export const Template = observer(({ eventStore }) => {
    const { openTemplateStore: templateStore } =  eventStore;

    if(!templateStore) return null;
    const { name, style } = templateStore.template;
    const { completedInteractionStores } = templateStore;
    const completedInteractions = completedInteractionStores.map((interactionStore, index) => {
        return  <Interaction key={index} interactionStore={ interactionStore } componentTypes={ getComponentTypes() }/>
    });
    const interactionStore = templateStore.nextInteractionStore;
   return ( 
        <Fragment>
            {completedInteractions}
            { interactionStore && <Interaction key={completedInteractions.length} interactionStore= { interactionStore }
                componentTypes={getComponentTypes()}/> }
        </Fragment>
   )
});

 Template.propTypes = { source: PropTypes.object,
    eventStore: PropTypes.object,
} 