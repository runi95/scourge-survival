import { Timer, Unit } from "w3ts/index";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Globals } from "../../../Utility/Globals";

export class TrollRegeneration extends VehicleUpgrade {
  public readonly name = "Troll Regeneration";
  public readonly rarity = VehicleUpgradeRarity.COMMON;
  public readonly icon = "ReplaceableTextures/CommandButtons/BTNRegenerate.blp";
  public readonly cost = 150;
  public readonly maxLevel = 5;
  public readonly description = "TODO: Write description";

  private readonly playerTimers: Timer[] = [];
  private readonly playerUnitPosition: [number, number][] = [];

  public applyUpgrade(vehicle: Vehicle): void {
    if (vehicle.upgradeMap.get(this.name) !== 1) return;

    const t: Timer = TimerUtils.newTimer();
    const owner = vehicle.unit.owner;
    const ownerId = owner.id;
    this.playerTimers[ownerId] = t;
    this.playerUnitPosition[ownerId] = [vehicle.unit.x, vehicle.unit.y];
    t.start(1, true, () => {
      const { x, y } = vehicle.unit;
      const [prevX, prevY] = this.playerUnitPosition[ownerId];
      if (prevX !== x || prevY !== y) {
        this.playerUnitPosition[ownerId][0] = x;
        this.playerUnitPosition[ownerId][1] = y;
        return;
      }

      const trollRegenerationLevel = vehicle.upgradeMap.get(this.name);
      vehicle.unit.life += 10 * trollRegenerationLevel;
    });
  }
}
