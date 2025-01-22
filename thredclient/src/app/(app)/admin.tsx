import React from 'react';
import { StyleSheet, View } from 'react-native';
import { RootStore } from '@/src/stores/rootStore';
import { ThredHeader } from '@/src/components/threds/ThredHeader';
import { EventsLayout } from '@/src/components/threds/EventsLayout';

export default function Admin() {
  const rootStore = RootStore.get();

  return (
    <View style={styles.container}>
      <ThredHeader rootStore={rootStore} />
      <EventsLayout rootStore={rootStore} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    flexGrow: 1,
    backgroundColor: '#ffffff',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
});
