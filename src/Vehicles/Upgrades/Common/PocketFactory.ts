import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";

export class PocketFactory extends VehicleUpgrade {
  public readonly name = "Pocket Factory";
  public readonly rarity = VehicleUpgradeRarity.COMMON;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNPocketFactory.blp";
  public readonly cost = 150;
  public readonly maxLevel = 5;
  public readonly isWeapon = true;
  public readonly description = "TODO: Write description";

  public applyUpgrade(vehicle: Vehicle): void {
    if (vehicle.upgradeMap.get(this.name) !== 1) return;

    vehicle.unit.addItemById(FourCC("I00O"));
  }
}
