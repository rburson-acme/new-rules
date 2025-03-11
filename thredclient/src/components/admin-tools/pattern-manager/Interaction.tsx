import { PatternStore } from '@/src/stores/PatternStore';
import { observer } from 'mobx-react-lite';
import { StyleSheet, View } from 'react-native';
import { InteractionModel } from 'thredlib';
import { MediumText } from '../../common/MediumText';
import { Content } from './Content';
import { InteractionPicker } from './InteractionPicker';
import { Button } from '../../common/Button';
import { toJS } from 'mobx';

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
            const path = `${pathSoFar}.interaction.content`;
            return (
              <View style={{ justifyContent: 'space-between', flexDirection: 'row' }} key={index}>
                <Content
                  key={index}
                  content={content}
                  index={index}
                  pathSoFar={`${path}.${index}`}
                  patternStore={patternStore}
                />
                <Button
                  content={'Remove Content'}
                  onPress={() => {
                    patternStore.removeContent(interactionIndex, reactionIndex, index, path);
                  }}
                />
              </View>
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
