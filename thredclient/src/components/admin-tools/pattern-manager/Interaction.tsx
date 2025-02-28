import { PatternStore } from '@/src/stores/PatternStore';
import { observer } from 'mobx-react-lite';
import { StyleSheet, View } from 'react-native';
import { InteractionModel } from 'thredlib';
import { MediumText } from '../../common/MediumText';
import { Content } from './Content';
import { InteractionPicker } from './InteractionPicker';

type InteractionProps = {
  interaction: InteractionModel;
  interactionIndex: number;
  reactionIndex: number;
  patternStore: PatternStore;
  pathSoFar: string;
};

export const Interaction = observer(
  ({ interactionIndex, reactionIndex, interaction, patternStore, pathSoFar }: InteractionProps) => {
    return (
      <View style={styles.interactionContainer}>
        <MediumText>Content:</MediumText>
        <View style={styles.interactionContainer}>
          {interaction.interaction.content.map((content, index) => {
            return (
              <Content
                key={index}
                content={content}
                index={index}
                pathSoFar={`${pathSoFar}.content.${index}`}
                patternStore={patternStore}
              />
            );
          })}
        </View>
        <InteractionPicker
          interactionIndex={interactionIndex}
          patternStore={patternStore}
          reactionIndex={reactionIndex}
        />
        {/* Create button for adding input/image/text/map/video/group. */}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  interactionContainer: {
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
