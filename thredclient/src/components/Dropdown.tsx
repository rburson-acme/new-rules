import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { Dropdown as RNEDDropdown } from 'react-native-element-dropdown';
import { SelectItem } from './SelectItem';

type Data = { display: string; value: any };
type DropdownProps = {
  data: Data[];
  onChange: ({ display, value }: Data) => void;
  style?: StyleProp<ViewStyle>;
  placeholderStyle?: StyleProp<ViewStyle>;
};

export const Dropdown = ({ data, onChange, style, placeholderStyle }: DropdownProps) => {
  return (
    <RNEDDropdown
      data={data}
      onChange={onChange}
      style={[styles.dropdownContainer, style]}
      placeholderStyle={[{ paddingLeft: 4 }, placeholderStyle]}
      placeholder="Select item..."
      labelField="display"
      valueField="value"
      renderItem={item => <SelectItem item={item} />}
    />
  );
};

const styles = StyleSheet.create({
  dropdownContainer: {
    height: 48,
    backgroundColor: 'white',
    borderBottomColor: 'gray',
  },
});
