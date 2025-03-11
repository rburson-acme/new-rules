import { StyleProp, ViewStyle, TextInput as RNTextInput, InputModeOptions, TextStyle } from 'react-native';

type TextInputProps = {
  onChangeText: (text: string) => void;
  value?: string;
  style?: StyleProp<TextStyle>;
  multiline?: boolean;
  inputMode?: InputModeOptions;
};

export const TextInput = ({ onChangeText, multiline = false, value, style, inputMode }: TextInputProps) => {
  return (
    <RNTextInput multiline={multiline} style={style} inputMode={inputMode} onChangeText={onChangeText} value={value} />
  );
};
