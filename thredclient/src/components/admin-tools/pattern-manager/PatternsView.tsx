import { Pressable, StyleSheet, View } from 'react-native';
import SearchBar from '../../common/SearchBar';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { PatternsStore } from '@/src/stores/PatternsStore';
import { PatternsList } from './PatternsList';
import { Feather } from '@expo/vector-icons';
import { MediumText } from '../../common/MediumText';
import { TextInput } from '../../common/TextInput';
import { useTheme } from '@/src/contexts/ThemeContext';
import { Button } from '../../common/Button';
import { router } from 'expo-router';

type PatternsViewProps = {
  patternsStore: PatternsStore;
};
export const PatternsView = observer(({ patternsStore }: PatternsViewProps) => {
  const locals = useLocalObservable(() => ({
    showAddInputs: false,
    name: '',
  }));
  const { colors } = useTheme();
  return (
    <View style={[styles.container]}>
      <SearchBar
        value={patternsStore.searchText}
        onChange={value => {
          patternsStore.setSearchText(value);
        }}
      />
      <PatternsList patternsStore={patternsStore} />
      {!locals.showAddInputs ? (
        <Pressable
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          onPress={() => (locals.showAddInputs = true)}>
          <Feather name="plus-circle" size={24} />
          <MediumText>Add New Pattern</MediumText>
        </Pressable>
      ) : (
        <View style={{ gap: 8 }}>
          <View style={{ gap: 4 }}>
            <MediumText>New Pattern Name</MediumText>
            <TextInput
              style={{ backgroundColor: colors.background, width: 300 }}
              onChangeText={text => {
                locals.name = text;
              }}
            />
          </View>
          <Button
            content={'Add New Pattern'}
            onPress={async () => {
              if (!locals.name) return;
              const id = await patternsStore.createPattern({ name: locals.name, reactions: [] });
              locals.showAddInputs = false;
              locals.name = '';
              router.push('/admin-tools/pattern-manager/' + id);
            }}
            buttonStyle={{ alignSelf: 'flex-start' }}
          />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
});
