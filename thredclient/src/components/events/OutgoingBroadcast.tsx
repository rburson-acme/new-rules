import { StyleSheet, View } from 'react-native';
import { TextBubble } from '../common/TextBubble';
import { turnValueToText } from '@/src/utils/turnValueToText';
import { Image } from 'expo-image';
import { useTheme } from '@/src/contexts/ThemeContext';
import { EventContent } from 'thredlib';

type OutgoingBroadcastProps = {
  content: EventContent;
};
export const OutgoingBroadcast = ({ content }: OutgoingBroadcastProps) => {
  const { colors } = useTheme();
  const avatar = require('../../../assets/avatar.png');

  if (Array.isArray(content.values)) return null;
  return (
    <View style={styles.containerStyle}>
      <TextBubble
        text={turnValueToText(content.values?.message)}
        bubbleStyle={{ backgroundColor: colors.buttonTertiary, alignSelf: 'center' }}
        textStyle={{ color: '#fff' }}
      />
      <Image source={avatar} style={{ width: 40, height: 40, borderRadius: 100 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  containerStyle: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
    justifyContent: 'flex-end',
    alignItems: 'center',
    flex: 1,
  },
});
