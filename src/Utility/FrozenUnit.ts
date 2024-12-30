import type { Unit } from "w3ts";

export class FrozenUnit {
  public hasDeepFreeze: boolean;
  public readonly permafrost: boolean;
  public readonly hasIceShards: boolean;
  private readonly unit: Unit;
  private duration: number;

  constructor(
    unit: Unit,
    duration: number,
    permafrost: boolean,
    hasIceShards: boolean,
    hasDeepFreeze: boolean
  ) {
    this.permafrost = permafrost;
    this.hasIceShards = hasIceShards;
    this.hasDeepFreeze = hasDeepFreeze;
    this.unit = unit;
    this.duration = duration;
  }

  public getUnit(): Unit {
    return this.unit;
  }

  public addDuration(duration: number): void {
    this.duration += duration;
  }

  public getDuration(): number {
    return this.duration;
  }

  public setDuration(duration: number): void {
    this.duration = duration;
  }
}
