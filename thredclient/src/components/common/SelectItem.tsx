import { StyleSheet, Text, View } from 'react-native';
import { MediumText } from './MediumText';

type SelectItemProps = {
  item: { display: string; value: string };
};
export const SelectItem = ({ item }: SelectItemProps) => {
  return (
    <View style={styles.item}>
      <MediumText style={styles.textItem}>{item.display}</MediumText>
    </View>
  );
};

const styles = StyleSheet.create({
  item: {
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textItem: {
    flex: 1,
    fontSize: 16,
  },
});
