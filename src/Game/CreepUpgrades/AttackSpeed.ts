import { CreepUpgrade } from "./CreepUpgrade";

export class AttackSpeed extends CreepUpgrade {
  public readonly name: string = "Attack Speed";
  public readonly upgradeTypeId: number = FourCC("R002");
  public readonly icon: string =
    "ReplaceableTextures/CommandButtons/BTNGhoulFrenzy.blp";
  public readonly description = (level: number) =>
    `Increases attack speed by |cffffcc00+${(level - 1) * 25}% => +${
      level * 25
    }%|r.`;
}
