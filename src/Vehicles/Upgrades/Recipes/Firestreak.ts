import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

interface Streak {
  x: number;
  y: number;
  angle: number;
  length: number;
  burnt: number;
  age: number;
  damage: number;
  fires: Effect[];
}

// Every 2 seconds a rocket-propelled arrow streaks from the hero to the
// farthest enemy within 900 and hits it. Its exhaust leaves the whole flight
// line burning for 6 seconds: every enemy unit within 150 of the line burns
// for 12 a second, or 24 when the hero paid 8 mana for the shot. An enemy in
// several streaks burns only in the hottest
export class Firestreak extends WeaponUpgradeRecipe {
  public readonly cooldown = 2;
  public readonly itemTypeId = FourCC("I0CY");
  public readonly merchantItemTypeId = FourCC("I0CZ");
  public readonly recipe: number[] = [FourCC("I04P"), FourCC("I00N")];

  private readonly fireTimers = new Map<number, Timer>();
  private readonly burnTimers = new Map<number, Timer>();
  private readonly itemStreaks = new Map<number, Streak[]>();

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const streaks: Streak[] = [];
    this.itemStreaks.set(itemId, streaks);

    const fire: Timer = TimerUtils.newTimer();
    this.fireTimers.set(itemId, fire);
    fire.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      const target = this.farthest(hero, owner);
      if (target == null) return;

      // Only spend mana when there is something to shoot at
      let damage = 3;
      if (hero.mana >= 8) {
        hero.mana -= 8;
        damage = 6;
      }
      this.launch(hero, owner, target, damage, streaks);
    });

    const burn: Timer = TimerUtils.newTimer();
    this.burnTimers.set(itemId, burn);
    burn.start(0.25, true, () => {
      const heat = new Map<Unit, number>();
      for (let i = streaks.length - 1; i >= 0; i--) {
        const streak = streaks[i];
        streak.age += 0.25;
        if (streak.age > 6) {
          for (const e of streak.fires) e.destroy();
          streaks.splice(i, 1);
          continue;
        }
        this.burn(owner, streak, heat);
      }
      heat.forEach((damage, u) => {
        vehicle.unit.damageTarget(
          u.handle,
          damage,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_FIRE,
          WEAPON_TYPE_WHOKNOWS,
        );
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
    TimerUtils.releaseTimer(this.fireTimers.get(itemId));
    this.fireTimers.delete(itemId);
    TimerUtils.releaseTimer(this.burnTimers.get(itemId));
    this.burnTimers.delete(itemId);

    for (const streak of this.itemStreaks.get(itemId) ?? []) {
      for (const e of streak.fires) e.destroy();
      // Streaks still being laid stop growing
      streak.length = 0;
    }
    this.itemStreaks.delete(itemId);
  }

  private isVictim(u: Unit, owner: MapPlayer): boolean {
    return (
      u.isAlive() && u.isEnemy(owner) && !u.isUnitType(UNIT_TYPE_STRUCTURE)
    );
  }

  private farthest(hero: Unit, owner: MapPlayer): Unit | undefined {
    let best: Unit | undefined;
    let most = -1;
    const grp = Group.fromRange(900, hero.point);
    grp.for((u) => {
      if (!this.isVictim(u, owner)) return;
      if (!u.isVisible(owner)) return;

      const d = (u.x - hero.x) ** 2 + (u.y - hero.y) ** 2;
      if (d <= most) return;
      most = d;
      best = u;
    });
    grp.destroy();
    return best;
  }

  // The arrow flies at 1500 a second, setting the ground alight behind it
  // every 100, and hits its target for 20 when it gets there
  private launch(
    hero: Unit,
    owner: MapPlayer,
    target: Unit,
    damage: number,
    streaks: Streak[],
  ): void {
    const x = hero.x;
    const y = hero.y;
    const angle = Math.atan2(target.y - y, target.x - x);
    const length = Math.sqrt((target.x - x) ** 2 + (target.y - y) ** 2);
    const streak: Streak = {
      x,
      y,
      angle,
      length,
      burnt: 0,
      age: 0,
      damage,
      fires: [],
    };
    streaks.push(streak);

    const arrow = Effect.create(
      "Abilities/Weapons/SearingArrow/SearingArrowMissile.mdl",
      x,
      y,
    );
    arrow.scale = 1.6;
    arrow.setHeight(60);
    arrow.setYaw(angle);

    const t = TimerUtils.newTimer();
    t.start(0.03125, true, () => {
      streak.burnt = Math.min(streak.length, streak.burnt + 1500 * 0.03125);
      arrow.x = x + streak.burnt * Math.cos(angle);
      arrow.y = y + streak.burnt * Math.sin(angle);
      while (streak.fires.length * 100 < streak.burnt) {
        const along = streak.fires.length * 100 + 50;
        const fx = x + along * Math.cos(angle);
        const fy = y + along * Math.sin(angle);
        const e = Effect.create(
          "Environment/SmallBuildingFire/SmallBuildingFire2.mdl",
          fx,
          fy,
        );
        e.scale = 1.1;
        streak.fires.push(e);
      }
      if (streak.burnt < streak.length) return;

      arrow.destroy();
      TimerUtils.releaseTimer(t);
      if (target.isAlive() && streak.length > 0) {
        hero.damageTarget(
          target.handle,
          20,
          false,
          true,
          ATTACK_TYPE_PIERCE,
          DAMAGE_TYPE_NORMAL,
          WEAPON_TYPE_WHOKNOWS,
        );
      }
    });
  }

  // Every enemy unit within 150 of the burnt part of the line, 4 times a
  // second, keeping the hottest streak each enemy stands in
  private burn(owner: MapPlayer, streak: Streak, heat: Map<Unit, number>) {
    if (streak.burnt <= 0) return;

    const half = streak.burnt / 2;
    const cos = Math.cos(streak.angle);
    const sin = Math.sin(streak.angle);
    const center = Point.create(streak.x + half * cos, streak.y + half * sin);
    const grp = Group.fromRange(half + 150, center);
    grp.for((u) => {
      if (!this.isVictim(u, owner)) return;

      const dx = u.x - streak.x;
      const dy = u.y - streak.y;
      const along = dx * cos + dy * sin;
      if (along < -150 || along > streak.burnt + 150) return;
      const across = Math.abs(dy * cos - dx * sin);
      if (across > 150) return;

      heat.set(u, Math.max(heat.get(u) ?? 0, streak.damage));
    });
    grp.destroy();
    center.destroy();
  }
}
