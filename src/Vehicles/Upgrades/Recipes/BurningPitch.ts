import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";

interface Puddle {
  x: number;
  y: number;
  age: number;
  fire: Effect;
}

interface Coat {
  left: number;
  // The puddle it last dripped
  puddle: Puddle;
  fire: Effect;
}

interface Pitch {
  coats: Map<Unit, Coat>;
  puddles: Puddle[];
  spears: Effect[];
}

// Every 1.5 seconds the hero throws a spear coated in burning pitch at the
// nearest enemy within 700 (30). The pitch sticks to it for 5 seconds: it is
// slowed 30% and burns, and every 0.5 seconds the pitch drips off it where it
// walks, a burning puddle (120, 4 seconds) along its path. Everything burning
// takes 16 a second, once however many puddles it stands in
export class BurningPitch extends WeaponUpgradeRecipe {
  public readonly cooldown = 1.5;
  public readonly itemTypeId = FourCC("I0DW");
  public readonly merchantItemTypeId = FourCC("I0DX");
  public readonly recipe: number[] = [FourCC("I04P"), FourCC("I05O")];

  private readonly timers = new Map<number, Timer[]>();
  private readonly pitches = new Map<number, Pitch>();
  private readonly dummyUnitId: number = FourCC("u000");
  private readonly slowAbilityId: number = FourCC("A05D");

  public onAcquire(
    vehicle: Vehicle,
    owner: MapPlayer,
    _item: Item,
    itemId: number,
    weaponIndex: number,
  ): void {
    const pitch: Pitch = { coats: new Map(), puddles: [], spears: [] };
    this.pitches.set(itemId, pitch);

    const throwTimer = TimerUtils.newTimer();
    throwTimer.start(this.cooldown, true, () => {
      const hero = vehicle.unit;
      hero.startAbilityCooldown(
        weaponDummyAbilityIds[weaponIndex],
        this.cooldown,
      );
      const target = this.nearest(hero, owner);
      if (target == null) return;
      this.hurl(hero, owner, target, pitch);
    });

    let drip = 0;
    const burnTimer = TimerUtils.newTimer();
    burnTimer.start(0.25, true, () => {
      drip = (drip + 1) % 2;
      const burning = new Set<Unit>();

      pitch.coats.forEach((coat, u) => {
        coat.left -= 0.25;
        if (!u.isAlive() || coat.left <= 0) {
          this.scrape(pitch, u);
          return;
        }
        burning.add(u);
        if (drip !== 0) return;
        // Standing in its own pitch only keeps that puddle fresh
        const dx = u.x - coat.puddle.x;
        const dy = u.y - coat.puddle.y;
        if (
          dx * dx + dy * dy < 60 * 60 &&
          pitch.puddles.indexOf(coat.puddle) >= 0
        ) {
          coat.puddle.age = 0;
          return;
        }
        coat.puddle = this.spill(pitch, u.x, u.y);
      });

      for (let i = pitch.puddles.length - 1; i >= 0; i--) {
        const puddle = pitch.puddles[i];
        puddle.age += 0.25;
        if (puddle.age >= 4) {
          puddle.fire.destroy();
          pitch.puddles.splice(i, 1);
          continue;
        }
        const p = Point.create(puddle.x, puddle.y);
        const grp = Group.fromRange(120, p);
        grp.for((u) => {
          if (!this.isVictim(u, owner)) return;
          if (u.isUnitType(UNIT_TYPE_FLYING)) return;
          burning.add(u);
        });
        grp.destroy();
        p.destroy();
      }

      burning.forEach((u) => {
        vehicle.unit.damageTarget(
          u.handle,
          4,
          false,
          false,
          ATTACK_TYPE_NORMAL,
          DAMAGE_TYPE_FIRE,
          WEAPON_TYPE_WHOKNOWS,
        );
      });
    });
    this.timers.set(itemId, [throwTimer, burnTimer]);
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
    const pitch = this.pitches.get(itemId);
    this.pitches.delete(itemId);
    if (pitch == null) return;
    pitch.coats.forEach((_coat, u) => this.scrape(pitch, u));
    for (const puddle of pitch.puddles) puddle.fire.destroy();
    pitch.puddles.length = 0;
    // Spears in the air fall harmlessly
    for (const spear of pitch.spears) spear.destroy();
    pitch.spears.length = 0;
  }

  private isVictim(u: Unit, owner: MapPlayer): boolean {
    return (
      u.isAlive() && u.isEnemy(owner) && !u.isUnitType(UNIT_TYPE_STRUCTURE)
    );
  }

  private nearest(hero: Unit, owner: MapPlayer): Unit | undefined {
    let best: Unit | undefined;
    let least = 0;
    const grp = Group.fromRange(700, hero.point);
    grp.for((u) => {
      if (!this.isVictim(u, owner)) return;
      if (!u.isVisible(owner)) return;
      const d = (u.x - hero.x) ** 2 + (u.y - hero.y) ** 2;
      if (best != null && d >= least) return;
      least = d;
      best = u;
    });
    grp.destroy();
    return best;
  }

  // The spear flies at 1200 a second, homing in on its target
  private hurl(hero: Unit, owner: MapPlayer, target: Unit, pitch: Pitch) {
    const spear = Effect.create(
      "Abilities/Weapons/DryadMissile/DryadMissile.mdl",
      hero.x,
      hero.y,
    );
    spear.scale = 1.3;
    spear.setHeight(60);
    pitch.spears.push(spear);

    let x = hero.x;
    let y = hero.y;
    const t = TimerUtils.newTimer();
    t.start(0.03125, true, () => {
      if (pitch.spears.indexOf(spear) < 0 || !target.isAlive()) {
        const i = pitch.spears.indexOf(spear);
        if (i >= 0) {
          pitch.spears.splice(i, 1);
          spear.destroy();
        }
        TimerUtils.releaseTimer(t);
        return;
      }
      const dx = target.x - x;
      const dy = target.y - y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const step = 1200 * 0.03125;
      if (d > step) {
        x += (dx / d) * step;
        y += (dy / d) * step;
        spear.x = x;
        spear.y = y;
        spear.setYaw(Math.atan2(dy, dx));
        return;
      }

      pitch.spears.splice(pitch.spears.indexOf(spear), 1);
      spear.destroy();
      TimerUtils.releaseTimer(t);
      hero.damageTarget(
        target.handle,
        30,
        false,
        true,
        ATTACK_TYPE_PIERCE,
        DAMAGE_TYPE_NORMAL,
        WEAPON_TYPE_WHOKNOWS,
      );
      if (!target.isAlive()) return;
      this.coat(owner, target, pitch);
    });
  }

  private coat(owner: MapPlayer, u: Unit, pitch: Pitch): void {
    const dummy = Unit.create(owner, this.dummyUnitId, u.x, u.y);
    dummy.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 1);
    dummy.addAbility(this.slowAbilityId);
    dummy.issueTargetOrder("slow", u);

    const old = pitch.coats.get(u);
    if (old != null) {
      old.left = 5;
      return;
    }
    const fire = Effect.createAttachment(
      "Abilities/Spells/Other/BreathOfFire/BreathOfFireDamage.mdl",
      u,
      "chest",
    );
    const puddle = this.spill(pitch, u.x, u.y);
    pitch.coats.set(u, { left: 5, puddle, fire });
  }

  private scrape(pitch: Pitch, u: Unit): void {
    const coat = pitch.coats.get(u);
    pitch.coats.delete(u);
    if (coat != null) coat.fire.destroy();
  }

  private spill(pitch: Pitch, x: number, y: number): Puddle {
    const fire = Effect.create(
      "Environment/SmallBuildingFire/SmallBuildingFire2.mdl",
      x,
      y,
    );
    fire.scale = 0.7;
    const puddle: Puddle = { x, y, age: 0, fire };
    pitch.puddles.push(puddle);
    return puddle;
  }
}
