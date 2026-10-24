import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { BallLightningDamageEvent } from "../../../Utility/DamageEngine/DamageEvents/BallLightningDamageEvent";

interface Bounce {
  hero: Unit;
  owner: MapPlayer;
  hit: Unit[];
  damage: number;
}

// Every 2.5 seconds a ball (u02N: 108 - 110, 150 splash, ground only) at the
// farthest enemy ground unit within 800. Each time it lands it bounces on to
// the nearest enemy within 500 that it hasn't hit, up to 5 hits in all, 15%
// weaker every time: a ball lobbed from where it landed at a ground unit, an
// arc (spell damage) at a flyer, bouncing on from beneath it
export class BallLightning extends WeaponUpgradeRecipe {
  public readonly cooldown = 2.5;
  public readonly itemTypeId = FourCC("I08C");
  public readonly merchantItemTypeId = FourCC("I08D");
  public readonly recipe: number[] = [FourCC("I05F"), FourCC("I00Q")];

  private readonly timers = new Map<number, Timer>();
  private readonly ballUnitId: number = FourCC("u02N");

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

      let farthest: Unit | undefined;
      let farthestDist = 0;
      const grp = Group.fromRange(800, hero.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
        if (u.isUnitType(UNIT_TYPE_FLYING)) return;

        const d =
          (u.x - hero.x) * (u.x - hero.x) + (u.y - hero.y) * (u.y - hero.y);
        if (d > farthestDist) {
          farthest = u;
          farthestDist = d;
        }
      });
      grp.destroy();
      if (farthest == null) return;

      const bounce: Bounce = { hero, owner, hit: [], damage: 110 };
      this.lob(bounce, hero.x, hero.y, farthest);
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

  // A ball lobbed from (x, y) at a ground unit
  private lob(bounce: Bounce, x: number, y: number, target: Unit) {
    bounce.hit.push(target);
    const ball = Unit.create(bounce.owner, this.ballUnitId, x, y);
    ball.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 3);
    ball.setBaseDamage(Math.max(1, Math.floor(bounce.damage) - 2), 0);
    const id = ball.id;
    BallLightningDamageEvent.BALLS.set(id, {
      target,
      landed: () => {
        Effect.create(
          "Abilities/Weapons/Bolt/BoltImpact.mdl",
          target.x,
          target.y,
        ).destroy();
        this.next(bounce, target);
      },
    });
    ball.issueTargetOrder("attack", target);

    const forget = TimerUtils.newTimer();
    forget.start(3, false, () => {
      TimerUtils.releaseTimer(forget);
      BallLightningDamageEvent.BALLS.delete(id);
    });
  }

  // On from the enemy just hit to the nearest one not hit yet
  private next(bounce: Bounce, from: Unit) {
    if (bounce.hit.length >= 5) return;
    bounce.damage = 0.85 * bounce.damage;
    const { x, y } = from;

    let nearest: Unit | undefined;
    let nearestDist = 0;
    const at = Point.create(x, y);
    const grp = Group.fromRange(500, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(bounce.owner)) return;
      if (!u.isEnemy(bounce.owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (bounce.hit.indexOf(u) >= 0) return;

      const d = (u.x - x) * (u.x - x) + (u.y - y) * (u.y - y);
      if (nearest == null || d < nearestDist) {
        nearest = u;
        nearestDist = d;
      }
    });
    grp.destroy();
    at.destroy();
    if (nearest == null) return;

    if (!nearest.isUnitType(UNIT_TYPE_FLYING)) {
      this.lob(bounce, x, y, nearest);
      return;
    }

    // A flyer is struck by an arc, and the ball bounces on from beneath it
    const flyer = nearest;
    bounce.hit.push(flyer);
    const arc = AddLightningEx(
      "CLPB",
      false,
      x,
      y,
      60,
      flyer.x,
      flyer.y,
      flyer.getflyHeight() + 60,
    );
    bounce.hero.damageTarget(
      flyer.handle,
      bounce.damage,
      false,
      false,
      ATTACK_TYPE_NORMAL,
      DAMAGE_TYPE_LIGHTNING,
      WEAPON_TYPE_WHOKNOWS,
    );
    const t = TimerUtils.newTimer();
    t.start(0.25, false, () => {
      TimerUtils.releaseTimer(t);
      DestroyLightning(arc);
      this.next(bounce, flyer);
    });
  }
}
