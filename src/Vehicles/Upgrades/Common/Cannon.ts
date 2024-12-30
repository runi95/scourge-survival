import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";

export class Cannon extends VehicleUpgrade {
  public readonly rarity = VehicleUpgradeRarity.COMMON;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNHumanArtilleryUpOne.blp";
  public readonly cost = 100;
  public readonly maxLevel = 5;
  public readonly isWeapon = true;
  public readonly description =
    "Fires a cannon dealing 25 damage to a random enemy unit within a range of 600 to the tank.";

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
