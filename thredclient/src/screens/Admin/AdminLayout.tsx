import React from 'react';
import { StyleSheet, View } from 'react-native';
import { EventsLayout } from './components/EventsLayout';
import { ThredHeader } from '@/src/screens/Admin/components/ThredHeader';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { AdminDrawerParamList } from '@/src/core/Navigation';

type AdminLayoutProps = DrawerScreenProps<AdminDrawerParamList, 'Home'>;
export const AdminLayout = ({ route, navigation }: AdminLayoutProps) => {
  const rootStore = route.params.rootStore;
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
