import { GlyphAbility } from "../../../Abilities/GlyphAbility";
import { Vehicle } from "../../../Vehicle";
import { VehicleUpgrade } from "../../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../../VehicleUpgradeRarity";
import { levelUpStr } from "../../LevelUpStr";

export class Glyph extends VehicleUpgrade {
  public readonly rarity = VehicleUpgradeRarity.LEGENDARY;
  public readonly icon = "ReplaceableTextures/CommandButtons/BTNGlyph.blp";
  public readonly cost = 500;
  public readonly description = (level: number) =>
    `Gain +${levelUpStr(
      level
    )} to a random attribute whenever an enemy unit dies`;

  public applyUpgrade(vehicle: Vehicle): void {
    if (vehicle.upgradeMap.get(this.name) !== 1) return;
    GlyphAbility.PLAYER_ID_UNLOCKS[vehicle.unit.owner.id] = true;
  }
}
