import { observer } from 'mobx-react-lite';
import { StyleSheet, Text, View } from 'react-native';
import { ReactionModel } from 'thredlib';

import { PatternInput } from './PatternInput';
import { PatternStore } from '@/src/stores/PatternStore';
import { MediumText } from '../../common/MediumText';

type ReactionProps = { index: number; reaction: ReactionModel; patternStore: PatternStore };
export const Reaction = observer(({ index, reaction, patternStore }: ReactionProps) => {
  function getAllowedSources() {
    if (!reaction.allowedSources) return '';
    if (Array.isArray(reaction.allowedSources)) return reaction.allowedSources.join(', ');
    return reaction.allowedSources;
  }

  function getPublishTo() {
    if (!reaction.condition.publish) return '';
    if (typeof reaction.condition.publish.to === 'object') {
      return 'TODO: This needs implemented.';
    }
    return reaction.condition.publish.to;
  }

  function getXPR() {
    if ('xpr' in reaction.condition) {
      return reaction.condition.xpr;
    }
    return '';
  }

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
      <PatternInput
        name="Allowed Sources"
        value={getAllowedSources()}
        updatePath={`reactions.${index}.allowedSources`}
        patternStore={patternStore}
      />
      <MediumText>Condition:</MediumText>
      <View style={styles.conditionContainer}>
        <PatternInput
          name="Type"
          value={reaction.condition.type}
          updatePath={`reactions.${index}.type`}
          patternStore={patternStore}
        />
        <PatternInput
          name="Expression"
          value={getXPR()}
          updatePath={`reactions.${index}.xpr`}
          patternStore={patternStore}
        />
        <PatternInput
          name="Publish to"
          value={getPublishTo()}
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
  },
  conditionContainer: {
    marginLeft: 16,
    paddingTop: 8,
  },
});
