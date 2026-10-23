import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { CoupDeGraceDamageEvent } from "../../../Utility/DamageEngine/DamageEvents/CoupDeGraceDamageEvent";

interface Hunt {
  // Every enemy a spear poisoned, and seconds left of its poison
  poisoned: Map<Unit, number>;
  timers: Timer[];
}

// Every 0.75 seconds a poisoned spear (u01S: 15, -25% movement for 2s) at the
// nearest enemy within 600 that no spear has poisoned yet (else the nearest).
// Every 2 seconds a poisoned dagger (A047: 100 + 30 every 3s for 9s, -50%
// movement) at the spear-poisoned enemy within 600 with the lowest share of
// its life (else the nearest enemy); a spear-poisoned enemy the dagger leaves
// below 40% of its life dies outright
export class CoupDeGrace extends WeaponUpgradeRecipe {
  public readonly cooldown = 2;
  public readonly itemTypeId = FourCC("I0EW");
  public readonly merchantItemTypeId = FourCC("I0EX");
  public readonly recipe: number[] = [FourCC("I05O"), FourCC("I05Q")];

  private readonly hunts = new Map<number, Hunt>();
  private readonly spearUnitId: number = FourCC("u01S");
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly daggerAbilityId: number = FourCC("A047");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const hunt: Hunt = { poisoned: new Map(), timers: [] };
    this.hunts.set(itemId, hunt);

    const spears = TimerUtils.newTimer();
    spears.start(0.75, true, () => {
      // Deleting inside forEach would end the loop there
      const cured: Unit[] = [];
      hunt.poisoned.forEach((left, u) => {
        if (left <= 0.75 || !u.isAlive()) cured.push(u);
        else hunt.poisoned.set(u, left - 0.75);
      });
      for (const u of cured) hunt.poisoned.delete(u);

      const hero = vehicle.unit;
      const target = this.pick(hero, owner, (u, d) =>
        hunt.poisoned.has(u) ? d + 1000000000 : d,
      );
      if (target == null) return;
      const spear = Unit.create(owner, this.spearUnitId, hero.x, hero.y);
      spear.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
      this.watch(spear, (struck) => {
        if (struck.isAlive()) hunt.poisoned.set(struck, 2);
      });
      spear.issueTargetOrder("attack", target);
    });

    const daggers = TimerUtils.newTimer();
    daggers.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      // Poisoned enemies by their share of life, everyone else after them
      // by distance
      const target = this.pick(hero, owner, (u, d) =>
        hunt.poisoned.has(u) ? u.life / u.maxLife - 2 : d,
      );
      if (target == null) return;
      const dummy = Unit.create(owner, this.dummyUnitId, hero.x, hero.y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 11);
      dummy.addAbility(this.daggerAbilityId);
      this.watch(dummy, (struck) => this.cull(hero, hunt, struck));
      dummy.issueTargetOrder("shadowstrike", target);
    });
    hunt.timers.push(spears, daggers);
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const hunt = this.hunts.get(itemId);
    this.hunts.delete(itemId);
    if (hunt == null) return;
    for (const t of hunt.timers) TimerUtils.releaseTimer(t);
    hunt.timers.length = 0;
    hunt.poisoned.clear();
  }

  // Hands the thrower's first hit to `struck`, and forgets a throw that
  // never lands
  private watch(thrower: Unit, struck: (u: Unit) => void) {
    const id = thrower.id;
    CoupDeGraceDamageEvent.THROWN.set(id, struck);
    const forget = TimerUtils.newTimer();
    forget.start(3, false, () => {
      if (CoupDeGraceDamageEvent.THROWN.get(id) === struck) {
        CoupDeGraceDamageEvent.THROWN.delete(id);
      }
      TimerUtils.releaseTimer(forget);
    });
  }

  // Once the dagger's hit has landed: a spear-poisoned enemy left below 40%
  // of its life dies
  private cull(hero: Unit, hunt: Hunt, struck: Unit) {
    const t = TimerUtils.newTimer();
    t.start(0, false, () => {
      TimerUtils.releaseTimer(t);
      if (!struck.isAlive() || !hunt.poisoned.has(struck)) return;
      if (struck.life > 0.4 * struck.maxLife) return;
      Effect.create(
        "Objects/Spawnmodels/Human/HumanLargeDeathExplode/HumanLargeDeathExplode.mdl",
        struck.x,
        struck.y,
      ).destroy();
      hero.damageTarget(
        struck.handle,
        struck.life * 10 + 100,
        false,
        false,
        ATTACK_TYPE_CHAOS,
        DAMAGE_TYPE_UNIVERSAL,
        WEAPON_TYPE_WHOKNOWS,
      );
    });
  }

  // The visible enemy within 600 with the lowest score (d: squared distance)
  private pick(
    hero: Unit,
    owner: MapPlayer,
    score: (u: Unit, d: number) => number,
  ): Unit | undefined {
    let best: Unit | undefined;
    let bestScore = 0;
    const grp = Group.fromRange(600, hero.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      const dx = u.x - hero.x;
      const dy = u.y - hero.y;
      const s = score(u, dx * dx + dy * dy);
      if (best == null || s < bestScore) {
        best = u;
        bestScore = s;
      }
    });
    grp.destroy();
    return best;
  }
}
