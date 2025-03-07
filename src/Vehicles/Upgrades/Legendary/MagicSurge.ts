import { MagicSurgeDamageEvent } from "../../../Utility/DamageEngine/DamageEvents/MagicSurgeDamageEvent";
import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";

export class MagicSurge extends VehicleUpgrade {
  public readonly name = "Magic Surge";
  public readonly rarity = VehicleUpgradeRarity.LEGENDARY;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNControlMagic.blp";
  public readonly cost = 500;
  public readonly maxLevel = 1;
  public readonly description =
    "Increases damage dealt by % of missing mana (at 0 mana your hero deals +100% bonus damage, at full mana your hero deals +0 bonus damage)";

  public applyUpgrade(vehicle: Vehicle): void {
    if (vehicle.upgradeMap.get(this.name) !== 1) return;
    MagicSurgeDamageEvent.READY_INSTANCES++;
  }
}
