import { CreepUpgrade } from "./CreepUpgrade";

export class Armor extends CreepUpgrade {
  public readonly upgradeTypeId: number = FourCC("R001");
  public readonly icon: string =
    "ReplaceableTextures/CommandButtons/BTNUnholyArmor.blp";
  public readonly description = (level: number) =>
    `Increases armor by |cffffcc00${(level - 1) * 2} => ${level * 2}|r.`;
}
