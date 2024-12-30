import { MapPlayer } from "w3ts/index";

export abstract class CreepUpgrade {
  public readonly name: string = this.constructor.name;
  public abstract readonly upgradeTypeId: number;
  public readonly maxLevel: number = 10;
  public currentLevel: number = 0;

  public apply(): void {
    this.currentLevel++;
    const hordePlayer = MapPlayer.fromIndex(23);
    hordePlayer.addTechResearched(this.upgradeTypeId, 1);
  }
}
