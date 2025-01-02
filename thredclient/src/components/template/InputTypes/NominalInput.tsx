import { IMultiSelectRef } from 'react-native-element-dropdown';
import { Set, SetItem } from './InputType';
import { InteractionStore } from '@/src/stores/InteractionStore';
import { createRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../Button';
import { MultiSelect } from '../../MultiSelect';
import { Dropdown } from '../../Dropdown';

type NominalInputProps = {
  name: string;
  set: Set;
  multiple: boolean;
  interactionStore: InteractionStore;
};

export const NominalInput = ({ name, set, multiple, interactionStore }: NominalInputProps) => {
  if (!multiple) {
    const [value, setValue] = useState(null);

    return (
      <>
        <Dropdown
          data={set}
          onChange={data => {
            setValue(data.value);
          }}
        />
        {
          <Button
            onPress={() => {
              interactionStore.setValue(name, value);
            }}
            content="Send"
          />
        }
      </>
    );
  } else {
    const [value, setValue] = useState<string[]>([]);
    const ref = createRef<IMultiSelectRef>();
    return (
      <>
        <MultiSelect
          data={set}
          ref={ref}
          onChange={data => {
            setValue(data);
          }}
          value={value}
        />
        <Button
          onPress={() => {
            interactionStore.setValue(name, value);
          }}
          content="Send"
        />
      </>
    );
  }
};
