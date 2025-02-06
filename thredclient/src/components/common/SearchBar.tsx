import { View, TextInput, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '@/src/contexts/ThemeContext';

type SearchBarProps = {
  onChange: (text: string) => void;
  value: string;
  placeholder?: string;
};
const SearchBar = ({ onChange, value, placeholder = 'Search...' }: SearchBarProps) => {
  const { colors, fonts } = useTheme();
  return (
    <View style={styles.container}>
      <TextInput
        value={value}
        style={[
          styles.input,
          fonts.medium,
          {
            borderColor: colors.border,
          },
        ]}
        placeholder={placeholder}
        onChangeText={onChange}
        placeholderTextColor={colors.icon}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Ionicons name="search" size={20} color={colors.icon} style={styles.absoluteIcon} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: '100%',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    padding: 4,
    borderRadius: 4,
    paddingLeft: 16,
    height: 48,
    fontSize: 16,
    width: '100%',
  },
  absoluteIcon: {
    position: 'absolute',
    right: 25,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
});

export default SearchBar;
