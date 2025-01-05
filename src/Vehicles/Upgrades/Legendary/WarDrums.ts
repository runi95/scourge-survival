import { WarDrumsDamageEvent } from "../../../Utility/DamageEngine/DamageEvents/WarDrumsDamageEvent";
import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";

export class WarDrums extends VehicleUpgrade {
  public readonly name = "War Drums";
  public readonly rarity = VehicleUpgradeRarity.LEGENDARY;
  public readonly icon = "ReplaceableTextures/CommandButtons/BTNDrum.blp";
  public readonly cost = 500;
  public readonly maxLevel = 3;
  public readonly description = "Increases all damage dealt by +30%";

  public applyUpgrade(vehicle: Vehicle): void {
    if (vehicle.upgradeMap.get(this.name) !== 1) return;
    WarDrumsDamageEvent.READY_INSTANCES++;
  }
}
