import { useEffect, useCallback } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event, Events } from 'thredlib';
import type { TemplateModel } from 'thredlib';
import { useTemplateStore } from '../useTemplateStore';
import { useConnectionStore } from '@/features/connection/useConnectionStore';
import { useAuthStore } from '@/features/auth/useAuthStore';
import { InteractionView } from './InteractionView';
import { formatDateAndTime, nextEventId } from '@/lib/utils';

interface Props {
  event: Event;
}

export function TemplateEvent({ event }: Props) {
  const template = event.data?.advice?.template as TemplateModel;
  const eventId = event.id;
  const advice = event.data?.advice;

  const initTemplate = useTemplateStore((s) => s.initTemplate);
  const areAllComplete = useTemplateStore((s) => s.areAllComplete);
  const isInteractionComplete = useTemplateStore(
    (s) => s.isInteractionComplete,
  );
  const setValue = useTemplateStore((s) => s.setValue);
  const getEventContent = useTemplateStore((s) => s.getEventContent);
  const cleanup = useTemplateStore((s) => s.cleanup);

  const publish = useConnectionStore((s) => s.publish);
  const userId = useAuthStore((s) => s.userId);

  useEffect(() => {
    initTemplate(eventId, template);
  }, [eventId, template, initTemplate]);

  const allComplete = areAllComplete(eventId);

  // Auto-publish when all interactions are complete
  useEffect(() => {
    if (!allComplete || !advice?.eventType || !userId) return;

    const content = getEventContent(eventId, template);
    const sourceId = userId;
    const resolvedTitle = advice.title
      ? `${sourceId} responded to '${advice.title}'`
      : `${sourceId} response to an event`;

    const responseEvent = Events.newEvent({
      id: nextEventId(sourceId),
      type: advice.eventType,
      data: { title: resolvedTitle, content },
      thredId: event.thredId,
      source: { id: sourceId, name: sourceId },
      re: eventId,
    });

    publish(responseEvent);
    cleanup(eventId);
  }, [
    allComplete,
    advice,
    userId,
    eventId,
    template,
    event.thredId,
    publish,
    getEventContent,
    cleanup,
  ]);

  const handleSubmit = useCallback(
    (interactionIndex: number) => (name: string, value: any) => {
      setValue(eventId, interactionIndex, name, value);
    },
    [eventId, setValue],
  );

  const icon = event.data?.display?.uri;

  return (
    <View className="flex-row gap-3 mb-4 mx-4">
      <View className="items-center">
        {icon ? (
          <Ionicons name="document-text-outline" size={32} color="#545E75" />
        ) : (
          <Ionicons name="document-text-outline" size={32} color="#545E75" />
        )}
        {event.time ? (
          <Text className="text-[10px] text-icon">
            {formatDateAndTime(event.time)}
          </Text>
        ) : null}
      </View>
      <View className="flex-1 gap-3">
        {allComplete ? (
          <View className="items-center py-2">
            <ActivityIndicator size="small" color="#63ADF2" />
            <Text className="text-xs text-icon mt-1">Sending response...</Text>
          </View>
        ) : (
          template.interactions.map((interaction, index) => (
            <InteractionView
              key={index}
              interaction={interaction}
              onSubmit={handleSubmit(index)}
              isComplete={isInteractionComplete(eventId, index)}
            />
          ))
        )}
      </View>
    </View>
  );
}
