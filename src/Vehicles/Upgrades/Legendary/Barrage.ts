import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";

export class Barrage extends VehicleUpgrade {
  public readonly rarity = VehicleUpgradeRarity.LEGENDARY;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNScatterRockets.blp";
  public readonly cost = 400;
  public readonly maxLevel = 1;
  public readonly description = "Increases inventory space by +1.";

  private readonly inventoryAbilityId = FourCC("A009");

  public applyUpgrade(vehicle: Vehicle): void {
    if (vehicle.upgradeMap.get(this.name) !== 1) return;
    vehicle.unit.incAbilityLevel(this.inventoryAbilityId);
    vehicle.weaponLimit = 5;
  }
}
