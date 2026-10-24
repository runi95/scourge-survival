import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

interface Trap {
  unit: Unit;
  catch?: Unit;
  // Seconds until it is armed, since it last bit and since it last held
  arming: number;
  bite: number;
  hold: number;
}

interface Traps {
  traps: Trap[];
  timers: Timer[];
}

// Every 3 seconds a trap (n01B, 30 s) under the hero, up to 5 (the oldest
// goes). Armed 2 s later (and 1 s after a catch dies), it pulls the nearest
// enemy ground unit within 200 onto itself and holds it there (A042, cast
// again every 2.5 s), with 50 damage every second until it dies
export class BearTrap extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I09M");
  public readonly merchantItemTypeId = FourCC("I09N");
  public readonly recipe: number[] = [FourCC("I003"), FourCC("I05G")];

  private readonly sets = new Map<number, Traps>();
  private readonly trapUnitId: number = FourCC("n01B");
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly netAbilityId: number = FourCC("A042");

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
      if (set.traps.length >= 5) this.spring(set, set.traps[0]);
      const unit = Unit.create(owner, this.trapUnitId, hero.x, hero.y, 270);
      unit.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 30);
      set.traps.push({ unit, arming: 2, bite: 0, hold: 0 });
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
        if (trap.catch != null && !trap.catch.isAlive()) {
          trap.catch = undefined;
          trap.arming = 1;
        }
        if (trap.catch == null) {
          trap.arming -= 0.25;
          if (trap.arming > 0) continue;
          const prey = this.nearest(trap.unit, owner, set);
          if (prey == null) continue;
          trap.catch = prey;
          trap.bite = 0;
          trap.hold = 2.5;
          prey.x = trap.unit.x;
          prey.y = trap.unit.y;
          Effect.create(
            "Abilities/Spells/Orc/Ensnare/EnsnareMissile.mdl",
            trap.unit.x,
            trap.unit.y,
          ).destroy();
        }

        // Every second it bites, every 2.5 s it is held again
        const prey = trap.catch;
        trap.hold += 0.25;
        if (trap.hold >= 2.5) {
          trap.hold = 0;
          const dummy = Unit.create(owner, this.dummyUnitId, prey.x, prey.y);
          dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 2);
          dummy.addAbility(this.netAbilityId);
          dummy.issueTargetOrder("ensnare", prey);
        }
        trap.bite += 0.25;
        if (trap.bite >= 1) {
          trap.bite = 0;
          hero.damageTarget(
            prey.handle,
            50,
            false,
            false,
            ATTACK_TYPE_NORMAL,
            DAMAGE_TYPE_MAGIC,
            WEAPON_TYPE_WHOKNOWS,
          );
        }
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
    set.timers.length = 0;
    while (set.traps.length > 0) this.spring(set, set.traps[0]);
  }

  private spring(set: Traps, trap: Trap) {
    const i = set.traps.indexOf(trap);
    if (i >= 0) set.traps.splice(i, 1);
    if (trap.unit.isAlive()) trap.unit.kill();
  }

  // The nearest enemy ground unit within 200 that no trap holds yet
  private nearest(trap: Unit, owner: MapPlayer, set: Traps): Unit | undefined {
    let nearest: Unit | undefined;
    let nearestDist = 0;
    const at = Point.create(trap.x, trap.y);
    const grp = Group.fromRange(200, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (u.isUnitType(UNIT_TYPE_FLYING)) return;
      for (const other of set.traps) {
        if (other.catch === u) return;
      }

      const d =
        (u.x - trap.x) * (u.x - trap.x) + (u.y - trap.y) * (u.y - trap.y);
      if (nearest == null || d < nearestDist) {
        nearest = u;
        nearestDist = d;
      }
    });
    grp.destroy();
    at.destroy();
    return nearest;
  }
}
