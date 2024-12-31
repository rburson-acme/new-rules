import { AntDesign } from '@expo/vector-icons';
import { RefObject } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { IMultiSelectRef, MultiSelect as RNEDMultiSelect } from 'react-native-element-dropdown';
import { SelectItem } from './SelectItem';

type MultiSelectProps = {
  data: { display: string; value: any }[];
  onChange: (value: string[]) => void;
  value: string[];
  ref?: RefObject<IMultiSelectRef>;
  style?: StyleProp<ViewStyle>;
  placeholderStyle?: StyleProp<ViewStyle>;
  selectedStyle?: StyleProp<ViewStyle>;
  textSelectedStyle?: StyleProp<ViewStyle>;
};
export const MultiSelect = ({
  data,
  ref,
  onChange,
  style,
  placeholderStyle,
  value,
  selectedStyle,
  textSelectedStyle,
}: MultiSelectProps) => {
  return (
    <RNEDMultiSelect
      data={data}
      ref={ref}
      onChange={onChange}
      style={[styles.dropdownContainer, style]}
      placeholderStyle={[{ paddingLeft: 4 }, placeholderStyle]}
      placeholder={`Select items.`}
      labelField="display"
      valueField="value"
      value={value}
      renderItem={item => <SelectItem item={item} />}
      renderSelectedItem={(item, unSelect) => (
        <Pressable onPress={() => unSelect && unSelect(item)}>
          <View style={[styles.selectedStyle, selectedStyle]}>
            <Text style={[styles.textSelectedStyle, textSelectedStyle]}>{item.display}</Text>
            <AntDesign name="close" size={16} color="black" />
          </View>
        </Pressable>
      )}
    />
  );
};

const styles = StyleSheet.create({
  dropdownContainer: {
    height: 48,
    backgroundColor: 'white',
    borderBottomColor: 'gray',
  },
  selectedStyle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: 'white',
    shadowColor: '#000',
    marginTop: 8,
    marginRight: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,

    elevation: 2,
  },
  textSelectedStyle: {
    marginRight: 5,
    fontSize: 16,
  },
});
