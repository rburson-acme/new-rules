import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  SystemEvents,
  EventHelper,
  Events,
  Event,
  Thred,
} from 'thredlib';
import { useConnectionStore } from '@/features/connection/useConnectionStore';
import { useAuthStore } from '@/features/auth/useAuthStore';

function getSource(userId: string): Event['source'] {
  return { id: userId, name: userId };
}

export function useAllThredsQuery() {
  const exchange = useConnectionStore((s) => s.exchange);
  const userId = useAuthStore((s) => s.userId);

  return useQuery({
    queryKey: ['adminThreds', userId],
    queryFn: () =>
      new Promise<Thred[]>((resolve, reject) => {
        if (!userId) return reject(new Error('Not authenticated'));
        const event = SystemEvents.getGetThredsEvent(
          getSource(userId),
          'all',
        );
        exchange(event, (response) => {
          const helper = new EventHelper(response);
          const threds = helper.valueNamed('threds') as Thred[] | undefined;
          threds ? resolve(threds) : reject(new Error('Failed to fetch threds'));
        });
      }),
    enabled: !!userId,
  });
}

export function useTerminateAllThredsMutation() {
  const exchange = useConnectionStore((s) => s.exchange);
  const userId = useAuthStore((s) => s.userId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      new Promise<void>((resolve, reject) => {
        if (!userId) return reject(new Error('Not authenticated'));
        const event = SystemEvents.getTerminateAllThredsEvent(
          getSource(userId),
        );
        exchange(event, () => {
          resolve();
        });
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminThreds'] });
      queryClient.invalidateQueries({ queryKey: ['threds'] });
    },
  });
}
