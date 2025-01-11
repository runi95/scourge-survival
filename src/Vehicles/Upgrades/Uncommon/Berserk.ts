import { BerserkDamageEvent } from "../../../Utility/DamageEngine/DamageEvents/BerserkDamageEvent";
import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";

export class Berserk extends VehicleUpgrade {
  public readonly rarity = VehicleUpgradeRarity.UNCOMMON;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNBerserkForTrolls.blp";
  public readonly cost = 250;
  public readonly maxLevel = 1;
  public readonly description =
    "Increases all damage dealt by +50% and all damage received by +30%";

  public applyUpgrade(vehicle: Vehicle): void {
    if (vehicle.upgradeMap.get(this.name) !== 1) return;
    BerserkDamageEvent.READY_INSTANCES++;
  }
}
