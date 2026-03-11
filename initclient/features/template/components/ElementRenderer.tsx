import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import type { ElementModel } from 'thredlib/model/interaction/ElementModel';
import { InputField } from './InputField';

interface Props {
  element: ElementModel;
  onSubmit: (name: string, value: any) => void;
  isComplete: boolean;
}

export function ElementRenderer({ element, onSubmit, isComplete }: Props) {
  if (element.input) {
    return (
      <InputField
        input={element.input}
        onSubmit={onSubmit}
        isComplete={isComplete}
      />
    );
  }

  if (element.text) {
    return <Text className="text-sm text-text">{element.text.value}</Text>;
  }

  if (element.image) {
    return (
      <Image
        source={{ uri: element.image.uri }}
        style={{
          width: element.image.width,
          height: element.image.height,
        }}
        contentFit="contain"
      />
    );
  }

  if (element.group) {
    return (
      <View className="gap-3">
        {element.group.items.map((child, i) => (
          <ElementRenderer
            key={i}
            element={child}
            onSubmit={onSubmit}
            isComplete={isComplete}
          />
        ))}
      </View>
    );
  }

  // video, map — placeholders for now
  return null;
}
