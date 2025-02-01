import { useRef } from 'react';

export function useRunOnInterval(callback: () => void, interval: number) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startInterval = () => {
    if (intervalRef.current) return; // Prevent multiple intervals
    callback(); // Run immediately
    intervalRef.current = setInterval(callback, interval);
  };

  const stopInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  return { startInterval, stopInterval };
}
