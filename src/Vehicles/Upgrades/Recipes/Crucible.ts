import { Effect, Item, MapPlayer, Point, Timer, Unit } from "w3ts";
import { TimerUtils } from "../../../Utility/TimerUtils";
import { Vehicle } from "../../Vehicle";
import { Globals } from "../../../Utility/Globals";
import { weaponDummyAbilityIds } from "../../../Utility/WeaponDummyAbilityIds";
import { WeaponUpgradeRecipe } from "../../WeaponUpgradeRecipe";
import { Group } from "../../../Utility/Group";
import { StunUtils } from "../../../Utility/StunUtils";

interface Pool {
  x: number;
  y: number;
  // Seconds since the iron reached it
  age: number;
  lava: Effect;
  fire: Effect;
}

// Every 3 seconds a crucible (n00Q, 3 s) 150 from the hero towards the enemy
// ground unit within 800 with the most enemy ground units within 250 of it.
// Molten iron floods from it 500 a second, up to 200 past that enemy (400 -
// 900 in all), a pool every 75. While a pool is molten (3 s) every enemy
// ground unit within 120 of it takes 50 every 0.5 s (once per pour); when it
// cools every enemy ground unit within 120 of it is stunned for 2 s
export class Crucible extends WeaponUpgradeRecipe {
  public readonly cooldown = 3;
  public readonly itemTypeId = FourCC("I031");
  public readonly merchantItemTypeId = FourCC("I032");
  public readonly recipe: number[] = [FourCC("I00O"), FourCC("I00V")];

  private readonly timers = new Map<number, Timer>();
  private readonly crucibleUnitId: number = FourCC("n00Q");

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

      const enemies: Unit[] = [];
      const grp = Group.fromRange(800, hero.point);
      grp.for((u) => {
        if (!u.isAlive()) return;
        if (!u.isVisible(owner)) return;
        if (!u.isEnemy(owner)) return;
        if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
        if (u.isUnitType(UNIT_TYPE_FLYING)) return;

        enemies.push(u);
      });
      grp.destroy();
      if (enemies.length === 0) return;

      let target = enemies[0];
      let most = 0;
      for (const u of enemies) {
        let around = 0;
        for (const v of enemies) {
          const dx = v.x - u.x;
          const dy = v.y - u.y;
          if (dx * dx + dy * dy <= 250 * 250) around++;
        }
        if (around > most) {
          target = u;
          most = around;
        }
      }

      const radians = Atan2(target.y - hero.y, target.x - hero.x);
      const sx = hero.x + 150 * Math.cos(radians);
      const sy = hero.y + 150 * Math.sin(radians);
      const dx = target.x - sx;
      const dy = target.y - sy;
      const length = Math.max(
        400,
        Math.min(900, Math.sqrt(dx * dx + dy * dy) + 200),
      );
      const crucible = Unit.create(
        owner,
        this.crucibleUnitId,
        sx,
        sy,
        (radians * 180) / Math.PI,
      );
      crucible.applyTimedLife(Globals.TIMED_LIFE_BUFF_ID, 3);
      this.pour(hero, owner, sx, sy, radians, length);
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

  private pour(
    hero: Unit,
    owner: MapPlayer,
    sx: number,
    sy: number,
    radians: number,
    length: number,
  ) {
    const ca = Math.cos(radians);
    const sa = Math.sin(radians);
    const pools: Pool[] = [];
    // Every enemy cast in iron by this pour
    const cast = new Set<Unit>();
    let front = 0;
    let ticks = 0;

    const t = TimerUtils.newTimer();
    t.start(0.1, true, () => {
      ticks++;
      // The flood front, 50 a tick
      while (front < length && front < ticks * 50) {
        const x = sx + front * ca;
        const y = sy + front * sa;
        pools.push({
          x,
          y,
          age: 0,
          lava: Effect.create(
            "Doodads/Dungeon/Props/LavaCracks/LavaCracks0.mdl",
            x,
            y,
          ),
          fire: Effect.create(
            "Abilities/Spells/Orc/LiquidFire/Liquidfire.mdl",
            x,
            y,
          ),
        });
        front += 75;
      }

      const burn = ticks % 5 === 0;
      const burnt = new Set<Unit>();
      for (const pool of pools) {
        if (pool.age >= 3) continue;
        pool.age += 0.1;
        const cooled = pool.age >= 3;
        if (!burn && !cooled) continue;

        const at = Point.create(pool.x, pool.y);
        const grp = Group.fromRange(120, at);
        grp.for((u) => {
          if (!u.isAlive()) return;
          if (!u.isEnemy(owner)) return;
          if (u.isUnitType(UNIT_TYPE_STRUCTURE)) return;
          if (u.isUnitType(UNIT_TYPE_FLYING)) return;

          if (burn && !burnt.has(u)) {
            burnt.add(u);
            hero.damageTarget(
              u.handle,
              50,
              false,
              false,
              ATTACK_TYPE_NORMAL,
              DAMAGE_TYPE_MAGIC,
              WEAPON_TYPE_WHOKNOWS,
            );
          }
          if (cooled && !cast.has(u) && u.isAlive()) {
            cast.add(u);
            StunUtils.stunUnit(u.handle, 2);
            Effect.create(
              "Abilities/Spells/Human/ThunderClap/ThunderClapCaster.mdl",
              u.x,
              u.y,
            ).destroy();
          }
        });
        grp.destroy();
        at.destroy();

        if (cooled) {
          pool.lava.destroy();
          pool.fire.destroy();
        }
      }

      if (front < length || pools.some((p) => p.age < 3)) return;
      TimerUtils.releaseTimer(t);
    });
  }
}
