/**
 * Creates a debounced function that delays invoking the provided function until after
 * the specified delay has elapsed since the last time the debounced function was invoked.
 *
 * @param func - The function to debounce
 * @param delay - The number of milliseconds to delay
 * @param options - Optional configuration object
 * @returns A debounced version of the original function with additional methods
 */
export declare function debounce<T extends (...args: any[]) => any>(func: T, delay: number, options?: {
    leading?: boolean;
    trailing?: boolean;
    maxWait?: number;
}): T & {
    cancel: () => void;
    flush: () => ReturnType<T> | undefined;
    pending: () => boolean;
};
