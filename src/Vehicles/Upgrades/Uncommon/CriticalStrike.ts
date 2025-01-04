import { CriticalStrikeDamageEvent } from "../../../Utility/DamageEngine/DamageEvents/CriticalStrikeDamageEvent";
import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";

export class CriticalStrike extends VehicleUpgrade {
  public readonly name = "Critical Strike";
  public readonly rarity = VehicleUpgradeRarity.UNCOMMON;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNCriticalStrike.blp";
  public readonly cost = 200;
  public readonly maxLevel = 5;
  public readonly description = "TODO: Write description";

  public applyUpgrade(vehicle: Vehicle): void {
    if (vehicle.upgradeMap.get(this.name) !== 1) return;
    CriticalStrikeDamageEvent.READY_INSTANCES++;
  }
}
