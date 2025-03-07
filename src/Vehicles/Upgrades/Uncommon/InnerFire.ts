import { InnerFireDamageEvent } from "../../../Utility/DamageEngine/DamageEvents/InnerFireDamageEvent";
import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";

export class InnerFire extends VehicleUpgrade {
  public readonly name = "Inner Fire";
  public readonly rarity = VehicleUpgradeRarity.UNCOMMON;
  public readonly icon = "ReplaceableTextures/CommandButtons/BTNInnerFire.blp";
  public readonly cost = 250;
  public readonly maxLevel = 5;
  public readonly description =
    "Applies Inner Fire to your hero whenever you take damage|nInner Fire increases attack damage by +10% and armor by +5 for 10 seconds and has a 60 seconds cooldown";

  public applyUpgrade(vehicle: Vehicle): void {
    if (vehicle.upgradeMap.get(this.name) !== 1) return;
    InnerFireDamageEvent.READY_INSTANCES++;
    vehicle.cooldowns.set("Inner Fire", 0);
  }
}
