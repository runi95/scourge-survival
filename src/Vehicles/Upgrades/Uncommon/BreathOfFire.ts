import { Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";
import { Globals } from "../../../Utility/Globals";

export class BreathOfFire extends VehicleUpgrade {
  public readonly name = "Breath of Fire";
  public readonly rarity = VehicleUpgradeRarity.UNCOMMON;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNBreathOfFire.blp";
  public readonly cost = 200;
  public readonly maxLevel = 5;
  public readonly isWeapon = true;
  public readonly description = "TODO: Write description";

  private readonly playerTimers: Timer[] = [];
  private readonly playerUnitPosition: [number, number][] = [];

  private readonly dummyUnitId: number = FourCC("u00D");
  private readonly breathOfFireAbilityId: number = FourCC("A01J");

  public applyUpgrade(vehicle: Vehicle): void {
    if (vehicle.upgradeMap.get(this.name) !== 1) return;

    vehicle.unit.addItemById(FourCC("I00P"));

    const t: Timer = TimerUtils.newTimer();
    const owner = vehicle.unit.owner;
    const ownerId = owner.id;
    this.playerTimers[ownerId] = t;
    this.playerUnitPosition[ownerId] = [vehicle.unit.x, vehicle.unit.y];
    t.start(0.5, true, () => {
      const { x, y } = vehicle.unit;
      const [prevX, prevY] = this.playerUnitPosition[ownerId];
      const dist = Math.sqrt(Math.pow(x - prevX, 2) + Math.pow(y - prevY, 2));
      if (dist < 50) return;

      this.playerUnitPosition[ownerId][0] = x;
      this.playerUnitPosition[ownerId][1] = y;

      const breathOfFireLevel = vehicle.upgradeMap.get(this.name);
      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 10);
      if (breathOfFireLevel > 1) {
        dummy.setAbilityLevel(this.breathOfFireAbilityId, breathOfFireLevel);
      }
    });
  }
}
