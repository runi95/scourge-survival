import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";

type Keg = {
  effect: Effect;
  at: Point;
  age: number;
  lit: boolean;
};

// Every 3 seconds a powder keg is left under the hero (up to 8, gone after
// 60s). Stepping on it does nothing. Every 1.5 seconds the hero picks the keg
// within 900 with the most enemies within 250 of it (at least 2) and, for 8
// mana, shoots a searing arrow into it: the keg blows up for 80 to every
// enemy within 250, air too, and sets off every other keg within 250 of it.
// With no keg worth it or no mana, the hero shoots a plain arrow (10) at a
// random enemy within 600 instead
export class PowderKeg extends WeaponUpgradeRecipe {
  public readonly cooldown = 1.5;
  public readonly itemTypeId = FourCC("I0DU");
  public readonly merchantItemTypeId = FourCC("I0DV");
  public readonly recipe: number[] = [FourCC("I04P"), FourCC("I003")];

  private readonly timers = new Map<number, Timer[]>();
  private readonly itemKegs = new Map<number, Keg[]>();
  private readonly arrowUnitId: number = FourCC("u01J");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const kegs: Keg[] = [];
    this.itemKegs.set(itemId, kegs);

    const place = TimerUtils.newTimer();
    place.start(3, true, () => {
      const hero = vehicle.unit;
      if (kegs.length >= 8) this.remove(kegs, kegs[0]);
      const effect = Effect.create(
        "Units/Other/TNTBarrel/TNTBarrel.mdl",
        hero.x,
        hero.y,
      );
      effect.scale = 0.8;
      effect.setYaw(RandomNumberGenerator.random(0, 359) * bj_DEGTORAD);
      kegs.push({
        effect,
        at: Point.create(hero.x, hero.y),
        age: 0,
        lit: false,
      });
    });

    const age = TimerUtils.newTimer();
    age.start(1, true, () => {
      for (let i = kegs.length - 1; i >= 0; i--) {
        kegs[i].age += 1;
        if (kegs[i].age >= 60 && !kegs[i].lit) this.remove(kegs, kegs[i]);
      }
    });

    const shoot = TimerUtils.newTimer();
    shoot.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      if (hero.mana >= 8) {
        const keg = this.bestKeg(hero, owner, kegs);
        if (keg != null) {
          hero.mana -= 8;
          this.light(hero, owner, kegs, keg);
          return;
        }
      }

      const enemies = this.enemiesAround(owner, hero.point, 600);
      if (enemies.length === 0) return;
      const target =
        enemies[RandomNumberGenerator.random(0, enemies.length - 1)];
      const arrow = Unit.create(owner, this.arrowUnitId, hero.x, hero.y);
      arrow.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      arrow.issueTargetOrder("attack", target);
    });
    this.timers.set(itemId, [place, age, shoot]);
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    for (const t of this.timers.get(itemId) ?? []) TimerUtils.releaseTimer(t);
    this.timers.delete(itemId);
    const kegs = this.itemKegs.get(itemId) ?? [];
    while (kegs.length > 0) this.remove(kegs, kegs[0]);
    this.itemKegs.delete(itemId);
  }

  private remove(kegs: Keg[], keg: Keg): void {
    const i = kegs.indexOf(keg);
    if (i < 0) return;
    kegs.splice(i, 1);
    keg.effect.setAlpha(0);
    keg.effect.destroy();
    keg.at.destroy();
  }

  private enemiesAround(owner: MapPlayer, at: Point, radius: number): Unit[] {
    const enemies: Unit[] = [];
    const grp = Group.fromRange(radius, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      enemies.push(u);
    });
    grp.destroy();
    return enemies;
  }

  // The unlit keg within 900 of the hero with the most enemies within 250,
  // at least 2
  private bestKeg(hero: Unit, owner: MapPlayer, kegs: Keg[]): Keg | undefined {
    let best: Keg | undefined;
    let most = 1;
    for (const keg of kegs) {
      if (keg.lit) continue;
      const dx = keg.at.x - hero.x;
      const dy = keg.at.y - hero.y;
      if (dx * dx + dy * dy > 900 * 900) continue;
      const count = this.enemiesAround(owner, keg.at, 250).length;
      if (count <= most) continue;
      most = count;
      best = keg;
    }
    return best;
  }

  // A searing arrow flies from the hero into the keg at 1500 a second
  private light(hero: Unit, owner: MapPlayer, kegs: Keg[], keg: Keg): void {
    keg.lit = true;
    const x = hero.x;
    const y = hero.y;
    const angle = Math.atan2(keg.at.y - y, keg.at.x - x);
    const length = Math.sqrt((keg.at.x - x) ** 2 + (keg.at.y - y) ** 2);
    const arrow = Effect.create(
      "Abilities/Weapons/SearingArrow/SearingArrowMissile.mdl",
      x,
      y,
    );
    arrow.setHeight(60);
    arrow.setYaw(angle);

    let flown = 0;
    const t = TimerUtils.newTimer();
    t.start(0.03125, true, () => {
      flown = Math.min(length, flown + 1500 * 0.03125);
      arrow.x = x + flown * Math.cos(angle);
      arrow.y = y + flown * Math.sin(angle);
      arrow.setHeight(60 - (40 * flown) / Math.max(length, 1));
      if (flown < length) return;

      TimerUtils.releaseTimer(t);
      arrow.destroy();
      this.explode(hero, owner, kegs, keg);
    });
  }

  // 80 to every enemy within 250, and every other keg within 250 goes off
  // 0.2 seconds later
  private explode(hero: Unit, owner: MapPlayer, kegs: Keg[], keg: Keg): void {
    if (kegs.indexOf(keg) < 0) return;
    const x = keg.at.x;
    const y = keg.at.y;
    Effect.create(
      "Objects/Spawnmodels/Other/NeutralBuildingExplosion/NeutralBuildingExplosion.mdl",
      x,
      y,
    ).destroy();
    for (const u of this.enemiesAround(owner, keg.at, 250)) {
      hero.damageTarget(
        u.handle,
        80,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_FIRE,
        WEAPON_TYPE_WHOKNOWS,
      );
    }

    const chained: Keg[] = [];
    for (const other of kegs) {
      if (other === keg || other.lit) continue;
      const dx = other.at.x - x;
      const dy = other.at.y - y;
      if (dx * dx + dy * dy > 250 * 250) continue;
      other.lit = true;
      chained.push(other);
    }
    this.remove(kegs, keg);
    if (chained.length === 0) return;

    const t = TimerUtils.newTimer();
    t.start(0.2, false, () => {
      TimerUtils.releaseTimer(t);
      for (const other of chained) this.explode(hero, owner, kegs, other);
    });
  }
}
