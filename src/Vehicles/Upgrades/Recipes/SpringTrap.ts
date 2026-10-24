import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

interface Trap {
  unit: Unit;
  // Seconds until it is armed, and throws left
  arming: number;
  throws: number;
}

interface Traps {
  traps: Trap[];
  timers: Timer[];
}

// Every 3 seconds a trap (n018, 30 s) under the hero, up to 5 (the oldest
// goes). Armed 2 s later, it throws the nearest enemy ground unit within 220
// in a 0.6 s arc onto the enemy within 700 of the trap farthest from it (or
// 500 straight away from the hero): where it lands it and that enemy take
// 100 and are stunned for 1.5 s. A trap throws 3 times, armed again 2 s after
// each
export class SpringTrap extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I07G");
  public readonly merchantItemTypeId = FourCC("I07H");
  public readonly recipe: number[] = [FourCC("I003"), FourCC("I05D")];

  private readonly sets = new Map<number, Traps>();
  private readonly trapUnitId: number = FourCC("n018");
  private readonly crowFormAbilityId: number = FourCC("Amrf");
  // Enemies in the air, so no trap throws them again on the way
  private readonly flying = new Set<Unit>();

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const set: Traps = { traps: [], timers: [] };
    this.sets.set(itemId, set);

    const lay = TimerUtils.newTimer();
    lay.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      if (set.traps.length >= 5) {
        const oldest = set.traps.shift();
        if (oldest.unit.isAlive()) oldest.unit.kill();
      }
      const unit = Unit.create(owner, this.trapUnitId, hero.x, hero.y, 270);
      unit.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 30);
      set.traps.push({ unit, arming: 2, throws: 3 });
    });

    const watch = TimerUtils.newTimer();
    watch.start(0.25, true, () => {
      const hero = vehicle.unit;
      for (let i = set.traps.length - 1; i >= 0; i--) {
        const trap = set.traps[i];
        if (!trap.unit.isAlive()) {
          set.traps.splice(i, 1);
          continue;
        }
        trap.arming -= 0.25;
        if (trap.arming > 0) continue;
        const prey = this.nearest(trap.unit, owner);
        if (prey == null) continue;

        trap.arming = 2;
        trap.throws--;
        this.hurl(hero, owner, trap.unit, prey);
        if (trap.throws > 0) continue;
        set.traps.splice(i, 1);
        trap.unit.kill();
      }
    });
    set.timers.push(lay, watch);
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const set = this.sets.get(itemId);
    this.sets.delete(itemId);
    if (set == null) return;
    for (const t of set.timers) TimerUtils.releaseTimer(t);
    for (const trap of set.traps) {
      if (trap.unit.isAlive()) trap.unit.kill();
    }
    set.traps.length = 0;
  }

  private nearest(trap: Unit, owner: MapPlayer): Unit | undefined {
    let nearest: Unit | undefined;
    let nearestDist = 0;
    const at = Point.create(trap.x, trap.y);
    const grp = Group.fromRange(220, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (u.isUnitType(UNIT_TYPE_FLYING)) return;
      if (this.flying.has(u)) return;

      const d = (u.x - trap.x) ** 2 + (u.y - trap.y) ** 2;
      if (nearest == null || d < nearestDist) {
        nearest = u;
        nearestDist = d;
      }
    });
    grp.destroy();
    at.destroy();
    return nearest;
  }

  private hurl(hero: Unit, owner: MapPlayer, trap: Unit, prey: Unit) {
    // The farthest enemy within 700 of the trap
    let target: Unit | undefined;
    let farthest = 0;
    const grp = Group.fromRange(700, trap.point);
    grp.for((u) => {
      if (u === prey) return;
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      const d = (u.x - trap.x) ** 2 + (u.y - trap.y) ** 2;
      if (d > farthest) {
        target = u;
        farthest = d;
      }
    });
    grp.destroy();

    const sx = prey.x;
    const sy = prey.y;
    let tx = sx;
    let ty = sy;
    if (target != null) {
      tx = target.x;
      ty = target.y;
    } else {
      const radians = Atan2(sy - hero.y, sx - hero.x);
      tx = sx + 500 * Math.cos(radians);
      ty = sy + 500 * Math.sin(radians);
    }

    Effect.create(
      "Abilities/Weapons/Mortar/MortarMissile.mdl",
      trap.x,
      trap.y,
    ).destroy();
    this.flying.add(prey);
    StunUtils.stunUnit(prey.handle, 0.6);
    prey.addAbility(this.crowFormAbilityId);
    prey.removeAbility(this.crowFormAbilityId);
    const base = prey.getflyHeight();
    let step = 0;

    const t = TimerUtils.newTimer();
    t.start(0.05, true, () => {
      step++;
      const f = step / 12;
      // Following a target that moves on
      if (target != null && target.isAlive()) {
        tx = target.x;
        ty = target.y;
      }
      const x = sx + (tx - sx) * f;
      const y = sy + (ty - sy) * f;
      if (prey.isAlive()) {
        if (!IsTerrainPathable(x, y, PATHING_TYPE_WALKABILITY)) {
          prey.x = x;
          prey.y = y;
        }
        prey.setflyHeight(base + 1200 * f * (1 - f), 0);
      }
      if (step < 12) return;

      TimerUtils.releaseTimer(t);
      this.flying.delete(prey);
      if (prey.isAlive()) prey.setflyHeight(base, 0);
      Effect.create(
        "Abilities/Spells/Human/StormBolt/StormBoltTarget.mdl",
        prey.x,
        prey.y,
      ).destroy();
      Effect.create(
        "Abilities/Spells/Human/ThunderClap/ThunderClapCaster.mdl",
        prey.x,
        prey.y,
      ).destroy();
      const struck = [prey];
      if (
        target != null &&
        target.isAlive() &&
        (target.x - prey.x) ** 2 + (target.y - prey.y) ** 2 <= 200 * 200
      ) {
        struck.push(target);
      }
      for (const u of struck) {
        if (!u.isAlive()) continue;
        hero.damageTarget(
          u.handle,
          100,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
        if (u.isAlive()) StunUtils.stunUnit(u.handle, 1.5);
      }
    });
  }
}
