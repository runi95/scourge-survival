import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";

export class RobeOfTheMagi extends VehicleUpgrade {
  public readonly name = "Robe of the Magi";
  public readonly rarity = VehicleUpgradeRarity.COMMON;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNRobeOfTheMagi.blp";
  public readonly cost = 100;
  public readonly description = "Increases Intelligence by +10 points.";

  public applyUpgrade(vehicle: Vehicle): void {
    vehicle.unit.setIntelligence(vehicle.unit.intelligence + 10, true);
  }
}
