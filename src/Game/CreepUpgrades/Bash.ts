import { CreepUpgrade } from "./CreepUpgrade";

export class Bash extends CreepUpgrade {
  public readonly upgradeTypeId: number = FourCC("R008");
  public readonly maxLevel: number = 1;
  public readonly icon: string =
    "ReplaceableTextures/CommandButtons/BTNBash.blp";
  public readonly description = () =>
    "Gives all melee units the |cffffcc00Bash|r ability:|n- Gives a 15% chance that an attack will do 250 bonus damage and stun an opponent for 0.6 seconds.";
}
