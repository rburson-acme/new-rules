import { PatternStore } from '@/src/stores/PatternStore';
import { observer } from 'mobx-react-lite';
import { StyleSheet, View } from 'react-native';
import { EventData } from 'thredlib';
import { PatternInput } from './PatternInput';
import { MediumText } from '../../common/MediumText';
import { Button } from '../../common/Button';
import { Template } from './Template';

type EventDataTemplateProps = { index: number; eventDataTemplate: EventData; patternStore: PatternStore };
export const EventDataTemplate = observer(({ index, eventDataTemplate, patternStore }: EventDataTemplateProps) => {
  return (
    <View style={styles.eventDataTemplateContainer}>
      <PatternInput
        value={eventDataTemplate.title || ''}
        name={'Title'}
        updatePath={`reactions.${index}.condition.transform.eventDataTemplate.title`}
        patternStore={patternStore}
      />
      <PatternInput
        value={eventDataTemplate.description || ''}
        name={'Description'}
        updatePath={`reactions.${index}.condition.transform.eventDataTemplate.description`}
        patternStore={patternStore}
      />
      <PatternInput
        value={eventDataTemplate.display?.uri || ''}
        name={'Display URI'}
        updatePath={`reactions.${index}.condition.transform.eventDataTemplate.display.uri`}
        patternStore={patternStore}
      />
      <MediumText>Advice:</MediumText>
      <View style={styles.subContainer}>
        <PatternInput
          value={eventDataTemplate.advice?.title || ''}
          name={'Title'}
          updatePath={`reactions.${index}.condition.transform.eventDataTemplate.advice.title`}
          patternStore={patternStore}
        />
        <PatternInput
          value={eventDataTemplate.advice?.eventType || ''}
          name={'Type'}
          updatePath={`reactions.${index}.condition.transform.eventDataTemplate.advice.eventType`}
          patternStore={patternStore}
        />
        <MediumText>Template:</MediumText>
        {eventDataTemplate.advice?.template ? (
          <Template index={index} patternStore={patternStore} template={eventDataTemplate.advice?.template} />
        ) : (
          <Button content={'Add Template'} onPress={() => patternStore.addTemplate(index)} />
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  eventDataTemplateContainer: {
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
