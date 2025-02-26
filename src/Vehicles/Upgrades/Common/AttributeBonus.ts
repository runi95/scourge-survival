import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";

export class AttributeBonus extends VehicleUpgrade {
  public readonly name = "Attribute Bonus";
  public readonly rarity = VehicleUpgradeRarity.COMMON;
  public readonly icon = "ReplaceableTextures/CommandButtons/BTNStatUp.blp";
  public readonly cost = 75;
  public readonly description =
    "Increases Strength, Agility and Intelligence by +2 points.";

  public applyUpgrade(vehicle: Vehicle): void {
    vehicle.unit.setStrength(vehicle.unit.strength + 2, true);
    vehicle.unit.setAgility(vehicle.unit.agility + 2, true);
    vehicle.unit.setIntelligence(vehicle.unit.intelligence + 2, true);
  }
}
