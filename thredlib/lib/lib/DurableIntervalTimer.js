export class DurableIntervalTimer {
    startTime = 0;
    intervalId = null;
    isStopped = true;
    interval = 0;
    callback = () => { };
    start(interval, callback) {
        this.stop();
        this.interval = interval;
        this.callback = callback;
        this.startTime = Date.now();
        this.isStopped = false;
        this.intervalId = setInterval(callback, interval);
    }
    resume() {
        if (this.isStopped || !this.startTime)
            return;
        this.intervalId && clearInterval(this.intervalId);
        const elapsed = (Date.now() - this.startTime) % this.interval;
        const remaining = this.interval - elapsed;
        setTimeout(() => {
            if (!this.isStopped) {
                this.callback();
                this.intervalId = setInterval(this.callback, this.interval);
            }
        }, remaining);
    }
    stop() {
        this.startTime = this.interval = 0;
        this.isStopped = true;
        this.callback = () => { };
        this.intervalId && (clearInterval(this.intervalId), (this.intervalId = null));
    }
}
