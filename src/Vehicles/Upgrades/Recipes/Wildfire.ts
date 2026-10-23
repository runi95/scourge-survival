import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { RandomNumberGenerator } from "../../../Utility/RandomNumberGenerator";
import { Group } from "../../../Utility/Group";
import { WildfireDamageEvent } from "../../../Utility/DamageEngine/DamageEvents/WildfireDamageEvent";

const MULT = Math.PI / 180;

interface Fire {
  treants: Unit[];
  // The burning enemy every Treant was sent after
  prey: Map<Unit, Unit>;
  // Seconds of burning left for every burning enemy, and its flames
  burning: Map<Unit, { left: number; flames: Effect }>;
  timers: Timer[];
  arrows: Effect[];
}

// 2 kindling Treants every 15 seconds for 15 seconds, and every 2 seconds a
// searing arrow (25) that sets the unlit enemy nearest to them on fire: 8 a
// second for 6s. The Treants go for burning enemies first, and every blow one
// of them lands on a burning enemy spreads the fire to every enemy within 150
// of it (or keeps it burning 6s more), so the Treants carry the spark through
// the pack
export class Wildfire extends WeaponUpgradeRecipe {
  public readonly cooldown = 2;
  public readonly itemTypeId = FourCC("I0F0");
  public readonly merchantItemTypeId = FourCC("I0F1");
  public readonly recipe: number[] = [FourCC("I04P"), FourCC("I05N")];

  private readonly fires = new Map<number, Fire>();
  private readonly treantUnitTypeId: number = FourCC("e003");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const fire: Fire = {
      treants: [],
      prey: new Map(),
      burning: new Map(),
      timers: [],
      arrows: [],
    };
    this.fires.set(itemId, fire);

    const summon = () => {
      const hero = vehicle.unit;
      for (let i = 0; i < 2; i++) {
        const radians = RandomNumberGenerator.random(0, 359) * MULT;
        const x = hero.x + 150 * Math.cos(radians);
        const y = hero.y + 150 * Math.sin(radians);
        Effect.create(
          "Abilities/Spells/Orc/Treants/feralspirittarget.mdl",
          x,
          y,
        ).destroy();
        const treant = Unit.create(owner, this.treantUnitTypeId, x, y);
        treant.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 15);
        fire.treants.push(treant);
        WildfireDamageEvent.KINDLING.set(treant.id, (struck) =>
          this.fan(vehicle, owner, fire, struck),
        );
      }
    };
    const grow = TimerUtils.newTimer();
    grow.start(15, true, summon);
    summon();

    const shoot = TimerUtils.newTimer();
    shoot.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      const target = this.spark(hero, owner, fire);
      if (target == null) return;
      this.shoot(vehicle, owner, fire, target);
    });

    // The fires burn down, and the Treants look for burning enemies
    const burn = TimerUtils.newTimer();
    burn.start(0.5, true, () => {
      const hero = vehicle.unit;
      fire.burning.forEach((b, u) => {
        if (u.isAlive()) {
          hero.damageTarget(
            u.handle,
            4,
            false,
            false,
            ATTACK_TYPE_NORMAL,
            DAMAGE_TYPE_MAGIC,
            WEAPON_TYPE_WHOKNOWS,
          );
        }
        b.left -= 0.5;
        if (b.left > 0 && u.isAlive()) return;
        b.flames.destroy();
        fire.burning.delete(u);
      });

      fire.treants = fire.treants.filter((treant) => {
        if (treant.isAlive()) return true;
        WildfireDamageEvent.KINDLING.delete(treant.id);
        fire.prey.delete(treant);
        return false;
      });
      for (const treant of fire.treants) this.steer(owner, fire, treant);
    });
    fire.timers.push(grow, shoot, burn);
  }

  public onDrop(
    _vehicle: Vehicle,
    _owner: MapPlayer,
    _item: Item,
    itemId: number,
    _weaponIndex: number,
  ): void {
    const fire = this.fires.get(itemId);
    this.fires.delete(itemId);
    if (fire == null) return;
    for (const t of fire.timers) TimerUtils.releaseTimer(t);
    fire.timers.length = 0;
    for (const arrow of fire.arrows) arrow.destroy();
    fire.arrows.length = 0;
    fire.burning.forEach((b) => b.flames.destroy());
    fire.burning.clear();
    for (const treant of fire.treants) {
      WildfireDamageEvent.KINDLING.delete(treant.id);
      if (treant.isAlive()) treant.kill();
    }
    fire.treants.length = 0;
    fire.prey.clear();
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

  // The unlit enemy within 800 of the hero nearest to one of its Treants, or
  // to the hero when it has none
  private spark(hero: Unit, owner: MapPlayer, fire: Fire): Unit | undefined {
    const from = fire.treants.length > 0 ? fire.treants : [hero];
    let best: Unit | undefined;
    let least = 0;
    for (const u of this.enemiesAround(owner, hero.x, hero.y, 800)) {
      if (!u.isVisible(owner)) continue;
      if (fire.burning.has(u)) continue;
      for (const f of from) {
        const d = (u.x - f.x) ** 2 + (u.y - f.y) ** 2;
        if (best != null && d >= least) continue;
        best = u;
        least = d;
      }
    }
    return best;
  }

  // The arrow flies at 1500 a second, homing in on its target
  private shoot(
    vehicle: Vehicle,
    owner: MapPlayer,
    fire: Fire,
    target: Unit,
  ): void {
    const hero = vehicle.unit;
    let x = hero.x;
    let y = hero.y;
    const arrow = Effect.create(
      "Abilities/Weapons/SearingArrow/SearingArrowMissile.mdl",
      x,
      y,
    );
    arrow.setHeight(60);
    fire.arrows.push(arrow);

    const t = TimerUtils.newTimer();
    fire.timers.push(t);
    t.start(0.03125, true, () => {
      const done = () => {
        fire.arrows.splice(fire.arrows.indexOf(arrow), 1);
        arrow.destroy();
        fire.timers.splice(fire.timers.indexOf(t), 1);
        TimerUtils.releaseTimer(t);
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
      vehicle.unit.damageTarget(
        target.handle,
        25,
        false,
        true,
        ATTACK_TYPE_PIERCE,
        DAMAGE_TYPE_NORMAL,
        WEAPON_TYPE_WHOKNOWS,
      );
      this.ignite(fire, target);
    });
  }

  private ignite(fire: Fire, u: Unit): void {
    if (!u.isAlive()) return;
    const b = fire.burning.get(u);
    if (b != null) {
      b.left = 6;
      return;
    }
    fire.burning.set(u, {
      left: 6,
      flames: Effect.createAttachment(
        "Abilities/Spells/Other/BreathOfFire/BreathOfFireDamage.mdl",
        u,
        "chest",
      ),
    });
  }

  // A Treant that hits a burning enemy fans the fire onto everyone around it
  private fan(
    _vehicle: Vehicle,
    owner: MapPlayer,
    fire: Fire,
    struck: Unit,
  ): void {
    if (!fire.burning.has(struck)) return;
    Effect.create(
      "Abilities/Weapons/RedDragonBreath/RedDragonMissile.mdl",
      struck.x,
      struck.y,
    ).destroy();
    for (const u of this.enemiesAround(owner, struck.x, struck.y, 150)) {
      this.ignite(fire, u);
    }
  }

  // A Treant that is not already after a burning enemy goes for the nearest
  // burning enemy ground unit within 600 of it
  private steer(owner: MapPlayer, fire: Fire, treant: Unit): void {
    const prey = fire.prey.get(treant);
    if (prey != null && prey.isAlive() && fire.burning.has(prey)) return;
    fire.prey.delete(treant);

    let best: Unit | undefined;
    let least = 600 * 600;
    fire.burning.forEach((_b, u) => {
      if (!u.isAlive() || u.isUnitType(UNIT_TYPE_FLYING)) return;
      if (!u.isEnemy(owner)) return;
      const d = (u.x - treant.x) ** 2 + (u.y - treant.y) ** 2;
      if (d >= least) return;
      best = u;
      least = d;
    });
    if (best == null) return;
    fire.prey.set(treant, best);
    treant.issueTargetOrder("attack", best);
  }
}
