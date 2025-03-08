import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";
import { levelUpStr } from "../LevelUpStr";

export class Cannon extends VehicleUpgrade {
  public readonly rarity = VehicleUpgradeRarity.COMMON;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNHumanArtilleryUpOne.blp";
  public readonly cost = 100;
  public readonly maxLevel = 5;
  public readonly isWeapon = true;
  public readonly description = (
    level: number
  ) => `Fires a rocket at a random enemy unit within range.

Damage: ${level > 1 ? `${levelUpStr(level, 1, 0, true)} x ` : "|cffffcc00"}25|r
Cooldown: |cffffcc001s|r
Range: |cffffcc00600|r
Targets: |cffffcc00air & ground|r
Damage type: |cffffcc00spell|r`;

  private readonly phoenixFireAbilityIds: number[] = [
    FourCC("A000"),
    FourCC("A004"),
    FourCC("A006"),
    FourCC("A007"),
    FourCC("A008"),
  ];

  public applyUpgrade(vehicle: Vehicle): void {
    const cannonLevel = vehicle.upgradeMap.get(this.name);
    vehicle.unit.disableAbility(
      this.phoenixFireAbilityIds[cannonLevel - 1],
      false,
      false
    );
  }
}
