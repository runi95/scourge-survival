import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

type Trap = {
  effect: Effect;
  at: Point;
  age: number;
};

// Every 3 seconds a toxin trap is left under the hero (up to 10, armed after
// 1s, gone after 60s). It doesn't explode: the first enemy ground unit that
// steps on it is injected with a volatile poison (a Dryad spear: 15 + slowed)
// and becomes the bomb. 3 seconds later, or as soon as it dies, it bursts
// wherever it has walked to: every enemy within 250, itself included, takes
// 100 and is splashed with the Dryad's slow poison
export class VolatileToxin extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I0DG");
  public readonly merchantItemTypeId = FourCC("I0DH");
  public readonly recipe: number[] = [FourCC("I05O"), FourCC("I003")];

  private readonly timers = new Map<number, Timer[]>();
  private readonly itemTraps = new Map<number, Trap[]>();
  // Enemies carrying the poison that haven't burst yet
  private readonly carriers = new Set<Unit>();
  private readonly spearUnitId: number = FourCC("u01S");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const traps: Trap[] = [];
    this.itemTraps.set(itemId, traps);

    const place = TimerUtils.newTimer();
    place.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      if (traps.length >= 10) this.remove(traps.shift());
      const effect = Effect.create(
        "Units/Creeps/GoblinLandMine/GoblinLandMine.mdl",
        hero.x,
        hero.y,
      );
      effect.setColor(120, 255, 80);
      traps.push({ effect, at: Point.create(hero.x, hero.y), age: 0 });
    });

    const watch = TimerUtils.newTimer();
    watch.start(0.1, true, () => {
      for (let i = traps.length - 1; i >= 0; i--) {
        const trap = traps[i];
        trap.age += 0.1;
        if (trap.age >= 60) {
          traps.splice(i, 1);
          this.remove(trap);
          continue;
        }
        if (trap.age < 1) continue;

        const victim = this.stepper(owner, trap.at);
        if (victim == null) continue;

        traps.splice(i, 1);
        this.remove(trap);
        this.inject(vehicle.unit, owner, victim);
      }
    });
    this.timers.set(itemId, [place, watch]);
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
    for (const trap of this.itemTraps.get(itemId) ?? []) this.remove(trap);
    this.itemTraps.delete(itemId);
  }

  private remove(trap: Trap | undefined): void {
    if (trap == null) return;
    trap.effect.setAlpha(0);
    trap.effect.destroy();
    trap.at.destroy();
  }

  private enemiesAround(owner: MapPlayer, at: Point, radius: number): Unit[] {
    const enemies: Unit[] = [];
    const grp = Group.fromRange(radius, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      enemies.push(u);
    });
    grp.destroy();
    return enemies;
  }

  // An enemy ground unit within 175 of the trap that isn't a carrier yet
  private stepper(owner: MapPlayer, at: Point): Unit | undefined {
    for (const u of this.enemiesAround(owner, at, 175)) {
      if (u.isUnitType(UNIT_TYPE_FLYING)) continue;
      if (this.carriers.has(u)) continue;
      return u;
    }
    return undefined;
  }

  // A Dryad spear (u01S: 15 + Slow Poison) from the trap
  private spear(owner: MapPlayer, x: number, y: number, target: Unit): void {
    const spear = Unit.create(owner, this.spearUnitId, x, y);
    spear.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
    spear.issueTargetOrder("attack", target);
  }

  private inject(hero: Unit, owner: MapPlayer, victim: Unit): void {
    this.carriers.add(victim);
    this.spear(owner, victim.x, victim.y, victim);
    const mark = Effect.createAttachment(
      "Abilities/Spells/Items/OrbVenom/OrbVenom.mdl",
      victim,
      "overhead",
    );
    let x = victim.x;
    let y = victim.y;
    let fuse = 0;
    const t = TimerUtils.newTimer();
    t.start(0.1, true, () => {
      fuse += 0.1;
      if (victim.isAlive()) {
        x = victim.x;
        y = victim.y;
        if (fuse < 3) return;
      }

      TimerUtils.releaseTimer(t);
      mark.destroy();
      this.carriers.delete(victim);
      this.burst(hero, owner, x, y);
    });
  }

  private burst(hero: Unit, owner: MapPlayer, x: number, y: number): void {
    Effect.create(
      "Abilities/Weapons/ChimaeraAcidMissile/ChimaeraAcidMissile.mdl",
      x,
      y,
    ).destroy();
    Effect.create(
      "Abilities/Spells/Other/AcidBomb/BottleImpact.mdl",
      x,
      y,
    ).destroy();
    const at = Point.create(x, y);
    for (const u of this.enemiesAround(owner, at, 250)) {
      hero.damageTarget(
        u.handle,
        100,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
      if (u.isAlive()) this.spear(owner, x, y, u);
    }
    at.destroy();
  }
}
