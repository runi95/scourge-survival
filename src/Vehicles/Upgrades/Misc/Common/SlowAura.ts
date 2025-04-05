import { Vehicle } from "../../../Vehicle";
import { VehicleUpgrade } from "../../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../../VehicleUpgradeRarity";
import { levelUpStr } from "../../LevelUpStr";

export class SlowAura extends VehicleUpgrade {
  public readonly name = "Slow Aura";
  public readonly rarity = VehicleUpgradeRarity.COMMON;
  public readonly icon = "ReplaceableTextures/CommandButtons/BTNCyclone.blp";
  public readonly cost = 150;
  public readonly maxLevel = 5;
  public readonly description = (level: number) =>
    `Slow nearby enemy units movement speed by -${levelUpStr(
      level,
      6
    )}% in a range of 600`;

  private readonly slowAuraAilityId: number = FourCC("A01A");

  public applyUpgrade(vehicle: Vehicle): void {
    const slowAuraLevel = vehicle.upgradeMap.get(this.name);
    if (slowAuraLevel === 1) {
      vehicle.unit.addAbility(this.slowAuraAilityId);
      vehicle.unit.hideAbility(this.slowAuraAilityId, true);
    } else {
      vehicle.unit.setAbilityLevel(this.slowAuraAilityId, slowAuraLevel);
    }
  }
}
