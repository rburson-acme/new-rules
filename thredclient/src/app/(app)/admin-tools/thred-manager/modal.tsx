import { Event } from '@/src/components/events/Event';
import { DateStamp } from '@/src/components/threds/DateStamp';
import { useModal } from '@/src/contexts/ModalContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { AdminEvent } from '@/src/core/AdminEvent';
import { EventStore } from '@/src/stores/EventStore';
import { RootStore } from '@/src/stores/RootStore';
import { useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function ThredManagerModal() {
  const { modalData } = useModal<AdminEvent>();
  const navigation = useNavigation();

  const rootStore = RootStore.get();
  const eventStore = new EventStore(modalData.event, rootStore);
  const { colors } = useTheme();

  useEffect(() => {
    navigation.setOptions({ title: modalData.event.data?.title });
  }, [navigation]);

  return (
    <View style={[styles.containerStyle, { backgroundColor: colors.background }]}>
      <DateStamp time={modalData.event.time} />
      <Event data={modalData.event.data} eventStore={eventStore} />
    </View>
  );
}

// TODO: Map responses onto the interaction somehow

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
    alignSelf: 'center',
    borderRadius: 4,
    marginBottom: 16,
  },
});
