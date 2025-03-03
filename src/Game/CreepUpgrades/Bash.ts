import { CreepUpgrade } from "./CreepUpgrade";

export class Bash extends CreepUpgrade {
  public readonly upgradeTypeId: number = FourCC("R008");
  public readonly maxLevel: number = 1;
}
