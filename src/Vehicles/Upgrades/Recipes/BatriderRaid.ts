import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

export class BatriderRaid extends WeaponUpgradeRecipe {
  public readonly cooldown = 6;
  public readonly itemTypeId = FourCC("I03P");
  public readonly merchantItemTypeId = FourCC("I03Q");
  public readonly recipe: number[] = [FourCC("I02M"), FourCC("I00O")];

  private readonly timers = new Map<number, Timer>();
  private readonly batriderUnitTypeId: number = FourCC("o000");
  private readonly liquidFireUnitTypeId: number = FourCC("u00D");

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
      const target = this.nearestAirEnemy(vehicle.unit, owner);
      if (target == null) return;

      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const { x, y } = vehicle.unit;
      const batrider = Unit.create(owner, this.batriderUnitTypeId, x, y);
      batrider.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 10);
      batrider.issueTargetOrder("unstableconcoction", target);

      const fireTimer = TimerUtils.newTimer();
      fireTimer.start(0.5, true, () => {
        if (!batrider.isAlive()) {
          TimerUtils.releaseTimer(fireTimer);
          return;
        }

        const liquidFire = Unit.create(
          owner,
          this.liquidFireUnitTypeId,
          batrider.x,
          batrider.y,
        );
        liquidFire.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 10);
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

  private nearestAirEnemy(source: Unit, owner: MapPlayer): Unit | undefined {
    const { x, y } = source;
    let nearest: Unit | undefined;
    let nearestDistance = 1440000;
    const grp = Group.fromRange(1200, source.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (!u.isUnitType(UNIT_TYPE_FLYING)) return;

      const distance = Math.pow(u.x - x, 2) + Math.pow(u.y - y, 2);
      if (distance < nearestDistance) {
        nearest = u;
        nearestDistance = distance;
      }
    });
    grp.destroy();

    return nearest;
  }
}
