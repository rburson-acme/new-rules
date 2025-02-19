import { observer } from 'mobx-react-lite';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import React from 'react';
import { useTheme } from '@/src/contexts/ThemeContext';
import { ThredIcon } from '../admin-tools/thred-manager/ThredIcon';
import { ThredStore } from '@/src/stores/ThredStore';
import { ThredsStore } from '@/src/stores/ThredsStore';
import { Link } from 'expo-router';
import { formatDateAndTime } from '@/src/utils/formatDateAndTime';
import { RegularText } from '../common/RegularText';
import { MediumText } from '../common/MediumText';

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
    const latestEvent = eventStores[eventStores?.length - 1]?.event;

    return latestEvent;
  }

  const latestEvent = getLatestEvent();
  if (!latestEvent) return null;

  const { source, data, type, time } = latestEvent;

  return (
    <Link href={`/threds/${thredStore.thred.id}`}>
      <View style={[styles.containerStyle]}>
        <ThredIcon uri={data?.display?.uri} />
        <View style={styles.textView}>
          <RegularText style={[styles.dateStyle]}>{time ? formatDateAndTime(time) : ''}</RegularText>
          <MediumText style={[styles.textStyle]}>
            {latestEvent.data?.title} {latestEvent.data?.description ? `-- ${latestEvent.data?.description}` : ''}
          </MediumText>
        </View>
        {/* Develop some sort of thumbnail to display here when  */}
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
