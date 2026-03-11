import { useEffect } from 'react';
import { ThredList } from '@/features/threds/components/ThredList';
import { useWatchThreds } from '@/features/threds/hooks';
import { useConnectionStore } from '@/features/connection/useConnectionStore';
import { useAuthStore } from '@/features/auth/useAuthStore';

export default function ThredsScreen() {
  const userId = useAuthStore((s) => s.userId);
  const connect = useConnectionStore((s) => s.connect);
  const hasConnection = useConnectionStore((s) => s.hasConnection);

  useEffect(() => {
    if (userId && !hasConnection) {
      connect(userId);
    }
  }, [userId, hasConnection, connect]);

  useWatchThreds();

  return <ThredList />;
}
