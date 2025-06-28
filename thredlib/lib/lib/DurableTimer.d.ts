export declare class DurableTimer {
    private startTime;
    private timeoutId;
    private hasFinished;
    private duration;
    private finished;
    private _onFinished;
    start(duration: number, finished: () => void): void;
    resume(): void;
    stop(): void;
}
