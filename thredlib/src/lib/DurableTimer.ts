export class DurableTimer {
  private startTime = 0;
  private timeoutId: NodeJS.Timeout | null = null;
  private hasFinished = false;
  private duration = 0;
  private finished: () => void = () => {};

  private _onFinished = () => {
    this.hasFinished = true;
    this.finished();
  };

  start(duration: number, finished: () => void) {
    this.stop();
    this.duration = duration;
    this.finished = finished;
    this.startTime = Date.now();
    this.timeoutId = setTimeout(this._onFinished, duration);
  }

  resume() {
    if (this.hasFinished || !this.startTime) return;
    this.timeoutId && clearTimeout(this.timeoutId);
    const remaining = this.duration - (Date.now() - this.startTime);
    if (remaining <= 0) this._onFinished();
    else this.timeoutId = setTimeout(this._onFinished, remaining);
  }

  stop() {
    this.startTime = this.duration = 0;
    this.hasFinished = false;
    this.finished = () => {};
    this.timeoutId && (clearTimeout(this.timeoutId), (this.timeoutId = null));
  }
}
