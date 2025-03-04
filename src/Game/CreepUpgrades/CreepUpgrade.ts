import { MapPlayer } from "w3ts/index";

export abstract class CreepUpgrade {
  public readonly name: string = this.constructor.name;
  public abstract readonly upgradeTypeId: number;
  public abstract readonly description: (level: number) => string;
  public abstract readonly icon: string;
  public readonly maxLevel: number = 10;

  public apply(level: number): void {
    for (let i = 9; i < 18; i++) {
      const scourgePlayer = MapPlayer.fromIndex(i);
      scourgePlayer.addTechResearched(this.upgradeTypeId, 1);
    }
  }
}
