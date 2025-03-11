import { PatternStore } from '@/src/stores/PatternStore';
import { observer } from 'mobx-react-lite';
import { StyleSheet, View } from 'react-native';
import { TransitionModel } from 'thredlib';
import { PatternInput } from './PatternInput';
import { PatternDropdown } from './PatternDropdown';

const transitionInputItems = [
  { display: 'Default', value: 'default' },
  { display: 'Forward', value: 'forward' },
  { display: 'Local', value: 'local' },
];
type TransitionProps = { index: number; transition: TransitionModel; patternStore: PatternStore };
export const Transition = observer(({ index, transition, patternStore }: TransitionProps) => {
  return (
    <View style={styles.transitionContainer}>
      <PatternInput
        value={transition.name || ''}
        name={'Name'}
        updatePath={`reactions.${index}.condition.transition.name`}
        patternStore={patternStore}
      />
      <PatternInput
        value={transition.description || ''}
        name={'Name'}
        updatePath={`reactions.${index}.condition.transition.description`}
        patternStore={patternStore}
      />
      <PatternInput
        value={transition.localName || ''}
        name={'Local Name'}
        updatePath={`reactions.${index}.condition.transition.localName`}
        patternStore={patternStore}
      />
      <PatternDropdown
        items={transitionInputItems}
        name="Input Type"
        value={transition?.input || 'default'}
        updatePath={`reactions.${index}.condition.type`}
        patternStore={patternStore}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  transitionContainer: {
    marginLeft: 16,
    paddingTop: 8,
    gap: 8,
  },
});
