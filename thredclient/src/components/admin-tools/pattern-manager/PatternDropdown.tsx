import { PatternStore } from '@/src/stores/PatternStore';
import { EditableInput } from '../../common/EditableInput';
import { StyleSheet, View } from 'react-native';
import { RegularText } from '../../common/RegularText';
import { DropdownData } from '../../common/Dropdown';
import { observer } from 'mobx-react-lite';

type PatternDropdownProps = {
  name: string;
  updatePath: string;
  patternStore: PatternStore;
  value: string;
  items: DropdownData[];
};

export const PatternDropdown = observer(({ name, value, patternStore, updatePath, items }: PatternDropdownProps) => {
  return (
    <View style={styles.container}>
      <RegularText>{name}: </RegularText>
      <EditableInput
        type="dropdown"
        selectedItem={items.find(i => i.value === value) || items[0]}
        items={items}
        onSubmit={text => {
          patternStore.updatePattern({ [updatePath]: text });
        }}
        onItemChange={item => {
          patternStore.updatePatternValue(updatePath, item.value);
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
