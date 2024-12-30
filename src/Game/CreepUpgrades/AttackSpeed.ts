import { CreepUpgrade } from "./CreepUpgrade";

export class AttackSpeed extends CreepUpgrade {
  public readonly name: string = "Attack Speed";
  public readonly upgradeTypeId: number = FourCC("R002");
}
