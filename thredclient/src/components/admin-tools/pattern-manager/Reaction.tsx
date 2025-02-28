import { observer } from 'mobx-react-lite';
import { StyleSheet, View } from 'react-native';
import { ReactionModel } from 'thredlib';
import { PatternInput } from './PatternInput';
import { PatternStore } from '@/src/stores/PatternStore';
import { MediumText } from '../../common/MediumText';
import { PatternDropdown } from './PatternDropdown';
import { PatternMultiInput } from './PatternMultiInput';
import { Transform } from './Transform';
import { Button } from '../../common/Button';
import { Transition } from './Transition';

type ReactionProps = { index: number; reaction: ReactionModel; patternStore: PatternStore };
export const Reaction = observer(({ index, reaction, patternStore }: ReactionProps) => {
  function getAllowedSources() {
    if (!reaction.allowedSources) return '';
    return reaction.allowedSources;
  }

  function getPublishTo() {
    if (!reaction.condition.publish) return '';
    if (typeof reaction.condition.publish.to === 'string' || Array.isArray(reaction.condition.publish.to)) {
      return reaction.condition.publish.to;
    }

    return 'Not implemented. TODO. Fix this';
  }

  function getXPR() {
    if ('xpr' in reaction.condition) {
      return reaction.condition.xpr;
    }
    return '';
  }

  const reactionItems = [
    { display: 'Filter', value: 'filter' },
    // { display: 'And', value: 'and' },
    // { display: 'Or', value: 'or' },
    // Only allow filter for now
  ];

  return (
    <View style={styles.reactionContainer} key={index}>
      <PatternInput
        value={reaction.name || ''}
        name="Name"
        updatePath={`reactions.${index}.name`}
        patternStore={patternStore}
      />
      <PatternInput
        value={reaction.description || ''}
        name={'Description'}
        updatePath={`reactions.${index}.description`}
        patternStore={patternStore}
      />
      <PatternMultiInput
        name="Allowed Sources"
        values={getAllowedSources()}
        updatePath={`reactions.${index}.allowedSources`}
        patternStore={patternStore}
      />
      <MediumText>Condition:</MediumText>
      <View style={styles.subContainer}>
        <PatternDropdown
          name="Type"
          items={reactionItems}
          value={reaction.condition.type}
          updatePath={`reactions.${index}.condition.type`}
          patternStore={patternStore}
        />
        <PatternInput
          value={reaction.condition.description || ''}
          name={'Description'}
          updatePath={`reactions.${index}.condition.description`}
          patternStore={patternStore}
        />
        <PatternInput
          value={reaction.condition.onTrue?.xpr || ''}
          name={'On True Expression'}
          updatePath={`reactions.${index}.condition.onTrue.xpr`}
          patternStore={patternStore}
        />
        <PatternInput
          name="Expression"
          value={getXPR()}
          updatePath={`reactions.${index}.condition.xpr`}
          patternStore={patternStore}
        />
        <PatternMultiInput
          name="Publish to"
          values={getPublishTo()}
          updatePath={`reactions.${index}.condition.publish.to`}
          patternStore={patternStore}
        />
        {reaction.condition.transform ? (
          <>
            <MediumText>Transform:</MediumText>
            <Transform index={index} patternStore={patternStore} transform={reaction.condition.transform} />
          </>
        ) : (
          <Button
            content={'Add Transform'}
            onPress={() => {
              patternStore.addTransform(index);
            }}
          />
        )}
        {reaction.condition.transition ? (
          <>
            <MediumText>Transition:</MediumText>
            <Transition index={index} patternStore={patternStore} transition={reaction.condition.transition} />
          </>
        ) : (
          <Button
            content="Add Transition"
            onPress={() => {
              patternStore.addTransition(index);
            }}
          />
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  reactionContainer: {
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
