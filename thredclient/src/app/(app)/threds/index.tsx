import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { RootStore } from '@/src/stores/RootStore';
import { ThredsLayout } from '@/src/components/threds/ThredsLayout';
import { useNavigation } from 'expo-router';

export default function Messenger() {
  const rootStore = RootStore.get();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

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
