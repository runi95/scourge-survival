import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";

export class PermanentImmolation extends VehicleUpgrade {
  public readonly name = "Permanent Immolation";
  public readonly rarity = VehicleUpgradeRarity.UNCOMMON;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNImmolationOn.blp";
  public readonly cost = 250;
  public readonly maxLevel = 5;
  public readonly isWeapon = true;
  public readonly description = "TODO: Write description";

  private readonly permanentImmolationAbilityId: number = FourCC("A002");

  public applyUpgrade(vehicle: Vehicle): void {
    const permanentImmolationLevel = vehicle.upgradeMap.get(this.name);
    if (permanentImmolationLevel === 1) {
      vehicle.unit.addItemById(FourCC("I005"));
      vehicle.unit.addAbility(this.permanentImmolationAbilityId);
      vehicle.unit.hideAbility(this.permanentImmolationAbilityId, true);
    } else {
      vehicle.unit.setAbilityLevel(
        this.permanentImmolationAbilityId,
        permanentImmolationLevel
      );
    }
  }
}
