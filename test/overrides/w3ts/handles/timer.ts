export const timers: Timer[] = [];

let timerIndex: number = 0;
export class Timer {
  public readonly timerIndex;
  private static ON_HANDLE_FUNC_CALLBACK: (t: Timer) => Promise<void> | undefined;
  private isRunning = false;

  constructor() {
    this.timerIndex = timerIndex++;
    timers.push(this);
  }

  public static setOnHandleFunc(cb: (t: Timer) => Promise<void> | undefined) {
    this.ON_HANDLE_FUNC_CALLBACK = cb;
  }

  public start(timeout: number, periodic: boolean, handlerFunc: () => void): Timer {
    this.isRunning = true;
    (async () => {
      while (this.isRunning) {
        if (Timer.ON_HANDLE_FUNC_CALLBACK !== undefined) {
          await Timer.ON_HANDLE_FUNC_CALLBACK(this);
        }

        handlerFunc();
        if (!periodic) {
          this.isRunning = false;
        }
      }
    })();

    return this;
  }

  public destroy(): Timer {
    this.isRunning = false;

    return this;
  }

  public pause(): Timer {
    this.isRunning = false;

    return this;
  }
}
