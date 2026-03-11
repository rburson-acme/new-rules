import { View, Text, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PatternModel, ReactionModel } from 'thredlib';
import { useUpdatePatternMutation } from '../queries';

interface Props {
  pattern: PatternModel;
}

function ReactionCard({
  reaction,
  index,
}: {
  reaction: ReactionModel;
  index: number;
}) {
  const transform = reaction.condition.transform;
  const transition = reaction.condition.transition;

  return (
    <View className="border border-border rounded-lg p-3 gap-2 bg-background-secondary">
      <View className="flex-row justify-between items-center">
        <Text className="text-sm font-semibold text-primary">
          Reaction {index + 1}: {reaction.name || '(unnamed)'}
        </Text>
      </View>
      {reaction.description ? (
        <Text className="text-xs text-icon">{reaction.description}</Text>
      ) : null}
      <Text className="text-xs text-icon">
        Type: {reaction.condition.type} | XPR:{' '}
        {reaction.condition.xpr || '(none)'}
      </Text>
      {transform && (
        <View className="pl-3 border-l-2 border-btn-primary mt-1">
          <Text className="text-xs font-semibold text-primary">Transform</Text>
          {transform.description ? (
            <Text className="text-xs text-icon">{transform.description}</Text>
          ) : null}
          {transform.templateXpr ? (
            <Text className="text-xs text-icon font-mono">
              {transform.templateXpr}
            </Text>
          ) : null}
          {transform.eventDataTemplate?.advice?.template && (
            <View className="mt-1">
              <Text className="text-xs text-icon">
                Template:{' '}
                {transform.eventDataTemplate.advice.template.name || '(unnamed)'}
                {' — '}
                {transform.eventDataTemplate.advice.template.interactions
                  ?.length ?? 0}{' '}
                interaction(s)
              </Text>
            </View>
          )}
        </View>
      )}
      {transition && (
        <View className="pl-3 border-l-2 border-accent mt-1">
          <Text className="text-xs font-semibold text-primary">
            Transition: {transition.name || '(unnamed)'}
          </Text>
          <Text className="text-xs text-icon">
            Input: {transition.input} | Local: {transition.localName}
          </Text>
        </View>
      )}
      <Text className="text-xs text-icon">
        Publish to: {reaction.condition.publish?.to?.join(', ') || '(all)'}
      </Text>
    </View>
  );
}

export function PatternDetail({ pattern }: Props) {
  const updatePattern = useUpdatePatternMutation();

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View>
        <Text className="text-lg font-semibold text-primary">
          {pattern.name}
        </Text>
        {pattern.id ? (
          <Text className="text-xs text-icon">ID: {pattern.id}</Text>
        ) : null}
      </View>

      <Text className="text-sm font-semibold text-primary">
        Reactions ({pattern.reactions?.length ?? 0})
      </Text>

      {pattern.reactions?.map((reaction, i) => (
        <ReactionCard key={i} reaction={reaction} index={i} />
      ))}

      {(!pattern.reactions || pattern.reactions.length === 0) && (
        <Text className="text-sm text-icon text-center py-4">
          No reactions defined
        </Text>
      )}
    </ScrollView>
  );
}
