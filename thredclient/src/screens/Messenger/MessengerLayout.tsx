import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThredHeader } from '@/src/screens/Admin/components/ThredHeader';
import { EventsLayout } from './components/EventsLayout';
import { RootStore } from '@/src/stores/rootStore';

type MessageLayoutProps = {
  rootStore: RootStore;
};
export const MessengerLayout = ({ rootStore }: MessageLayoutProps) => {
  // @TODO - add 'ThredPanel' and determine selected thred here
  // For now use the first ThredStore

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
