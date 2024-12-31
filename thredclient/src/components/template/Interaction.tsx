import React, { ReactNode } from 'react';
import { View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { ComponentTree } from '@/src/components/ComponentTree';
import { typeConfig } from './typeConfig';
import { InteractionStore } from '@/src/stores/InteractionStore';

type InteractionProps = {
  interactionStore: InteractionStore;
  componentTypes: Record<string, React.ComponentType<any>>;
};
export const Interaction = observer(({ interactionStore, componentTypes }: InteractionProps) => {
  if (!interactionStore) {
    return null;
  }
  const { name, style, content } = interactionStore.interaction;

  return (
    <View style={{ ...styles.containerStyle, ...style }}>
      <ComponentTree
        root={content}
        typeConfig={typeConfig}
        componentTypes={componentTypes}
        props={{ interactionStore }}
        style={{ gap: 8 }}
      />
    </View>
  );
});

const styles = {
  containerStyle: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: 8,
  },
  textDescriptionStyle: {
    fontSize: 12,
    padding: 1,
  },
};
