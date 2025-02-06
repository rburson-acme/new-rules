import { observer } from 'mobx-react-lite';
import { TextInput } from './TextInput';
import { Pressable, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { Button } from './Button';
import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';

type EditableTextProps = {
  onTextChange: (text: string) => void;
  text: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  onEditPress?: () => void;
  onSubmit?: (text: string) => void;
};

export const EditableText = ({ text, style, textStyle, onEditPress, onSubmit, onTextChange }: EditableTextProps) => {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <View style={styles.container}>
        <TextInput
          value={text}
          onChangeText={text => {
            onTextChange(text);
          }}
          style={styles.input}
        />
        <Button
          onPress={() => {
            setIsEditing(false);
            onSubmit && onSubmit(text);
          }}
          content="Submit Changes"
        />
      </View>
    );
  } else {
    return (
      <View style={styles.container}>
        <Text style={textStyle}>{text}</Text>
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
};

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    padding: 8,
    margin: 8,
    borderWidth: 1,
    borderColor: 'black',
  },
});
