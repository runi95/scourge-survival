import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

// Every 4 seconds a poisoned dagger with a goblin rocket strapped to it is
// stabbed into the nearest enemy within 700 (Shadow Strike). A moment later
// the rocket ignites and carries its helpless host through the air into the
// largest enemy group within 900 of it (or 500 straight away from the hero
// when there is none), where it crashes: every enemy within 250, the host
// included, takes 100, is stunned 1s and poisoned (30 every 3s for 9s, slowed)
export class Joyride extends WeaponUpgradeRecipe {
  public readonly cooldown = 4;
  public readonly itemTypeId = FourCC("I0EU");
  public readonly merchantItemTypeId = FourCC("I0EV");
  public readonly recipe: number[] = [FourCC("I05Q"), FourCC("I00N")];

  private readonly timers = new Map<number, Timer>();
  // Enemies with a rocket in them that hasn't crashed yet
  private readonly riders = new Set<Unit>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly daggerAbilityId: number = FourCC("A047");
  private readonly venomAbilityId: number = FourCC("A059");

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
      const target = this.nearest(hero, owner);
      if (target == null) return;

      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      this.stab(hero, owner, target);
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

  private enemiesAround(
    owner: MapPlayer,
    x: number,
    y: number,
    radius: number,
  ): Unit[] {
    const at = Point.create(x, y);
    const enemies: Unit[] = [];
    const grp = Group.fromRange(radius, at);
    grp.for((u) => {
      if (!u.isAlive()) return;
      if (!u.isEnemy(owner)) return;
      if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;

      enemies.push(u);
    });
    grp.destroy();
    at.destroy();
    return enemies;
  }

  // The nearest visible enemy within 700 of the hero without a rocket in it
  private nearest(hero: Unit, owner: MapPlayer): Unit | undefined {
    let best: Unit | undefined;
    let bestDistance = 700 * 700;
    for (const u of this.enemiesAround(owner, hero.x, hero.y, 700)) {
      if (!u.isVisible(owner)) continue;
      if (this.riders.has(u)) continue;

      const d = (u.x - hero.x) ** 2 + (u.y - hero.y) ** 2;
      if (d > bestDistance) continue;
      bestDistance = d;
      best = u;
    }
    return best;
  }

  // The enemy within 900 of the host, at least 200 away from it, with the
  // most enemies within 250 of it
  private largestGroup(owner: MapPlayer, host: Unit): Unit | undefined {
    const enemies = this.enemiesAround(owner, host.x, host.y, 900).filter(
      (u) => u.handle !== host.handle && !this.riders.has(u),
    );
    let best: Unit | undefined;
    let most = 0;
    for (const u of enemies) {
      if ((u.x - host.x) ** 2 + (u.y - host.y) ** 2 < 200 * 200) continue;

      let count = 0;
      for (const other of enemies) {
        if ((other.x - u.x) ** 2 + (other.y - u.y) ** 2 <= 250 * 250) count++;
      }
      if (count <= most) continue;
      most = count;
      best = u;
    }
    return best;
  }

  // The dagger is the real Shadow Strike (A047: 100 + 30 every 3s for 9s,
  // slowed); the rocket ignites 0.75 seconds after it is thrown
  private stab(hero: Unit, owner: MapPlayer, target: Unit): void {
    this.riders.add(target);
    const dummy = Unit.create(owner, this.dummyUnitId, hero.x, hero.y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 11);
    dummy.addAbility(this.daggerAbilityId);
    dummy.issueTargetOrder("shadowstrike", target);

    const t = TimerUtils.newTimer();
    t.start(0.75, false, () => {
      TimerUtils.releaseTimer(t);
      if (!target.isAlive()) {
        this.riders.delete(target);
        return;
      }
      const group = this.largestGroup(owner, target);
      if (group != null) {
        this.fly(hero, owner, target, group.x, group.y);
        return;
      }
      const away = Math.atan2(target.y - hero.y, target.x - hero.x);
      this.fly(
        hero,
        owner,
        target,
        target.x + 500 * Math.cos(away),
        target.y + 500 * Math.sin(away),
      );
    });
  }

  // The host flies at 800 a second in an arc up to 250 high, held (stunned)
  // until it lands
  private fly(
    hero: Unit,
    owner: MapPlayer,
    host: Unit,
    toX: number,
    toY: number,
  ): void {
    const fromX = host.x;
    const fromY = host.y;
    const distance = Math.max(
      1,
      Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2),
    );
    const duration = Math.max(0.4, distance / 800);
    const flyer = host.isUnitType(UNIT_TYPE_FLYING);
    const baseHeight = host.getflyHeight();
    if (!flyer) {
      // Crow Form on and off lets a ground unit's height change
      host.addAbility(FourCC("Amrf"));
      host.removeAbility(FourCC("Amrf"));
    }
    StunUtils.stunUnit(host.handle, duration + 0.1);
    const rocket = Effect.createAttachment(
      "Abilities/Spells/Other/TinkerRocket/TinkerRocketMissile.mdl",
      host,
      "chest",
    );
    let elapsed = 0;
    const t = TimerUtils.newTimer();
    t.start(0.03125, true, () => {
      elapsed += 0.03125;
      const progress = Math.min(1, elapsed / duration);
      if (host.isAlive()) {
        const x = fromX + (toX - fromX) * progress;
        const y = fromY + (toY - fromY) * progress;
        if (!IsTerrainPathable(x, y, PATHING_TYPE_WALKABILITY) || flyer) {
          host.x = x;
          host.y = y;
        }
        host.setflyHeight(baseHeight + 250 * Math.sin(progress * Math.PI), 0);
      }
      if (progress < 1) return;

      TimerUtils.releaseTimer(t);
      rocket.destroy();
      host.setflyHeight(baseHeight, 0);
      this.riders.delete(host);
      this.crash(
        hero,
        owner,
        host.isAlive() ? host.x : toX,
        host.isAlive() ? host.y : toY,
      );
    });
  }

  // Every enemy within 250 takes 100, is stunned 1s and poisoned (A059: 30
  // every 3s for 9s, slowed)
  private crash(hero: Unit, owner: MapPlayer, x: number, y: number): void {
    Effect.create("Abilities/Weapons/Mortar/MortarMissile.mdl", x, y).destroy();
    Effect.create(
      "Abilities/Weapons/ChimaeraAcidMissile/ChimaeraAcidMissile.mdl",
      x,
      y,
    ).destroy();
    for (const u of this.enemiesAround(owner, x, y, 250)) {
      hero.damageTarget(
        u.handle,
        100,
        false,
        false,
        ATTACK_TYPE_NORMAL,
        DAMAGE_TYPE_MAGIC,
        WEAPON_TYPE_WHOKNOWS,
      );
      if (!u.isAlive()) continue;

      StunUtils.stunUnit(u.handle, 1);
      const dummy = Unit.create(owner, this.dummyUnitId, x, y);
      dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 11);
      dummy.addAbility(this.venomAbilityId);
      dummy.issueTargetOrder("shadowstrike", u);
    }
  }
}
