import { MapPlayer } from "w3ts/index";

export abstract class CreepUpgrade {
  public readonly name: string = this.constructor.name;
  public abstract readonly upgradeTypeId: number;
  public readonly maxLevel: number = 10;
  public currentLevel: number = 0;

  public apply(): void {
    this.currentLevel++;

    for (let i = 9; i < 18; i++) {
      const scourgePlayer = MapPlayer.fromIndex(i);
      scourgePlayer.addTechResearched(this.upgradeTypeId, 1);
    }
  }
}
