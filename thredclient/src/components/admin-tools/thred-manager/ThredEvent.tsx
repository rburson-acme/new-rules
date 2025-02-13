import { useTheme } from '@/src/contexts/ThemeContext';
import { observer } from 'mobx-react-lite';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PatternModel } from 'thredlib';
import { ThredIcon } from './ThredIcon';
import { formatDateAndTime } from '@/src/utils/formatDateAndTime';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { AdminEvent } from '@/src/core/AdminEvent';
import { useRouter } from 'expo-router';
import { useModal } from '@/src/contexts/ModalContext';

type ThredEventsProps = {
  event: AdminEvent;
  pattern: PatternModel;
};
export const ThredEvent = observer(({ event, pattern }: ThredEventsProps) => {
  const { colors, fonts } = useTheme();
  const router = useRouter();
  const [showJSON, setShowJSON] = useState(false);
  const { setModalData } = useModal<AdminEvent>();

  return (
    <View
      key={event.id}
      style={[styles.container, { backgroundColor: colors.secondaryBackground, borderColor: colors.border }]}>
      <View style={styles.innerContainer}>
        <ThredIcon uri={event.event.data?.display?.uri} tintColor={colors.green} />
        <View style={{ flexWrap: 'wrap', flex: 1 }}>
          <Text style={[fonts.regular]}>{event.timestamp ? formatDateAndTime(event.timestamp) : ''}</Text>
          <View style={{ flex: 1, flexWrap: 'wrap' }}>
            <Text style={[fonts.medium]}>{event.event.data?.title}</Text>
          </View>
        </View>
      </View>
      <View style={styles.buttonGroup}>
        <Pressable
          style={[styles.button, { borderColor: colors.border }]}
          onPress={() => console.log(setShowJSON(!showJSON))}>
          <MaterialCommunityIcons name="eye" size={20} style={{ color: colors.icon }} />
          <Text style={{ color: colors.icon }}>{!showJSON ? 'Show JSON' : 'Hide JSON'}</Text>
        </Pressable>
        <Pressable
          style={[styles.button, { borderColor: colors.border }]}
          onPress={() => {
            setModalData(event);
            router.push('admin-tools/thred-manager/modal');
          }}>
          <MaterialIcons name="event" size={20} style={{ color: colors.icon }} />
          <Text style={{ color: colors.icon }}>View Event</Text>
        </Pressable>
        {showJSON && (
          <View style={{ maxHeight: 300 }}>
            <ScrollView>
              <Text style={{ fontFamily: 'monospace', color: colors.text }}>{JSON.stringify(event, null, 2)}</Text>
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 8,
    gap: 8,
    borderRadius: 4,
    borderWidth: 1,
    flex: 1,
  },
  innerContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    paddingVertical: 8,
  },
  buttonGroup: {
    gap: 8,
  },
});
