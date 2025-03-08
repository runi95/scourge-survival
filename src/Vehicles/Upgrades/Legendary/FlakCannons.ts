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
  public readonly description =
    () => `Enables your hero's basic attack, allowing you to attack enemies directly.

Damage: |cffffcc0050 + strength|r
Cooldown: |cffffcc002.1s|r
Range: |cffffcc00192|r
Targets: |cffffcc00air & ground|r
Damage type: |cffffcc00hero|r`;

  public applyUpgrade(vehicle: Vehicle): void {
    BlzSetUnitWeaponBooleanField(
      vehicle.unit.handle,
      UNIT_WEAPON_BF_ATTACKS_ENABLED,
      0,
      true
    );
  }
}
