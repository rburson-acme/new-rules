import { observer } from 'mobx-react-lite';
import { StyleSheet, Text, View } from 'react-native';
import { ReactionModel } from 'thredlib';
import { PatternInput } from './PatternInput';
import { PatternStore } from '@/src/stores/PatternStore';
import { MediumText } from '../../common/MediumText';
import { PatternDropdown } from './PatternDropdown';
import { PatternMultiInput } from './PatternMultiInput';

type ReactionProps = { index: number; reaction: ReactionModel; patternStore: PatternStore };
export const Reaction = observer(({ index, reaction, patternStore }: ReactionProps) => {
  function getAllowedSources() {
    if (!reaction.allowedSources) return '';
    return reaction.allowedSources;
  }

  function getPublishTo() {
    if (!reaction.condition.publish) return '';
    //if it is a string or an array, return it
    if (typeof reaction.condition.publish.to === 'string' || Array.isArray(reaction.condition.publish.to)) {
      return reaction.condition.publish.to;
    }
    //if it is an object, return string "not implemented. TODO. Fix this", return the to property

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
    { display: 'And', value: 'and' },
    { display: 'Or', value: 'or' },
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
      <View style={styles.conditionContainer}>
        <PatternDropdown
          name="Type"
          items={reactionItems}
          value={reaction.condition.type}
          updatePath={`reactions.${index}.condition.type`}
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
  conditionContainer: {
    marginLeft: 16,
    paddingTop: 8,
    gap: 8,
  },
});
