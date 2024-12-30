import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";

export class Dummy9 extends VehicleUpgrade {
  public readonly rarity = VehicleUpgradeRarity.LEGENDARY;
  public readonly icon =
    "ReplaceableTextures/WorldEditUI/DoodadPlaceholder.blp";
  public readonly cost = 0;
  public readonly description = "TODO: Write description";

  public applyUpgrade(vehicle: Vehicle): void {
    // Intentionally left empty
  }
}
