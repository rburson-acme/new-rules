import { Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { Button } from './Button';
import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { RegularText } from './RegularText';
import { observer } from 'mobx-react-lite';
import { EditableInputType } from './EditableInputType';

type BaseProps = {
  style?: ViewStyle;
  textStyle?: TextStyle;
  onEditPress?: () => void;
  onSubmit?: (text: any) => void;
};

type TextInputProps = BaseProps & {
  type: 'text';
  onChangeText: (text: string) => void;
  text: string;
};

type Item = { display: string; value: any };
type DropdownProps = BaseProps & {
  type: 'dropdown';
  items: Item[];
  onItemChange: (value: Item) => void;
  selectedItem: Item;
};

type MultipleText = BaseProps & {
  type: 'multipleText';
  inputValues: string[] | string;
  onChangeText: (text: string, index?: number) => void;
  addInputValue: () => void;
  removeInputValue: () => void;
};
export type EditableInputProps = TextInputProps | DropdownProps | MultipleText;

export const EditableInput = observer((props: EditableInputProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const { style, textStyle, onEditPress, onSubmit, type } = props;

  function getText() {
    if (type === 'text') {
      return props.text;
    }
    if (type === 'dropdown') {
      return props.selectedItem.display;
    }
    if (type === 'multipleText') {
      if (Array.isArray(props.inputValues)) {
        return props.inputValues.join(', ');
      }
      return props.inputValues;
    }
  }
  if (isEditing) {
    return (
      <View style={styles.container}>
        <EditableInputType {...props} />
        <Button
          onPress={() => {
            setIsEditing(false);
            if (type === 'text') {
              onSubmit && onSubmit(props.text);
            } else if (type === 'dropdown') {
              onSubmit && onSubmit(props.selectedItem.value);
            } else if (type === 'multipleText') {
              onSubmit && onSubmit(props.inputValues);
            }
          }}
          content="Submit Changes"
        />
      </View>
    );
  } else {
    return (
      <View style={styles.container}>
        <RegularText style={textStyle}>{getText()}</RegularText>
        <Pressable
          onPress={() => {
            setIsEditing(true);
            onEditPress && onEditPress();
          }}>
          <MaterialIcons name="edit" size={24} color="black" />
        </Pressable>
      </View>
    );
  }
});

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
