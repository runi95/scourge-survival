import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";

export class BeltOfGiantStrength extends VehicleUpgrade {
  public readonly name = "Belt of Giant Strength";
  public readonly rarity = VehicleUpgradeRarity.COMMON;
  public readonly icon = "ReplaceableTextures/CommandButtons/BTNBelt.blp";
  public readonly cost = 100;
  public readonly description = "Increases Strength by +10 points.";

  public applyUpgrade(vehicle: Vehicle): void {
    vehicle.unit.setStrength(vehicle.unit.strength + 10, true);
  }
}
