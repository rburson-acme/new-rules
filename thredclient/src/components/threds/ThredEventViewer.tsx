import { ThredStore } from '@/src/stores/ThredStore';
import { observer } from 'mobx-react-lite';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { EventDataView } from '../events/EventDataView';
import { ThredsStore } from '@/src/stores/ThredsStore';
import { toJS } from 'mobx';
import { ThredIcon } from '../admin-tools/thred-manager/ThredIcon';
import { Bubble } from '../common/Bubble';
import { useTheme } from '@/src/contexts/ThemeContext';

type OpenThredViewProps = {
  thredStore: ThredStore;
  thredsStore: ThredsStore;
};

export const ThredEventViewer = observer(({ thredStore, thredsStore }: OpenThredViewProps) => {
  const { eventsStore } = thredStore;
  const firstEventStore = eventsStore?.eventStores[0];
  const { colors, fonts } = useTheme();

  function getDate() {
    const time = firstEventStore?.event?.time;
    //Return format Mon, Feb 1
    return time ? new Date(time).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : '';
  }
  if (!firstEventStore?.event || !eventsStore) return null;
  const { data } = firstEventStore.event;
  return (
    <ScrollView contentContainerStyle={styles.containerStyle}>
      <View style={[styles.dateStampStyle, { backgroundColor: colors.infoBlue }]}>
        <Text style={[fonts.medium, { color: colors.invertedText }]}>{getDate()}</Text>
      </View>
      <View style={{ width: 2, height: 16, backgroundColor: colors.border, alignSelf: 'center' }} />
      <View style={{ gap: 16 }}>
        {eventsStore.eventStores.map(eventStore => {
          return (
            <View key={eventStore.event?.id} style={styles.eventDataContainer}>
              <View>
                <ThredIcon uri={eventStore.event?.data?.display?.uri} tintColor={colors.green} />
                {eventStore.event?.time && (
                  <Text style={[fonts.regular, { color: colors.text }]}>
                    {new Date(eventStore.event?.time).toLocaleTimeString()}
                  </Text>
                )}
              </View>
              <EventDataView data={data} eventStore={eventStore} />
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  containerStyle: {
    flexDirection: 'column',
    alignItems: 'stretch',
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  dateStampStyle: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 8,
    maxWidth: 120,
    alignSelf: 'center',
    borderRadius: 4,
  },
  eventDataContainer: { flexDirection: 'row', gap: 12 },
  buttonStyle: {
    marginTop: 40,
  },
});
