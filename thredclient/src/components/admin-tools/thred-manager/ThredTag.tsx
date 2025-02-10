import { useTheme } from '@/src/contexts/ThemeContext';
import { ThredStore } from '@/src/stores/ThredStore';
import { StyleSheet, Text, View } from 'react-native';

type ThredTagProps = {
  thredStore: ThredStore;
};

export const ThredTag = ({ thredStore }: ThredTagProps) => {
  //TODO: determine based on the events which tag to use. For now just use 'New'
  const {
    colors,
    fonts: { regular },
  } = useTheme();

  return (
    <View style={[styles.tagContainer, { backgroundColor: colors.redTag }]}>
      <Text style={[regular, { color: colors.invertedText, lineHeight: 14 }]}>New</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tagContainer: {
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    height: 22,
  },
});
