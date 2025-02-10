import { observer } from 'mobx-react-lite';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import React from 'react';
import { useTheme } from '@/src/contexts/ThemeContext';
import { ThredIcon } from '../admin-tools/thred-manager/ThredIcon';
import { ThredStore } from '@/src/stores/ThredStore';
import { ThredsStore } from '@/src/stores/ThredsStore';
import { Link } from 'expo-router';

type ThredViewProps = {
  thredStore: ThredStore;
  thredsStore: ThredsStore;
};
export const ThredView = observer(({ thredStore, thredsStore }: ThredViewProps) => {
  const {
    colors,
    fonts: { medium, regular },
  } = useTheme();

  function getLatestEvent() {
    const eventStores = thredStore.eventsStore?.eventStores;
    if (!eventStores) return undefined;
    const latestEvent = eventStores[eventStores?.length - 1].event;

    return latestEvent;
  }

  const latestEvent = getLatestEvent();
  if (!latestEvent) return null;

  const { source, data, type, time } = latestEvent;

  function formatDateAndTime() {
    if (!time) return '';
    const date = new Date(time);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const amPm = hours >= 12 ? 'PM' : 'AM';

    const formattedTime = `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${amPm}`;

    const formattedDate = `${String(date.getMonth() + 1).padStart(2, '0')} / ${String(date.getDate()).padStart(
      2,
      '0',
    )} / ${String(date.getFullYear()).slice(-2)}`;

    return `${formattedTime} | ${formattedDate}`;
  }

  return (
    <Link href={`/threds/${thredStore.thred.id}`}>
      <View style={[styles.containerStyle]}>
        <ThredIcon uri={data?.display?.uri} />
        <View style={styles.textView}>
          <Text style={[styles.dateStyle, regular, { color: colors.text }]}>{formatDateAndTime()}</Text>
          <Text style={[styles.textStyle, medium, { color: colors.text }]}>
            {latestEvent.data?.title} {latestEvent.data?.description ? `-- ${latestEvent.data?.description}` : ''}
          </Text>
        </View>
        {/* Develop some sort of thumbnail to display here when  */}
        {/* <ThredTag thredStore={thredStore} /> */}
      </View>
    </Link>
  );
});

const styles = StyleSheet.create({
  containerStyle: {
    flexDirection: 'row',
    flexGrow: 1,
    padding: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  textView: {
    flexWrap: 'wrap',
    flex: 1,
  },
  textStyle: { flexWrap: 'wrap' },
  dateStyle: {},
});
