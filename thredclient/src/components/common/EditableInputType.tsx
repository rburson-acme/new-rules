import { observer } from 'mobx-react-lite';
import { Dropdown } from './Dropdown';
import { TextInput } from './TextInput';
import { Pressable, StyleSheet, View } from 'react-native';
import { EditableInputProps } from './EditableInput';
import { MaterialIcons } from '@expo/vector-icons';

export const EditableInputType = observer((props: EditableInputProps) => {
  const { type } = props;
  switch (type) {
    case 'text':
      return <TextInput value={props.text} onChangeText={props.onChangeText} style={styles.input} />;
    case 'dropdown':
      return (
        <Dropdown
          data={props.items}
          defaultItem={props.selectedItem}
          style={[styles.input]}
          onChange={item => {
            props.onItemChange(item);
          }}
        />
      );
    case 'multipleText':
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {Array.isArray(props.inputValues) ? (
            props.inputValues.map((value, index) => (
              <TextInput
                key={index}
                value={value}
                onChangeText={value => {
                  props.onChangeText(value, index);
                }}
                style={styles.input}
              />
            ))
          ) : (
            <TextInput value={props.inputValues} onChangeText={props.onChangeText} style={styles.input} />
          )}
          {props.inputValues.length > 1 && (
            <Pressable
              onPress={() => {
                props.removeInputValue();
              }}>
              <MaterialIcons name="remove" size={24} color="black" />
            </Pressable>
          )}
          <Pressable
            onPress={() => {
              props.addInputValue();
            }}>
            <MaterialIcons name="add" size={24} color="black" />
          </Pressable>
        </View>
      );
  }
});

const styles = StyleSheet.create({
  input: {
    padding: 8,
    borderWidth: 1,
    borderColor: 'black',
  },
});
