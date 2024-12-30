import { CreepUpgrade } from "./CreepUpgrade";

export class HitPointRegeneration extends CreepUpgrade {
  public readonly name: string = "Hit Point Regeneration";
  public readonly upgradeTypeId: number = FourCC("R004");
}
