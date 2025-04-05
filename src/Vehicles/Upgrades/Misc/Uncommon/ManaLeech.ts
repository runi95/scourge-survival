import { Vehicle } from "../../../Vehicle";
import { VehicleUpgrade } from "../../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../../VehicleUpgradeRarity";
import { levelUpStr } from "../../LevelUpStr";

export class ManaLeech extends VehicleUpgrade {
  public readonly name = "Mana Leech";
  public readonly rarity = VehicleUpgradeRarity.UNCOMMON;
  public readonly icon = "ReplaceableTextures/CommandButtons/BTNBrilliance.blp";
  public readonly cost = 200;
  public readonly maxLevel = 5;
  public readonly description = (level: number) =>
    `Regenerate ${levelUpStr(level, 5)} mana whenever an enemy unit is killed`;

  public applyUpgrade(_vehicle: Vehicle): void {
    // Intentionally left empty
  }
}
