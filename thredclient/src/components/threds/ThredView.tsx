import { ThredStore } from '@/src/stores/ThredStore';
import { observer } from 'mobx-react-lite';
import { Image, StyleSheet, Text, View } from 'react-native';
import { ThredsStore } from '@/src/stores/ThredsStore';
import React from 'react';
import { ThredTag } from './ThredTag';
import { ThredIcon } from './ThredIcon';
import { useTheme } from '@/src/contexts/ThemeContext';
import { toJS } from 'mobx';

type ThredViewProps = {
  thredStore: ThredStore;
  thredsStore: ThredsStore;
  thredId: string;
};
export const ThredView = observer(({ thredStore, thredsStore, thredId }: ThredViewProps) => {
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
    //month, day, year
    const formattedDate = `${String(date.getMonth() + 1).padStart(2, '0')} / ${String(date.getDate()).padStart(
      2,
      '0',
    )} / ${String(date.getFullYear()).slice(-2)}`;

    return `${formattedTime} | ${formattedDate}`;
  }

  return (
    <View style={[styles.containerStyle, { backgroundColor: colors.secondaryBackground, borderColor: colors.border }]}>
      <ThredIcon uri={data?.display?.uri} />
      <View style={styles.textView}>
        <Text style={[styles.dateStyle, regular, { color: colors.text }]}>{formatDateAndTime()}</Text>
        <Text style={[styles.textStyle, medium, { color: colors.text }]}>
          {latestEvent.data?.title} -- {latestEvent.data?.description}
        </Text>
      </View>
      <ThredTag thredStore={thredStore} />
    </View>
  );
});

const styles = StyleSheet.create({
  containerStyle: {
    flexDirection: 'row',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 4,
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
