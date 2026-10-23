import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { OrderId } from "w3ts/globals/order";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { GameMap } from "../../../Game/GameMap";
import { VertigoDamageEvent } from "../../../Utility/DamageEngine/DamageEvents/VertigoDamageEvent";

interface Storm {
  funnel: Effect;
  x: number;
  y: number;
  timer: Timer;
}

interface Dizzy {
  unit: Unit;
  owner: MapPlayer;
  storm: Storm;
  // Seconds of dizziness left
  left: number;
  victim: Unit | null;
  stars: Effect;
}

// A sickening whirlwind drifts after the largest group within 900 of the hero
// and spins every enemy within 250 of it every 0.5 seconds (40). The spun
// reel out of it dizzy for 4 seconds: each lashes out at the nearest other
// enemy within 400 instead of the hero (creep.tauntTarget), and every blow it
// lands carries the Dryad's slow poison (a Dryad spear from the dummy u01S:
// 15 + 10 a second for 2s, -25% movement speed) and 40 more
export class Vertigo extends WeaponUpgradeRecipe {
  public readonly cooldown = 4;
  public readonly itemTypeId = FourCC("I0ES");
  public readonly merchantItemTypeId = FourCC("I0ET");
  public readonly recipe: number[] = [FourCC("I05O"), FourCC("I00X")];

  private readonly storms = new Map<number, Storm>();
  // Dizzy enemies by handle id
  private readonly dizzy = new Map<number, Dizzy>();
  private readonly spearDummyId: number = FourCC("u01S");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const hero = vehicle.unit;
    const funnel = Effect.create(
      "Abilities/Spells/Other/Tornado/TornadoElementalSmall.mdl",
      hero.x,
      hero.y,
    );
    funnel.setColor(120, 255, 120);
    const storm: Storm = {
      funnel,
      x: hero.x,
      y: hero.y,
      timer: TimerUtils.newTimer(),
    };
    this.storms.set(itemId, storm);

    let ticks = 0;
    let goal: Unit | undefined;
    storm.timer.start(0.1, true, () => {
      ticks++;
      if (ticks % 10 === 1) goal = this.largestGroup(vehicle.unit, owner);
      if (goal != null && !goal.isAlive()) goal = undefined;
      // Drifts at 250 a second after the group, back to the hero with none
      const gx = goal != null ? goal.x : vehicle.unit.x;
      const gy = goal != null ? goal.y : vehicle.unit.y;
      const dx = gx - storm.x;
      const dy = gy - storm.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 0) {
        const step = Math.min(d, 25);
        storm.x += (dx / d) * step;
        storm.y += (dy / d) * step;
        storm.funnel.x = storm.x;
        storm.funnel.y = storm.y;
      }
      if (ticks % 5 !== 0) return;

      this.spin(vehicle, owner, storm);
      this.reel(owner, storm);
      if (ticks % 40 === 0) {
        vehicle.unit.startAbilityCooldown(
          weaponDummyAbilityIds[weaponIndex],
          this.cooldown,
        );
      }
    });
    vehicle.unit.startAbilityCooldown(
      weaponDummyAbilityIds[weaponIndex],
      this.cooldown,
    );
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const storm = this.storms.get(itemId);
    this.storms.delete(itemId);
    if (storm == null) return;
    TimerUtils.releaseTimer(storm.timer);
    storm.funnel.destroy();
    for (const d of [...this.dizzy.values()]) {
      if (d.storm === storm) this.recover(d);
    }
  }

  // The visible enemy within 900 of the hero with the most enemies within
  // 300 of it
  private largestGroup(hero: Unit, owner: MapPlayer): Unit | undefined {
    const enemies: Unit[] = [];
    const grp = Group.fromRange(900, hero.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      enemies.push(u);
    });
    grp.destroy();
    let best: Unit | undefined;
    let most = 0;
    for (const u of enemies) {
      let count = 0;
      for (const other of enemies) {
        const dx = other.x - u.x;
        const dy = other.y - u.y;
        if (dx * dx + dy * dy <= 300 * 300) count++;
      }
      if (count <= most) continue;
      most = count;
      best = u;
    }
    return best;
  }

  // Every enemy within 250 of the whirlwind is spun (40) and made dizzy for
  // 4 seconds (again if it already is)
  private spin(vehicle: Vehicle, owner: MapPlayer, storm: Storm): void {
    const spun: Unit[] = [];
    const at = Point.create(storm.x, storm.y);
    const grp = Group.fromRange(250, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      spun.push(u);
    });
    grp.destroy();
    at.destroy();

    for (const u of spun) {
      vehicle.unit.damageTarget(
        u.handle,
        40,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
      if (!u.isAlive()) continue;
      const d = this.dizzy.get(u.id);
      if (d != null) {
        d.left = 4;
        continue;
      }
      const dizzy: Dizzy = {
        unit: u,
        owner,
        storm,
        left: 4,
        victim: null,
        stars: Effect.createAttachment(
          "Abilities/Spells/Other/Tornado/Tornado_Target.mdl",
          u,
          "overhead",
        ),
      };
      this.dizzy.set(u.id, dizzy);
      VertigoDamageEvent.REELING.set(u.id, (struck) =>
        this.poison(dizzy, struck),
      );
    }
  }

  // Every 0.5s each dizzy enemy goes for the nearest other enemy within 400,
  // or comes to its senses when its time is up or nobody is near
  private reel(owner: MapPlayer, storm: Storm): void {
    for (const d of [...this.dizzy.values()]) {
      if (d.storm !== storm) continue;
      const u = d.unit;
      d.left -= 0.5;
      if (!u.isAlive() || d.left <= 0) {
        this.recover(d);
        continue;
      }
      if (
        d.victim != null &&
        d.victim.isAlive() &&
        this.distance(u, d.victim) <= 500
      ) {
        continue;
      }
      const victim = this.nearestOther(owner, u);
      if (victim == null) {
        this.recover(d);
        continue;
      }
      const creep = GameMap.REMAINING_PLAYER_CREEPS[owner.id + 9]?.get(u.id);
      if (creep != null) {
        // A taunt (Mountain Giant, Cursed Doll, a Treant) holds on
        const taunt = creep.tauntTarget;
        if (
          taunt != null &&
          taunt.isAlive() &&
          (d.victim == null || taunt.handle !== d.victim.handle)
        ) {
          this.recover(d);
          continue;
        }
        creep.tauntTarget = victim;
      }
      d.victim = victim;
      u.issueTargetOrder(OrderId.Attack, victim);
    }
  }

  private nearestOther(owner: MapPlayer, u: Unit): Unit | undefined {
    let best: Unit | undefined;
    let bestDistance = 400;
    const grp = Group.fromRange(400, u.point);
    grp.for((o) => {
      if (o === u) return;
      if (!o.isAlive()) return;
      if (!o.isEnemy(owner)) return;
      if (o.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      const d = this.distance(u, o);
      if (d >= bestDistance) return;

      best = o;
      bestDistance = d;
    });
    grp.destroy();
    return best;
  }

  private distance(a: Unit, b: Unit): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // A blow from a dizzy enemy on its own kind carries the Dryad's slow
  // poison and 40 more
  private poison(d: Dizzy, struck: Unit): void {
    if (!struck.isAlive()) return;
    const hero = GameMap.PLAYER_VEHICLES[d.owner.id]?.unit;
    if (hero == null) return;
    hero.damageTarget(
      struck.handle,
      40,
      false,
      false,
      ATTACK_TYPE_NORMAL,
      DAMAGE_TYPE_MAGIC,
      WEAPON_TYPE_WHOKNOWS,
    );
    if (!struck.isAlive()) return;
    const dummy = Unit.create(d.owner, this.spearDummyId, d.unit.x, d.unit.y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
    dummy.issueTargetOrder("attack", struck);
  }

  // Comes to its senses and goes after the hero again
  private recover(d: Dizzy): void {
    this.dizzy.delete(d.unit.id);
    VertigoDamageEvent.REELING.delete(d.unit.id);
    d.stars.destroy();
    const u = d.unit;
    const creep = GameMap.REMAINING_PLAYER_CREEPS[d.owner.id + 9]?.get(u.id);
    if (
      creep != null &&
      d.victim != null &&
      creep.tauntTarget?.handle === d.victim.handle
    ) {
      creep.tauntTarget = null;
    }
    if (!u.isAlive()) return;
    const vehicle = GameMap.PLAYER_VEHICLES[d.owner.id];
    if (vehicle == null) return;
    if (creep != null) {
      creep.attackOrderPosition = [vehicle.lastKnownX, vehicle.lastKnownY];
    }
    u.issueOrderAt(OrderId.Attack, vehicle.lastKnownX, vehicle.lastKnownY);
  }
}
