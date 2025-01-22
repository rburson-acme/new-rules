import { ThredStore } from '@/src/stores/ThredStore';
import { observer } from 'mobx-react-lite';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Bar } from '../common/Bar';
import { EventDataView } from '../events/EventDataView';
import { ThredsStore } from '@/src/stores/ThredsStore';
import { Button } from '../common/Button';
import { OpenEventHeader } from '../events/OpenEventHeader';

type OpenThredViewProps = {
  thredStore: ThredStore;
  thredsStore: ThredsStore;
};

export const OpenThredView = observer(({ thredStore, thredsStore }: OpenThredViewProps) => {
  const { eventsStore } = thredStore;
  const firstEventStore = eventsStore?.eventStores[0];

  if (!firstEventStore?.event || !eventsStore) return null;

  const { data } = firstEventStore.event;
  return (
    <View style={styles.containerStyle}>
      <Bar />
      <View style={styles.contentStyle}>
        <OpenEventHeader event={firstEventStore.event} />
        <ScrollView>
          {eventsStore.eventStores.map(eventStore => {
            return (
              <View key={eventStore.event?.id}>
                <EventDataView data={data} containerStyle={styles.eventDataStyle} eventStore={eventStore} />
              </View>
            );
          })}
        </ScrollView>
        <Button
          content={'Return to Threds'}
          onPress={() => {
            thredsStore.unselectThred();
          }}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  containerStyle: {
    flexDirection: 'column',
    alignItems: 'stretch',
    flex: 1,

    marginTop: 25,
    marginBottom: 20,
    paddingRight: 15,
    paddingLeft: 16,
    paddingBottom: 20,
  },
  contentStyle: {
    flexDirection: 'column',
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    borderStyle: 'solid',
    borderWidth: 1,
    backgroundColor: '#f3f3f3',
    borderColor: '#ddd',
    borderRadius: 1,
    paddingTop: 10,
    paddingHorizontal: 8,
    paddingBottom: 20,
  },
  eventDataStyle: {},
  buttonStyle: {
    marginTop: 40,
  },
});
