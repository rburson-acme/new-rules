export declare class DurableIntervalTimer {
    private startTime;
    private intervalId;
    private isStopped;
    private interval;
    private callback;
    start(interval: number, callback: () => void): void;
    resume(): void;
    stop(): void;
}
