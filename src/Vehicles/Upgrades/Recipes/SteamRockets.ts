import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";

const MULT = Math.PI / 180;

export class SteamRockets extends WeaponUpgradeRecipe {
  public readonly cooldown = 2;
  public readonly itemTypeId = FourCC("I05A");
  public readonly merchantItemTypeId = FourCC("I05B");
  public readonly recipe: number[] = [FourCC("I00N"), FourCC("I00M")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly steamUnitId: number = FourCC("u01O");
  private readonly clusterRocketsAbilityId: number = FourCC("A01B");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, () => {
      const { x, y } = vehicle.unit;
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 4);
      dummy.addAbility(this.clusterRocketsAbilityId);

      const radians = RandomNumberGenerator.random(0, 359) * MULT;
      const tx = x + 400 * Math.cos(radians);
      const ty = y + 400 * Math.sin(radians);
      dummy.issueOrderAt("clusterrockets", tx, ty);

      // The steam rises once the rockets have landed
      const burst: Timer = TimerUtils.newTimer();
      burst.start(2, false, () => {
        TimerUtils.releaseTimer(burst);
        const steam = Unit.create(owner, this.steamUnitId, tx, ty);
        steam.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 3);
      });
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
