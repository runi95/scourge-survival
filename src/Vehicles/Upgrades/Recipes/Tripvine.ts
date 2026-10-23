import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

interface Vines {
  // Distance to the hero at the last look, to tell who is closing in
  distances: Map<Unit, number>;
  // Seconds of hold left for every tripped enemy
  held: Map<Unit, number>;
  timers: Timer[];
  arrows: Effect[];
}

// Every 3.5 seconds the hero shoots a vine arrow at the enemy ground unit
// within 700 closing in on it fastest (the nearest when nobody is): 20, and it
// trips into roots (A046: 50 a second for 2.5s, disarmed). Every enemy ground
// unit within 150 behind a tripped one (farther from the hero) stumbles over
// it 0.2s later and is caught too, and so on, up to 6 for one arrow
export class Tripvine extends WeaponUpgradeRecipe {
  public readonly cooldown = 3.5;
  public readonly itemTypeId = FourCC("I0EC");
  public readonly merchantItemTypeId = FourCC("I0ED");
  public readonly recipe: number[] = [FourCC("I04P"), FourCC("I05P")];

  private readonly vines = new Map<number, Vines>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly rootsAbilityId: number = FourCC("A046");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const vines: Vines = {
      distances: new Map(),
      held: new Map(),
      timers: [],
      arrows: [],
    };
    this.vines.set(itemId, vines);

    const shoot = TimerUtils.newTimer();
    shoot.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      const target = this.charger(hero, owner, vines);
      if (target == null) return;
      this.shoot(vehicle, owner, target, vines);
    });

    const look = TimerUtils.newTimer();
    look.start(0.5, true, () => {
      const hero = vehicle.unit;
      vines.distances = new Map();
      const grp = Group.fromRange(900, hero.point);
      grp.for((u) => {
        if (!this.isVictim(u, owner)) return;
        vines.distances.set(u, this.distance(hero, u));
      });
      grp.destroy();
      // Deleting inside forEach would end the loop there
      const freed: Unit[] = [];
      vines.held.forEach((left, u) => {
        if (left <= 0.5 || !u.isAlive()) freed.push(u);
        else vines.held.set(u, left - 0.5);
      });
      for (const u of freed) vines.held.delete(u);
    });
    vines.timers.push(shoot, look);
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const vines = this.vines.get(itemId);
    this.vines.delete(itemId);
    if (vines == null) return;
    // Arrows in flight and pile-ups under way stop with the timers
    for (const t of vines.timers) TimerUtils.releaseTimer(t);
    vines.timers.length = 0;
    for (const arrow of vines.arrows) arrow.destroy();
    vines.arrows.length = 0;
  }

  private isVictim(u: Unit, owner: MapPlayer): boolean {
    return (
      u.isAlive() &&
      u.isEnemy(owner) &&
      !u.isUnitType(UNIT_TYPE_STRUCTURE) &&
      !u.isUnitType(UNIT_TYPE_FLYING)
    );
  }

  private distance(hero: Unit, u: Unit): number {
    return Math.sqrt((u.x - hero.x) ** 2 + (u.y - hero.y) ** 2);
  }

  // The unheld enemy ground unit within 700 that came closest to the hero
  // since the last look, else the nearest
  private charger(
    hero: Unit,
    owner: MapPlayer,
    vines: Vines,
  ): Unit | undefined {
    let best: Unit | undefined;
    let fastest = 0;
    let nearest: Unit | undefined;
    let least = 0;
    const grp = Group.fromRange(700, hero.point);
    grp.for((u) => {
      if (!this.isVictim(u, owner)) return;
      if (!u.isVisible(owner)) return;
      if (vines.held.has(u)) return;
      const d = this.distance(hero, u);
      if (nearest == null || d < least) {
        nearest = u;
        least = d;
      }
      const before = vines.distances.get(u);
      if (before == null) return;
      const closing = before - d;
      if (closing > 10 && closing > fastest) {
        fastest = closing;
        best = u;
      }
    });
    grp.destroy();
    return best ?? nearest;
  }

  // The arrow flies at 1500 a second, homing in on its target
  private shoot(
    vehicle: Vehicle,
    owner: MapPlayer,
    target: Unit,
    vines: Vines,
  ): void {
    const hero = vehicle.unit;
    let x = hero.x;
    let y = hero.y;
    const arrow = Effect.create(
      "Abilities/Weapons/SearingArrow/SearingArrowMissile.mdl",
      x,
      y,
    );
    arrow.setHeight(40);
    vines.arrows.push(arrow);

    const t = TimerUtils.newTimer();
    vines.timers.push(t);
    t.start(0.03125, true, () => {
      const done = () => {
        vines.arrows.splice(vines.arrows.indexOf(arrow), 1);
        arrow.destroy();
        this.release(vines, t);
      };
      if (!target.isAlive()) {
        done();
        return;
      }
      const dx = target.x - x;
      const dy = target.y - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const step = 1500 * 0.03125;
      if (d > step) {
        x += (dx / d) * step;
        y += (dy / d) * step;
        arrow.x = x;
        arrow.y = y;
        arrow.setYaw(Math.atan2(dy, dx));
        return;
      }
      done();
      hero.damageTarget(
        target.handle,
        20,
        false,
        true,
        ATTACK_TYPE_PIERCE,
        DAMAGE_TYPE_NORMAL,
        WEAPON_TYPE_WHOKNOWS,
      );
      const caught = { count: 0 };
      this.trip(vehicle, owner, target, vines, caught);
    });
  }

  private trip(
    vehicle: Vehicle,
    owner: MapPlayer,
    u: Unit,
    vines: Vines,
    caught: { count: number },
  ): void {
    if (!u.isAlive() || vines.held.has(u) || caught.count >= 6) return;
    caught.count++;
    vines.held.set(u, 2.5);
    const dummy = Unit.create(owner, this.dummyUnitId, u.x, u.y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 4);
    dummy.addAbility(this.rootsAbilityId);
    dummy.issueTargetOrder("entanglingroots", u);

    // The ones right behind stumble over it
    const t = TimerUtils.newTimer();
    vines.timers.push(t);
    t.start(0.2, false, () => {
      this.release(vines, t);
      const hero = vehicle.unit;
      const own = this.distance(hero, u);
      const behind: Unit[] = [];
      const grp = Group.fromRange(150, u.point);
      grp.for((o) => {
        if (o === u || !this.isVictim(o, owner)) return;
        if (vines.held.has(o)) return;
        if (this.distance(hero, o) <= own) return;
        behind.push(o);
      });
      grp.destroy();
      for (const o of behind) this.trip(vehicle, owner, o, vines, caught);
    });
  }

  private release(vines: Vines, t: Timer): void {
    const i = vines.timers.indexOf(t);
    if (i < 0) return;
    vines.timers.splice(i, 1);
    TimerUtils.releaseTimer(t);
  }
}
