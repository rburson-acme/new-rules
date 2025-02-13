import React from 'react';
import { View, Text, StyleProp, ViewStyle, StyleSheet, ScrollView } from 'react-native';
import { EventData } from 'thredlib';
import { EventStore } from '@/src/stores/EventStore';
import { Interaction } from '../template/Interaction';
import { getComponentTypes } from '../template/componentTypes';
import { ThredIcon } from '../admin-tools/thred-manager/ThredIcon';
import { useTheme } from '@/src/contexts/ThemeContext';

type EventDataViewProps = {
  eventStore: EventStore;
  data?: EventData;
};
export const EventDataView = ({ data, eventStore }: EventDataViewProps) => {
  const { colors, fonts } = useTheme();

  const templateStore = eventStore.openTemplateStore;

  if (!data) {
    return null;
  }
  return (
    <View style={styles.containerStyle}>
      <View>
        <ThredIcon uri={data?.display?.uri} tintColor={colors.border} />
        {eventStore.event?.time && (
          <Text style={[fonts.regular, { color: colors.text, fontSize: 10 }]}>
            {new Date(eventStore.event?.time).toLocaleTimeString()}
          </Text>
        )}
      </View>
      <View style={[styles.eventDataContainer]}>
        {templateStore?.completedInteractionStores.map((interactionStore, index) => {
          return (
            <Interaction
              key={index}
              interactionStore={interactionStore}
              componentTypes={getComponentTypes()}
              eventStore={eventStore}
            />
          );
        })}
        {templateStore?.currentInteractionStore && (
          <Interaction
            componentTypes={getComponentTypes()}
            interactionStore={templateStore.currentInteractionStore}
            eventStore={eventStore}
          />
        )}
      </View>
    </View>
  );
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
