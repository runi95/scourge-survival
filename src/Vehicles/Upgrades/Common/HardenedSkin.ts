import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";

export class HardenedSkin extends VehicleUpgrade {
  public readonly name = "Hardened Skin";
  public readonly rarity = VehicleUpgradeRarity.COMMON;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNHardenedSkin.blp";
  public readonly cost = 150;
  public readonly maxLevel = 5;
  public readonly description =
    "Reduces all attacks by 4 damage. Attacks cannot be reduced below 2 damage.";

  private readonly hardenedSkinAbilityId: number = FourCC("A00I");

  public applyUpgrade(vehicle: Vehicle): void {
    const hardenedSkinLevel = vehicle.upgradeMap.get(this.name);
    if (hardenedSkinLevel === 1) {
      vehicle.unit.addAbility(this.hardenedSkinAbilityId);
      vehicle.unit.hideAbility(this.hardenedSkinAbilityId, true);
    } else {
      vehicle.unit.setAbilityLevel(
        this.hardenedSkinAbilityId,
        hardenedSkinLevel
      );
    }
  }
}
