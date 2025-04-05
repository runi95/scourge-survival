import { CriticalStrikeDamageEvent } from "../../../../Utility/DamageEngine/DamageEvents/CriticalStrikeDamageEvent";
import { Vehicle } from "../../../Vehicle";
import { VehicleUpgrade } from "../../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../../VehicleUpgradeRarity";
import { levelUpStr } from "../../LevelUpStr";

export class CriticalStrike extends VehicleUpgrade {
  public readonly name = "Critical Strike";
  public readonly rarity = VehicleUpgradeRarity.RARE;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNCriticalStrike.blp";
  public readonly cost = 200;
  public readonly maxLevel = 5;
  public readonly description = (level: number) =>
    `Gives a 20% chance to increase any damage dealt by ${levelUpStr(
      level,
      1,
      1
    )} times the normal amount`;

  public applyUpgrade(vehicle: Vehicle): void {
    if (vehicle.upgradeMap.get(this.name) !== 1) return;
    CriticalStrikeDamageEvent.READY_INSTANCES++;
  }
}
