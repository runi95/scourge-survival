import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../../Utility/TimerUtils";
import { Vehicle } from "../../../Vehicle";
import { WeaponUpgrade } from "../../../WeaponUpgrade";
import { VehicleUpgradeRarity } from "../../../VehicleUpgradeRarity";
import { Globals } from "../../../../Utility/Globals";
import { RandomNumberGenerator } from "../../../../Utility/RandomNumberGenerator";
import { weaponDummyAbilityIds } from "../../../../Utility/WeaponDummyAbilityIds";

const MULT = Math.PI / 180;

export class ClusterRockets extends WeaponUpgrade {
  public readonly name = "Cluster Rockets";
  public readonly rarity = VehicleUpgradeRarity.UNCOMMON;
  public readonly icon =
    "ReplaceableTextures/CommandButtons/BTNClusterRockets.blp";
  public readonly cost = 250;
  public readonly cooldown = 2;
  public readonly itemTypeId = FourCC("I00N");
  public readonly description = (
    level: number
  ) => `Sends Cluster Rockets firing off in a random area at a random direction.

Damage: |cffffcc006 x 17.5 (max 210)|r
Cooldown: |cffffcc002s|r
Area of effect: |cffffcc00300|r
Targets: |cffffcc00air & ground|r
Damage type: |cffffcc00spell|r
Effect: stuns for |cffffcc001s|r`;

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly clusterRocketsAbilityId: number = FourCC("A01B");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(2, true, () => {
      const { x, y } = vehicle.unit;
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown
      );
      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 4);
      dummy.addAbility(this.clusterRocketsAbilityId);

      const radians = RandomNumberGenerator.random(0, 359) * MULT;
      dummy.issueOrderAt(
        "clusterrockets",
        x + 400 * Math.cos(radians),
        y + 400 * Math.sin(radians)
      );
    });
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number
  ): void {
    const t = this.timers.get(itemId);
    this.timers.delete(itemId);
    TimerUtils.releaseTimer(t);
  }
}
