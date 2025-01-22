import { ThredStore } from '@/src/stores/ThredStore';
import { observer } from 'mobx-react-lite';
import { Pressable, StyleSheet, View } from 'react-native';
import { EventSourceView } from '../events/EventSourceView';
import { EventDataCompactView } from '../events/EventDataCompactView';
import { ThredsStore } from '@/src/stores/ThredsStore';
import React from 'react';

type ThredViewProps = {
  thredStore: ThredStore;
  thredsStore: ThredsStore;
  thredId: string;
};
export const ThredView = observer(({ thredStore, thredsStore, thredId }: ThredViewProps) => {
  const firstEvent = thredStore.eventsStore?.eventStores[0]?.event;

  if (!firstEvent) return null;

  const { source, data, type, time } = firstEvent;
  return (
    <View style={styles.containerStyle}>
      <EventSourceView source={source} display={data?.display} eventType={type} />
      <EventDataCompactView
        data={data}
        time={time}
        onPress={() => {
          thredsStore.selectThred(thredId);
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  containerStyle: {
    flexDirection: 'row',
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingTop: 16,
    paddingRight: 8,
    paddingBottom: 16,
    paddingLeft: 8,
  },
});
