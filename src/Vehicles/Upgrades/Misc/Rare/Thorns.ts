import { ThornsDamageEvent } from "../../../../Utility/DamageEngine/DamageEvents/ThornsDamageEvent";
import { Vehicle } from "../../../Vehicle";
import { VehicleUpgrade } from "../../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../../VehicleUpgradeRarity";
import { levelUpStr } from "../../LevelUpStr";

export class Thorns extends VehicleUpgrade {
  public readonly rarity = VehicleUpgradeRarity.RARE;
  public readonly icon = "ReplaceableTextures/CommandButtons/BTNThorns.blp";
  public readonly cost = 300;
  public readonly description = (level: number) =>
    `Deal ${levelUpStr(
      level,
      6
    )}% of all damage taken back to the source (including spell and ranged damage)`;

  public applyUpgrade(vehicle: Vehicle): void {
    if (vehicle.upgradeMap.get(this.name) !== 1) return;
    ThornsDamageEvent.READY_INSTANCES++;
  }
}
