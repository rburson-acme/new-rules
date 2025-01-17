import { observer } from 'mobx-react-lite';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { EventEditorLocals } from './EventEditor';

type QueueProps = { localStore: EventEditorLocals; shakeAnim: Animated.Value };

export const Queue = observer(({ localStore, shakeAnim }: QueueProps) => {
  return (
    <View style={styles.queue}>
      <Text style={{ fontSize: 24 }}>Queue</Text>
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
            <Text>{index + 1}.</Text>
            <Text>{JSON.stringify(item, null, 2)}</Text>
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
