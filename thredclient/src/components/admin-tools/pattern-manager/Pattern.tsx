import { PatternStore } from '@/src/stores/PatternStore';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Reaction } from './Reaction';
import { PatternInput } from './PatternInput';
import { observer } from 'mobx-react-lite';
import { MediumText } from '../../common/MediumText';
import { Button } from '../../common/Button';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useModal } from '@/src/contexts/ModalContext';
import { PatternModel } from 'thredlib';
import { useRouter } from 'expo-router';

type PatternProps = { patternStore: PatternStore };
export const Pattern = observer(({ patternStore }: PatternProps) => {
  const { pattern } = patternStore;
  const { colors } = useTheme();
  const router = useRouter();
  const { setModalData } = useModal<PatternModel>();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Button
        content={'View Interactions'}
        onPress={() => {
          setModalData(pattern);
          router.push('admin-tools/pattern-manager/modal');
        }}
      />
      <View style={{ paddingHorizontal: 16 }}>
        <MediumText>Pattern:</MediumText>
        <PatternInput value={pattern.name} name="Name" updatePath="name" patternStore={patternStore} />
        <PatternInput
          name="Description"
          updatePath="description"
          patternStore={patternStore}
          value={pattern.description || ''}
        />
        <MediumText>Reactions:</MediumText>
      </View>
      <View>
        {pattern.reactions.map((reaction, index) => {
          return (
            <View
              key={index}
              style={{
                paddingHorizontal: 16,
                backgroundColor: index % 2 === 0 ? colors.background : colors.secondaryBackground,
              }}>
              <Reaction patternStore={patternStore} key={index} index={index} reaction={reaction} />
              <Button content={'Remove Reaction'} onPress={() => patternStore.removeReaction(index)} />
            </View>
          );
        })}
      </View>
      <Button content={'Add Reaction'} onPress={() => patternStore.addReaction()} />
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    gap: 8,
  },
});
