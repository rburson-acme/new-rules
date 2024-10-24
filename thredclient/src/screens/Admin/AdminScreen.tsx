import React from 'react';
import { StyleSheet, View } from 'react-native';
import { EventsLayout } from './components/EventsLayout';
import { ThredHeader } from '@/src/screens/Admin/components/ThredHeader';
import { RootStore } from '@/src/stores/rootStore';

type AdminScreenProps = {
  rootStore: RootStore;
};
export const AdminScreen = ({ rootStore }: AdminScreenProps) => {
  return (
    <View style={styles.container}>
      <ThredHeader rootStore={rootStore} />
      <EventsLayout rootStore={rootStore} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    flexGrow: 1,
    backgroundColor: '#ffffff',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
});
