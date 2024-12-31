import React from 'react';
import { View, StyleSheet, Image as RNImage } from 'react-native';

type ImageProps = {
  uri: string;
  height: number;
  width: number;
};
export const Image = ({ uri, height, width }: ImageProps) => {
  return (
    <View style={styles.containerStyle}>
      <RNImage source={{ uri }} resizeMode="contain" resizeMethod="auto" style={{ height, width }} />
    </View>
  );
};

const styles = StyleSheet.create({
  containerStyle: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
