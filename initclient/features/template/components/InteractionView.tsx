import { View } from 'react-native';
import type { InteractionModel } from 'thredlib';
import { ElementRenderer } from './ElementRenderer';

interface Props {
  interaction: InteractionModel;
  onSubmit: (name: string, value: any) => void;
  isComplete: boolean;
}

export function InteractionView({ interaction, onSubmit, isComplete }: Props) {
  const { content } = interaction.interaction;

  return (
    <View className="gap-3">
      {content.map((element, i) => (
        <ElementRenderer
          key={i}
          element={element}
          onSubmit={onSubmit}
          isComplete={isComplete}
        />
      ))}
    </View>
  );
}
