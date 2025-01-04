import type { Unit } from "w3ts";

let internalIdSeq = 0;
export class Vehicle {
  public readonly internalId: number;
  public readonly customData: unknown;
  public readonly upgradeMap = new Map<string, number>();
  public readonly cooldowns = new Map<string, number>();
  public unit: Unit;
  public readonly weapons: string[];

  constructor(unit: Unit, weapons: string[]) {
    this.internalId = internalIdSeq++;
    this.unit = unit;
    this.weapons = weapons;
  }
}
