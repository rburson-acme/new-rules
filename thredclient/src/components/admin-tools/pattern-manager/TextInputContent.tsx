import { PatternStore } from '@/src/stores/PatternStore';
import { observer } from 'mobx-react-lite';
import { StyleSheet } from 'react-native';
import { InputModel } from 'thredlib';
import { PatternInput } from './PatternInput';

type TextInputContentProps = {
  textInput: InputModel;
  patternStore: PatternStore;
  pathSoFar: string;
};

export const TextInputContent = observer(({ textInput, pathSoFar, patternStore }: TextInputContentProps) => {
  switch (textInput.type) {
    case 'boolean':
      return (
        <>
          <PatternInput
            name="True Display"
            patternStore={patternStore}
            updatePath={`${pathSoFar}.set[0].display`}
            value={textInput.set[0].display || ''}
          />
          <PatternInput
            name="False Display"
            patternStore={patternStore}
            updatePath={`${pathSoFar}.set[0].display`}
            value={textInput.set[1].display || ''}
          />
        </>
      );
    case 'numeric':
    case 'text':
    case 'nominal':
  }
});

const styles = StyleSheet.create({
  interactionContainer: {
    marginLeft: 16,
    paddingTop: 8,
    gap: 8,
  },
});
