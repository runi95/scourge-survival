import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";

export class Evasion extends VehicleUpgrade {
  public readonly rarity = VehicleUpgradeRarity.UNCOMMON;
  public readonly icon = "ReplaceableTextures/CommandButtons/BTNEvasion.blp";
  public readonly cost = 200;
  public readonly maxLevel = 5;
  public readonly description = "TODO: Write description";

  private readonly evasionAbilityId: number = FourCC("A003");

  public applyUpgrade(vehicle: Vehicle): void {
    const evasionLevel = vehicle.upgradeMap.get(this.name);
    if (evasionLevel === 1) {
      vehicle.unit.addAbility(this.evasionAbilityId);
      vehicle.unit.hideAbility(this.evasionAbilityId, true);
    } else {
      vehicle.unit.setAbilityLevel(this.evasionAbilityId, evasionLevel);
    }
  }
}
