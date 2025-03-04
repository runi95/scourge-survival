import { CreepUpgrade } from "./CreepUpgrade";

export class CriticalStrike extends CreepUpgrade {
  public readonly name: string = "Critical Strike";
  public readonly upgradeTypeId: number = FourCC("R006");
  public readonly maxLevel: number = 1;
  public readonly icon: string =
    "ReplaceableTextures/CommandButtons/BTNCriticalStrike.blp";
  public readonly description = () =>
    "Gives all units the |cffffcc00Critical Strike|r ability:|n- Gives a 20% chance to do 2x the normal damage on an attack.";
}
