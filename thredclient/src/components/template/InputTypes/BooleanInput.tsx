import { InteractionStore } from '@/src/stores/InteractionStore';
import { StyleSheet, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { BooleanInputSetItem } from './InputType';
import { Button } from '../../common/Button';

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
  const value = interactionStore.getValue(name);
  const hasBeenClicked = setItem.value === value;

  return (
    <Button
      content={setItem.display || ''}
      buttonStyle={[styles.buttonStyle, hasBeenClicked ? styles.buttonClicked : styles.buttonNotClicked]}
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
  textInput: {
    backgroundColor: 'white',
  },
  containerStyle: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
});
