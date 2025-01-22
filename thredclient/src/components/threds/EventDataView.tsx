import React from 'react';
import { View, Text, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import { EventData } from 'thredlib';
import { Content } from './Content';
import { RootStore } from '@/src/stores/rootStore';
import { ThredsStore } from '@/src/stores/ThredsStore';

type EventDataViewProps = {
  data?: EventData;
  containerStyle: StyleProp<ViewStyle>;
  stores: {
    rootStore: RootStore;
    thredsStore: ThredsStore;
  };
};
export const EventDataView = ({ data, containerStyle, stores }: EventDataViewProps) => {
  if (!data) {
    return null;
  }
  const { title, description } = data;
  return (
    <View style={[styles.containerStyle, containerStyle]}>
      <Text style={styles.textDescriptionStyle}>{description}</Text>
      <Content stores={stores} />
    </View>
  );
};

const styles = StyleSheet.create({
  containerStyle: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'stretch',
    padding: 5,
  },
  textDescriptionStyle: {
    padding: 5,
    fontSize: 12,
    fontWeight: 'bold',
  },
});
