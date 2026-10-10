import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

export class MoltenHammer extends WeaponUpgradeRecipe {
  public readonly cooldown = 2;
  public readonly itemTypeId = FourCC("I06W");
  public readonly merchantItemTypeId = FourCC("I06X");
  public readonly recipe: number[] = [FourCC("I00V"), FourCC("I05D")];

  private readonly timers = new Map<number, Timer>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly abilityId: number = FourCC("A04G");

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
      const grp = Group.fromRange(600, vehicle.unit.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

        enemies.push(u);
      });
      grp.destroy();

      if (enemies.length === 0) return;

      const hx = vehicle.unit.x;
      const hy = vehicle.unit.y;
      const target =
        enemies[RandomNumberGenerator.random(0, enemies.length - 1)];
      {
        const dummy = Unit.create(owner, this.dummyUnitId, hx, hy);
        dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 3);
        dummy.addAbility(this.abilityId);
        dummy.issueTargetOrder("thunderbolt", target);
      }
      {
        const at = { x: target.x, y: target.y };
        const later: Timer = TimerUtils.newTimer();
        later.start(0.6, false, () => {
          TimerUtils.releaseTimer(later);
          {
            const center = Point.create(at.x, at.y);
            const area = Group.fromRange(150, center);
            center.destroy();
            area.for((u) => {
              if (!u.isAlive() || !u.isEnemy(owner)) return;
              if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
              vehicle.unit.damageTarget(
                u.handle,
                60,
                false,
                false,
                ATTACK_TYPE_NORMAL,
                DAMAGE_TYPE_MAGIC,
                WEAPON_TYPE_WHOKNOWS,
              );
            });
            area.destroy();
          }
        });
      }
      {
        const at = { x: target.x, y: target.y };
        const later: Timer = TimerUtils.newTimer();
        later.start(0.6, false, () => {
          TimerUtils.releaseTimer(later);
          Effect.create(
            "Abilities/Weapons/FireBallMissile/FireBallMissile.mdl",
            at.x,
            at.y,
          ).destroy();
        });
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
