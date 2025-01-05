import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";

export class MagicSentry extends VehicleUpgrade {
  public readonly name = "Magic Sentry";
  public readonly rarity = VehicleUpgradeRarity.RARE;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNMagicalSentry.blp";
  public readonly cost = 350;
  public readonly maxLevel = 1;
  public readonly description = "TODO: Write description";

  public applyUpgrade(_vehicle: Vehicle): void {
    // Intentionally left empty
  }
}
