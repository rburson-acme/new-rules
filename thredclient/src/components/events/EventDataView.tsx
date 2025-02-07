import React from 'react';
import { View, Text, StyleProp, ViewStyle, StyleSheet, ScrollView } from 'react-native';
import { EventData } from 'thredlib';
import { EventStore } from '@/src/stores/EventStore';
import { Interaction } from '../template/Interaction';
import { getComponentTypes } from '../template/componentTypes';

type EventDataViewProps = {
  data?: EventData;
  containerStyle?: StyleProp<ViewStyle>;
  eventStore: EventStore;
};
export const EventDataView = ({ data, containerStyle, eventStore }: EventDataViewProps) => {
  if (!data) {
    return null;
  }

  const templateStore = eventStore.openTemplateStore;

  return (
    <View style={[styles.containerStyle, containerStyle]}>
      {templateStore?.completedInteractionStores.map((interactionStore, index) => {
        return <Interaction key={index} interactionStore={interactionStore} componentTypes={getComponentTypes()} />;
      })}
      {templateStore?.currentInteractionStore && (
        <Interaction componentTypes={getComponentTypes()} interactionStore={templateStore.currentInteractionStore} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  containerStyle: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'stretch',
    flex: 1,
  },
  textDescriptionStyle: {
    padding: 5,
    fontSize: 12,
    fontWeight: 'bold',
  },
});
