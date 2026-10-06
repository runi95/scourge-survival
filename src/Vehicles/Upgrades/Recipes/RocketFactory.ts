import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { Vehicle } from "../../Vehicle";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

export class RocketFactory extends WeaponUpgradeRecipe {
  public readonly cooldown = 0.5;
  public readonly itemTypeId = FourCC("I029");
  public readonly merchantItemTypeId = FourCC("I028");
  public readonly recipe: number[] = [FourCC("I00O"), FourCC("I00N")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u00T");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);

    let ticks = 3;
    t.start(0.5, true, () => {
      const { charges } = item;
      if (charges > 0) {
        let hasTarget = false;
        const grp = Group.fromRange(600, vehicle.unit.point);
        grp.for((u) => {
          if (hasTarget) return;
          if (!u.isAlive()) return;
          if (!u.isEnemy(owner)) return;
          if (!u.isVisible(owner)) return;
          hasTarget = true;
        });

        if (hasTarget) {
          const { x, y } = vehicle.unit;
          const dummy = Unit.create(owner, this.dummyUnitId, x, y);
          dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
          vehicle.unit.startAbilityCooldown(
            weaponDummyAbilityIds[weaponIndex],
            this.cooldown,
          );
          item.charges = charges - 1;
        }
      }

      if (ticks <= 0) {
        ticks = 3;
        if (charges < 30) {
          item.charges = charges + 1;
        }
      } else {
        ticks--;
      }
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
