import React from 'react';
import { typeConfig } from './typeConfig';

import { ComponentTree } from '@/src/components/ComponentTree';
import { InteractionStore } from '@/src/stores/InteractionStore';

type InteractionProps = {
  interactionStore: InteractionStore;
  componentTypes: Record<string, React.ComponentType<any>>;
};
export const Interaction = ({ interactionStore, componentTypes }: InteractionProps) => {
  if (!interactionStore) {
    return null;
  }
  const { name, style, content } = interactionStore.interaction;

  return (
    <ComponentTree
      root={content}
      typeConfig={typeConfig}
      componentTypes={componentTypes}
      props={{ interactionStore }}
    />
  );
};
