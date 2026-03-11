import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  SystemEvents,
  BuiltInEvents,
  Events,
  Event,
  Thred,
  ThredStatus,
} from 'thredlib';
import type { EventRecord } from 'thredlib/persistence/EventRecord';
import { useConnectionStore } from '@/features/connection/useConnectionStore';
import { useAuthStore } from '@/features/auth/useAuthStore';
import type { ThredTab } from './useThredsStore';

export interface ThredWithLastEvent {
  thred: Thred;
  lastEvent: EventRecord | null;
}

const TAB_TO_STATUS: Record<ThredTab, ThredStatus | undefined> = {
  active: ThredStatus.ACTIVE,
  completed: ThredStatus.FINISHED,
  archived: ThredStatus.TERMINATED,
};

function getSource(userId: string): Event['source'] {
  return { id: userId, name: userId };
}

export function useThredsQuery(tab: ThredTab) {
  const exchange = useConnectionStore((s) => s.exchange);
  const userId = useAuthStore((s) => s.userId);

  return useQuery({
    queryKey: ['threds', userId, tab],
    queryFn: () =>
      new Promise<ThredWithLastEvent[]>((resolve, reject) => {
        if (!userId) return reject(new Error('Not authenticated'));
        const event = SystemEvents.getGetUserThredsEvent(
          getSource(userId),
          'all',
        );
        exchange(event, (response) => {
          const values = Events.getValues(response) as
            | { results: ThredWithLastEvent[] }
            | undefined;
          if (values?.results) {
            const status = TAB_TO_STATUS[tab];
            const filtered = status
              ? values.results.filter((r) => r.thred.status === status)
              : values.results;
            resolve(filtered);
          } else {
            reject(new Error('Failed to fetch threds'));
          }
        });
      }),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useThredEventsQuery(thredId: string) {
  const exchange = useConnectionStore((s) => s.exchange);
  const userId = useAuthStore((s) => s.userId);

  return useQuery({
    queryKey: ['thredEvents', thredId],
    queryFn: () =>
      new Promise<EventRecord[]>((resolve, reject) => {
        if (!userId) return reject(new Error('Not authenticated'));
        const event = SystemEvents.getGetUserEventsEvent(
          thredId,
          getSource(userId),
        );
        exchange(event, (response) => {
          const values = Events.getValues(response) as
            | { events: EventRecord[] | null }
            | undefined;
          if (values?.events) {
            resolve(values.events);
          } else {
            reject(new Error('Failed to fetch events'));
          }
        });
      }),
    enabled: !!userId && !!thredId,
  });
}

export function useBroadcastMutation(thredId: string) {
  const publish = useConnectionStore((s) => s.publish);
  const userId = useAuthStore((s) => s.userId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (message: string) => {
      if (!userId) throw new Error('Not authenticated');
      const event = BuiltInEvents.getBroadcastMessageEvent(
        thredId,
        getSource(userId),
        message,
      );
      publish(event);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thredEvents', thredId] });
    },
  });
}
