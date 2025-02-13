import { useTheme } from '@/src/contexts/ThemeContext';
import { StyleSheet, Text, View } from 'react-native';

type DateStampProps = { time?: number };
export const DateStamp = ({ time }: DateStampProps) => {
  function getDate() {
    return time ? new Date(time).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : '';
  }

  const { colors, fonts } = useTheme();
  return (
    <View style={[styles.dateStampStyle]}>
      <Text style={[fonts.regular, { color: colors.text }]}>{getDate()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  dateStampStyle: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 4,
    alignSelf: 'center',
    borderRadius: 4,
    marginBottom: 16,
  },
});
