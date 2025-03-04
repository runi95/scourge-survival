import { CreepUpgrade } from "./CreepUpgrade";

export class MagicResistance extends CreepUpgrade {
  public readonly name: string = "Magic Resistance";
  public readonly upgradeTypeId: number = FourCC("R007");
  public readonly maxLevel: number = 1;
  public readonly icon: string =
    "ReplaceableTextures/CommandButtons/BTNGenericSpellImmunity.blp";
  public readonly description = () =>
    "Gives the all units the |cffffcc00Magic Resistance|r ability:|n- Reduces the damage taken from spells and Magic attacks by 20%.";
}
