import { StyleSheet, View } from 'react-native';
import { TextBubble } from '../common/TextBubble';
import { turnValueToText } from '@/src/utils/turnValueToText';
import { Image } from 'expo-image';
import { useTheme } from '@/src/contexts/ThemeContext';
import { RegularText } from '../common/RegularText';
import { EventContent } from 'thredlib';

type BroadcastProps = {
  content: EventContent;
  time: number | undefined;
};

export const IncomingBroadcast = ({ content, time }: BroadcastProps) => {
  const incomingAvatar = require('../../../assets/avatar2.png');

  if (Array.isArray(content.values)) return null;

  const values = content.values as Record<string, any>; //assert, because we just checked above if an array

  return (
    <View style={styles.containerStyle}>
      <View style={{ alignItems: 'center' }}>
        <Image source={incomingAvatar} style={{ width: 40, height: 40, borderRadius: 100 }} />
        {time && <RegularText style={{ fontSize: 10 }}>{new Date(time).toLocaleTimeString()}</RegularText>}
      </View>
      <View>
        <BroadcastContent values={values} valuesType={content.valuesType} />
      </View>
    </View>
  );
};

const BroadcastContent = ({ values, valuesType }: { values: Record<string, any>; valuesType?: string }) => {
  const { colors } = useTheme();
  if (valuesType === 'broadcastMessage') {
    return (
      <>
        <RegularText style={{ fontSize: 10, color: colors.border }}>{values.messageSource?.id}</RegularText>
        <TextBubble
          text={turnValueToText(values.message)}
          bubbleStyle={{ alignSelf: 'center', backgroundColor: colors.lightGrey }}
        />
      </>
    );
  }

  if (valuesType === 'broadcastValues') {
    const { messageSource, re, ...rest } = values;
    return (
      <>
        <RegularText style={{ fontSize: 10, color: colors.border }}>{messageSource?.id}</RegularText>
        {Object.entries(rest).map(([key, value]) => (
          <TextBubble
            key={key}
            text={turnValueToText(value)}
            bubbleStyle={{ alignSelf: 'center', backgroundColor: colors.lightGrey }}
          />
        ))}
      </>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  containerStyle: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  valuesContainer: {
    backgroundColor: '#f2f2f2',
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  valueRow: { fontSize: 12, marginBottom: 2 },
  valueKey: { fontWeight: 'bold' },
});
