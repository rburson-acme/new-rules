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

type ThredListCardProps = {
  thredStore: ThredStore;
  thredsStore: ThredsStore;
};
export const ThredListCard = observer(({ thredStore, thredsStore }: ThredListCardProps) => {
  const {
    colors,
    fonts: { medium, regular },
  } = useTheme();

  const latestEvent = thredStore.eventsStore?.latestEventStore;

  function getIcon() {
    return latestEvent?.data?.display?.uri || 'https://www.svgrepo.com/show/489126/sensor.svg';
  }

  function getText() {
    const description = latestEvent?.data?.description;
    const title = latestEvent?.data?.title;
    return title + (description ? ' -- ' + description : '');
  }

  function getTime() {
    return latestEvent?.time;
  }

  const time = getTime();
  return (
    <Link href={`/threds/${thredStore.thred.id}`}>
      <View style={[styles.containerStyle]}>
        <ThredIcon uri={getIcon()} />
        <View style={styles.textView}>
          <RegularText style={[styles.dateStyle]}>{time ? formatDateAndTime(time) : ''}</RegularText>
          <MediumText style={[styles.textStyle]}>{getText()}</MediumText>
        </View>
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
