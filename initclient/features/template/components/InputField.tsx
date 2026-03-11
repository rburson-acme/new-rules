import { View, Text } from 'react-native';
import type { InputModel } from 'thredlib/model/interaction/InputModel';
import { TextInputField } from './inputs/TextInputField';
import { BooleanInputField } from './inputs/BooleanInputField';
import { NominalInputField } from './inputs/NominalInputField';

interface Props {
  input: InputModel;
  onSubmit: (name: string, value: any) => void;
  isComplete: boolean;
}

export function InputField({ input, onSubmit, isComplete }: Props) {
  if (isComplete) {
    return null; // Already answered — don't show the input
  }

  return (
    <View className="gap-2">
      <Text className="text-sm text-primary font-semibold">
        {input.display}
      </Text>
      {input.type === 'text' && (
        <TextInputField name={input.name} onSubmit={onSubmit} />
      )}
      {input.type === 'numeric' && (
        <TextInputField name={input.name} numeric onSubmit={onSubmit} />
      )}
      {input.type === 'boolean' && (
        <BooleanInputField
          name={input.name}
          set={input.set}
          onSubmit={onSubmit}
        />
      )}
      {input.type === 'nominal' && (
        <NominalInputField
          name={input.name}
          set={input.set}
          multiple={input.multiple}
          onSubmit={onSubmit}
        />
      )}
    </View>
  );
}
