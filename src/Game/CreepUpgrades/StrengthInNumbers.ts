import { MapPlayer } from "w3ts";
import { StrengthInNumbersDamageEvent } from "../../Utility/DamageEngine/DamageEvents/StrengthInNumbersDamageEvent";
import { CreepUpgrade } from "./CreepUpgrade";

export class StrengthInNumbers extends CreepUpgrade {
  public readonly name: string = "Strength In Numbers";
  public readonly upgradeTypeId: number = FourCC("R009");
  public readonly maxLevel: number = 1;
  public readonly icon: string =
    "ReplaceableTextures/CommandButtons/BTNSkeletonMage.blp";
  public readonly description = () =>
    "Gives all units the |cffffcc00Strength In Numbers|r ability:|n- Reduces damage taken from all sources by 1.1% for each other scourge unit alive up to a maximum damage reduction of 25%.";

  public apply(_level: number, scourgePlayer: MapPlayer): void {
    StrengthInNumbersDamageEvent.IS_ENABLED[scourgePlayer.id] = true;
    scourgePlayer.addTechResearched(this.upgradeTypeId, 1);
  }
}
