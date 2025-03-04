import { CreepUpgrade } from "./CreepUpgrade";

export class HitPointRegeneration extends CreepUpgrade {
  public readonly name: string = "Hit Point Regeneration";
  public readonly upgradeTypeId: number = FourCC("R004");
  public readonly icon: string =
    "ReplaceableTextures/CommandButtons/BTNSkeletalLongevity.blp";
  public readonly description = (level: number) =>
    `Increases hit point regeneration by |cffffcc00${(level - 1) * 80}% => ${
      level * 80
    }%|r.`;
}
