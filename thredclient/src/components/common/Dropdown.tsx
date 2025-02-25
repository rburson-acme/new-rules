import { StyleProp, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { Dropdown as RNEDDropdown } from 'react-native-element-dropdown';
import { SelectItem } from './SelectItem';

export type DropdownData = { display: string; value: any };
type DropdownProps = {
  data: DropdownData[];
  onChange: ({ display, value }: DropdownData) => void;
  style?: StyleProp<ViewStyle>;
  placeholderStyle?: StyleProp<TextStyle>;
  defaultItem?: DropdownData;
};

export const Dropdown = ({ data, onChange, style, placeholderStyle, defaultItem }: DropdownProps) => {
  return (
    <RNEDDropdown
      data={data}
      onChange={onChange}
      style={[styles.dropdownContainer, style]}
      placeholderStyle={[{ paddingLeft: 4 }, placeholderStyle]}
      placeholder={defaultItem?.display || 'Select item...'}
      labelField="display"
      valueField="value"
      renderItem={item => <SelectItem item={item} />}
    />
  );
};

const styles = StyleSheet.create({
  dropdownContainer: {
    backgroundColor: 'white',
    borderBottomColor: 'gray',
  },
});
