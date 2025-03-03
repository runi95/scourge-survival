import { CreepUpgrade } from "./CreepUpgrade";

export class CriticalStrike extends CreepUpgrade {
  public readonly name: string = "Critical Strike";
  public readonly upgradeTypeId: number = FourCC("R006");
  public readonly maxLevel: number = 1;
}
