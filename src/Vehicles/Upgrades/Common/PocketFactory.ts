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
  public readonly description =
    "Spawns a pocket factory every 60 seconds|nThe Pocket Factory has 300 health and spawns a Clockwerk Goblin every 5 seconds that explodes to deal 60 damage upon death";

  public applyUpgrade(vehicle: Vehicle): void {
    if (vehicle.upgradeMap.get(this.name) !== 1) return;

    vehicle.unit.addItemById(FourCC("I00O"));
  }
}
