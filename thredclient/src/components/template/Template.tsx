import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Interaction } from './Interaction';
import { getComponentTypes } from './componentTypes';
import { ThredsStore } from '@/src/stores/ThredsStore';
import { RootStore } from '@/src/stores/rootStore';

type TemplateProps = {
  stores: {
    rootStore: RootStore;
    thredsStore: ThredsStore;
  };
};
export const Template = ({ stores }: TemplateProps) => {
  const { thredsStore } = stores;
  const interactionStores =
    thredsStore.currentThredStore?.eventsStore?.openEventStore?.openTemplateStore?.interactionStores;

  return interactionStores?.map(interactionStore => {
    return (
      <View style={[styles.containerStyle]}>
        <Interaction interactionStore={interactionStore} componentTypes={getComponentTypes()} />
      </View>
    );
  });
};

const styles = StyleSheet.create({
  containerStyle: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
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
    padding: 1,
  },
});
