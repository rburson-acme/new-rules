import { EventOutput } from '@/src/components/admin-tools/event-editor/EventOutput';
import { getComponentTypes } from '@/src/components/template/componentTypes';
import { Interaction } from '@/src/components/template/Interaction';
import { useModal } from '@/src/contexts/ModalContext';
import { useTheme } from '@/src/contexts/ThemeContext';
import { InteractionStore } from '@/src/stores/InteractionStore';
import { RootStore } from '@/src/stores/RootStore';
import { useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PatternModel } from 'thredlib';

export default function PatternManagerModal() {
  const { modalData } = useModal<PatternModel>();
  const navigation = useNavigation();
  const { patternsStore } = RootStore.get();
  const { colors } = useTheme();

  const patternStore = patternsStore.patterns.find(patterns => patterns.pattern.id === modalData.id);

  useEffect(() => {
    navigation.setOptions({ title: `${modalData.name} Interactions` });
  }, [navigation]);

  //   TODO: Figure out how to define xpr in this context
  //   TODO: Figure out how to show an interaction only when the previous one is complete
  return (
    <View style={[styles.containerStyle, { backgroundColor: colors.background }]}>
      {patternStore?.pattern.reactions.map((reaction, index) => {
        return (
          <View key={index} style={{ paddingHorizontal: 16 }}>
            <Text>Reaction {index + 1}</Text>
            {reaction.condition.transform?.eventDataTemplate?.advice?.template?.interactions.map(
              (interaction, interactionIndex) => {
                return (
                  <Interaction
                    interactionStore={new InteractionStore(interaction)}
                    componentTypes={getComponentTypes()}
                  />
                );
              },
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  containerStyle: {
    flexDirection: 'column',
    alignItems: 'stretch',
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  dateStampStyle: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 8,
    alignSelf: 'center',
    borderRadius: 4,
    marginBottom: 16,
  },
});
