import { EventRecord } from '@/src/core/EventRecord';
import { observer } from 'mobx-react-lite';
import { StyleSheet, Text, View } from 'react-native';
import { Address } from 'thredlib';

type ThredEventsProps = {
  event: EventRecord;
};
export const ThredEvent = observer(({ event }: ThredEventsProps) => {
  function formatTo(to: string[] | Address | undefined) {
    if (Array.isArray(to)) {
      return to.join(', ');
    } else return 'Unknown';
  }
  return (
    <View key={event.id} style={styles.container}>
      <View>
        <Text>{event.event.data?.title}</Text>
        <View style={{ flexDirection: 'row', gap: 20 }}>
          <Text>From: {event.event.source.name}</Text>
          <Text style={{ alignSelf: 'flex-end' }}>To: {formatTo(event.to)}</Text>
        </View>
        <Text>Status: (figure out how to define)</Text>
      </View>
      <View>
        <Text>{new Date(event.timestamp).toLocaleString()}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 8,
    backgroundColor: 'white',
    borderRadius: 8,
    borderColor: 'black',
    borderWidth: 1,
    justifyContent: 'space-between',
    display: 'flex',
    flexDirection: 'row',
    marginHorizontal: 8,
    marginTop: 8,
  },
});
