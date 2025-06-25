export class DurableTimer {
  private startTime = 0;
  private timeoutId: any = null;
  private hasFinished = false;
  private duration = 0;
  private finished = () => {};

  start(duration: number, finished: () => void) {
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
    if (this.hasFinished || !this.startTime) return;
    this.timeoutId && clearTimeout(this.timeoutId);
    const remaining = this.duration - (Date.now() - this.startTime);
    if (remaining <= 0) {
      this.hasFinished = true;
      this.finished();
    } else
      this.timeoutId = setTimeout(() => {
        this.hasFinished = true;
        this.finished();
      }, remaining);
  }

  stop() {
    this.startTime = this.duration = 0;
    this.hasFinished = false;
    this.finished = () => {};
    this.timeoutId && (clearTimeout(this.timeoutId), (this.timeoutId = null));
  }
}
