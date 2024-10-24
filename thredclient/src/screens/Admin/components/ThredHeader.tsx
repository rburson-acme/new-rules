import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Menu } from '@/src/components/Menu';
import { RootStore } from '@/src/stores/rootStore';

type ThredHeaderProps = {
  rootStore: RootStore;
};
export const ThredHeader = ({ rootStore }: ThredHeaderProps) => {
  const { thredsStore } = rootStore;

  return (
    <View style={styles.containerStyle}>
      <Text style={styles.textStyle}>Downtime Notification</Text>
      <Menu />
    </View>
  );
};

const styles = StyleSheet.create({
  containerStyle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    height: 50,
    paddingTop: 3,
    paddingRight: 5,
    paddingBottom: 3,
    paddingLeft: 5,
  },
  textStyle: {
    fontSize: 13,
    paddingLeft: 20,
    color: 'black',
  },
});
