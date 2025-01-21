import React, { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
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
  const { content } = interactionStore.interaction.interaction;

  return (
    <View style={styles.containerStyle}>
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

const styles = StyleSheet.create({
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
});
