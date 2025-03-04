import { CreepUpgrade } from "./CreepUpgrade";

export class Health extends CreepUpgrade {
  public readonly upgradeTypeId: number = FourCC("R003");
  public readonly icon: string =
    "ReplaceableTextures/CommandButtons/BTNPeriapt.blp";
  public readonly description = (level: number) =>
    `Increases hit points by |cffffcc00${(level - 1) * 20}% => ${
      level * 20
    }%|r.`;
}
