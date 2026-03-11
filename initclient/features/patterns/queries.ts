import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  SystemEvents,
  EventHelper,
  Event,
  PatternModel,
} from 'thredlib';
import { useConnectionStore } from '@/features/connection/useConnectionStore';
import { useAuthStore } from '@/features/auth/useAuthStore';

function getSource(userId: string): Event['source'] {
  return { id: userId, name: userId };
}

export function usePatternsQuery() {
  const exchange = useConnectionStore((s) => s.exchange);
  const userId = useAuthStore((s) => s.userId);

  return useQuery({
    queryKey: ['patterns', userId],
    queryFn: () =>
      new Promise<PatternModel[]>((resolve, reject) => {
        if (!userId) return reject(new Error('Not authenticated'));
        const event = SystemEvents.getFindAllPatternsEvent(getSource(userId));
        exchange(event, (response) => {
          const helper = new EventHelper(response);
          const result = helper.valueNamed('result') as any;
          const patterns = Array.isArray(result)
            ? result[0]
            : result;
          Array.isArray(patterns)
            ? resolve(patterns)
            : reject(new Error('Failed to fetch patterns'));
        });
      }),
    enabled: !!userId,
  });
}

export function useSavePatternMutation() {
  const exchange = useConnectionStore((s) => s.exchange);
  const userId = useAuthStore((s) => s.userId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pattern: PatternModel) =>
      new Promise<string>((resolve, reject) => {
        if (!userId) return reject(new Error('Not authenticated'));
        const event = SystemEvents.getSavePatternEvent(
          pattern,
          getSource(userId),
        );
        exchange(event, (response) => {
          const helper = new EventHelper(response);
          const result = helper.valueNamed('result') as any;
          const id = Array.isArray(result) ? result[0] : result;
          typeof id === 'string'
            ? resolve(id)
            : reject(new Error('Failed to save pattern'));
        });
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patterns'] });
    },
  });
}

export function useUpdatePatternMutation() {
  const exchange = useConnectionStore((s) => s.exchange);
  const userId = useAuthStore((s) => s.userId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      patternId,
      updateValues,
    }: {
      patternId: string;
      updateValues: Record<string, any>;
    }) =>
      new Promise<void>((resolve, reject) => {
        if (!userId) return reject(new Error('Not authenticated'));
        const event = SystemEvents.getUpdatePatternEvent(
          patternId,
          getSource(userId),
          updateValues,
        );
        exchange(event, () => resolve());
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patterns'] });
    },
  });
}

export function useDeletePatternMutation() {
  const exchange = useConnectionStore((s) => s.exchange);
  const userId = useAuthStore((s) => s.userId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patternId: string) =>
      new Promise<void>((resolve, reject) => {
        if (!userId) return reject(new Error('Not authenticated'));
        const event = SystemEvents.getDeletePatternEvent(
          patternId,
          getSource(userId),
        );
        exchange(event, () => resolve());
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patterns'] });
    },
  });
}
