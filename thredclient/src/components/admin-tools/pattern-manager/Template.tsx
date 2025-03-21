import { StyleSheet, View } from 'react-native';
import { PatternInput } from './PatternInput';
import { observer } from 'mobx-react-lite';
import { TemplateModel } from 'thredlib';
import { PatternStore } from '@/src/stores/PatternStore';
import { MediumText } from '../../common/MediumText';
import { Interaction } from './Interaction';
import { Button } from '../../common/Button';
import { Fragment } from 'react';

type TemplateProps = { index: number; template: TemplateModel; patternStore: PatternStore };
export const Template = observer(({ index, template, patternStore }: TemplateProps) => {
  return (
    <View style={styles.templateContainer}>
      <PatternInput
        value={template.name || ''}
        name={'Name'}
        updatePath={`reactions.${index}.condition.transform.eventDataTemplate.advice.template.name`}
        patternStore={patternStore}
      />
      <PatternInput
        value={template?.description || ''}
        name={'Description'}
        updatePath={`reactions.${index}.condition.transform.eventDataTemplate.advice.template.description`}
        patternStore={patternStore}
      />
      <MediumText>Interactions:</MediumText>
      {template?.interactions?.map((interaction, interactionIndex) => {
        const pathSoFar = `reactions.${index}.condition.transform.eventDataTemplate.advice.template.interactions`;
        return (
          <Fragment key={index}>
            <Interaction
              pathSoFar={`${pathSoFar}.${interactionIndex}`}
              interactionIndex={interactionIndex}
              reactionIndex={index}
              interaction={interaction}
              patternStore={patternStore}
            />
            <Button
              content={'Remove Interaction'}
              onPress={() => {
                patternStore.removeInteraction(interactionIndex, index, pathSoFar);
              }}
            />
          </Fragment>
        );
      })}
      <Button
        content={'Add Interaction'}
        onPress={() => {
          patternStore.addInteraction(
            index,
            `reactions.${index}.condition.transform.eventDataTemplate.advice.template.interactions`,
          );
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  templateContainer: {
    marginLeft: 16,
    paddingTop: 8,
    gap: 8,
  },
});
