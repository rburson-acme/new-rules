import React, { ReactNode } from 'react';
import { View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { ComponentTree } from '@/src/components/ComponentTree';
import { ThredsStore } from '@/src/stores/ThredsStore';
import { RootStore } from '@/src/stores/rootStore';
import { TemplateStore } from '@/src/stores/TemplateStore';
import { typeConfig } from './typeConfig';

type InteractionProps = {
  stores: {
    templateStore: TemplateStore;
    rootStore: RootStore;
    thredsStore: ThredsStore;
  };
  componentTypes: Record<string, React.ComponentType<any>>;
};
export const Interaction = observer(({ stores, componentTypes }: InteractionProps) => {
  const { templateStore } = stores;
  const interactionStore = templateStore.currentInteractionStore;
  if (!interactionStore) {
    return null;
  }
  const { name, style, content } = interactionStore.interaction;

  return (
    <View style={{ ...styles.containerStyle, ...style }}>
      <ComponentTree root={content} typeConfig={typeConfig} componentTypes={componentTypes} props={{ stores }} />
    </View>
  );
});

const styles = {
  containerStyle: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  textDescriptionStyle: {
    fontSize: 12,
    padding: 1,
  },
};
