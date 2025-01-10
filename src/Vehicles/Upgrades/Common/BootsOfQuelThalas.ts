import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";

export class BootsOfQuelThalas extends VehicleUpgrade {
  public readonly name = "Boots of Quel'Thalas";
  public readonly rarity = VehicleUpgradeRarity.COMMON;
  public readonly icon = "ReplaceableTextures/CommandButtons/BTNBoots.blp";
  public readonly cost = 100;
  public readonly description = "Increases Agility by +10 points.";

  public applyUpgrade(vehicle: Vehicle): void {
    vehicle.unit.setAgility(vehicle.unit.agility + 10, true);
  }
}
