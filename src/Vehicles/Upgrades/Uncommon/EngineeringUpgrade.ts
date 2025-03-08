import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";

export class EngineeringUpgrade extends VehicleUpgrade {
  public readonly name = "Engineering Upgrade";
  public readonly rarity = VehicleUpgradeRarity.UNCOMMON;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNEngineeringUpgrade.blp";
  public readonly cost = 250;
  public readonly maxLevel = 5;
  public readonly description = () =>
    "Upgrades all spells to their next tier (all spells are upgraded to be as strong as +1 level higher than they currently are)";

  private readonly engeneeringUpgradeAbilityId: number = FourCC("A00J");

  public applyUpgrade(vehicle: Vehicle): void {
    const engineeringUpgradeLevel = vehicle.upgradeMap.get(this.name);
    if (engineeringUpgradeLevel === 1) {
      vehicle.unit.addAbility(this.engeneeringUpgradeAbilityId);
      vehicle.unit.hideAbility(this.engeneeringUpgradeAbilityId, true);
    } else {
      vehicle.unit.setAbilityLevel(
        this.engeneeringUpgradeAbilityId,
        engineeringUpgradeLevel
      );
    }
  }
}
