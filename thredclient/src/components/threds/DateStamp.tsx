import { StyleSheet, View } from 'react-native';
import { RegularText } from '../common/RegularText';

type DateStampProps = { time?: number };
export const DateStamp = ({ time }: DateStampProps) => {
  function getDate() {
    return time ? new Date(time).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : '';
  }

  return (
    <View style={[styles.dateStampStyle]}>
      <RegularText>{getDate()}</RegularText>
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
