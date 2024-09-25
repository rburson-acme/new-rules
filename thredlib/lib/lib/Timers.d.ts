export declare class Timers {
    static wait(duration: number): Promise<void>;
    static clock(): Clock;
}
export declare class Clock {
    private startTime;
    start(): this;
    elapsed(): number;
    hasElaspsed(interval: number): boolean;
}
