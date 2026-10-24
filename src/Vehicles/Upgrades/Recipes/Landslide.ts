import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";
import { LandslideDamageEvent } from "../../../Utility/DamageEngine/DamageEvents/LandslideDamageEvent";

// Every 2.5 seconds a boulder (u01P: 58 - 60, 150 splash) at the farthest
// enemy ground unit within 800. Where it lands it rolls back 1100 towards and
// past the hero at 600 a second; every enemy ground unit within 150 of its
// path takes 90, is stunned for 0.75 s and shoved 75 aside, once per boulder
export class Landslide extends WeaponUpgradeRecipe {
  public readonly cooldown = 2.5;
  public readonly itemTypeId = FourCC("I08E");
  public readonly merchantItemTypeId = FourCC("I08F");
  public readonly recipe: number[] = [FourCC("I05F"), FourCC("I05H")];

  private readonly timers = new Map<number, Timer>();
  private readonly boulderUnitId: number = FourCC("u01P");

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
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      let target: Unit | undefined;
      let targetDist = 0;
      const grp = Group.fromRange(800, hero.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
        if (u.isUnitType(UNIT_TYPE_FLYING)) return;

        const dx = u.x - hero.x;
        const dy = u.y - hero.y;
        if (dx * dx + dy * dy > targetDist) {
          target = u;
          targetDist = dx * dx + dy * dy;
        }
      });
      grp.destroy();
      if (target == null) return;

      const landing = target;
      const boulder = Unit.create(owner, this.boulderUnitId, hero.x, hero.y);
      boulder.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1.5);
      const id = boulder.id;
      LandslideDamageEvent.BOULDERS.set(id, {
        target: landing,
        landed: () => this.roll(hero, owner, landing.x, landing.y),
      });
      boulder.issueTargetOrder("attack", landing);

      const forget = TimerUtils.newTimer();
      forget.start(3, false, () => {
        TimerUtils.releaseTimer(forget);
        LandslideDamageEvent.BOULDERS.delete(id);
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

  // From where it landed, back towards the hero and past it
  private roll(hero: Unit, owner: MapPlayer, x: number, y: number) {
    const radians = Atan2(hero.y - y, hero.x - x);
    const ca = Math.cos(radians);
    const sa = Math.sin(radians);
    const rock = Effect.create(
      "Abilities/Weapons/DemolisherMissile/DemolisherMissile.mdl",
      x,
      y,
    );
    rock.scale = 1.5;
    rock.setYaw(radians);
    const crushed: Unit[] = [];
    let rolled = 0;

    const t = TimerUtils.newTimer();
    t.start(0.05, true, () => {
      rolled += 30;
      const rx = x + rolled * ca;
      const ry = y + rolled * sa;
      rock.x = rx;
      rock.y = ry;
      rock.setPitch(-rolled / 50);

      const at = Point.create(rx, ry);
      const grp = Group.fromRange(150, at);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
        if (u.isUnitType(UNIT_TYPE_FLYING)) return;
        if (crushed.indexOf(u) >= 0) return;

        crushed.push(u);
        hero.damageTarget(
          u.handle,
          90,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
        if (!u.isAlive()) return;
        StunUtils.stunUnit(u.handle, 0.75);
        // Shoved to whichever side of the path it stood on
        const side = -(u.x - rx) * sa + (u.y - ry) * ca >= 0 ? 1 : -1;
        u.x = u.x - 75 * side * sa;
        u.y = u.y + 75 * side * ca;
      });
      grp.destroy();
      at.destroy();

      if (rolled < 1100) return;
      TimerUtils.releaseTimer(t);
      rock.destroy();
    });
  }
}
