import { CreepUpgrade } from "./CreepUpgrade";

export class MagicResistance extends CreepUpgrade {
  public readonly name: string = "Magic Resistance";
  public readonly upgradeTypeId: number = FourCC("R007");
  public readonly maxLevel: number = 1;
}
