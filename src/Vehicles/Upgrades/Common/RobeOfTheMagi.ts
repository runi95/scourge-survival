import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";

export class RobeOfTheMagi extends VehicleUpgrade {
  public readonly name = "Robe of the Magi";
  public readonly rarity = VehicleUpgradeRarity.COMMON;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNRobeOfTheMagi.blp";
  public readonly cost = 50;
  public readonly description = "Increases Intelligence by +5 points.";

  public applyUpgrade(vehicle: Vehicle): void {
    vehicle.unit.setIntelligence(vehicle.unit.intelligence + 5, true);
  }
}
