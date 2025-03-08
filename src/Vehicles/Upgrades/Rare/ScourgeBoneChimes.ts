import { ScourgeBoneChimesDamageEvent } from "../../../Utility/DamageEngine/DamageEvents/ScourgeBoneChimesDamageEvent";
import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";

export class ScourgeBoneChimes extends VehicleUpgrade {
  public readonly name = "Scourge Bone Chimes";
  public readonly rarity = VehicleUpgradeRarity.RARE;
  public readonly icon = "ReplaceableTextures/CommandButtons/BTNBoneChimes.blp";
  public readonly cost = 400;
  public readonly maxLevel = 1;
  public readonly description = () =>
    "Heals your hero for +12% of all damage dealt (including spell and ranged damage)";

  public applyUpgrade(vehicle: Vehicle): void {
    if (vehicle.upgradeMap.get(this.name) !== 1) return;
    ScourgeBoneChimesDamageEvent.READY_INSTANCES++;
  }
}
