export class Timers {

  static wait(duration: number): Promise<void> {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, duration);
    });
  }

  static clock() {
    return new Clock();
  }

}

export class Clock {

  private startTime: number = 0;

  start() {
    this.startTime = Date.now();
    return this;
  }

  elapsed() {
    return Date.now() - this.startTime;
  }

  hasElaspsed(interval: number) {
    return this.elapsed() >= interval;
  }

}
