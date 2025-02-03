import React from 'react';
import { StyleSheet, View } from 'react-native';
import { RootStore } from '@/src/stores/rootStore';
import { ThredsLayout } from '@/src/components/threds/ThredsLayout';

export default function Messenger() {
  const rootStore = RootStore.get();
  return (
    <View style={styles.container}>
      <ThredsLayout rootStore={rootStore} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
});
