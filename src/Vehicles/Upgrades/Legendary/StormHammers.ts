import { Timer, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";

export class StormHammers extends VehicleUpgrade {
  public readonly name = "Storm Hammers";
  public readonly rarity = VehicleUpgradeRarity.LEGENDARY;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNStormHammer.blp";
  public readonly cost = 500;
  public readonly maxLevel = 5;
  public readonly isWeapon = true;
  public readonly description = "TODO: Write description";

  private readonly playerTimers: Timer[] = [];

  private readonly dummyUnitId: number = FourCC("u009");

  public applyUpgrade(vehicle: Vehicle): void {
    if (vehicle.upgradeMap.get(this.name) !== 1) return;

    vehicle.unit.addItemById(FourCC("I00M"));

    const t: Timer = TimerUtils.newTimer();
    const owner = vehicle.unit.owner;
    this.playerTimers[owner.id] = t;
    t.start(1, true, () => {
      const stormHammersLevel = vehicle.upgradeMap.get(this.name);
      const { x, y } = vehicle.unit;

      for (let i = 0; i < stormHammersLevel; i++) {
        const dummy = Unit.create(owner, this.dummyUnitId, x, y);
        dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      }
    });
  }
}
