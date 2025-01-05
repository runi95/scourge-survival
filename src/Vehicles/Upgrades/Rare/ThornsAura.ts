import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";

export class ThornsAura extends VehicleUpgrade {
  public readonly name = "Thorns Aura";
  public readonly rarity = VehicleUpgradeRarity.RARE;
  public readonly icon = "ReplaceableTextures/CommandButtons/BTNThorns.blp";
  public readonly cost = 300;
  public readonly description = "TODO: Write description";

  private readonly thornsAuraAbilityId: number = FourCC("A010");

  public applyUpgrade(vehicle: Vehicle): void {
    const thornsAuraLevel = vehicle.upgradeMap.get(this.name);
    if (thornsAuraLevel === 1) {
      vehicle.unit.addAbility(this.thornsAuraAbilityId);
      vehicle.unit.hideAbility(this.thornsAuraAbilityId, true);
    } else {
      vehicle.unit.setAbilityLevel(this.thornsAuraAbilityId, thornsAuraLevel);
    }
  }
}
