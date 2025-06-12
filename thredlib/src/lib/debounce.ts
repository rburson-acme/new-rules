/**
 * Creates a debounced function that delays invoking the provided function until after
 * the specified delay has elapsed since the last time the debounced function was invoked.
 * 
 * @param func - The function to debounce
 * @param delay - The number of milliseconds to delay
 * @param options - Optional configuration object
 * @returns A debounced version of the original function with additional methods
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  options: {
    leading?: boolean;
    trailing?: boolean;
    maxWait?: number;
  } = {}
): T & {
  cancel: () => void;
  flush: () => ReturnType<T> | undefined;
  pending: () => boolean;
} {
  const { leading = false, trailing = true, maxWait } = options;
  
  let timeoutId: NodeJS.Timeout | null = null;
  let maxTimeoutId: NodeJS.Timeout | null = null;
  let lastCallTime: number | null = null;
  let lastInvokeTime = 0;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;
  let result: ReturnType<T>;

  function invokeFunc(time: number): ReturnType<T> {
    const args = lastArgs!;
    const thisArg = lastThis;
    
    lastArgs = null;
    lastThis = null;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  }

  function leadingEdge(time: number): ReturnType<T> {
    // Reset any `maxWait` timer
    lastInvokeTime = time;
    // Start the timer for the trailing edge
    timeoutId = setTimeout(timerExpired, delay);
    // Invoke the leading edge
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time: number): number {
    const timeSinceLastCall = time - lastCallTime!;
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = delay - timeSinceLastCall;

    return maxWait !== undefined
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
  }

  function shouldInvoke(time: number): boolean {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeSinceLastInvoke = time - lastInvokeTime;

    // Either this is the first call, activity has stopped and we're at the
    // trailing edge, the system time has gone backwards, or we've hit the
    // `maxWait` limit
    return (
      lastCallTime === null ||
      timeSinceLastCall >= delay ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  }

  function timerExpired(): ReturnType<T> | undefined {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    // Restart the timer
    timeoutId = setTimeout(timerExpired, remainingWait(time));
    return undefined;
  }

  function trailingEdge(time: number): ReturnType<T> | undefined {
    timeoutId = null;

    // Only invoke if we have `lastArgs` which means `func` has been
    // debounced at least once
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = null;
    lastThis = null;
    return result;
  }

  function cancel(): void {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (maxTimeoutId !== null) {
      clearTimeout(maxTimeoutId);
      maxTimeoutId = null;
    }
    lastInvokeTime = 0;
    lastArgs = null;
    lastCallTime = null;
    lastThis = null;
  }

  function flush(): ReturnType<T> | undefined {
    return timeoutId === null ? result : trailingEdge(Date.now());
  }

  function pending(): boolean {
    return timeoutId !== null;
  }

  function debounced(this: any, ...args: Parameters<T>): ReturnType<T> | undefined {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timeoutId === null) {
        return leadingEdge(lastCallTime);
      }
      if (maxWait !== undefined) {
        // Handle invocations in a tight loop
        timeoutId = setTimeout(timerExpired, delay);
        return invokeFunc(lastCallTime);
      }
    }
    if (timeoutId === null) {
      timeoutId = setTimeout(timerExpired, delay);
    }
    return result;
  }

  debounced.cancel = cancel;
  debounced.flush = flush;
  debounced.pending = pending;

  return debounced as T & {
    cancel: () => void;
    flush: () => ReturnType<T> | undefined;
    pending: () => boolean;
  };
}

// Usage Examples:
/*
// Basic usage
const debouncedSearch = debounce((query: string) => {
  console.log('Searching for:', query);
  // API call here
}, 300);

// With leading edge execution
const debouncedSubmit = debounce(
  (data: any) => {
    console.log('Submitting:', data);
    return data.id;
  },
  500,
  { leading: true, trailing: false }
);

// With maximum wait time
const debouncedSave = debounce(
  (content: string) => {
    console.log('Saving:', content);
  },
  1000,
  { maxWait: 5000 }
);

// Using utility methods
const debouncedLogger = debounce((message: string) => {
  console.log(message);
}, 1000);

// Check if execution is pending
console.log(debouncedLogger.pending()); // false

debouncedLogger('Hello');
console.log(debouncedLogger.pending()); // true

// Cancel pending execution
debouncedLogger.cancel();

// Force immediate execution
debouncedLogger('Immediate');
debouncedLogger.flush();
*/