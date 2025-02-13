import { observer } from 'mobx-react-lite';
import { StyleSheet, Text, View } from 'react-native';
import React from 'react';
import { useTheme } from '@/src/contexts/ThemeContext';
import { ThredIcon } from './ThredIcon';
import { AdminThredStore } from '@/src/stores/AdminThredStore';
import { AdminThredsStore } from '@/src/stores/AdminThredsStore';
import { Link } from 'expo-router';
import { formatDateAndTime } from '@/src/utils/formatDateAndTime';

type ThredViewProps = {
  thredStore: AdminThredStore;
  thredsStore: AdminThredsStore;
};
export const AdminThredCard = observer(({ thredStore, thredsStore }: ThredViewProps) => {
  const {
    colors,
    fonts: { medium, regular },
  } = useTheme();
  const endTime = thredStore.thred?.endTime;
  const time = thredStore.thred?.startTime;
  if (!time) return null;

  return (
    <Link href={`/admin-tools/thred-manager/${thredStore.thred.id}`}>
      <View
        style={[styles.containerStyle, { backgroundColor: colors.secondaryBackground, borderColor: colors.border }]}>
        <ThredIcon />
        <View style={styles.textView}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={[styles.dateStyle, regular, { color: colors.text }]}>{formatDateAndTime(time)}</Text>
            {endTime ? (
              <Text style={[styles.dateStyle, regular, { color: colors.text }]}>{formatDateAndTime(endTime)}</Text>
            ) : null}
          </View>
          <Text style={[styles.textStyle, medium, { color: colors.text }]}>{thredStore.thred.patternName}</Text>
        </View>
      </View>
    </Link>
  );
});

const styles = StyleSheet.create({
  containerStyle: {
    flexDirection: 'row',
    display: 'flex',
    flex: 1,
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
  textStyle: { flexWrap: 'wrap', flexShrink: 1 },
  dateStyle: {},
});
