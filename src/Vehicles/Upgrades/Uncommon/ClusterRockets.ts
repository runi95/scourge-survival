import { Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";
import { Globals } from "../../../Utility/Globals";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";

const MULT = Math.PI / 180;

export class ClusterRockets extends VehicleUpgrade {
  public readonly name = "Cluster Rockets";
  public readonly rarity = VehicleUpgradeRarity.UNCOMMON;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNClusterRockets.blp";
  public readonly cost = 250;
  public readonly maxLevel = 5;
  public readonly isWeapon = true;
  public readonly description = "TODO: Write description";

  private readonly playerTimers: Timer[] = [];

  private readonly dummyUnitId: number = FourCC("u000");
  private readonly clusterRocketsAbilityId: number = FourCC("A01B");

  public applyUpgrade(vehicle: Vehicle): void {
    if (vehicle.upgradeMap.get(this.name) !== 1) return;

    vehicle.unit.addItemById(FourCC("I00N"));

    const t: Timer = TimerUtils.newTimer();
    const owner = vehicle.unit.owner;
    this.playerTimers[owner.id] = t;
    t.start(2, true, () => {
      const clusterRocketsLevel = vehicle.upgradeMap.get(this.name);
      const { x, y } = vehicle.unit;
      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 4);
      dummy.addAbility(this.clusterRocketsAbilityId);
      if (clusterRocketsLevel > 1) {
        dummy.setAbilityLevel(
          this.clusterRocketsAbilityId,
          clusterRocketsLevel
        );
      }

      const radians = RandomNumberGenerator.random(0, 359) * MULT;
      dummy.issueOrderAt(
        "clusterrockets",
        x + 400 * Math.cos(radians),
        y + 400 * Math.sin(radians)
      );
    });
  }
}
