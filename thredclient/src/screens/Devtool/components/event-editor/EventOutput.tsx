import { observer } from 'mobx-react-lite';
import { StyleSheet, Text, View } from 'react-native';
import { ComponentTree } from '@/src/components/ComponentTree';
import { InteractionStore } from '@/src/stores/InteractionStore';
import { EventEditorLocals } from './EventEditor';
import { RootStore } from '@/src/stores/rootStore';
import { getComponentTypes } from '@/src/components/template/componentTypes';
import { typeConfig } from '@/src/components/template/typeConfig';

type EventOutputProps = {
  localStore: EventEditorLocals;
  rootStore: RootStore;
};

//TODO: Check out GetComponentTypes
export const EventOutput = observer(({ localStore, rootStore }: EventOutputProps) => {
  return (
    <View style={styles.eventOutput}>
      <Text style={{ fontSize: 24 }}>Event output</Text>
      {localStore.template ? (
        <View style={{ justifyContent: 'center' }}>
          <Text>{localStore.template.name}</Text>
          {localStore.template.interactions.map((item, index) => {
            const interactionStore = new InteractionStore(item.interaction);
            const { content } = interactionStore.interaction;
            return (
              <ComponentTree
                root={content}
                style={{ gap: 8, paddingTop: 8 }}
                typeConfig={typeConfig}
                componentTypes={getComponentTypes()}
                props={{ interactionStore }}
              />
            );
          })}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  eventOutput: {
    backgroundColor: '#e4e4e4',
    flex: 2,
    padding: 8,
  },
});
