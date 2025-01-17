import { InteractionStore } from '@/src/stores/InteractionStore';
import { BooleanInput } from './BooleanInput';
import { TextInput } from './TextInput';
import { TextBubble } from '../../common/TextBubble';
import { observer } from 'mobx-react-lite';
import { NominalInput } from './NominalInput';

export type BooleanInputSetItem = { display: string; value: boolean };
export type SetItem = { display: string; value: any };
export type Set = SetItem[];

type InputProps = {
  name: string;
  type: 'text' | 'nominal' | 'ordinal' | 'numeric' | 'boolean';
  interactionStore: InteractionStore;
  set?: Set;
  multiple: boolean;
};
export const InputType = observer(({ name, type, interactionStore, set, multiple }: InputProps) => {
  const value = interactionStore.getValue(name);

  if (value) {
    const isValueString = typeof value === 'string';
    const isValueBoolean = typeof value === 'boolean';
    const isValueStringArray = Array.isArray(value) && value.every(item => typeof item === 'string');
    function getText() {
      if (isValueString) {
        return value;
      }
      if (isValueStringArray) {
        return value.join(', ');
      }
      if (isValueBoolean) {
        return value ? 'Yes' : 'No';
      } else return 'Invalid String';
    }
    return (
      <TextBubble
        text={getText()}
        leftOrRight="right"
        bubbleStyle={{ backgroundColor: '#79CC4D' }}
        textStyle={{ color: '#fff' }}
      />
    );
  } else {
    switch (type) {
      case 'boolean': {
        return <BooleanInput interactionStore={interactionStore} name={name} set={set as BooleanInputSetItem[]} />;
      }
      case 'text': {
        return <TextInput interactionStore={interactionStore} name={name} />;
      }
      case 'nominal':
        if (!set) return null;
        return <NominalInput name={name} set={set} multiple={multiple} interactionStore={interactionStore} />;
      case 'ordinal': {
        if (!set) return null;
        return <NominalInput name={name} set={set} multiple={multiple} interactionStore={interactionStore} />;
      }
      case 'numeric': {
        return <TextInput interactionStore={interactionStore} name={name} numeric />;
      }
    }
  }
});
