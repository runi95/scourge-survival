import { MapPlayer } from "w3ts";

export abstract class CreepUpgrade {
  public readonly name: string = this.constructor.name;
  public abstract readonly upgradeTypeId: number;
  public abstract readonly description: (level: number) => string;
  public abstract readonly icon: string;
  public readonly maxLevel: number = 10;

  // For the scourge of one player, whose wave it is
  public apply(_level: number, scourgePlayer: MapPlayer): void {
    scourgePlayer.addTechResearched(this.upgradeTypeId, 1);
  }
}
