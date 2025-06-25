export class DurableTimer {
    startTime = 0;
    timeoutId = null;
    hasFinished = false;
    duration = 0;
    finished = () => { };
    start(duration, finished) {
        this.stop();
        this.duration = duration;
        this.finished = finished;
        this.startTime = Date.now();
        this.timeoutId = setTimeout(() => {
            this.hasFinished = true;
            finished();
        }, duration);
    }
    resume() {
        if (this.hasFinished || !this.startTime)
            return;
        this.timeoutId && clearTimeout(this.timeoutId);
        const remaining = this.duration - (Date.now() - this.startTime);
        if (remaining <= 0) {
            this.hasFinished = true;
            this.finished();
        }
        else
            this.timeoutId = setTimeout(() => {
                this.hasFinished = true;
                this.finished();
            }, remaining);
    }
    stop() {
        this.startTime = this.duration = 0;
        this.hasFinished = false;
        this.finished = () => { };
        this.timeoutId && (clearTimeout(this.timeoutId), (this.timeoutId = null));
    }
}
