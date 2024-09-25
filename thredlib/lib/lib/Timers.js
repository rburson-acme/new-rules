export class Timers {
    static wait(duration) {
        return new Promise((resolve) => {
            setTimeout(resolve, duration);
        });
    }
    static clock() {
        return new Clock();
    }
}
export class Clock {
    startTime = 0;
    start() {
        this.startTime = Date.now();
        return this;
    }
    elapsed() {
        return Date.now() - this.startTime;
    }
    hasElaspsed(interval) {
        return this.elapsed() >= interval;
    }
}
