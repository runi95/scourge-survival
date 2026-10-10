import { Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

export class SiegeSpears extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I08M");
  public readonly merchantItemTypeId = FourCC("I08N");
  public readonly recipe: number[] = [FourCC("I05F"), FourCC("I02L")];

  private readonly timers = new Map<number, Timer>();
  private readonly unitTypeId: number = FourCC("u01P");
  private readonly unit2TypeId: number = FourCC("u00W");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const tick = () => {
      vehicle.unit.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      const enemies: Unit[] = [];
      const grp = Group.fromRange(800, vehicle.unit.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
        if (u.isUnitType(UNIT_TYPE_FLYING)) return;

        enemies.push(u);
      });
      grp.destroy();

      if (enemies.length === 0) return;

      const hx = vehicle.unit.x;
      const hy = vehicle.unit.y;
      for (let i = 0; i < 2 && enemies.length > 0; i++) {
        const index = RandomNumberGenerator.random(0, enemies.length - 1);
        const target = enemies[index];
        enemies.splice(index, 1);
        {
          const missile = Unit.create(owner, this.unitTypeId, hx, hy);
          missile.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1.5);
          missile.issueTargetOrder("attack", target);
        }
        {
          const missile = Unit.create(owner, this.unit2TypeId, hx, hy);
          missile.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
          missile.issueTargetOrder("attack", target);
        }
      }
    };

    const t: Timer = TimerUtils.newTimer();
    this.timers.set(itemId, t);
    t.start(this.cooldown, true, tick);
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
