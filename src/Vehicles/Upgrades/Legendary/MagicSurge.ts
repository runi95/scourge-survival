import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";

export class MagicSurge extends VehicleUpgrade {
  public readonly name = "Magic Surge";
  public readonly rarity = VehicleUpgradeRarity.LEGENDARY;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNControlMagic.blp";
  public readonly cost = 500;
  public readonly maxLevel = 1;
  public readonly description = "Increases damage dealt by % of missing mana.";

  public applyUpgrade(_vehicle: Vehicle): void {
    // Intentionally left empty
  }
}
