/* eslint-disable */

export enum LogLevel {
  None = -1,
  Verbose = 0,
  Debug = 1,
  Information = 2,
  Warning = 3,
  Error = 4,
  Fatal = 5,
}

export enum LogEventType {
  Text,
  Parameter,
}

export class LogEvent {
  constructor(
    public readonly Type: LogEventType,
    public readonly Text: string,
    public readonly Value: any
  ) {}
}

export interface ILogSink {
  LogLevel(): LogLevel;
  Log(level: LogLevel, events: LogEvent[]): void;
}

export namespace Log {
  let _sinks: ILogSink[];

  export function Init(this: void, sinks: ILogSink[]): void {
    _sinks = sinks;
  }

  function Parse(this: void, message: string, ...args: any[]): LogEvent[] {
    const logEvents: LogEvent[] = [];

    const matcher = string.gmatch(message, "{.-}") as any; // This has to be cast to "any" or it breaks for some reason
    let match: string;
    let text: string;
    let n = 0;
    let i = 0;
    // @ts-ignore
    while ((match = matcher())) {
      const [s, e] = string.find(message, match, 1, true);
      if (!s || !e) continue; // this should never happen
      text = message.substring(i, s - 1);
      if (text != "")
        logEvents.push(new LogEvent(LogEventType.Text, text, null));
      logEvents.push(new LogEvent(LogEventType.Parameter, match, args[n]));
      i = e;
      n += 1;
    }
    text = message.substring(i);
    if (text != "") logEvents.push(new LogEvent(LogEventType.Text, text, null));

    return logEvents;
  }

  export function Log(
    this: void,
    level: LogLevel,
    message: string,
    ...args: any[]
  ): void {
    const logEvents = Parse(message, ...args);
    for (let index = 0; index < _sinks.length; index++) {
      if (_sinks[index].LogLevel() <= level) {
        _sinks[index].Log(level, logEvents);
      }
    }
  }

  export function Fatal(this: void, message: string, ...args: any[]): void {
    Log(LogLevel.Fatal, message, ...args);
  }

  export function Error(this: void, message: string, ...args: any[]): void {
    Log(LogLevel.Error, message, ...args);
  }

  export function Warning(this: void, message: string, ...args: any[]): void {
    Log(LogLevel.Warning, message, ...args);
  }

  export function Information(
    this: void,
    message: string,
    ...args: any[]
  ): void {
    Log(LogLevel.Information, message, ...args);
  }

  export function Debug(this: void, message: string, ...args: any[]): void {
    Log(LogLevel.Debug, message, ...args);
  }

  export function Verbose(this: void, message: string, ...args: any[]): void {
    Log(LogLevel.Verbose, message, ...args);
  }
}
