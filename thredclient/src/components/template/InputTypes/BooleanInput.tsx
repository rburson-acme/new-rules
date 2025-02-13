import { InteractionStore } from '@/src/stores/InteractionStore';
import { StyleSheet, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { BooleanInputSetItem } from './InputType';
import { Button } from '../../common/Button';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useState } from 'react';

type BooleanInputProps = {
  name: string;
  set: BooleanInputSetItem[];
  interactionStore: InteractionStore;
};

export const BooleanInput = observer(({ interactionStore, name, set }: BooleanInputProps) => {
  return (
    <View style={[styles.containerStyle]}>
      {set.map(item => {
        return <BooleanButton key={item.display} interactionStore={interactionStore} name={name} setItem={item} />;
      })}
    </View>
  );
});

type BooleanButtonProps = {
  setItem: BooleanInputSetItem;
  interactionStore: InteractionStore;
  name: string;
};
const BooleanButton = observer(({ setItem, interactionStore, name }: BooleanButtonProps) => {
  const { colors } = useTheme();
  return (
    <Button
      content={setItem.display || ''}
      buttonStyle={[
        styles.buttonStyle,
        {
          backgroundColor: colors.lightBlue,
        },
      ]}
      textStyle={styles.textStyle}
      iconStyle={styles.iconStyle}
      onPress={() => {
        interactionStore.setValue(name, setItem.value);
      }}
    />
  );
});

const styles = StyleSheet.create({
  buttonStyle: {
    borderRadius: 8,
    padding: 8,
    alignSelf: 'flex-end',
  },
  textStyle: {
    color: '#fff',
  },
  iconStyle: {
    color: '#fff',
    paddingLeft: 5,
  },
  textInput: {
    backgroundColor: 'white',
  },
  containerStyle: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
