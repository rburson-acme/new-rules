import { Text } from '@/src/components/template/Text';
import React from 'react';
import { StyleProp, StyleSheet, TextStyle, View } from 'react-native';
import { InteractionStore } from '@/src/stores/InteractionStore';
import { InputType, Set } from './InputTypes/InputType';

/**
 * Input types - these give the server a hint on how to handle the input
 * The following types are supported in addition an Array of any of these types
 * nominal - a known set of text values (i.e. ['green', 'blue', 'purple'])
 * ordinal - a set of values with an order  (i.e. Enum)
 * numeric - a number
 * text - free form text input (i.e. string) Check
 * boolean - true or false
 */

type InputProps = {
  name: string;
  type: 'text' | 'nominal' | 'ordinal' | 'numeric' | 'boolean';
  display: string | React.ReactElement;
  interactionStore: InteractionStore;
  style: StyleProp<TextStyle>;
  set?: Set;
  multiple?: boolean;
};
export const Input = ({ name, type, display, style, set, interactionStore, multiple = false }: InputProps) => {
  return (
    <View style={styles.containerStyle}>
      {typeof display === 'string' ? <Text value={display} style={styles.style} /> : display}
      <InputType name={name} type={type} interactionStore={interactionStore} set={set} multiple={multiple} />
    </View>
  );
};

const styles = StyleSheet.create({
  style: {
    padding: 4,
  },
  containerStyle: {
    gap: 36,
  },
});
