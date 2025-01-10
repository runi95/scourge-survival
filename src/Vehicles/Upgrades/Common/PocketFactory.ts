import { MapPlayer, Timer, Unit } from "w3ts/index";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { VehicleUpgrade } from "../../VehicleUpgrade";
import { VehicleUpgradeRarity } from "../../VehicleUpgradeRarity";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Globals } from "../../../Utility/Globals";

const MULT = Math.PI / 180;

export class PocketFactory extends VehicleUpgrade {
  public readonly name = "Pocket Factory";
  public readonly rarity = VehicleUpgradeRarity.COMMON;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNPocketFactory.blp";
  public readonly cost = 150;
  public readonly maxLevel = 5;
  public readonly isWeapon = true;
  public readonly description = "TODO: Write description";

  private readonly playerTimers: Timer[] = [];

  private readonly dummyUnitId: number = FourCC("u000");
  private readonly pocketFactoryAbilityId: number = FourCC("A01C");

  public applyUpgrade(vehicle: Vehicle): void {
    if (vehicle.upgradeMap.get(this.name) !== 1) return;

    vehicle.unit.addItemById(FourCC("I00O"));

    const t: Timer = TimerUtils.newTimer();
    const owner = vehicle.unit.owner;
    this.playerTimers[owner.id] = t;
    t.start(60, true, () => {
      this.createFactory(vehicle, owner);
    });

    this.createFactory(vehicle, owner);
  }

  private createFactory(vehicle: Vehicle, owner: MapPlayer) {
    const pocketFactoryLevel = vehicle.upgradeMap.get(this.name);
    const { x, y } = vehicle.unit;

    const dummy = Unit.create(owner, this.dummyUnitId, x, y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
    dummy.addAbility(this.pocketFactoryAbilityId);
    if (pocketFactoryLevel > 1) {
      dummy.setAbilityLevel(this.pocketFactoryAbilityId, pocketFactoryLevel);
    }

    const radians = RandomNumberGenerator.random(0, 359) * MULT;
    dummy.issueOrderAt(
      "summonfactory",
      x + 400 * Math.cos(radians),
      y + 400 * Math.sin(radians)
    );
  }
}
