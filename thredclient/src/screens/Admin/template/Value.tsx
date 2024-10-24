import { Button } from '@/src/components/Button';
import React from 'react';
import { StyleSheet } from 'react-native';

type ValueProps = {
  forInput: string;
  display: string;
  set: string[];
  stores: any;
};
export const Value = ({ forInput, display, set, stores }: ValueProps) => {
  const { templateStore } = stores;

  if (set.length === 1) {
    return (
      <Button
        content={display}
        buttonStyle={styles.buttonStyle}
        textStyle={styles.textStyle}
        onPress={() => {
          templateStore.setValueForInteraction(forInput, set[0]);
        }}
      />
    );
  }
};

const styles = StyleSheet.create({
  buttonStyle: {
    margin: 10,
    padding: 5,
    width: 100,
    backgroundColor: '#4DB9CC',
  },
  textStyle: {
    color: '#fff',
  },
});
