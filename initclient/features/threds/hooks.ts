import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { eventManagerClient } from '@/features/connection/eventManagerClient';
import { maybeNotify } from '@/features/connection/useConnectionStore';
import { useConnectionStore } from '@/features/connection/useConnectionStore';
import type { Event } from 'thredlib';

/** Subscribe to real-time push events and invalidate thred/event caches. */
export function useWatchThreds() {
  const queryClient = useQueryClient();
  const hasConnection = useConnectionStore((s) => s.hasConnection);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!hasConnection) return;

    unsubRef.current = eventManagerClient.addConsumer((event: Event) => {
      // Invalidate relevant caches so TanStack Query refetches
      queryClient.invalidateQueries({ queryKey: ['threds'] });
      if (event.thredId) {
        queryClient.invalidateQueries({
          queryKey: ['thredEvents', event.thredId],
        });
      }
      maybeNotify(event);
    });

    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [hasConnection, queryClient]);
}
