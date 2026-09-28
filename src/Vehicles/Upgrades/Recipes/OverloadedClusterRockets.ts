import { Item, MapPlayer, Timer, Trigger, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";

const MULT = Math.PI / 180;

export class OverloadedClusterRockets extends WeaponUpgradeRecipe {
  public readonly cooldown = 2;
  public readonly itemTypeId = FourCC("I02B");
  public readonly merchantItemTypeId = FourCC("I02A");
  public readonly recipe: number[] = [FourCC("I00N"), FourCC("I00N")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly overloadedClusterRocketsAbilityId: number = FourCC("A00L");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(2, true, () => {
      const { x, y } = vehicle.unit;
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 4);
      dummy.addAbility(this.overloadedClusterRocketsAbilityId);

      const dummy2 = Unit.create(owner, this.dummyUnitId, x, y);
      dummy2.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 4);
      dummy2.addAbility(this.overloadedClusterRocketsAbilityId);

      const radians = RandomNumberGenerator.random(0, 359) * MULT;
      dummy.issueOrderAt(
        "clusterrockets",
        x + 400 * Math.cos(radians),
        y + 400 * Math.sin(radians),
      );
      dummy2.issueOrderAt(
        "clusterrockets",
        x + 400 * Math.cos(radians + 180),
        y + 400 * Math.sin(radians + 180),
      );
    });
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const t = this.timers.get(itemId);
    this.timers.delete(itemId);
    TimerUtils.releaseTimer(t);
  }
}
