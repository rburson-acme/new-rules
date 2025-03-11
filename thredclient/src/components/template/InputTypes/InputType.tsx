import { InteractionStore } from '@/src/stores/InteractionStore';
import { BooleanInput } from './BooleanInput';
import { TextInput } from './TextInput';
import { TextBubble } from '../../common/TextBubble';
import { observer } from 'mobx-react-lite';
import { NominalInput } from './NominalInput';
import { useTheme } from '@/src/contexts/ThemeContext';
import { View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { turnValueToText } from '@/src/utils/turnValueToText';

const avatar = require('../../../../assets/avatar.png');

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

  const { colors, fonts } = useTheme();

  if (value) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
        <TextBubble
          text={turnValueToText(value)}
          bubbleStyle={{ backgroundColor: colors.green, alignSelf: 'center' }}
          textStyle={{ color: '#fff' }}
        />
        {/* <FontAwesome name="user-circle" size={40} color={colors.lightGrey} /> */}
        <Image source={avatar} style={{ width: 40, height: 40, borderRadius: 100 }} />
      </View>
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
