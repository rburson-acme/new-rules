import { StyleSheet, View } from 'react-native';
import { TextBubble } from '../common/TextBubble';
import { turnValueToText } from '@/src/utils/turnValueToText';
import { Image } from 'expo-image';
import { useTheme } from '@/src/contexts/ThemeContext';

type BroadcastProps = {
  error: {
    message: string;
    code?: number;
    cause?: any;
  };
};
export const ErrorEvent = ({ error }: BroadcastProps) => {
  const { colors } = useTheme();
  const incomingAvatar = require('../../../assets/system.png');
  const message = error.code ? `Errored with code ${error.code}: ${error?.message}` : error.message;
  return (
    <View style={styles.containerStyle}>
      <View style={{ alignItems: 'center' }}>
        <Image source={incomingAvatar} style={{ width: 40, height: 40 }} contentFit="contain" />
      </View>
      <View>
        <TextBubble
          text={message}
          bubbleStyle={{ alignSelf: 'flex-start', backgroundColor: colors.lightGrey, width: '80%' }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  containerStyle: { flexDirection: 'row', gap: 12, marginBottom: 32 },
});
