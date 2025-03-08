import type { Unit } from "w3ts";

export class Vehicle {
  public readonly upgradeMap = new Map<string, number>();
  public readonly skillMap = new Map<number, number>();
  public readonly cooldowns = new Map<string, number>();
  public readonly weapons: string[] = [];
  public unit: Unit | null = null;
  public weaponLimit: number = 4;
  public lastKnownX: number = 0;
  public lastKnownY: number = 0;
}
