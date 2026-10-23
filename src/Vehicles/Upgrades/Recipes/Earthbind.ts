import { Effect, Item, MapPlayer, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";

// Every 2 seconds 2 vine-trailing rockets home in on 2 different enemies
// within 800 that aren't held yet: flyers first, then enemies that attack
// from range, then anyone. A flyer that is hit is torn out of the sky and
// bound to the ground (Ensnare) while the vines hurt it for 50 a second; a
// ground unit is rooted (Entangling Roots, 50 a second). Both are held 2.5s
export class Earthbind extends WeaponUpgradeRecipe {
  public readonly cooldown = 2;
  public readonly itemTypeId = FourCC("I0DO");
  public readonly merchantItemTypeId = FourCC("I0DP");
  public readonly recipe: number[] = [FourCC("I00N"), FourCC("I05P")];

  private readonly timers = new Map<number, Timer>();
  // Enemies a rocket is already flying at
  private readonly incoming = new Set<Unit>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly bindAbilityId: number = FourCC("A058");
  private readonly rootsAbilityId: number = FourCC("A046");
  private readonly heldBuffIds: number[] = [
    FourCC("B00D"),
    FourCC("Beng"),
    FourCC("BEer"),
  ];

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
      for (const target of this.pickTargets(hero, owner, 2)) {
        this.launch(hero, owner, target);
      }
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

  private isHeld(u: Unit): boolean {
    for (const buffId of this.heldBuffIds) {
      if (u.getAbilityLevel(buffId) > 0) return true;
    }
    return this.incoming.has(u);
  }

  // Up to `count` different enemies within 800 that aren't held: flyers
  // first, then ranged attackers, then anyone, at random within each
  private pickTargets(hero: Unit, owner: MapPlayer, count: number): Unit[] {
    const tiers: Unit[][] = [[], [], []];
    const grp = Group.fromRange(800, hero.point);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isVisible(owner)) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
      if (this.isHeld(u)) return;

      if (u.isUnitType(UNIT_TYPE_FLYING)) tiers[0].push(u);
      else if (u.isUnitType(UNIT_TYPE_RANGED_ATTACKER)) tiers[1].push(u);
      else tiers[2].push(u);
    });
    grp.destroy();

    const picked: Unit[] = [];
    for (const tier of tiers) {
      while (tier.length > 0 && picked.length < count) {
        const i = RandomNumberGenerator.random(0, tier.length - 1);
        picked.push(tier[i]);
        tier.splice(i, 1);
      }
    }
    return picked;
  }

  // The rocket homes in at 1000 a second, arcing up and trailing vines,
  // and hits for 30
  private launch(hero: Unit, owner: MapPlayer, target: Unit): void {
    this.incoming.add(target);
    const rocket = Effect.create(
      "Abilities/Spells/Other/TinkerRocket/TinkerRocketMissile.mdl",
      hero.x,
      hero.y,
    );
    let x = hero.x;
    let y = hero.y;
    let travelled = 0;
    const t = TimerUtils.newTimer();
    t.start(0.03125, true, () => {
      if (!target.isAlive()) {
        this.incoming.delete(target);
        rocket.destroy();
        TimerUtils.releaseTimer(t);
        return;
      }
      const angle = Math.atan2(target.y - y, target.x - x);
      const left = Math.sqrt((target.x - x) ** 2 + (target.y - y) ** 2);
      const step = Math.min(1000 * 0.03125, left);
      x += step * Math.cos(angle);
      y += step * Math.sin(angle);
      travelled += step;
      rocket.x = x;
      rocket.y = y;
      rocket.setYaw(angle);
      rocket.setHeight(60 + Math.min(200, travelled / 2, left / 2));
      if (step < left) return;

      this.incoming.delete(target);
      rocket.destroy();
      TimerUtils.releaseTimer(t);
      this.bind(hero, owner, target);
    });
  }

  private bind(hero: Unit, owner: MapPlayer, target: Unit): void {
    Effect.create(
      "Abilities/Spells/NightElf/EntanglingRoots/EntanglingRootsTarget.mdl",
      target.x,
      target.y,
    ).destroy();
    hero.damageTarget(
      target.handle,
      30,
      false,
      false,
      ATTACK_TYPE_NORMAL,
      DAMAGE_TYPE_MAGIC,
      WEAPON_TYPE_WHOKNOWS,
    );
    if (!target.isAlive()) return;

    const dummy = Unit.create(owner, this.dummyUnitId, target.x, target.y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 4);
    if (!target.isUnitType(UNIT_TYPE_FLYING)) {
      dummy.addAbility(this.rootsAbilityId);
      dummy.issueTargetOrder("entanglingroots", target);
      return;
    }

    // Ensnare only holds; the vines hurt a grounded flyer by code
    dummy.addAbility(this.bindAbilityId);
    dummy.issueTargetOrder("ensnare", target);
    let ticks = 0;
    const t = TimerUtils.newTimer();
    t.start(0.25, true, () => {
      ticks++;
      if (target.isAlive()) {
        hero.damageTarget(
          target.handle,
          12.5,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_MAGIC,
          WEAPON_TYPE_WHOKNOWS,
        );
      }
      if (ticks >= 10 || !target.isAlive()) TimerUtils.releaseTimer(t);
    });
  }
}
