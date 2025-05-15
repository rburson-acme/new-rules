import React from 'react';
import { View, StyleSheet } from 'react-native';
import { EventData, Events } from 'thredlib';
import { EventStore } from '@/src/stores/EventStore';
import { Interaction } from '../template/Interaction';
import { getComponentTypes } from '../template/componentTypes';
import { ThredIcon } from '../admin-tools/thred-manager/ThredIcon';
import { useTheme } from '@/src/contexts/ThemeContext';
import { RegularText } from '../common/RegularText';
import { OutgoingBroadcast } from './OutgoingBroadcast';
import { IncomingBroadcast } from './IncomingBroadcast';
import { ErrorEvent } from './ErrorEvent';

type EventProps = {
  eventStore: EventStore;
  data?: EventData;
};
export const Event = ({ data, eventStore }: EventProps) => {
  const { colors } = useTheme();

  const templateStore = eventStore.openTemplateStore;
  if (!data) return null;
  const values = data.content?.values;
  if (!eventStore.event) return null;
  const error = Events.getError(eventStore.event);

  if (error) {
    return <ErrorEvent error={error} />;
  }
  if (eventStore.event.type === 'org.wt.broadcast') {
    return <IncomingBroadcast values={values} time={eventStore.event.time} />;
  } else if (eventStore.event.type === 'org.wt.client.broadcast') {
    return <OutgoingBroadcast values={values} />;
  } else {
    return (
      <View style={styles.containerStyle}>
        <View>
          <ThredIcon uri={data?.display?.uri} tintColor={colors.border} />
          {eventStore.event.time && (
            <RegularText style={[{ fontSize: 10 }]}>{new Date(eventStore.event.time).toLocaleTimeString()}</RegularText>
          )}
        </View>
        <View style={[styles.eventDataContainer]}>
          {templateStore?.completedInteractionStores.map((interactionStore, index) => {
            return <Interaction key={index} interactionStore={interactionStore} componentTypes={getComponentTypes()} />;
          })}
          {templateStore?.currentInteractionStore && (
            <Interaction
              componentTypes={getComponentTypes()}
              interactionStore={templateStore.currentInteractionStore}
            />
          )}
        </View>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  containerStyle: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  eventDataContainer: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'stretch',
    flex: 1,
  },
  textDescriptionStyle: {
    padding: 5,
    fontSize: 12,
    fontWeight: 'bold',
  },
});
