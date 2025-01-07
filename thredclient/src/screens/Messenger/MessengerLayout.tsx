import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ThredHeader } from '@/src/screens/Admin/components/ThredHeader';
import { EventsLayout } from './components/EventsLayout';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { MessengerDrawerParamList } from '@/src/core/Navigation';
import { RootStore } from '@/src/stores/rootStore';

type AdminLayoutProps = DrawerScreenProps<MessengerDrawerParamList, 'Home'>;
export const MessengerLayout = ({ navigation, route }: AdminLayoutProps) => {
  // @TODO - add 'ThredPanel' and determine selected thred here
  // For now use the first ThredStore
  const rootStore = RootStore.get();
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
