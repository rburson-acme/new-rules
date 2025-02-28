import { PatternStore } from '@/src/stores/PatternStore';
import { observer } from 'mobx-react-lite';
import { StyleSheet, View } from 'react-native';
import { TransformModel } from 'thredlib';
import { PatternInput } from './PatternInput';
import { MediumText } from '../../common/MediumText';
import { Button } from '../../common/Button';
import { EventDataTemplate } from './EventDataTemplate';

type TransformProps = { index: number; transform: TransformModel; patternStore: PatternStore };
export const Transform = observer(({ index, transform, patternStore }: TransformProps) => {
  return (
    <View style={styles.transformContainer}>
      <PatternInput
        value={transform?.description || ''}
        name={'Description'}
        updatePath={`reactions.${index}.condition.transform.description`}
        patternStore={patternStore}
      />
      <PatternInput
        value={transform?.templateXpr || ''}
        name={'Expression'}
        updatePath={`reactions.${index}.condition.transform.templateXpr`}
        patternStore={patternStore}
      />
      <MediumText>Event Data Template:</MediumText>
      <View style={styles.subContainer}>
        {transform?.eventDataTemplate ? (
          <EventDataTemplate
            index={index}
            eventDataTemplate={transform.eventDataTemplate}
            patternStore={patternStore}
          />
        ) : (
          <Button content={'Add Event Data Template'} onPress={() => patternStore.addEventDataTemplate(index)} />
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  transformContainer: {
    marginLeft: 16,
    paddingTop: 8,
    gap: 8,
  },
  subContainer: {
    marginLeft: 16,
    paddingTop: 8,
    gap: 8,
  },
});
