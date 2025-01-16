import { StyleSheet, Text, View } from 'react-native';

type SelectItemProps = {
  item: { display: string; value: string };
};
export const SelectItem = ({ item }: SelectItemProps) => {
  return (
    <View style={styles.item}>
      <Text style={styles.textItem}>{item.display}</Text>
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
