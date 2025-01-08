import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";

export class Fortification extends VehicleUpgrade {
  public readonly rarity = VehicleUpgradeRarity.COMMON;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNStoneArchitecture.blp";
  public readonly cost = 200;
  public readonly description = "TODO: Write description";

  public applyUpgrade(vehicle: Vehicle): void {
    BlzSetUnitArmor(
      vehicle.unit.handle,
      BlzGetUnitArmor(vehicle.unit.handle) + 2
    );
    BlzSetUnitMaxHP(
      vehicle.unit.handle,
      BlzGetUnitMaxHP(vehicle.unit.handle) + 125
    );
  }
}
