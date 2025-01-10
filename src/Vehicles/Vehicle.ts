import type { Unit } from "w3ts";

let internalIdSeq = 0;
export class Vehicle {
  public readonly internalId: number;
  public readonly customData: unknown;
  public readonly upgradeMap = new Map<string, number>();
  public readonly cooldowns = new Map<string, number>();
  public readonly unit: Unit;
  public readonly weapons: string[];
  public lastKnownX: number = 0;
  public lastKnownY: number = 0;

  constructor(unit: Unit, weapons: string[]) {
    this.internalId = internalIdSeq++;
    this.unit = unit;
    this.weapons = weapons;
  }
}
