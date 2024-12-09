import { Button } from '@/src/components/Button';
import { InteractionStore } from '@/src/stores/InteractionStore';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { StyleSheet } from 'react-native';

type ValueProps = {
  forInput: string;
  display: string;
  icon: string;
  set: string[];
  interactionStore: InteractionStore;
};
export const Value = observer(({ forInput, display, set, icon, interactionStore }: ValueProps) => {
  const value = interactionStore.getValue(forInput);
  const hasBeenClicked = set.includes(value);

  if (set.length === 1) {
    return (
      <Button
        content={display}
        buttonStyle={[styles.buttonStyle, hasBeenClicked ? styles.buttonClicked : styles.buttonNotClicked]}
        textStyle={styles.textStyle}
        iconStyle={styles.iconStyle}
        onPress={() => {
          interactionStore.setValue(forInput, set[0]);
        }}
      />
    );
  }

  return null;
});

const styles = StyleSheet.create({
  buttonStyle: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    alignSelf: 'flex-end',
  },
  buttonNotClicked: {
    backgroundColor: '#4DB9CC',
  },
  buttonClicked: {
    backgroundColor: '#79CC4D',
    borderBottomRightRadius: 0,
  },
  textStyle: {
    color: '#fff',
  },
  iconStyle: {
    color: '#fff',
    paddingLeft: 5,
  },
});
