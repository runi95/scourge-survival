import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";

export class FlakCannons extends VehicleUpgrade {
  public readonly name = "Flak Cannons";
  public readonly rarity = VehicleUpgradeRarity.LEGENDARY;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNFlakCannons.blp";
  public readonly cost = 500;
  public readonly maxLevel = 1;
  public readonly description = "Enables the tank to attack units directly.";

  public applyUpgrade(vehicle: Vehicle): void {
    BlzSetUnitWeaponBooleanField(
      vehicle.unit.handle,
      UNIT_WEAPON_BF_ATTACKS_ENABLED,
      0,
      true
    );
  }
}
