import { observer } from 'mobx-react-lite';
import { StyleSheet, Text, View } from 'react-native';
import { getComponentTypes } from '@/src/components/template/componentTypes';
import { Interaction } from '@/src/components/template/Interaction';
import { EventEditorLocals } from '@/src/app/(app)/admin-tools/event-editor';

type EventOutputProps = {
  localStore: EventEditorLocals;
};

export const EventOutput = observer(({ localStore }: EventOutputProps) => {
  const completedInteractionStores = localStore.templateStore?.completedInteractionStores;
  const interactionStore = localStore.templateStore?.nextInteractionStore;
  const completedInteractions = completedInteractionStores?.map((interactionStore, index) => {
    return <Interaction key={index} interactionStore={interactionStore} componentTypes={getComponentTypes()} />;
  });

  return (
    <View style={styles.eventOutput}>
      <Text style={{ fontSize: 24 }}>Event output</Text>
      {localStore.templateStore?.template ? (
        <View style={{ justifyContent: 'center', gap: 16 }}>
          {completedInteractions}
          {interactionStore && (
            <Interaction
              key={completedInteractions?.length}
              interactionStore={interactionStore}
              componentTypes={getComponentTypes()}
            />
          )}
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
