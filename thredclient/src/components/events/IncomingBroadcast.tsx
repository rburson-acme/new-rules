import { StyleSheet, View } from 'react-native';
import { TextBubble } from '../common/TextBubble';
import { turnValueToText } from '@/src/utils/turnValueToText';
import { Image } from 'expo-image';
import { useTheme } from '@/src/contexts/ThemeContext';
import { RegularText } from '../common/RegularText';

type BroadcastProps = {
  values: Record<string, any> | Record<string, any>[] | undefined;
  time: number | undefined;
};
export const IncomingBroadcast = ({ values, time }: BroadcastProps) => {
  const { colors } = useTheme();
  const incomingAvatar = require('../../../assets/avatar2.png');

  if (Array.isArray(values)) return null;
  return (
    <View style={styles.containerStyle}>
      <View style={{ alignItems: 'center' }}>
        <Image source={incomingAvatar} style={{ width: 40, height: 40, borderRadius: 100 }} />
        {time && <RegularText style={[{ fontSize: 10 }]}>{new Date(time).toLocaleTimeString()}</RegularText>}
      </View>
      <View>
        <RegularText style={{ fontSize: 10, color: colors.border }}>{values?.messageSource.id}</RegularText>
        <TextBubble
          text={turnValueToText(values?.message)}
          bubbleStyle={{ alignSelf: 'center', backgroundColor: colors.lightGrey }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  containerStyle: { flexDirection: 'row', gap: 12, marginBottom: 32 },
});
