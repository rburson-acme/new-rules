import { EventEditorLocals } from '@/src/app/(app)/admin-tools/event-editor';
import { observer } from 'mobx-react-lite';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { MediumText } from '../../common/MediumText';
import { RegularText } from '../../common/RegularText';

type QueueProps = { localStore: EventEditorLocals; shakeAnim: Animated.Value };

export const Queue = observer(({ localStore, shakeAnim }: QueueProps) => {
  return (
    <View style={styles.queue}>
      <MediumText style={{ fontSize: 24 }}>Queue</MediumText>
      {localStore.queue.length === 0 && (
        <Animated.Text
          style={{
            transform: [{ translateX: shakeAnim }],
            color: localStore.isTextRed ? 'red' : 'black',
          }}>
          Queue is empty
        </Animated.Text>
      )}
      <View style={styles.queueContent}>
        {localStore.queue.map((item, index) => (
          <View key={index} style={{ gap: 4, flexDirection: 'row' }}>
            <RegularText>{index + 1}.</RegularText>
            <RegularText>{JSON.stringify(item, null, 2)}</RegularText>
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  queue: {
    gap: 8,
  },
  queueContent: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
});
