import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { GarroteDamageEvent } from "../../../Utility/DamageEngine/DamageEvents/GarroteDamageEvent";

interface Cord {
  victim?: Unit;
  // What the next second of strangling deals
  strength: number;
  timer: Timer;
}

// A vine cord seizes the enemy ground unit that last struck the hero (else the
// nearest one within 600) and holds it (A05F: rooted, can't attack). It
// strangles it every second, 40 the first and twice as much every second
// after, up to 320, until it dies; then the cord seizes the next enemy at
// once, starting at half the strength that killed (40 at least). The cord
// snaps when the hero gets more than 800 away, and starts over at 40
export class Garrote extends WeaponUpgradeRecipe {
  public readonly cooldown = 1;
  public readonly itemTypeId = FourCC("I0E8");
  public readonly merchantItemTypeId = FourCC("I0E9");
  public readonly recipe: number[] = [FourCC("I05Q"), FourCC("I05P")];

  // Every enemy held by some Garrote, so two cords never share one
  private static readonly HELD = new Set<Unit>();

  private readonly cords = new Map<number, Cord>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly vinesAbilityId: number = FourCC("A05F");
  private readonly vinesBuffId: number = FourCC("BEer");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const heroId = vehicle.unit.id;
    GarroteDamageEvent.WATCHED.set(
      heroId,
      (GarroteDamageEvent.WATCHED.get(heroId) ?? 0) + 1,
    );

    const cord: Cord = { strength: 40, timer: TimerUtils.newTimer() };
    this.cords.set(itemId, cord);
    cord.timer.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );

      let victim = cord.victim;
      if (victim != null && victim.isAlive()) {
        if (this.distance(hero, victim) > 800) {
          this.release(cord);
          cord.strength = 40;
          return;
        }
        const dealt = cord.strength;
        Effect.createAttachment(
          "Abilities/Spells/NightElf/ThornsAura/ThornsAuraDamage.mdl",
          victim,
          "head",
        ).destroy();
        hero.damageTarget(
          victim.handle,
          dealt,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
        if (victim.isAlive()) {
          cord.strength = Math.min(320, dealt * 2);
          return;
        }
        // Strangled: the cord whips on at half the strength that killed
        this.release(cord);
        cord.strength = Math.max(40, dealt / 2);
      } else if (victim != null) {
        // Killed by something else while held: it keeps half its strength
        const reached = cord.strength / 2;
        this.release(cord);
        cord.strength = Math.max(40, reached / 2);
      }

      victim = this.pickVictim(hero, owner);
      if (victim == null) return;
      this.seize(owner, cord, hero, victim);
    });
  }

  public onDrop(
    vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const cord = this.cords.get(itemId);
    this.cords.delete(itemId);
    if (cord != null) {
      TimerUtils.releaseTimer(cord.timer);
      this.release(cord);
    }

    const heroId = vehicle.unit.id;
    const count = (GarroteDamageEvent.WATCHED.get(heroId) ?? 1) - 1;
    if (count > 0) {
      GarroteDamageEvent.WATCHED.set(heroId, count);
    } else {
      GarroteDamageEvent.WATCHED.delete(heroId);
      GarroteDamageEvent.LAST_ATTACKER.delete(heroId);
    }
  }

  private seize(owner: MapPlayer, cord: Cord, hero: Unit, victim: Unit) {
    cord.victim = victim;
    Garrote.HELD.add(victim);
    const dummy = Unit.create(owner, this.dummyUnitId, hero.x, hero.y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 2);
    dummy.addAbility(this.vinesAbilityId);
    dummy.issueTargetOrder("entanglingroots", victim);
  }

  private release(cord: Cord) {
    const victim = cord.victim;
    cord.victim = undefined;
    if (victim == null) return;
    Garrote.HELD.delete(victim);
    if (victim.isAlive()) victim.removeAbility(this.vinesBuffId);
  }

  // The enemy ground unit that last struck the hero, if it is still within
  // 600 and free; else the nearest free enemy ground unit within 600
  private pickVictim(hero: Unit, owner: MapPlayer): Unit | undefined {
    const attacker = GarroteDamageEvent.LAST_ATTACKER.get(hero.id);
    if (
      attacker != null &&
      this.isVictim(attacker, owner) &&
      this.distance(hero, attacker) <= 600
    ) {
      return attacker;
    }

    let nearest: Unit | undefined;
    let best = 0;
    const grp = Group.fromRange(600, hero.point);
    grp.for((u) => {
      if (!this.isVictim(u, owner)) return;
      if (!u.isVisible(owner)) return;
      const d = this.distance(hero, u);
      if (nearest == null || d < best) {
        nearest = u;
        best = d;
      }
    });
    grp.destroy();
    return nearest;
  }

  private isVictim(u: Unit, owner: MapPlayer): boolean {
    if (!u.isAlive()) return false;
    if (!u.isEnemy(owner)) return false;
    if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return false;
    if (u.isUnitType(UNIT_TYPE_FLYING)) return false;
    return !Garrote.HELD.has(u);
  }

  private distance(a: Unit, b: Unit): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
