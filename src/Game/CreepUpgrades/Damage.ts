import { CreepUpgrade } from "./CreepUpgrade";

export class Damage extends CreepUpgrade {
  public readonly upgradeTypeId: number = FourCC("R000");
  public readonly icon: string =
    "ReplaceableTextures/CommandButtons/BTNUnholyStrength.blp";
  public readonly description = (level: number) =>
    `Increases basic attack damage by |cffffcc00${(level - 1) * 10}% => ${
      level * 10
    }%|r.`;
}
